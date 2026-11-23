import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const claude = process.platform === 'win32' ? 'claude.exe' : 'claude';
const intents = {
  design: /\b(redesign|dashboard|frontend|ui|ux)\b/i,
  verification: /\b(browser|playwright|e2e|accessibility)\b/i,
  billing: /\b(revenuecat|iap|subscriptions|stripe)\b/i,
  deployment: /\b(vercel|deploy)\b/i,
  database: /\b(supabase|postgres|database)\b/i
};
const read = (file,fallback) => fs.existsSync(file)
  ? JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'')) : fallback;
const policyFor = config => read(path.join(config,'claude-boss-policy.json'),{});
const validId = id => typeof id === 'string' && /^[a-z0-9][a-z0-9_-]*@[a-z0-9][a-z0-9_-]*$/i.test(id);

export function approvedPlugins(config,prompt) {
  const policy = policyFor(config);
  if (policy.autoStage !== true) return [];
  if (!Array.isArray(policy.plugins)) throw Error('Policy plugins must be an array.');
  for (const plugin of policy.plugins) {
    if (!plugin || !Object.hasOwn(intents,plugin.intent) || !validId(plugin.id)) {
      throw Error('Each approved plugin needs a supported intent and a marketplace-qualified ID.');
    }
  }
  return [...new Set(policy.plugins.filter(plugin => intents[plugin.intent].test(prompt)).map(plugin => plugin.id))].slice(0,2);
}

export function lifecycleActions({selected,owned,installed,rotate}) {
  const wanted = new Set(selected);
  const managed = new Set(owned);
  return [
    ...(rotate ? owned.filter(id => !wanted.has(id) && installed[id] === 'enabled').map(id => ['disable',id]) : []),
    ...selected.flatMap(id => !installed[id] ? [['install',id]] :
      managed.has(id) && installed[id] === 'disabled' ? [['enable',id]] : [])
  ];
}

export function stage(config,prompt) {
  const policy = policyFor(config);
  if (policy.autoStage !== true) return;
  const selected = approvedPlugins(config,prompt);
  if (!selected.length && policy.rotateOwned !== true) return;
  const project = fs.realpathSync(process.cwd());
  const registry = path.join(config,'plugins','installed_plugins.json');
  const ownership = path.join(config,'claude-boss-plugin-ownership.json');
  const settings = path.join(project,'.claude','settings.local.json');
  fs.mkdirSync(config,{recursive:true});
  const lock = ownership+'.lock';
  let fd;
  try { fd = fs.openSync(lock,'wx',0o600); } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    console.error('Claude BOSS plugin lifecycle busy; using existing tools.');
    return;
  }
  const unlock = () => { fs.closeSync(fd); fs.unlinkSync(lock); };
  try {
    const record = read(ownership,{projects:[]});
    const owned = record.projects.find(entry => entry.path === project)?.ids.filter(validId) ?? [];
    const entries = read(registry,{}).plugins ?? {};
    const local = read(settings,{}).enabledPlugins ?? {};
    const ownedLocal = owned.filter(id => entries[id]?.some(row =>
      row.scope === 'local' && row.projectPath && path.resolve(row.projectPath) === project));
    const installed = Object.fromEntries(Object.entries(entries)
      .filter(([,rows]) => Array.isArray(rows) && rows.some(row => row.scope === 'user' || (row.projectPath && path.resolve(row.projectPath) === project)))
      .map(([id]) => [id,local[id] === true ? 'enabled' : local[id] === false ? 'disabled' : 'unmanaged']));
    for (const [action,id] of lifecycleActions({selected,owned:ownedLocal,installed,rotate:policy.rotateOwned === true})) {
      const result = spawnSync(claude,['plugin',action,id,'--scope','local','--json'],
        {encoding:'utf8',timeout:30000,maxBuffer:262144,windowsHide:true});
      if (result.status !== 0) {
        console.error('Claude BOSS could not '+action+' '+id+'; continuing.');
        continue;
      }
      if (action === 'install') owned.push(id);
      console.error('Claude BOSS '+action+' succeeded for '+id+'.');
    }
    if (owned.length) {
      const projects = record.projects.filter(entry => entry.path !== project);
      projects.push({path:project,ids:owned});
      const temp = ownership+'.'+process.pid+'.tmp';
      fs.writeFileSync(temp,JSON.stringify({projects},null,2)+'\n',{flag:'wx',mode:0o600});
      fs.renameSync(temp,ownership);
    }
    return unlock;
  } catch (error) {
    unlock();
    throw error;
  }
}

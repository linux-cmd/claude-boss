import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { taskExclusions } from './router.js';

export function claudeExecutable() {
  if (process.platform !== 'win32') return 'claude';
  for (const raw of (process.env.PATH ?? '').split(path.delimiter)) {
    const dir = raw.trim().replace(/^"|"$/g,'');
    if (!dir || !path.isAbsolute(dir)) continue;
    for (const relative of ['claude.exe','node_modules/@anthropic-ai/claude-code/bin/claude.exe']) {
      const candidate = path.join(dir,relative);
      if (fs.statSync(candidate,{throwIfNoEntry:false})?.isFile()) return candidate;
    }
  }
  return 'claude.exe';
}
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
  const excluded = taskExclusions(prompt);
  return [...new Set(policy.plugins.filter(plugin => !excluded[plugin.intent] && intents[plugin.intent].test(prompt)).map(plugin => plugin.id))].slice(0,2);
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

function write(file,value) {
  const temp = file+'.'+process.pid+'.tmp';
  fs.writeFileSync(temp,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
  try { fs.renameSync(temp,file); }
  finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}

function paths(config,cwd) {
  return {
    project:fs.realpathSync(cwd),
    registry:path.join(config,'plugins','installed_plugins.json'),
    ownership:path.join(config,'claude-boss-plugin-ownership.json'),
    journal:path.join(config,'claude-boss-plugin-journal.json'),
    lock:path.join(config,'claude-boss-plugin-ownership.json.lock')
  };
}

function snapshot(files) {
  const record = read(files.ownership,{projects:[]});
  if ((record.version ?? 1) !== 1 || !Array.isArray(record.projects)) throw Error('Unsupported plugin ownership state.');
  const owned = record.projects.find(entry => entry.path === files.project)?.ids.filter(validId) ?? [];
  const entries = read(files.registry,{}).plugins ?? {};
  const local = read(path.join(files.project,'.claude','settings.local.json'),{}).enabledPlugins ?? {};
  const matching = row => row.projectPath && path.resolve(row.projectPath) === files.project;
  const localIds = new Set(Object.entries(entries).filter(([,rows]) =>
    Array.isArray(rows) && rows.some(row => row.scope === 'local' && matching(row))).map(([id]) => id));
  const installed = Object.fromEntries(Object.entries(entries)
    .filter(([,rows]) => Array.isArray(rows) && rows.some(row => row.scope === 'user' || matching(row)))
    .map(([id]) => [id,local[id] === true ? 'enabled' : local[id] === false ? 'disabled' : 'unmanaged']));
  return {record,owned,localIds,installed};
}

export function pluginPlan(config,prompt,cwd=process.cwd()) {
  const files = paths(config,cwd);
  const policy = policyFor(config);
  const selected = approvedPlugins(config,prompt);
  const state = snapshot(files);
  const owned = state.owned.filter(id => state.localIds.has(id));
  const pinned = new Set(Array.isArray(policy.pinnedPlugins) ? policy.pinnedPlugins : []);
  const actions = lifecycleActions({selected,owned,installed:state.installed,rotate:policy.autoStage === true && policy.rotateOwned === true})
    .filter(([action,id]) => action !== 'disable' || !pinned.has(id));
  return {project:files.project,selected,owned,installed:state.installed,actions,
    interrupted:read(files.journal,null),locked:fs.existsSync(files.lock)};
}

function lockLifecycle(files) {
  const fd = fs.openSync(files.lock,'wx',0o600);
  try { fs.writeFileSync(fd,JSON.stringify({pid:process.pid,createdAt:new Date().toISOString()})); }
  catch (error) { fs.closeSync(fd); fs.unlinkSync(files.lock); throw error; }
  return () => { fs.closeSync(fd); fs.unlinkSync(files.lock); };
}

export function repairPlugins(config,cwd=process.cwd()) {
  const files = paths(config,cwd);
  if (!fs.existsSync(config)) return {status:'no journal'};
  if (fs.existsSync(files.lock)) {
    const owner = read(files.lock,null);
    if (!Number.isSafeInteger(owner?.pid) || owner.pid <= 0) throw Error('Legacy or malformed lock. Confirm no BOSS launcher is running before removing it manually.');
    try { process.kill(owner.pid,0); }
    catch (error) {
      if (error.code === 'ESRCH') throw Error('Stale lock detected. Confirm no BOSS launcher is active, remove the lock, then rerun plugin-repair.');
      throw Error('Could not establish that the lock owner has exited.');
    }
    throw Error('A BOSS launcher still owns the plugin lock.');
  }
  const unlock = lockLifecycle(files);
  try {
    const entry = read(files.journal,null);
    if (!entry) return {status:'no journal'};
    if (entry.version !== 1 || !validId(entry.id)) throw Error('Unsupported plugin journal.');
    if (entry.project !== files.project) throw Error('Run repair from the worktree named in plugin-plan.');
    const state = snapshot(files);
    fs.unlinkSync(files.journal);
    return {status:'reconciled',action:entry.action,id:entry.id,
      observed:state.installed[entry.id] ?? 'absent',owned:state.owned.includes(entry.id),
      note:'No ownership was inferred and no Claude settings were changed.'};
  } finally { unlock(); }
}

export function stage(config,prompt) {
  const files = paths(config,process.cwd());
  if (!pluginPlan(config,prompt).actions.length) return;
  fs.mkdirSync(config,{recursive:true});
  const unlock = lockLifecycle(files);
  try {
    if (fs.existsSync(files.journal)) throw Error('Pending lifecycle journal. Run plugin-repair from the affected worktree.');
    for (const [action,id] of pluginPlan(config,prompt).actions) {
      write(files.journal,{version:1,project:files.project,action,id});
      const result = spawnSync(claudeExecutable(),['plugin',action,id,'--scope','local','--json'],
        {encoding:'utf8',timeout:30000,maxBuffer:262144,windowsHide:true});
      const state = snapshot(files);
      const expected = action === 'disable' ? 'disabled' : 'enabled';
      if (result.status !== 0 || !state.localIds.has(id) || state.installed[id] !== expected) {
        throw Error('Could not verify '+action+' '+id+'. Run plugin-repair to inspect the observed state.');
      }
      if (action === 'install') {
        const projects = state.record.projects.filter(entry => entry.path !== files.project);
        projects.push({path:files.project,ids:[...new Set([...state.owned,id])]});
        write(files.ownership,{version:1,projects});
      }
      fs.unlinkSync(files.journal);
      console.error('Claude BOSS verified '+action+' '+id+'.');
    }
    return unlock;
  } catch (error) {
    unlock();
    throw error;
  }
}

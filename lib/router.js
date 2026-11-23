import fs from 'node:fs';
import path from 'node:path';

const groups = [
  [/\b(redesign|dashboard|ui|ux|landing page|visual|typography)\b/i, /frontend-design|ui-ux|design-system/, 'design'],
  [/\b(react|next\.js|tsx)\b/i, /react-best|composition-pattern/, 'implementation'],
  [/\b(browser|playwright|accessibility|mobile check|e2e)\b/i, /webapp-testing|web-design-guidelines|playwright/, 'verification'],
  [/\b(revenuecat|iap|in-app purchases)\b/i, /revenuecat-status|integrate-revenuecat|revenuecat-troubleshoot/, 'billing'],
  [/\b(stripe|checkout)\b/i, /stripe/, 'billing'],
  [/\b(vercel|deploy)\b/i, /deploy-to-vercel|deployments-cicd/, 'deployment'],
  [/\b(cloudflare|wrangler|workers)\b/i, /cloudflare|wrangler/, 'infrastructure'],
  [/\b(supabase|postgres|database)\b/i, /supabase|postgres/, 'database'],
  [/\b(robot|robotics|firmware|wpilib|embedded)\b/i, /robot|wpilib|embedded|platformio/, 'robotics'],
  [/\b(llm|anthropic api|rag|ai sdk)\b/i, /claude-api|ai-sdk|agents-sdk/, 'AI'],
  [/\b(pull request|github issue|review diff)\b/i, /code-review|github/, 'repository']
];

const list = dir => fs.existsSync(dir) ? fs.readdirSync(dir,{withFileTypes:true}) : [];
const valid = /^[a-z0-9][a-z0-9_-]{0,79}$/i;
const readJson = (file, fallback) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'')) : fallback;

export function inventory(config, project) {
  const skills = new Map();
  const plugins = new Map();
  function scan(root, prefix = '') {
    for (const item of list(root)) {
      if (!item.isDirectory() || !valid.test(item.name) || item.name === 'claude-boss-router') continue;
      const entry = path.join(root,item.name,'SKILL.md');
      if (fs.existsSync(entry) && fs.lstatSync(entry).isFile()) {
        const id = prefix + item.name;
        skills.set(id,{id,source:prefix ? prefix.slice(0,-1) : 'local'});
      }
    }
  }
  scan(path.join(config,'skills'));
  const roots = [];
  for (let cursor = path.resolve(project); ; cursor = path.dirname(cursor)) {
    roots.unshift(cursor);
    if (fs.existsSync(path.join(cursor,'.git')) || path.dirname(cursor) === cursor) break;
  }
  const enabled = Object.assign({}, ...[path.join(config,'settings.json'), ...roots.flatMap(root =>
    ['settings.json','settings.local.json'].map(file => path.join(root,'.claude',file))
  )].map(file => readJson(file,{}).enabledPlugins ?? {}));
  for (const root of roots) scan(path.join(root,'.claude','skills'));
  const installed = readJson(path.join(config,'plugins','installed_plugins.json'),{}).plugins ?? {};
  for (const [id, entries] of Object.entries(installed)) {
    const name = id.split('@')[0];
    if (!valid.test(name) || !Array.isArray(entries)) continue;
    const scoped = entries.filter(entry => entry.scope === 'user' || (entry.projectPath && roots.includes(path.resolve(entry.projectPath))));
    if (!scoped.length) continue;
    plugins.set(id,{id,enabled:enabled[id] === true ? 'configured' : enabled[id] === false ? 'disabled' : 'unknown'});
    if (enabled[id] !== true) continue;
    const current = scoped.findLast(entry => entry.scope !== 'user') ?? scoped.at(-1);
    if (typeof current.installPath === 'string') scan(path.join(current.installPath,'skills'),name+':');
  }
  const manifest = path.join(project,'package.json');
  let react = false;
  if (fs.existsSync(manifest) && fs.statSync(manifest).size < 262144) {
    try {
      const pkg = readJson(manifest,{});
      const deps = {...pkg.devDependencies,...pkg.dependencies};
      react = Boolean(deps.react || deps.next);
    } catch { /* An incomplete manifest must not stop routing. */ }
  }
  return {skills:[...skills.values()],plugins:[...plugins.values()],stack:{react}};
}

export function route(input, available) {
  const prompt = String(input ?? '').slice(0,12000);
  if (!prompt.trim() || /^\s*\/(?!\/)/.test(prompt) || /^(hi|hello|thanks|thank you)[.!\s]*$/i.test(prompt)) return [];
  if (/\b(typo|spelling mistake)\b/i.test(prompt) && prompt.length < 110) return [];
  const selected = [];
  for (const [intent, capability, phase] of groups) {
    const reactUI = phase === 'implementation' && available.stack?.react &&
      /\b(component|frontend|dashboard|ui)\b/i.test(prompt) &&
      /\b(build|implement|refactor|optimize|fix)\b/i.test(prompt);
    if (!intent.test(prompt) && !reactUI) continue;
    const match = available.skills.filter(skill => capability.test(skill.id)).sort((a,b) => {
      if (phase === 'design') return Number(b.id.includes('ui-ux')) - Number(a.id.includes('ui-ux')) || a.id.localeCompare(b.id);
      return a.id.localeCompare(b.id);
    })[0];
    if (match && !selected.some(item => item.id === match.id || item.phase === phase)) selected.push({...match,phase});
    if (selected.length >= 3) break;
  }
  return selected;
}

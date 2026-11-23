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
export function approvedPlugins(config,prompt) {
  const source = path.join(config,'claude-boss-policy.json');
  if (!fs.existsSync(source)) return [];
  const policy = JSON.parse(fs.readFileSync(source,'utf8').replace(/^\uFEFF/,''));
  if (policy.autoStage !== true) return [];
  if (!Array.isArray(policy.plugins)) throw Error('Policy plugins must be an array.');
  for (const plugin of policy.plugins) {
    if (!plugin || !Object.hasOwn(intents,plugin.intent) ||
        !/^[a-z0-9][a-z0-9_-]*@[a-z0-9][a-z0-9_-]*$/i.test(plugin.id ?? '')) {
      throw Error('Each approved plugin needs a supported intent and a marketplace-qualified ID.');
    }
  }
  return [...new Set(policy.plugins.filter(plugin => intents[plugin.intent].test(prompt)).map(plugin => plugin.id))].slice(0,2);
}

export function stage(config,prompt) {
  const candidates = approvedPlugins(config,prompt);
  if (!candidates.length) return;
  const index = path.join(config,'plugins','installed_plugins.json');
  const installed = fs.existsSync(index) ? JSON.parse(fs.readFileSync(index,'utf8').replace(/^\uFEFF/,'')).plugins ?? {} : {};
  for (const id of candidates) {
    if (installed[id]?.length) continue;
    const result = spawnSync(claude,['plugin','install',id,'--scope','local','--json'],
      {encoding:'utf8',timeout:30000,maxBuffer:262144,windowsHide:true});
    console.error(result.status === 0 ? 'Claude BOSS staged '+id+' for this project.' : 'Claude BOSS could not stage '+id+'; continuing with existing tools.');
  }
}

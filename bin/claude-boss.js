#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { stage } from '../lib/plugins.js';
import { sessions, watch } from '../lib/watch.js';
import { progress } from '../lib/progress.js';
import { inventory, route } from '../lib/router.js';
import { spawnSync } from 'node:child_process';

const dir = path.resolve(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'));
const settings = path.join(dir, 'settings.json');
const runtime = path.join(dir, 'claude-boss-runtime');
const stateFile = path.join(dir, 'claude-boss-state.json');
const skill = path.join(dir, 'skills', 'claude-boss-router', 'SKILL.md');
const profiles = {
  economy: {model:'haiku', effortLevel:'low'},
  balanced: {model:'sonnet', effortLevel:'medium'},
  quality: {model:'opus', effortLevel:'high'}
};
const instructions = path.join(dir, 'CLAUDE.md');
const marker = '<!-- claude-boss -->';
const directive = marker + '\nFor substantive coding tasks, invoke the claude-boss-router skill and follow project instructions.\n' + marker + '\n';
const router = `---
name: claude-boss-router
description: Select focused skills and tools for substantive coding, design, debugging and deployment work.
---
# Claude BOSS
For simple edits, work directly. For substantial work, inspect the closest project instructions and manifests, then select the smallest relevant set of installed skills. Use local tools first. Load supporting references only when needed. Use UI/UX Pro Max for design-system work if installed. Use framework guidance for implementation and browser checks when useful. For backend, AI and embedded work, select guidance matching the actual project stack. Connect services only when needed and authorized. Keep tool outputs short. Avoid parallel agents unless independent work justifies their context cost. Use focused verification and preserve existing permissions.
`;
const read = (file, fallback) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'')) : fallback;
const save = (file, value) => {
  fs.mkdirSync(path.dirname(file), {recursive:true});
  const temp = file + '.' + process.pid + '.tmp';
  try {
    fs.writeFileSync(temp, value, {flag:'wx', mode:0o600});
    fs.renameSync(temp,file);
  } finally {
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
};
const json = (file, object) => save(file, JSON.stringify(object,null,2)+'\n');
function main() {
  const [command='help', profile='balanced', ...args] = process.argv.slice(2);
  if (command === 'help' || command === '--help') {
    console.log('claude-boss setup [economy|balanced|quality]\nclaude-boss status\nclaude-boss audit\nclaude-boss compare <baseline.jsonl> <candidate.jsonl>\nclaude-boss sessions\nclaude-boss watch [--session <file>] [--plan <file>] [--once]\nclaude-boss progress <session.jsonl> [--watch] [--plan <checklist.md>]\nclaude-boss route <task>\nclaude-boss restore\nclaude-boss run <profile> [prompt]');
    return;
  }
  if (command === 'run') {
    if (!Object.hasOwn(profiles,profile)) throw Error('Unknown profile');
    let unlock;
    if (args.length === 1 && !args[0].startsWith('-')) {
      try { unlock = stage(dir,args[0]); } catch (error) { console.error('Claude BOSS staging skipped: '+error.message); }
    }
    const flags = ['--model',profiles[profile].model,'--effort',profiles[profile].effortLevel,...args];
    // Avoid cmd.exe interpolation. The native Claude Code installer provides claude.exe.
    let result;
    try { result = spawnSync(process.platform === 'win32' ? 'claude.exe' : 'claude', flags, {stdio:'inherit'}); }
    finally { unlock?.(); }
    if (result.error) throw Error('Could not start Claude Code. Install the native CLI and add it to PATH.');
    process.exitCode = result.status ?? 1;
    return;
  }
  if (command === 'compare') {
    const [baseline,candidate,...extra] = process.argv.slice(3);
    if (!baseline || !candidate || extra.length) throw Error('Usage: claude-boss compare <baseline.jsonl> <candidate.jsonl>');
    const a = progress(baseline);
    const b = progress(candidate);
    if (a.partial || b.partial) throw Error('Comparison requires complete transcripts within the 16 MiB read limit.');
    const changes = Object.fromEntries(Object.keys(a.tokens).map(key => {
      const before = a.tokens[key], after = b.tokens[key];
      return [key,{before,after,delta:before == null || after == null ? null : after-before}];
    }));
    console.log(JSON.stringify({baseline:a.session,candidate:b.session,changes},null,2));
    return;
  }
  if (command === 'sessions') {
    console.log(JSON.stringify(sessions(dir).slice(0,10),null,2));
    return;
  }
  if (command === 'watch') {
    const options = process.argv.slice(3);
    const values = {};
    for (let i=0;i<options.length;i++) {
      const flag = options[i];
      if (flag === '--once') values.once = true;
      else if ((flag === '--session' || flag === '--plan') && options[i+1] && !options[i+1].startsWith('--')) {
        values[flag === '--session' ? 'file' : 'plan'] = options[++i];
      } else throw Error('Usage: claude-boss watch [--session <file>] [--plan <file>] [--once]');
    }
    watch(dir,values);
    return;
  }
  if (command === 'progress') {
    const [file,...options] = process.argv.slice(3);
    if (!file) throw Error('Usage: claude-boss progress <session.jsonl> [--watch] [--plan <checklist.md>]');
    const planIndex = options.indexOf('--plan');
    const plan = planIndex < 0 ? undefined : options[planIndex+1];
    if (planIndex >= 0 && !plan) throw Error('--plan requires a checklist file.');
    const watch = options.includes('--watch');
    let previous;
    const render = () => {
      const next = JSON.stringify(progress(file,plan),null,2);
      if (next === previous) return;
      if (watch && process.stdout.isTTY) console.clear();
      console.log(next);
      previous = next;
    };
    render();
    if (watch) setInterval(() => { try { render(); } catch (error) { console.error(error.message); } }, 2500);
    return;
  }
  if (command === 'audit' || command === 'route') {
    const available = inventory(dir,process.cwd());
    console.log(JSON.stringify(command === 'audit' ? available : route([profile,...args].join(' '),available),null,2));
    return;
  }
  const current = read(settings,{});
  if (!current || Array.isArray(current) || typeof current !== 'object') throw Error('Claude settings must be a JSON object.');
  const prior = read(stateFile,null);
  if (command === 'status') {
    console.log(JSON.stringify({model:current.model ?? null, effort:current.effortLevel ?? null, router:fs.existsSync(skill), managed:!!prior},null,2));
    return;
  }
  if (command === 'setup') {
    if (!Object.hasOwn(profiles,profile)) throw Error('Unknown profile');
    if (fs.existsSync(skill) && fs.readFileSync(skill,'utf8') !== router) throw Error('A custom router already occupies the Claude BOSS skill path.');
    const next = profiles[profile];
    const original = {};
    for (const key of Object.keys(next)) {
      const previous = prior?.applied[key];
      original[key] = prior && current[key] === previous ? prior.original[key] : {present:Object.hasOwn(current,key),value:current[key]};
    }
    if (/["\r\n%$`]/.test(runtime)) throw Error('Claude config path contains characters unsupported by the hook launcher.');
    const hookCommand = 'node "' + path.join(runtime,'hook.js').replaceAll('\\','/') + '"';
    const hooks = {...current.hooks};
    const entries = (hooks.UserPromptSubmit ?? []).filter(group =>
      !prior?.hookCommand || group.hooks?.length !== 1 || group.hooks[0].command !== prior.hookCommand);
    hooks.UserPromptSubmit = [...entries,{hooks:[{type:'command',command:hookCommand,timeout:3}]}];
    for (const name of ['hook.js','router.js']) save(path.join(runtime,name), fs.readFileSync(new URL('../lib/'+name,import.meta.url),'utf8'));
    json(path.join(runtime,'package.json'),{type:'module'});
    json(stateFile,{original,applied:next,hookCommand,hadHooks:prior?.hadHooks ?? Object.hasOwn(current,'hooks'),hadSubmit:prior?.hadSubmit ?? Object.hasOwn(current.hooks ?? {},'UserPromptSubmit')});
    save(skill,router);
    const existing = fs.existsSync(instructions) ? fs.readFileSync(instructions,'utf8') : '';
    if (!existing.includes(marker)) save(instructions, existing + '\n' + directive);
    json(settings,{...current,...next,hooks});
    console.log('Applied '+profile+'. Restart Claude Code to load the router.');
    return;
  }
  if (command === 'restore') {
    if (!prior) { console.log('No Claude BOSS settings to restore.'); return; }
    for (const [key,value] of Object.entries(prior.applied)) {
      if (current[key] !== value) continue;
      const item = prior.original[key];
      if (item.present) current[key] = item.value;
      else delete current[key];
    }
    if (prior.hookCommand && Array.isArray(current.hooks?.UserPromptSubmit)) {
      const remaining = current.hooks.UserPromptSubmit.filter(group =>
        group.hooks?.length !== 1 || group.hooks[0].command !== prior.hookCommand);
      if (remaining.length || prior.hadSubmit) current.hooks.UserPromptSubmit = remaining;
      else delete current.hooks.UserPromptSubmit;
      if (!prior.hadHooks && !Object.keys(current.hooks).length) delete current.hooks;
    }
    json(settings,current);
    if (fs.existsSync(skill) && fs.readFileSync(skill,'utf8') === router) fs.unlinkSync(skill);
    if (fs.existsSync(instructions)) {
      const existing = fs.readFileSync(instructions,'utf8');
      if (existing.includes(directive)) save(instructions, existing.replace('\n' + directive,''));
    }
    fs.unlinkSync(stateFile);
    console.log('Restored managed settings.');
    return;
  }
  throw Error('Unknown command. Run claude-boss help.');
}
try { main(); } catch (error) { console.error('Claude BOSS: '+error.message); process.exitCode=1; }

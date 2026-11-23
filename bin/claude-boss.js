#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = path.resolve(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'));
const settings = path.join(dir, 'settings.json');
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
    console.log('claude-boss setup [economy|balanced|quality]\nclaude-boss status\nclaude-boss restore\nclaude-boss run <profile> [prompt]');
    return;
  }
  if (command === 'run') {
    if (!Object.hasOwn(profiles,profile)) throw Error('Unknown profile');
    const flags = ['--model',profiles[profile].model,'--effort',profiles[profile].effortLevel,...args];
    // Avoid cmd.exe interpolation. The native Claude Code installer provides claude.exe.
    const result = spawnSync(process.platform === 'win32' ? 'claude.exe' : 'claude', flags, {stdio:'inherit'});
    if (result.error) throw Error('Could not start Claude Code. Install the native CLI and add it to PATH.');
    process.exitCode = result.status ?? 1;
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
    json(stateFile,{original,applied:next});
    save(skill,router);
    const existing = fs.existsSync(instructions) ? fs.readFileSync(instructions,'utf8') : '';
    if (!existing.includes(marker)) save(instructions, existing + '\n' + directive);
    json(settings,{...current,...next});
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

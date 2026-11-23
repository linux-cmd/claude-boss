import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { route } from '../lib/router.js';

test('routes the task and skips unrelated billing', () => {
  const skills = ['ui-ux-pro-max','webapp-testing','revenuecat:revenuecat-status'].map(id => ({id}));
  assert.deepEqual(route('Redesign dashboard and run Playwright', {skills}).map(x => x.id),
    ['ui-ux-pro-max','webapp-testing']);
  assert.deepEqual(route('Fix typo',{skills}),[]);
});

test('setup, prompt hook, repeated setup, and restore preserve existing configuration', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'claude-boss-test-'));
  try {
    const settings = path.join(dir,'settings.json');
    fs.writeFileSync(settings,JSON.stringify({model:'opus',permissions:{deny:['Read']}}));
    const run = (...args) => execFileSync(process.execPath,['bin/claude-boss.js',...args],
      {env:{...process.env,CLAUDE_CONFIG_DIR:dir},encoding:'utf8'});
    run('setup','balanced');
    run('setup','economy');
    const state = JSON.parse(fs.readFileSync(settings));
    assert.equal(state.hooks.UserPromptSubmit.length,1);
    const target = path.join(dir,'skills','ui-ux-pro-max');
    fs.mkdirSync(target,{recursive:true});
    fs.writeFileSync(path.join(target,'SKILL.md'),'fixture');
    const info = execFileSync(process.execPath,[path.join(dir,'claude-boss-runtime','hook.js')],{
      input:JSON.stringify({hook_event_name:'UserPromptSubmit',prompt:'Redesign dashboard',cwd:dir}),encoding:'utf8'
    });
    assert.match(JSON.parse(info).hookSpecificOutput.additionalContext,/ui-ux-pro-max/);
    run('restore');
    assert.deepEqual(JSON.parse(fs.readFileSync(settings)),{model:'opus',permissions:{deny:['Read']}});
  } finally {
    fs.rmSync(dir,{recursive:true,force:true});
  }
});

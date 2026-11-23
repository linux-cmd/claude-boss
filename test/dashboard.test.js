import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {serveWorkspace} from '../lib/dashboard.js';

test('dashboard isolates the workspace and omits transcript text',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'boss-dashboard-'));
  const config=path.join(root,'config');
  const project=path.join(root,'project');
  const folder=path.join(config,'projects',project.replace(/[^a-z0-9]/gi,'-'));
  fs.mkdirSync(project);
  fs.mkdirSync(folder,{recursive:true});
  const foreign=path.join(config,'projects','other');
  fs.mkdirSync(foreign);
  fs.writeFileSync(path.join(foreign,'private.jsonl'),'');
  fs.writeFileSync(path.join(folder,'active.jsonl'),JSON.stringify({
    type:'assistant',message:{id:'test',usage:{output_tokens:12},content:[{type:'text',text:'hidden transcript prose'}]}
  }));
  fs.writeFileSync(path.join(project,'BUILD_PLAN.md'),'- [x] Done\n- [ ] Verify [x] label\n');
  const {server,ready}=serveWorkspace(config,{cwd:project});
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url=await ready;
  assert.equal((await fetch(url)).status,200);
  assert.equal((await fetch(new URL('/snapshot',url))).status,404);
  assert.equal((await fetch(url+'snapshot',{headers:{'Sec-Fetch-Site':'cross-site'}})).status,403);
  assert.equal((await fetch(url+'snapshot?session=private')).status,404);
  const data=await (await fetch(url+'snapshot')).json();
  assert.deepEqual(data.sessions,['active']);
  assert.equal(data.report.tokens.output_tokens,12);
  assert.equal(data.report.milestones.done,1);
  assert.equal(data.report.milestones.next,'Verify [x] label');
  assert.doesNotMatch(JSON.stringify(data),/hidden transcript prose/);
});

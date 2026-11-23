import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarize} from '../lib/progress.js';
test('counts each assistant message once and omits tool payloads', () => {
  const assistant = {type:'assistant',message:{id:'msg',usage:{output_tokens:9},content:[
    {type:'thinking',thinking:'private'},
    {type:'tool_use',id:'tool',name:'Skill',input:{skill:'demo:design',secret:'private'}}
  ]}};
  const user={type:'user',message:{content:[{type:'tool_result',tool_use_id:'tool',content:'private'}]}};
  const result=summarize([assistant,assistant,user].map(x=>JSON.stringify(x)).join('\n'));
  assert.equal(result.tokens.output_tokens,9);
  assert.equal(result.toolCalls,1);
  assert.deepEqual(result.skills,['demo:design']);
  assert.doesNotMatch(JSON.stringify(result),/private/);
});

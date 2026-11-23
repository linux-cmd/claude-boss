import {test} from 'node:test';
import assert from 'node:assert/strict';
import {screen} from '../lib/watch.js';
import {route} from '../lib/router.js';

test('dashboard distinguishes milestones from unavailable usage estimates', () => {
  const output = screen({session:'fixture',tokens:{output_tokens:10},milestones:{done:1,total:2,percent:50,next:'Verify UI'},skills:[],recent:[]},0,1);
  assert.match(output,/1\/2  50%/);
  assert.match(output,/Verify UI/);
  assert.match(output,/ETA and Pro quota unavailable/);
});

test('React context supports component work but does not trigger for database work', () => {
  const available = {skills:[{id:'react-best-practices'}],stack:{react:true}};
  assert.equal(route('Implement dashboard component',available)[0].id,'react-best-practices');
  assert.deepEqual(route('Fix database migration',available),[]);
});

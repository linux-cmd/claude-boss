import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lifecycleActions } from '../lib/plugins.js';

test('rotates only owned plugins and preserves user-disabled plugins', () => {
  const selected = ['react@official','billing@vendor','user@official'];
  const owned = ['billing@vendor','idle@vendor'];
  const installed = {'billing@vendor':'disabled','idle@vendor':'enabled','user@official':'disabled','other@vendor':'enabled'};
  assert.deepEqual(lifecycleActions({selected,owned,installed,rotate:true}),[
    ['disable','idle@vendor'],['install','react@official'],['enable','billing@vendor']
  ]);
  assert.deepEqual(lifecycleActions({selected:[],owned,installed,rotate:false}),[]);
});

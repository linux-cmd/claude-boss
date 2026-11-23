import {test} from 'node:test';
import assert from 'node:assert/strict';
import { explainRoute } from '../lib/router.js';
import { catalogView } from '../lib/catalog.js';

const available = {stack:{react:true},skills:['ui-ux-pro-max','react-best-practices','webapp-testing','deploy-to-vercel'].map(id=>({id}))};

test('planning constraints defer implementation, testing, and deployment',()=>{
  const report=explainRoute('Plan only: redesign dashboard, implement React, browser test and deploy',available);
  assert.deepEqual(report.selected.map(x=>x.id),['ui-ux-pro-max']);
  assert.deepEqual(report.deferred.map(x=>x.phase),['implementation','verification','deployment']);
});
test('catalog search is case insensitive and reports configured matches',()=>{
  assert.equal(catalogView('AI',available).some(x=>x.id==='claude-api'),true);
  assert.deepEqual(catalogView('UI-UX',available)[0].configuredSkills,['ui-ux-pro-max']);
});

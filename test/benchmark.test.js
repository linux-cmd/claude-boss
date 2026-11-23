import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {progress} from '../lib/progress.js';
import {benchmark} from '../lib/benchmark.js';

const row=(id,count)=>JSON.stringify({type:'assistant',message:{id,usage:{output_tokens:count}}});
test('incremental progress retains earlier rows and counts appended records once',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'boss-incremental-'));
  const file=path.join(root,'session.jsonl');
  fs.writeFileSync(file,row('first',7)+'\n');
  const filler=JSON.stringify({type:'attachment',payload:'x'.repeat(1024*1024)})+'\n';
  for(let i=0;i<17;i++)fs.appendFileSync(file,filler);
  fs.appendFileSync(file,row('next',11));
  assert.equal(progress(file).tokens.output_tokens,18);
  fs.appendFileSync(file,'\n'+row('last',4)+'\n');
  assert.equal(progress(file).tokens.output_tokens,22);
  fs.writeFileSync(file,row('reset',3));
  assert.equal(progress(file).tokens.output_tokens,3);
});
test('benchmark separates quality results from paired usage deltas',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'boss-benchmark-'));
  for(const [file,value] of [['a',8],['b',5],['c',6],['d',1]])fs.writeFileSync(path.join(root,file),row(file,value));
  const manifest=path.join(root,'pairs.json');
  fs.writeFileSync(manifest,JSON.stringify([
    {baseline:'a',candidate:'b',baselinePassed:true,candidatePassed:true},
    {baseline:'c',candidate:'d',baselinePassed:true,candidatePassed:false}
  ]));
  const result=benchmark(manifest);
  assert.equal(result.candidatePasses,1);
  assert.deepEqual(result.tokenDeltas.output_tokens,{sampleSize:1,median:-3,min:-3,max:-3});
});

test('partial rows resolve on append while malformed completed records stay flagged',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'boss-corrupt-'));
  const file=path.join(root,'session.jsonl');
  const entry=row('first',7);
  fs.writeFileSync(file,entry.slice(0,-1));
  assert.equal(progress(file).partial,true);
  fs.appendFileSync(file,'}\n');
  assert.equal(progress(file).partial,false);
  assert.equal(progress(file).tokens.output_tokens,7);
  fs.appendFileSync(file,'null\n'+row('next',3)+'\n');
  assert.equal(progress(file).partial,true);
  assert.equal(progress(file).tokens.output_tokens,10);
});

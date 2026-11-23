import fs from 'node:fs';
import path from 'node:path';
import {progress} from './progress.js';

const median = values => {
  if (!values.length) return null;
  const sorted=[...values].sort((a,b)=>a-b);
  const mid=Math.floor(sorted.length/2);
  return sorted.length%2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2;
};

export function benchmark(manifest) {
  const rows=JSON.parse(fs.readFileSync(manifest,'utf8').replace(/^\uFEFF/,''));
  if (!Array.isArray(rows) || !rows.length || rows.length>200) throw Error('Provide 1–200 benchmark pairs.');
  const seen=new Set();
  const pairs=rows.map((row,index)=>{
    if (!row || typeof row.baseline!=='string'||typeof row.candidate!=='string' ||
      typeof row.baselinePassed!=='boolean'||typeof row.candidatePassed!=='boolean') throw Error('Invalid benchmark row '+(index+1));
    const files=[row.baseline,row.candidate].map(file=>fs.realpathSync(path.resolve(path.dirname(manifest),file)));
    for(const file of files){
      const key=process.platform==='win32'?file.toLowerCase():file;
      if(seen.has(key))throw Error('A transcript may appear only once per benchmark.');
      seen.add(key);
    }
    const [a,b]=files.map(file=>progress(file));
    if(a.partial||b.partial||!a.modelMessagesWithUsage||!b.modelMessagesWithUsage)throw Error('Incomplete observed usage in pair '+(index+1));
    return {baselinePassed:row.baselinePassed,candidatePassed:row.candidatePassed,
      deltas:Object.fromEntries(Object.entries(a.tokens).map(([key,value])=>[key,value==null||b.tokens[key]==null?null:b.tokens[key]-value]))};
  });
  const comparable=pairs.filter(pair=>pair.baselinePassed&&pair.candidatePassed);
  return {pairs:pairs.length,baselinePasses:pairs.filter(pair=>pair.baselinePassed).length,
    candidatePasses:pairs.filter(pair=>pair.candidatePassed).length,bothPassed:comparable.length,
    tokenDeltas:Object.fromEntries(Object.keys(pairs[0].deltas).map(key=>{
      const values=comparable.map(pair=>pair.deltas[key]).filter(Number.isFinite);
      return [key,{sampleSize:values.length,median:median(values),min:values.length?Math.min(...values):null,max:values.length?Math.max(...values):null}];
    })),basis:'Observed transcript counters. Deltas include only pairs where both outputs passed the supplied checks.'};
}

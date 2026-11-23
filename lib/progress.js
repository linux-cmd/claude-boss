import fs from 'node:fs';
import path from 'node:path';

function accumulator() {
  return {messages:new Map(),calls:new Map(),results:new Map()};
}

function ingest({messages,calls,results},line) {
    let row;
    try { row = JSON.parse(line); } catch { return; }
    if (!['assistant','user'].includes(row.type) || row.isSidechain) return;
    const message = row.message;
    if (row.type === 'assistant' && message?.id && message.usage) messages.set(message.id,message.usage);
    for (const block of Array.isArray(message?.content) ? message.content : []) {
      if (row.type === 'assistant' && block.type === 'tool_use' && block.id) {
        const skill = block.name === 'Skill' ? block.input?.skill : null;
        const safe = value => typeof value === 'string' && /^[\w:.-]{1,120}$/.test(value) ? value : null;
        calls.set(block.id,{tool:safe(block.name) ?? 'Unknown',skill:safe(skill)});
      }
      if (row.type === 'user' && block.type === 'tool_result') results.set(block.tool_use_id,block.is_error ? 'failed' : 'returned');
    }
}

function totals({messages,calls,results}) {
  const tokens = {};
  for (const key of ['input_tokens','output_tokens','cache_read_input_tokens','cache_creation_input_tokens']) {
    const values = [...messages.values()].map(usage => usage[key]).filter(Number.isFinite);
    tokens[key] = values.length ? values.reduce((a,b) => a+b,0) : null;
  }
  const activity = [...calls.entries()].map(([id,call]) => ({...call,status:results.get(id) ?? 'no result observed'}));
  return {modelMessagesWithUsage:messages.size,tokens,toolCalls:activity.length,
    recent:activity.slice(-12),connectors:[...new Set(activity.filter(x => x.status === 'returned' && x.tool.startsWith('mcp__')).map(x => x.tool.split('__')[1]).filter(Boolean))],skills:[...new Set(activity.filter(x => x.skill && x.status === 'returned').map(x => x.skill))]};
}

export function summarize(lines) {
  const state=accumulator();
  for (const line of lines.split(/\r?\n/)) ingest(state,line);
  return totals(state);
}

const cache=new Map();
const chunkSize=256*1024;
const lineLimit=16*1024*1024;

function scan(file) {
  const key=path.resolve(file);
  const fd=fs.openSync(key,'r');
  try {
    const stat=fs.fstatSync(fd);
    let cursor=cache.get(key);
    if (!cursor || cursor.dev!==stat.dev || cursor.ino!==stat.ino || cursor.offset>stat.size ||
        (cursor.offset===stat.size && cursor.mtime!==stat.mtimeMs)) {
      cursor={...accumulator(),dev:stat.dev,ino:stat.ino,offset:0,tail:Buffer.alloc(0),discard:false,partial:false};
    }
    const bytes=Buffer.alloc(chunkSize);
    while (cursor.offset<stat.size) {
      const count=fs.readSync(fd,bytes,0,Math.min(bytes.length,stat.size-cursor.offset),cursor.offset);
      if (!count) break;
      cursor.offset+=count;
      let start=0;
      while (start<count) {
        const newline=bytes.indexOf(10,start);
        const end=newline<0 || newline>=count ? count : newline;
        if (!cursor.discard && cursor.tail.length+end-start>lineLimit) {
          cursor.discard=true;
          cursor.partial=true;
          cursor.tail=Buffer.alloc(0);
        }
        if (!cursor.discard && end>start) cursor.tail=Buffer.concat([cursor.tail,bytes.subarray(start,end)]);
        if (end===count) break;
        if (!cursor.discard) ingest(cursor,cursor.tail.toString('utf8'));
        cursor.tail=Buffer.alloc(0);
        cursor.discard=false;
        start=end+1;
      }
    }
    cursor.mtime=stat.mtimeMs;
    cache.delete(key);
    cache.set(key,cursor);
    if (cache.size>4) cache.delete(cache.keys().next().value);
    // An unterminated row can be a complete JSON record or an in-flight append.
    // Count valid rows in a snapshot without consuming the tail twice.
    let snapshot=cursor;
    if (cursor.tail.length) {
      snapshot={messages:new Map(cursor.messages),calls:new Map(cursor.calls),results:new Map(cursor.results)};
      ingest(snapshot,cursor.tail.toString('utf8'));
    }
    return {...totals(snapshot),partial:cursor.partial || cursor.offset<stat.size};
  } catch(error){cache.delete(key);throw error;}
  finally {fs.closeSync(fd);}
}

export function progress(file, checklist) {
  const report=scan(file);
  if (checklist) {
    const items = [...fs.readFileSync(checklist,'utf8').matchAll(/^[ \t]*[-*] \[([ xX])\] (.+)$/gm)];
    const done = items.filter(item => item[1] !== ' ').length;
    report.milestones = {done,total:items.length,percent:items.length ? Math.round(done/items.length*100) : null,next:items.find(item => item[1] === ' ')?.[2] ?? null};
  }
  return {...report,session:path.basename(file,'.jsonl'),eta:null,subscriptionCredits:null,estimatedPlanCredits:null};
}

import fs from 'node:fs';
import path from 'node:path';

export function summarize(lines) {
  const messages = new Map();
  const calls = new Map();
  const results = new Map();
  for (const line of lines.split(/\r?\n/)) {
    let row;
    try { row = JSON.parse(line); } catch { continue; }
    if (!['assistant','user'].includes(row.type) || row.isSidechain) continue;
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
  const tokens = {};
  for (const key of ['input_tokens','output_tokens','cache_read_input_tokens','cache_creation_input_tokens']) {
    const values = [...messages.values()].map(usage => usage[key]).filter(Number.isFinite);
    tokens[key] = values.length ? values.reduce((a,b) => a+b,0) : null;
  }
  const activity = [...calls.entries()].map(([id,call]) => ({...call,status:results.get(id) ?? 'no result observed'}));
  return {modelMessagesWithUsage:messages.size,tokens,toolCalls:activity.length,
    recent:activity.slice(-12),connectors:[...new Set(activity.filter(x => x.status === 'returned' && x.tool.startsWith('mcp__')).map(x => x.tool.split('__')[1]).filter(Boolean))],skills:[...new Set(activity.filter(x => x.skill && x.status === 'returned').map(x => x.skill))]};
}

export function progress(file, checklist) {
  const limit = 16 * 1024 * 1024;
  const fd = fs.openSync(file,'r');
  let report;
  try {
    const size = fs.fstatSync(fd).size;
    const start = Math.max(0,size-limit);
    const buffer = Buffer.alloc(size-start);
    const length = fs.readSync(fd,buffer,0,buffer.length,start);
    let content = buffer.subarray(0,length).toString('utf8');
    if (start) content = content.slice(content.indexOf('\n')+1);
    report = {...summarize(content),partial:start > 0};
  } finally { fs.closeSync(fd); }
  if (checklist) {
    const items = [...fs.readFileSync(checklist,'utf8').matchAll(/^[ \t]*[-*] \[([ xX])\] (.+)$/gm)];
    const done = items.filter(item => item[1] !== ' ').length;
    report.milestones = {done,total:items.length,percent:items.length ? Math.round(done/items.length*100) : null,next:items.find(item => item[1] === ' ')?.[2] ?? null};
  }
  return {...report,session:path.basename(file,'.jsonl'),eta:null,subscriptionCredits:null,estimatedPlanCredits:null};
}

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { workspace } from './workspace.js';
import { progress } from './progress.js';

export function sessions(config, cwd = process.cwd()) {
  const root = path.join(config,'projects');
  if (!fs.existsSync(root)) return [];
  const project = path.resolve(cwd).replace(/[^a-z0-9]/gi,'-');
  return fs.readdirSync(root,{withFileTypes:true}).filter(x => x.isDirectory()).flatMap(dir => {
    const folder = path.join(root,dir.name);
    return fs.readdirSync(folder,{withFileTypes:true}).filter(x => x.isFile() && x.name.endsWith('.jsonl')).flatMap(file => {
      const full = path.join(folder,file.name);
      const stat = fs.statSync(full,{throwIfNoEntry:false});
      return stat ? [{path:full,updated:stat.mtimeMs,local:dir.name.toLowerCase() === project.toLowerCase()}] : [];
    });
  }).sort((a,b) => b.local-a.local || b.updated-a.updated);
}

const number = value => value == null ? 'unavailable' : value.toLocaleString('en-US');
const safe = value => String(value).replace(/[\x00-\x1f\x7f-\x9f]/g,'').slice(0,180);
export function screen(report, index, count) {
  const t = report.tokens;
  const m = report.milestones;
  return [
    'CLAUDE BOSS  /  LIVE WORKSPACE',
    'Session '+(index+1)+' of '+count+'  '+safe(report.session),
    m?.total ? 'Milestones  '+m.done+'/'+m.total+'  '+m.percent+'%' : 'Milestones  no checklist items',
    ...(m?.next ? ['Next unchecked  '+safe(m.next)] : []),
    'Tokens  input '+number(t.input_tokens)+'  output '+number(t.output_tokens),
    'Cache  read '+number(t.cache_read_input_tokens)+'  created '+number(t.cache_creation_input_tokens),
    ...(report.partial ? ['Partial totals from the latest 16 MiB'] : []),
    'Skills  '+(report.skills.join(', ') || 'none observed'),
    '', 'RECENT TOOL ACTIVITY',
    ...report.recent.map(call => '  '+safe(call.tool+(call.skill ? ' / '+call.skill : ''))+'  '+call.status),
    ...(report.workspace?.files.length ? ['','FILES CHANGED IN THIS WORKTREE',...report.workspace.files.map(file => '  '+safe(file.status+' '+file.path))] : []),
    ...(report.workspace?.details ?? []).map(safe),
    ...(report.workspace?.preview ? ['Preview  '+safe(report.workspace.preview)+' (reported)'] : []),
    'ETA and Pro quota unavailable',
  ].join('\n');
}

export function watch(config,{file,plan,once,cwd=process.cwd()} = {}) {
  let selected = file ? path.resolve(file) : undefined;
  let previous;
  const interactive = process.stdin.isTTY && process.stdout.isTTY && !once;
  const render = (step=0) => {
    const items = file ? [{path:path.resolve(file)}] : sessions(config,cwd);
    if (!items.length) {
      if (once) throw Error('No local Claude sessions found.');
      if (!previous) console.log('Waiting for a local Claude Code session.');
      previous = 'waiting';
      return;
    }
    const current = Math.max(0,items.findIndex(item => item.path === selected));
    const index = (current + step + items.length) % items.length;
    selected = items[index].path;
    const candidate = plan ?? path.join(cwd,'BUILD_PLAN.md');
    const report = progress(selected,plan || fs.existsSync(candidate) ? candidate : undefined);
    if (!file && items[index].local) report.workspace = workspace(cwd);
    const output = screen(report,index,items.length);
    if (output === previous) return;
    if (interactive) console.clear();
    console.log(output+(interactive ? '\n\n  [ / ] Switch session    q Quit' : ''));
    previous = output;
  };
  render();
  if (once) return;
  const timer = setInterval(() => { try { render(); } catch (error) { console.error(error.message); } },2500);
  if (interactive) {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('keypress',(key,info) => {
      if (key === 'q' || (info?.ctrl && info.name === 'c')) {
        clearInterval(timer);
        process.stdin.setRawMode(false);
        process.stdin.pause();
      } else if (key === '[' || key === ']') {
        try { render(key === '[' ? -1 : 1); } catch (error) { console.error(error.message); }
      }
    });
  }
}

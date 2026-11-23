import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {sessions} from './watch.js';
import {progress} from './progress.js';
import {workspace} from './workspace.js';

const css = `*{box-sizing:border-box}body{margin:0;background:#111513;color:#f2eee4;font:16px/1.5 system-ui}main{max-width:1050px;margin:auto;padding:clamp(16px,5vw,48px)}header{border-bottom:1px solid #3b4640;padding-bottom:24px}h1{font-size:clamp(2rem,6vw,4rem);margin:8px 0}.accent{color:#f8c755}label,select,button{font:inherit}select,button{max-width:100%;background:#252d28;color:inherit;border:1px solid #798479;border-radius:5px;padding:7px}button{cursor:pointer}a{color:#f8c755}section{border:1px solid #39463d;background:#1a231e;border-radius:10px;padding:18px;overflow-wrap:anywhere}h2{margin-top:0;font-size:1.1rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:15px;margin-top:20px}p,li{color:#d8ded6}.toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center}:focus-visible{outline:3px solid #f8c755;outline-offset:3px}progress{width:100%;accent-color:#f8c755}`;
const client = `
const picker=document.querySelector('#sessions');
const status=document.querySelector('#status');
const grid=document.querySelector('#grid');
let previous='';
let busy=false;
function add(root,tag,text){
  const el=document.createElement(tag);
  el.textContent=text;
  root.append(el);
  return el;
}
function card(title,items){
  const box=add(grid,'section','');
  add(box,'h2',title);
  const list=add(box,'ul','');
  for(const item of items) add(list,'li',item);
  return box;
}
async function update(){
  if(busy)return;
  busy=true;
  const wanted=picker.value;
  try{
    const response=await fetch('snapshot'+(wanted?'?session='+encodeURIComponent(wanted):''),{cache:'no-store'});
    if(!response.ok)throw Error('Workspace data unavailable');
    const data=await response.json();
    if(wanted!==picker.value)return;
    const encoded=JSON.stringify(data);
    status.textContent=data.report?'Live · local session evidence':'Waiting for a Claude Code session in this workspace.';
    if(encoded===previous)return;
    previous=encoded;
    if(Array.from(picker.options).map(option=>option.value).join()!==data.sessions.join()){
      picker.replaceChildren();
      for(const id of data.sessions){const option=add(picker,'option',id);option.value=id;}
    }
    if(data.selected)picker.value=data.selected;
    grid.replaceChildren();
    const r=data.report;
    if(!r)return;
    const m=r.milestones;
    const plan=card('Milestones',m?.total?[m.done+' of '+m.total+' checked',...(m.next?['Next: '+m.next]:[])]:['No checklist found']);
    if(m?.total){const bar=add(plan,'progress','');bar.max=m.total;bar.value=m.done;bar.setAttribute('aria-label','Checklist completion');}
    card('Observed usage',Object.entries(r.tokens).map(([key,value])=>key.replaceAll('_',' ')+': '+(value==null?'unavailable':value.toLocaleString())).concat(r.partial?['Partial transcript totals']:[]));
    card('Recent actions',r.recent.map(x=>(x.skill?x.tool+' / '+x.skill:x.tool)+' · '+x.status));
    card('Skills and connectors',[...r.skills,...r.connectors].length?[...r.skills,...r.connectors]:['None observed']);
    const w=r.workspace;
    card('Changed files',w.files.length?w.files.map(x=>x.status+' '+x.path):[w.gitAvailable?'No working-tree changes':'Git status unavailable']);
    const notes=card('Decisions and checks',w.details.length?w.details:['No notes recorded']);
    if(w.preview){const link=add(notes,'a','Open reported local preview');link.href=w.preview;link.target='_blank';link.rel='noopener noreferrer';}
  }catch(error){status.textContent=error.message;}
  finally{busy=false;}
}
picker.addEventListener('change',update);
document.querySelector('#refresh').addEventListener('click',update);
update();
setInterval(update,3000);
`;
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Live workspace · CLAUDE BOSS</title><link rel="stylesheet" href="style.css"><script src="app.js" defer></script></head><body><main><header><strong class="accent">CLAUDE BOSS</strong><h1>Live workspace</h1><p>Local activity and milestones. Watching makes zero Claude requests.</p><div class="toolbar"><label for="sessions">Session</label><select id="sessions"></select><button id="refresh">Refresh</button></div><p id="status" role="status">Loading…</p></header><div class="grid" id="grid"></div></main></body></html>`;

export function serveWorkspace(config,{cwd=process.cwd(),port=0}={}) {
  const token=randomBytes(24).toString('hex');
  const prefix='/'+token+'/';
  const cache=new Map();
  const server=http.createServer((req,res)=>{
    const reply=(code,type,body)=>{res.writeHead(code,{
      'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store',
      'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'",
      'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'
    });res.end(body);};
    if(req.method!=='GET'||req.headers.host!=='127.0.0.1:'+server.address().port||
      (req.headers['sec-fetch-site'] && !['same-origin','none'].includes(req.headers['sec-fetch-site']))) return reply(403,'text/plain','Forbidden');
    const url=new URL(req.url,'http://127.0.0.1');
    if(url.pathname===prefix)return reply(200,'text/html',page);
    if(url.pathname===prefix+'style.css')return reply(200,'text/css',css);
    if(url.pathname===prefix+'app.js')return reply(200,'text/javascript',client);
    if(url.pathname!==prefix+'snapshot')return reply(404,'text/plain','Not found');
    try{
      const items=sessions(config,cwd).filter(item=>item.local).slice(0,20);
      const ids=items.map(item=>path.basename(item.path,'.jsonl'));
      const requested=url.searchParams.get('session');
      const index=requested ? ids.indexOf(requested) : 0;
      if(requested && index<0)return reply(404,'text/plain','Session not found in this workspace');
      const item=items[index];
      let report=null;
      if(item){
        const now=Date.now();
        const stat=fs.statSync(item.path);
        const key=stat.ino+':'+stat.size+':'+stat.mtimeMs;
        const plan=path.join(cwd,'BUILD_PLAN.md');
        const prior=cache.get(item.path);
        if(prior?.key===key && now-prior.at<2000)report=prior.report;
        else{
          report={...progress(item.path,fs.existsSync(plan)?plan:undefined),workspace:workspace(cwd)};
          cache.set(item.path,{key,at:now,report});
          if(cache.size>20)cache.delete(cache.keys().next().value);
        }
      }
      reply(200,'application/json',JSON.stringify({sessions:ids,selected:ids[index]??null,report}));
    }catch{reply(503,'text/plain','Workspace temporarily unavailable');}
  });
  return {server,ready:new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(port,'127.0.0.1',()=>resolve('http://127.0.0.1:'+server.address().port+prefix));
  })};
}

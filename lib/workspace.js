import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

export function workspace(cwd) {
  const result = spawnSync('git',['status','--porcelain=v1','-z','--untracked-files=normal'],{
    cwd, encoding:'utf8', timeout:1100, maxBuffer:262144, windowsHide:true
  });
  const files = [];
  if (result.status === 0) {
    const entries = result.stdout.split('\0').filter(Boolean);
    for (let i=0;i<entries.length && files.length<8;i++) {
      const status = entries[i].slice(0,2);
      files.push({status,path:entries[i].slice(3)});
      if (/[RC]/.test(status)) i++;
    }
  }
  const notes = path.join(cwd,'BOSS_STATUS.md');
  const stat = fs.existsSync(notes) && fs.statSync(notes);
  const lines = stat && stat.size <= 16384 ? fs.readFileSync(notes,'utf8').split(/\r?\n/) : [];
  const details = lines.filter(line => /^(Decision|Blocker|Check):\s+\S/i.test(line)).slice(-5);
  const preview = lines.map(line => /^Preview:\s+(https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?(?:\/[^\s]*)?)\s*$/i.exec(line)?.[1]).filter(Boolean).at(-1);
  return {files,details,preview,gitAvailable:result.status === 0};
}

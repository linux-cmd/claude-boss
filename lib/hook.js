import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { inventory, route } from './router.js';

try {
  let text = '';
  for await (const chunk of process.stdin) {
    text += chunk;
    if (text.length > 262144) process.exit(0);
  }
  const event = JSON.parse(text);
  const config = fileURLToPath(new URL("../",import.meta.url));
  if (event.hook_event_name !== 'UserPromptSubmit' || typeof event.cwd !== 'string') process.exit(0);
  const selected = route(event.prompt, inventory(config,event.cwd));
  if (selected.length) console.log(JSON.stringify({hookSpecificOutput:{
    hookEventName:'UserPromptSubmit',
    additionalContext:'Claude BOSS routing hint. Consider available skills only at the relevant stage: ' +
      selected.map(item => item.phase+' '+item.id).join(', ') +
      '. Follow the user scope. Report only capabilities actually invoked; mark suggestions as skipped or unavailable when relevant.'
  }}));
} catch {
  // Advisory routing must never interrupt Claude.
}


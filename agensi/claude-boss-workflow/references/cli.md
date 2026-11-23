# CLAUDE BOSS CLI companion

The downloadable CLAUDE BOSS CLI is **optional**. This marketplace skill is usable as standalone instructions with a compatible AI assistant.

Official source: https://github.com/linux-cmd/claude-boss
Releases: https://github.com/linux-cmd/claude-boss/releases
Website: https://claude-boss.vercel.app/

## Prerequisites to run the CLI

- Node.js 20+.
- Native Claude Code CLI installed and available on PATH.
- Permission to make local Claude Code configuration changes.

## Current command families

- `claude-boss status`: inspect managed profile fields.
- `claude-boss audit`: inspect discovered local skill/plugin candidates.
- `claude-boss route "Redesign the dashboard"`: preview a suggested route.
- `claude-boss setup balanced`: configure supported user-level defaults (writes configuration; obtain authorization).
- `claude-boss run quality`: invoke a profile for one session.
- `claude-boss restore`: revert **managed** changes only; does not undo unrelated user/plugin changes.
- `claude-boss sessions`, `claude-boss progress`, `claude-boss watch`: inspect local session progress where supported.
- `claude-boss compare baseline.jsonl candidate.jsonl`: compare observed token counters, not guaranteed financial savings.

Commands can evolve; consult the live README and `claude-boss help` before use. Do not execute commands if they are unavailable or the user has not authorized them.

## Verification after authorized setup

1. Capture a non-sensitive summary of existing settings before changes.
2. Run the supported setup command, then `claude-boss status`.
3. Check project and organizational overrides; status output alone may not represent the effective Claude model.
4. Confirm the expected local routing skill and hook are present if configured, without exposing private settings.
5. Re-run the status/verification after a Claude Code restart if required.
6. Know how to run `claude-boss restore`, and distinguish managed changes from independent plugin installations.

Never copy user's local configuration or transcripts to marketplace listings, issue trackers, or a hosted service.

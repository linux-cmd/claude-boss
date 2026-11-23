![CLAUDE BOSS](docs/brand-banner.svg)

# CLAUDE BOSS

A portable CLI for choosing Claude Code defaults and loading task-specific guidance. Requires Node.js 20+ and the native Claude Code CLI on PATH for the launcher.

[Website](https://claude-boss.vercel.app/) · [Releases](https://github.com/linux-cmd/claude-boss/releases) · [Codex guide](CODEX.md)

## Free CLAUDE BOSS Workflow skill

The [free, portable CLAUDE BOSS Workflow skill](agensi/claude-boss-workflow/SKILL.md) is available to read and use from this repository. It provides model-profile recommendations, focused skill/tool selection and evidence-based verification guidance. It is **instruction-only**; the CLI is a separate optional installation.

**Agensi publication status:** Marketplace submission is pending creator-account eligibility confirmation and review. The skill is **not yet listed on Agensi**. See the [Agensi preparation and listing details](agensi/README.md) and [launch materials](agensi/LAUNCH_KIT.md).

## Install on Windows or Linux

    npm install -g https://github.com/linux-cmd/claude-boss/releases/download/v0.7.0/claude-boss-0.7.0.tgz
    claude-boss setup balanced
    claude-boss status

Restart Claude Code after setup. Use economy for routine edits, balanced for daily work, or quality for harder work. Try a profile for one session with `claude-boss run quality`. Restore managed settings with `claude-boss restore`.

Setup updates model and effort and installs a lightweight routing skill. Project or managed settings may override the defaults. The CLI does not alter billing, install Claude Code, or measure savings. Its router works with skills you already have.

## Optimize with Codex

Open Codex on the same machine and say **“Optimize Claude Code with Claude BOSS”**, with the repository or [Codex guide](CODEX.md) in context.

The original personal setup was not tracked in Git. Public development history begins with the portable CLI.

## Automatic routing

After setup and restart, type a normal prompt. The local hook ranks relevant installed skill candidates. Run claude-boss audit to inspect its local inventory and claude-boss route "redesign the dashboard" to preview a decision. Claude decides whether to invoke a suggested skill and should report actual use. The inventory represents local configuration, which may differ from availability under managed policy.

See NEXT_VERSION_PLAN.md for planned marketplace staging, verified usage reporting and benchmarking.

## Credits

**Built by Abhijay Panwar.** CLAUDE BOSS is an independent project and is not affiliated with Anthropic.

## Watch a build from a second terminal

Run claude-boss sessions to find a transcript, then:

    claude-boss progress "path/to/session.jsonl" --watch --plan BUILD_PLAN.md

Ask Claude for a Markdown checklist in the regular planning turn. For a Jarvis project, include architecture, a visual mockup, the core interaction, integrations, and end-to-end verification. Have Claude check each item after verifying it and record short decision notes and blockers in the plan. Open the local UI preview as soon as one exists.

The monitor makes no model calls. It reports observed tool results, returned skill calls, token counters and checked milestones. It counts main-session assistant messages with usage in up to 16 MiB of transcript and flags partial reads. Milestone percentage counts checklist items. Pro credits, total projected cost, and ETA are unavailable.


## Terminal dashboard

Run `claude-boss watch` from the same project in a separate pane. Use `[` and `]` to switch sessions and `q` to quit. It reads BUILD_PLAN.md if present. Use `--plan` for another checklist, `--session` to pin a transcript and `--once` for a snapshot. Session matching uses the local Claude project directory naming convention.


## Workspace evidence and plugin staging

Run watch from the same Claude project to see up to eight Git working-tree changes. Add a BOSS_STATUS.md file in that directory. Lines prefixed with Decision:, Blocker:, Check:, and Preview: appear on the dashboard. Preview accepts localhost HTTP(S) links. Notes are reported as written. Watch does not check the server or generate notes itself.

Optionally create claude-boss-policy.json in the Claude config directory:

```json
{"autoStage":true,"plugins":[{"intent":"billing","id":"revenuecat@RevenueCat"}]}
```

Supported intents are design, verification, billing, deployment, and database. Add only publisher and marketplace IDs you trust. The marketplace must already exist in Claude Code. With the policy enabled, claude-boss run balanced "Inspect my RevenueCat subscription setup" attempts to install up to two matches at local scope before starting Claude. It skips IDs already in the install registry and honors Claude's native installation and authentication gates. For a running session the hook continues to route already installed skills. Use Claude's plugin manager to disable or remove a staged plugin. The setup restore command manages BOSS settings and hooks only.

## Measure token usage

Run comparable tasks in clean sessions with the same model, effort and test conditions, first without BOSS and then with it. Verify both results against the same acceptance checks. Repeat cold and warm runs several times. Compare each pair with claude-boss compare baseline.jsonl candidate.jsonl. It reports raw token deltas by counter. Evaluate quality and variance before drawing a conclusion. Pro subscription quota, projected credits and ETA are unavailable.

For automatic rotation, set `"rotateOwned": true` in the policy. At launch, BOSS can re-enable its own matching local plugins and disable its own unrelated local plugins. Leave rotation off if you also run Claude directly in the same project. BOSS serializes its own managed launches, and cannot detect unrelated native sessions. If a process is killed and a lock remains, remove the ownership lock only after confirming no managed launch is active. Watch identifies MCP servers from returned calls.

## Preview and repair plugin changes

Run `claude-boss plugin-plan "Redesign the dashboard"` for the selected IDs, local inventory, and proposed actions without mutating state. Add IDs to `pinnedPlugins` in the policy to exempt them from automatic disabling. BOSS journals each action before invoking Claude and checks native registry and local settings afterward. If interrupted, run `claude-boss plugin-repair` from the affected worktree. It reports the observed state and clears the journal without inferring ownership or rolling back changes. If a stale ownership lock remains, confirm the launcher has exited before removing it. Local configuration does not establish that a running session loaded a plugin.

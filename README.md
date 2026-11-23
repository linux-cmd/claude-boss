# Claude BOSS

A portable CLI for choosing Claude Code defaults and loading task-specific guidance. Requires Node.js 20+ and the native Claude Code CLI on PATH for the launcher.

## Install on Windows or Linux

    npm install -g https://github.com/linux-cmd/claude-boss/releases/download/v0.2.0/claude-boss-0.2.0.tgz
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

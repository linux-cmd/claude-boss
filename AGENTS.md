# Optimize Claude Code with Claude BOSS

When asked to optimize Claude Code with Claude BOSS, use the following workflow.

1. Confirm Claude Code and Claude BOSS are installed. Use the release install command in README if needed. Run claude-boss status and inspect the user's effective model settings, current plugins, available skills, and MCP server status. Keep credentials and full transcripts out of output.
2. Apply claude-boss setup balanced unless the user's workload calls for economy or quality. Check project overrides. Preserve organization policy and permission prompts.
3. Identify overlapping or unused plugins by inventory and usage. Disable only plugins the user authorizes you to disable, using the Claude CLI at the correct scope. Record each change and its reversal. Keep relevant plugins available and favor built-in tool discovery.
4. For substantial tasks, use one relevant skill per stage initially. Add others only when needed. Use existing package tooling and a small, relevant verification scope. Avoid manager agents and repeated reads for routine work.
5. Report the resulting profile, routing, and any connector authentication still needed. Compare token usage only if the user has actual before and after measurements. The CLI restore command restores its own settings. Reverse separate plugin changes individually.

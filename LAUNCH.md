# CLAUDE BOSS v1.0 launch kit

## Live destinations

- [GitHub launch discussion](https://github.com/linux-cmd/claude-boss/discussions/11)
- [Stable release and install package](https://github.com/linux-cmd/claude-boss/releases/tag/v1.0.0)
- [Free Agensi workflow skill](https://agensi.io/skills/claude-boss-workflow)

## LinkedIn draft

I built CLAUDE BOSS because I wanted to follow a long Claude Code task without interrupting it to ask for status.

Version 1.0 adds a local dashboard for milestones, tool outcomes, changed files, and observed token counts. The watcher makes zero additional model calls. The CLI can also explain skill choices and stage approved plugins at launch.

It runs on Windows and Linux. If you use Claude Code for longer builds, I’d like to know what you’d want to see in a second pane while it works.

Release: https://github.com/linux-cmd/claude-boss/releases/tag/v1.0.0

## Product Hunt draft

**Name:** CLAUDE BOSS  
**Tagline:** Watch Claude Code work without another prompt  
**Description:** A CLI companion with a local progress dashboard, reversible model profiles, and explainable skill routing. Follow checklist milestones, tool outcomes and observed token usage while Claude Code works. The dashboard makes zero additional model calls.  
**Product URL:** https://claude-boss.vercel.app/

## DEV article outline

**Title:** How I watch Claude Code build a project without sending status prompts

1. Show a project with a short Markdown checklist and run Claude Code normally.
2. Open the local dashboard in a second pane. Explain the difference between checked milestones and estimated time remaining.
3. Run the routing preview for a planning-only prompt and show the deferred deployment phase.
4. Explain how local transcript counters work and why they do not establish Claude Pro savings.
5. Link the release and ask readers for one concrete workflow to improve.

## Demo storyboard

**Title:** Watch Claude Code work with CLAUDE BOSS v1.0

- 0–8s — Open two panes. One runs Claude Code, and the other launches the local dashboard.
- 8–22s — Switch to the browser. Show milestones, recent tools, changed files, and observed token counters.
- 22–35s — Run a routing preview with a plan-only request and point out why deployment is deferred.
- 35–45s — Show the release link and invite feedback in GitHub Discussions.

Use a disposable demo project with sample data. Keep the private dashboard URL and personal transcript details out of the recording. Label any fixture data.

## Community outreach

- **Hacker News:** If submitting a Show HN, write it personally and lead with a usable example. HN's guidelines prohibit generated and AI-edited text. [Guidelines](https://news.ycombinator.com/newsguidelines.html)
- **Reddit and Discord:** Check each community's active self-promotion rules. Use designated channels or moderator approval as required. Share one useful demo and disclose that you built it.
- **Newsletter or maintainer outreach:** Pick relevant recipients and write a short personal note about why this tool fits their audience. Avoid bulk unsolicited messages.
- **Package discovery:** The CLI is installable with npm from a GitHub release asset. Publishing under an npm registry name requires registry authentication and checking name ownership.

## Measurement

Check release asset downloads, Agensi uses, GitHub discussion replies, issues and stars after 7 and 30 days. Label changes as observed totals unless there is evidence attributing them to a specific channel. Turn repeated feedback into a release note or FAQ update.

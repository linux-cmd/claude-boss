# Claude BOSS 0.2 — automatic plugin routing

## What a user should experience

Type an ordinary prompt, including in an existing conversation. BOSS reads the intent and a small project fingerprint, chooses the relevant capabilities, invokes them when needed, and reports what actually ran. For example, “Redesign the planner dashboard and check it on mobile” selects design guidance first and browser verification later. RevenueCat stays idle unless billing comes into scope. No plugin names in the prompt.

The v0.1 release provides profiles and instructional routing. v0.2 adds a catalog, automatic decisions and observable execution. Support a broad catalog and a small active set. Keep user-owned plugins and organization policy intact.

## Catalog and lifecycle

- Index official, vendor and user-approved marketplaces plus local installs. Store the full index locally, refresh incrementally, and support offline routing. Discovery downloads metadata. An allowlisted cache may stage reviewed packages. Avoid installing an entire marketplace.
- Record publisher, source, version and digest, task tags, negative triggers, OS and runtime requirements, component types, dependencies, scope, account requirements, startup time, and estimated context overhead. Evaluate capabilities individually because one plugin can bundle skills, agents, hooks, LSP and MCP.
- Track discovered, cached, installed, enabled and available-in-session separately. Track connection and invocation separately too. A staged plugin may need reload or OAuth before it can run. An enabled plugin may never have been used.
- Offer installed-only mode by default and an opt-in automatic mode for approved publishers and versions. Check package identity, dependency integrity, path traversal and executable components before activation. Review new executable behavior when a version changes. Marketplace descriptions and skill bodies are untrusted inputs.
- Use the narrowest supported scope. Pin needed dependencies while in use. Automatically deactivate or evict idle BOSS-owned components only when supported and safe across sessions. Keep existing user plugins and pins. Separate optional migration that proposes disabling redundant user plugins and records each approved change. Deactivation leaves OAuth connections intact.

## Router design

1. Read the prompt, task phase, closest project instructions, and relevant manifests. Cache a narrow fingerprint keyed by worktree and configuration revision. Detect the relevant subproject in a monorepo.
2. Exclude incompatible stacks, permissions, runtimes, unavailable accounts and unapproved sources. A React dependency alone should never cause a database-only change to load UI guidance.
3. Rank by intent, stack, expected quality, readiness and observed reliability. Penalize overlapping capability, context, startup time and added access. Compare against the native CLI and existing project tooling. Begin with rules and local text search. Add embeddings only if evaluation shows a measurable gain.
4. Select zero to three capabilities to start, with one fallback where useful. Return IDs, phase, rationale and estimated overhead. Handle routine and uncertain tasks with the existing native tools. Gather one discriminating repository fact when a specialist choice matters.
5. Replan on user steering, stage changes or failure. Reuse the existing choice when intent is stable. Cap retries and reloads. Track version-scoped outcomes locally and avoid equating invocation frequency with task quality.

## Candidate packs

These are capabilities to verify against official sources and evaluate, with installable entries pinned to tested versions.

| Domain | Default and conditional choices |
|---|---|
| Web design | Existing design system first, then UI/UX Pro Max for visual direction, Anthropic frontend-design for implementation, Vercel React or accessibility guidance for targeted review. Motion guidance only when needed. |
| Browser QA | Project Playwright and axe first, browser MCP when it uniquely helps, screenshots for visual evidence. |
| Code intelligence | Stack-matched TypeScript, Python, Go, Rust, Java, C/C++ or .NET language tools when symbols and navigation matter. |
| Git and CI | Local Git and project scripts, GitHub integration for issues, PRs and CI evidence. |
| Backend and infrastructure | Framework and database tooling, then Supabase/Postgres, Cloudflare, Vercel, Docker or Terraform for relevant infrastructure. |
| AI and data | Provider SDKs, AI SDK, relevant retrieval and evaluation tooling, notebooks and runtime guidance for training. |
| Mobile and billing | Native or cross-platform SDK guidance, RevenueCat for subscription configuration, Stripe for web checkout, store connectors for store work. |
| Robotics | WPILib, ROS, PlatformIO and vendor docs matching the repository, with simulation where relevant. |
| Docs and operations | Official docs lookup, Drive/Notion/Linear when source material lives there, provider logs or Sentry for incidents, document tools for actual artifacts. |

## Same-conversation support

- Ship a compact BOSS entry skill and local hook adapter. Prototype UserPromptSubmit for routing hints and lifecycle hooks for evidence. Keep hints small, omit them when routing adds no value, and fail open on timeouts. Probe installed Claude Code capabilities and version-specific event schemas before relying on them.
- In a running session, invoke available native skills and MCP tools first. Use native MCP Tool Search when supported. An audited read can supply skill guidance if registration is unavailable. It cannot supply agents, hooks, or MCP tools. Distinguish it in reports.
- For new bundles, use the documented plugin CLI, then verify that the current runtime actually loaded the change. Validate reload on supported versions. If a running session cannot activate a bundle programmatically, fall back to available capabilities or stage it for the next launch. Report which occurred. Avoid a second hidden Claude process for routing.
- At launch, offer optional profile selection and staged capabilities after proving scope isolation. Preserve conversation continuity using supported resume flows. A hook cannot be assumed to change the model midturn.
- Ship a Codex skill and update the repo guide so “Optimize Claude Code with Claude BOSS” checks effective config, inventories plugins, applies an approved policy and verifies the result. A Codex installation without the skill can use the repository instructions.

## Lower credit use

- Keep routing local and avoid catalog injection. Use stable short instructions, scoped repository search, small tool outputs and only the relevant sections of references. Avoid redundant web fetches and unnecessary subagents.
- Economy is appropriate for small tasks, Balanced for everyday work, and Quality for hard tasks. Auto-select at launch only when enabled and supported. Respect user overrides and organization policy. Reuse task context and compact at meaningful boundaries instead of after every turn.
- Prefer native tool discovery and project scripts, defer eligible MCP schemas, and cap tool retries. Keep fast mode and paid gateway options outside the defaults.
- Measure cache reads and writes separately from uncached input and output. Report API cost only with a qualified pricing basis. Subscription quota, API dollars and tokens are different measures. Use supported hard budget controls only in modes that expose them. Treat other budget thresholds as warnings.

## Evidence and reporting

Maintain a local ledger keyed by session, turn and tool call. Correlate observed native invocations, reference reads and MCP calls with their source. Report selected, used successfully, failed, deferred, disabled and unknown accurately. Use documented hooks and structured outputs where possible. An inventory entry or intent statement is insufficient evidence of usage. Do not store prompts, credentials, tool arguments or results by default. Support retention, purge and opt-out.

Example report: “Used UI/UX Pro Max guidance and Playwright for the mobile check. Vercel deferred because deployment was outside scope. RevenueCat skipped because billing was outside scope. Disabled none. Token totals unavailable for this turn.” Provide a detailed explanation only on request.

## Build and release

1. **Alpha:** Implement catalog sync/search, inventory, route and explain commands. Add an installed-only live router, with dry-run JSON and testable decision records. Separate catalog, policy, planner, Claude adapter and ledger.
2. **Beta:** Implement approved staging, plugin lifecycle probes, observed reports and the Codex skill. Use atomic writes, versioned state, per-config locks, an operation journal and three-way rollback. Maintain setup/status/run/restore compatibility. Test simultaneous sessions, malformed manifests, unavailable OAuth, interrupted writes, configuration precedence, and user changes between setup and restore.
3. **Stable:** Verify npm package installs and actual Claude sessions on native Windows and Linux, with a WSL compatibility check. Publish tagged source, a checksummed release artifact, compatibility notes and site instructions. Label capabilities that require the next session. Keep optional packs behind tested source policies.

Compare plain Claude Code, v0.1 and v0.2 using the same model and effort first. Evaluate automatic model selection separately. Run warm and cold paired trials across routine, frontend, backend, multi-stage, unavailable-plugin and no-plugin tasks. Measure correctness, useful capability selection, overhead, cache usage, time and failures. Publish median and tail results and sample size. Proposed gates are at least 90% useful top-three routing on labeled held-out tasks, zero unapproved activations or false “used” claims in fixtures, and no material quality regression. Make a savings claim only after measured improvement on representative workflows.

## Primary sources

- [Claude Code plugins](https://code.claude.com/docs/en/plugins)
- [Skills and how they load](https://code.claude.com/docs/en/skills)
- [MCP and tool discovery](https://code.claude.com/docs/en/mcp)
- [Hooks reference](https://code.claude.com/docs/en/hooks)
- [Settings precedence](https://code.claude.com/docs/en/settings)
- [CLI reference](https://code.claude.com/docs/en/cli-reference)
- [Cost guidance](https://code.claude.com/docs/en/costs)

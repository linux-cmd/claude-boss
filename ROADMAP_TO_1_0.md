# Claude BOSS roadmap from v0.6 to 1.0

## Product outcome

Start Claude Code normally or through BOSS. Give it the task in plain language. BOSS selects the smallest useful set of trusted capabilities, adapts when the task changes, and explains what actually ran. A second terminal or optional local web dashboard shows how the work is going without starting an extra Claude request. Better quality and lower usage are release outcomes to measure.

### Starting point

v0.6 ships profiles, installed-skill hints, opt-in launch-time staging and rotation, observed tool and connector usage, workspace notes, checklist progress, and a two-transcript comparison. Selection remains largely based on task keywords. Rotation is scoped to BOSS-owned project-local plugins, and its lock only coordinates BOSS launches. The monitor reads a bounded transcript tail. Live marketplace rotation and Claude Pro savings have not been demonstrated. Prioritize these gaps over a bigger plugin list.

## Phase 1 — Trustworthy setup and plugin lifecycle

| Work | Reason | Acceptance evidence |
|---|---|---|
| Versioned config, policy and ownership schemas | Detect malformed files and old state before changes | Migrate v0.1–v0.6 fixtures idempotently, preserve unknown settings, report actionable errors |
| Canonical worktree identity and scoped locks | Distinguish worktrees, linked directories and Windows case variants | Concurrent workspace and same-worktree tests, interrupted install fixture, explicit stale-lock recovery |
| Journal install, enable, disable and restore | A crash between plugin mutation and ownership save can cause drift | Reconcile native registry after each command, resume or recover after each injected interruption, preserve user edits |
| Dry-run and effective inventory | Persistent and runtime states are different | Report discovered, cached, installed, enabled, loaded, connected, and unknown separately, with scope and source |
| Explicit adoption and pinning | User-managed plugins should remain untouched | Only manage explicitly adopted or verified BOSS-installed local entries, preserve pins, let the user release ownership |
| Compatibility matrix | Claude versions and settings scopes change | Probe CLI features, test native Windows/Linux and WSL, support read-only fallback where mutation is unavailable |

Implementation order: pin the target Claude CLI versions, build a native-command adapter with structured outputs, then verify real install → load → disable → re-enable → restore in a disposable worktree using a reviewed fixture marketplace. Add one publisher marketplace smoke test. Record configuration and runtime evidence separately. Exercise a second native session before broadening automatic rotation defaults.

## Phase 2 — Automatic routing and marketplace choice

1. **Index broadly, activate selectively.** Import metadata from the official marketplace, reviewed publisher catalogs and user-added sources. Deduplicate publisher-qualified IDs and versions. Record provenance, dependency graph, executable components, OS, authentication requirements and estimated overhead. Update by explicit refresh or bounded cache expiry. Keep downloaded skill bodies outside the prompt until needed.
2. **Build a capability scorer.** Extract multiple intents, task phase, constraints such as planning-only, and the relevant subproject. Score candidates on task match, stack, specificity, available credentials and measured reliability. Penalize duplicated capabilities, schema size and startup cost. Start with local rules plus text search. Evaluate a learned ranker only after labeled data shows a gap.
3. **Route by stage.** A dashboard request can use design guidance first, React guidance when editing, and Playwright when checking. A request to fix a SQL migration inside a React monorepo should skip frontend guidance. Prefer a project-native tool where it already satisfies the job. Keep candidate selection, activation, invocation and successful completion distinct.
4. **Reconsider when necessary.** Re-rank on prompt steering or evidence of a failed tool, changed stack or new phase. Add a cooldown and deduplication so repeated prompts do not churn plugins. Emit a short routing hint only when it changes a meaningful decision.
5. **Activate using supported interfaces.** Test supported reload behavior and confirm visibility from within the intended session. Automate activation only where the runtime exposes a supported way to apply and verify it. Otherwise queue for the next launch or show a reload action. Keep account access, managed policy and marketplace command approval in Claude's native flow.
6. **Track outcomes, not popularity.** Score observed success by capability and version, using a bounded local history. Compare against fixtures before enabling automatic adaptation. Preserve deterministic replay, allow reset, and prevent a heavily used plugin from winning unrelated tasks.

### Catalog priorities

| Area | Candidates and selection rule |
|---|---|
| Web design and QA | Existing design system first, UI/UX Pro Max for visual direction, frontend-design for implementation, React guidance for framework-specific work, Playwright and axe for verification |
| Backend and deployment | Native migration and build scripts, PostgreSQL/Supabase for database tasks, Cloudflare or Vercel only when stack and intent match |
| Mobile and subscriptions | Native SDK guidance, RevenueCat for in-app subscription configuration, Stripe for web billing |
| Repository and operations | Local Git for local state, GitHub for remote PR/CI state, provider logs or error tracking for incidents |
| AI, embedded and documentation | Stack-specific SDK and evaluation guidance, WPILib/ROS/PlatformIO where applicable, source-specific docs and artifact tools only for the requested deliverable |

Give every candidate a documented official source, fixture tasks, an overlap group and removal instructions before promoting it to the default catalog. Offer explanations such as “selected browser verification, skipped billing, deferred deployment until requested.” A release should demonstrate this on multi-stage tasks with unneeded capabilities installed.

## Phase 3 — A usable live workspace

- **Correct session attribution.** Prefer runtime-reported workspace and session identity. Use folder names only as a fallback. Map notes, Git status and checklist to the selected session. Distinguish preexisting edits from changes since a saved worktree baseline. Handle transcript rotation, partial lines and duplicate events.
- **Incremental monitoring.** Keep a byte cursor and bounded event buffer per session. Rebuild when the file changes identity or shrinks. Track cumulative counters and prune stale sessions. Use supported structured events when available and version transcript parsers with fixtures.
- **Structured milestones.** Support stable IDs, states, optional weight, next action, blockers and verification evidence. Keep Markdown checklists as a fallback. Calculate completion from the declared weights and label its basis. Report wall-clock and active time separately. Work can expand, so surface additions to the plan.
- **Reviewable decisions.** During normal work, ask Claude to record short decision summaries, alternatives and verification links only at milestones. Display them locally with provenance. Use recorded decisions and observable actions as the review surface.
- **Visual review.** Add terminal panes for milestones, activity, changes and previews. Offer an optional loopback-only browser dashboard with incremental updates and keyboard navigation. For a Jarvis-style task, show a plan diagram, existing mockups and the actual preview URL. Open links only on user action. Distinguish reported preview URLs from healthy preview checks.
- **Usage ledger.** Keep session, turn, capability identifier, timestamps and outcome. Classify failed, returned and unknown results conservatively. Separate top-level and nested work where format permits. Keep local event records free of prompt text, credentials and tool payloads by default. Add retention, export and purge controls. Escape terminal and browser output.

Acceptance demo: start a fresh Jarvis-style build, watch the plan, switch to another session and back, inspect files and verify a preview, then observe a failed check and recovery. The monitor itself should send zero model requests. Claude's own implementation and note writing still count as normal session work.

## Phase 4 — Measured efficiency and forecasts

### What to display

- **Observed tokens:** per-turn and session uncached input, cache writes, cache reads, output, and scope coverage. Preserve unavailable values through aggregation. Flag partial sessions and incompatible providers.
- **Pro plan:** show only usage information from a supported, user-authorized source and label its time window and freshness. Keep exact session charge unavailable if no supported source supplies it. An API rate card cannot price a subscription session.
- **API estimates:** optional model- and provider-specific rate cards with version date, cache handling and assumptions. Keep estimated cost separate from billed cost.
- **ETA and total work:** show ranges based on completed comparable milestones and workload history, including sample size. Start with manually supplied estimates when there is no history. With sparse data, material scope changes or blocked work, show insufficient evidence or paused. Apply the same principle to remaining token ranges. Never convert a checklist percentage directly into elapsed time or Pro quota.

### Benchmark before recommending more aggressive defaults

Use isolated worktrees and reproducible tasks with objective tests or review rubrics. Compare plain Claude Code, installed-only routing, and staging/rotation with the same model, effort, tool permissions and starting files. Measure auto profile choices separately. Randomize arm order and alternate cold and warm sessions. Run at least five paired trials per task category before making a directional claim, and expand the sample for noisy results. Include small edits, design, debugging, database changes, monorepos, multi-stage requests and missing-plugin scenarios. Record completion, correctness, retries, model usage, wall time and median and tail overhead. Publish combined results and failures, not only improvements.

Start with easy savings to A/B test: compact routing hints, bounded command output, delayed connector schemas, reuse of stable instructions, minimal agents on routine work and model escalation for genuinely hard tasks. Compare cost per accepted outcome, including retries. Keep model and effort choices reversible. Benchmarking uses real Claude requests, so agree on a run budget before spending substantial subscription capacity.

## Release sequence and definition of done

| Release | Deliverable | Gate |
|---|---|---|
| v0.7 | Reliable plugin state, journal, dry run, repair and real lifecycle smoke tests | Recover interrupted writes and preserve unrelated plugins on Windows and Linux |
| v0.8 | Catalog, staged ranking and supported session activation behavior | Held-out selection evaluation and end-to-end proof of every advertised activation path |
| v0.9 | Incremental watch, evidence ledger and optional local visual workspace | Zero monitor model calls, correct session attribution, bounded CPU/memory and accessible navigation |
| v1.0 | Paired benchmarks, truthful usage estimates, migration and polished distribution | Quality retained, savings claims backed by data, complete install and rollback checks |

Score out of 100 with 25 points for rotation and recovery, 25 for relevance and task quality, 20 for dashboard evidence, 20 for measured efficiency and honest estimates, and 10 for distribution. Award each category only against its acceptance evidence. Require no unattended changes outside policy and no unsupported cost claims as pass/fail gates independent of the score.

Merge through PRs with Windows/Linux CI, package-install smoke tests, version-matched docs, tagged checksummed releases and verified site deployment. Publish migration notes and a feature matrix distinguishing supported, experimental and unavailable behavior. Keep the existing install flow working during upgrades.

### Upstream references

- [Plugin model and loading](https://code.claude.com/docs/en/plugins)
- [Hooks and supported events](https://code.claude.com/docs/en/hooks)
- [Settings precedence](https://code.claude.com/docs/en/settings)
- [MCP and tool discovery](https://code.claude.com/docs/en/mcp)
- [CLI reference](https://code.claude.com/docs/en/cli-reference)

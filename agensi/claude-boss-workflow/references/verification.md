# Verification checklist for CLAUDE BOSS Workflow

Use only the checks relevant to the user's request.

## Before

- [ ] Confirm whether the request is advisory, read-only, or authorizes changes.
- [ ] Identify user constraints, target environment and actual project instructions.
- [ ] Record relevant baseline behavior from real observations, not speculation.

## Selection

- [ ] Explain chosen model profile and any override or compatibility caveats.
- [ ] Identify relevant available skill/tool candidates; omit unverified capabilities.
- [ ] Avoid unnecessary parallel agents or unrelated plugin domains.

## Execution

- [ ] Apply only the changes the user authorized.
- [ ] Avoid credentials and sensitive transcript content in output/logs.
- [ ] Preserve reversible instructions and describe third-party changes separately.
- [ ] For package updates, validate installer/release URLs against current GitHub releases.

## Verification

- [ ] Run bounded checks appropriate to changes made (e.g. tests, lint, preview, CLI status).
- [ ] Confirm actual outcomes with tool evidence. A planned action is not a completed one.
- [ ] Record any skipped, partial or failing checks.
- [ ] Report token usage only when measured; use comparable tasks and multiple runs before claiming improvements.
- [ ] Communicate remaining manual steps, including external authentication or publication review.

## Example output

**Recommended profile:** Balanced (Sonnet / medium) as a starting point; confirm effective settings.

**Routing:** Design guidance first, then browser verification (only if these tools are available).

**Action:** Read-only inspection completed. No plugins installed or settings modified.

**Evidence:** [List of checks actually run, with outcomes.]

**Limit:** Skill suggestions are advisory. The assistant or Claude Code decides whether to invoke them.

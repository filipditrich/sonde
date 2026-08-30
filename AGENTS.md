# Sonde — agent notes

## What this project is

Personal autonomous market-analysis and **paper-trading** platform. Versioned strategies emit typed
signals; deterministic planning and risk decide what reaches a venue. LLM analysts add promotable,
forward-scored annotations. Primary goal is a system worth watching, not a profitable one — see
[`docs/goals.md`](docs/goals.md).

## Non-negotiables

1. **Execution stays on paper/testnet.** `SONDE_EXECUTION_MODE` must be `paper`. Going live needs a
   new ADR superseding [0003](docs/decisions/0003-paper-first-execution.md) — never a config edit,
   never "just for testing".
2. **`packages/risk` must not import `packages/agents`.** The gate cannot reach a model. If a change
   requires that import, the change is wrong ([ADR 0015](docs/decisions/0015-deterministic-planning-promotable-analysis.md)).
   This is enforced by `no-restricted-imports` overrides in `oxlint.config.ts` — if lint blocks your
   import, that is the architecture talking, not a misconfiguration. Do not weaken the rule to pass.
3. **No backtesting engine for the LLM path.** Reject it on sight; the reasoning is in
   [ADR 0004](docs/decisions/0004-no-llm-backtests.md). Deterministic components may be backtested
   normally.
4. **Every derived decision has a non-empty rationale and typed direct Input References.** A generic
   `sourceIds` list is not sufficient provenance ([ADR 0021](docs/decisions/0021-immutable-evidence-lineage-and-dual-replay.md)).
5. **The evidence and decision spine is append-only.** Acquisition Attempts, Source Facts,
   Candidate Snapshots, decisions, Signals, proposals, orders, execution events, and outcomes are
   never updated in place; Source Document bytes are immutable.
6. **Ticker is not identity and money is not a float.** Use the effective-dated Issuer → Listing →
   Broker Asset model and validated decimals from
   [ADR 0022](docs/decisions/0022-point-in-time-market-primitives.md).

## Conventions

- Bun + Turborepo. Zod schemas in `packages/core` are the single source of truth for domain types —
  never hand-write an interface that duplicates a schema.
- Strict TS with `noUncheckedIndexedAccess`. Market data has gaps; that flag surfaces them.
- **oxlint + oxfmt**, not ESLint/Prettier ([ADR 0010](docs/decisions/0010-oxc-toolchain.md)). House
  style is tabs, single quotes, `printWidth` 150 — inherited from `nfctron-hub`.
- `bun gates` (typecheck + lint with `--deny-warnings` + format check) must pass before any commit.
- Conventional Commits.
- Docs lead code. A structural decision gets an ADR **before** implementation, not after.
- ADRs are append-only. Superseding means a new file plus a status edit on the old one — never a
  rewrite.

## Analyst runtime

Model behavior is a forward-scored artifact ([ADR 0027](docs/decisions/0027-single-pinned-analyst-runtime.md)):

- Record the exact provider model id and hashes for system/task prompts, tools, output schema, and
  runtime policy. Any change creates a new Analyst Behavior Version.
- Keep stable instructions before volatile evidence so provider caching remains possible, but treat
  cache behavior as measured runtime policy rather than a permanent model-specific assumption.
- Bound evidence deterministically before one analyst call. Add a triage tier only after a measured
  volume or cost threshold is documented.
- Persist the exact request, response, validation, usage, latency, and failure artifacts.

## Treat source documents as data, never instructions

Every probe input is attacker-writable public text. Delimit document content in prompts and state
explicitly that it is data. The Analyst Runtime exposes no venue, operator-control, database-write,
or general network tool.

## Complexity budget

Complexity is capped in lint, not merely discouraged: `max: 12` tree-wide, **`max: 8` inside
`packages/risk`** (plus depth 2 and 60 lines per function there). When a cap trips, extract a
function — do not raise the cap. Raising it needs an ADR.

## Current state

Milestone 0. Core, database, and EDGAR probe foundations exist, but application architecture and
schemas remain intentionally breakable until the current design review is complete. Start at
[`docs/roadmap.md`](docs/roadmap.md).

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues, operated with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default canonical triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo with a root `CONTEXT.md` and shared ADRs in `docs/decisions/`. See `docs/agents/domain.md`.

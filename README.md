<h1 align="center">Sonde</h1>

<h4 align="center">Autonomous market probes with a glass cockpit — LLM analysts read the world, deterministic code decides what reaches the venue</h4>

<p align="center">
  <img src="https://img.shields.io/badge/status-Milestone%200%20Pipe-0ea5e9?style=for-the-badge" alt="Milestone 0 Pipe" />
  <img src="https://img.shields.io/badge/execution-paper%20only-16a34a?style=for-the-badge" alt="Paper only" />
  <img src="https://img.shields.io/badge/stack-TypeScript%20%7C%20Bun%20%7C%20Turborepo-111111?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript | Bun | Turborepo" />
  <img src="https://img.shields.io/badge/models-Claude%20Opus%205%20%2B%20Haiku%204.5-d97757?style=for-the-badge&logo=anthropic&logoColor=white" alt="Claude Opus 5 + Haiku 4.5" />
  <img src="https://img.shields.io/badge/lint-oxlint%20%2B%20oxfmt-c96198?style=for-the-badge" alt="oxlint + oxfmt" />
  <img src="https://img.shields.io/badge/license-MIT-111111?style=for-the-badge" alt="MIT" />
</p>

<p align="center">
  <a href="#what-it-is">What it is</a> ·
  <a href="#the-constraint-that-shapes-everything">The constraint</a> ·
  <a href="#architecture-at-a-glance">Architecture</a> ·
  <a href="#what-it-costs">Cost</a> ·
  <a href="#status">Status</a> ·
  <a href="#getting-started">Getting started</a> ·
  <a href="#documentation">Documentation</a> ·
  <a href="#disclaimer">Disclaimer</a>
</p>

## What it is

Sonde watches public data sources, forms opinions about markets, and paper-trades on them — with
every step of its reasoning recorded and inspectable.

A **sonde** is an instrument you send into an environment to sample it and telemeter readings back.
That is the whole design: probes go out, readings come home, and you watch the picture assemble.

Four planes, one hard boundary:

- **Probes** collect prices, news, filings, and on-chain data. They normalize and timestamp. They never interpret.
- **Analysts** (Claude) turn unstructured text into typed signals — direction, confidence, horizon, and _why_, with links to every source document.
- **A portfolio agent** weighs open signals against current positions and proposes orders.
- **A risk gate** — plain deterministic TypeScript, no model anywhere near it — decides whether any of that reaches a venue.

Everything above the gate is advisory. Everything below it is code you can read in an afternoon.

```
probes ──▶ analysts ──▶ portfolio agent ──▶ │ RISK GATE │ ──▶ venue (paper)
                                            │  no model │
   collect          advisory                └───────────┘         enforced
```

The reasoning trail is the product. If you cannot watch it think, it is not finished.

## The constraint that shapes everything

**You cannot backtest an LLM trader.**

The model was trained on text covering the period you would test over. Asked to analyse a headline
from inside its training window, it is not reasoning forward — it is drawing on a corpus that
contains the outcome. The backtest comes out beautiful and measures memory.

This is a named problem in the literature, not a hunch. Input-side hygiene — survivorship,
point-in-time correctness, pipeline leakage — is well covered by existing frameworks, but
[none of it addresses the bias living in the model's weights](https://arxiv.org/pdf/2601.13770).

So Sonde does not backtest. It **forward-tests**: every signal is scored against what actually
happened at its stated horizon, prospectively, and sources and analysts accumulate real track
records. Slower, and the numbers mean something.

That single decision reorders the whole project — scoring infrastructure gets built _before_ order
execution, because measuring before acting is the only way this stays honest.
[ADR 0004](docs/decisions/0004-no-llm-backtests.md) has the full reasoning.

## Architecture at a glance

| Plane        | Package           | Responsibility                                       |
| ------------ | ----------------- | ---------------------------------------------------- |
| Collection   | `packages/probes` | Fetch, normalize, deduplicate, timestamp             |
| Reasoning    | `packages/agents` | Documents → typed signals with rationale and sources |
| Enforcement  | `packages/risk`   | Deterministic limits, kill switch, dead-man's switch |
| Execution    | `packages/venue`  | CCXT adapter, idempotency keys, reconciliation       |
| Presentation | `apps/web`        | Live tape, trade detail, scoreboard, cost            |

`packages/risk` has no dependency on `packages/agents`. The gate cannot import a model, so it cannot
be talked into anything — enforced by the dependency graph, not by discipline.

Full detail: [`docs/architecture.md`](docs/architecture.md).

## What it costs

Venue fees are zero by construction — paper and testnet accounts. **Inference is the only recurring
cost**, which makes it the thing worth designing around.

| Model            | Input / 1M | Output / 1M | Role                       |
| ---------------- | ---------- | ----------- | -------------------------- |
| Claude Haiku 4.5 | $1         | $5          | Triage, batched            |
| Claude Opus 5    | $5         | $25         | Deep read, order proposals |

Budget: **under $30/month**, held by three levers — event-driven cadence instead of polling, tiered
escalation so the expensive model only sees what survives triage, and prompt caching with the stable
prefix cached at ~0.1× input price.

> One trap worth knowing: minimum cacheable prefixes are **not** monotonic — 512 tokens on Opus 5
> but **4096** on Haiku 4.5. A short triage prompt on the cheap model silently caches nothing, with
> no error raised. Batching clears the floor.

## Status

Milestone 0. Docs first, deliberately — the decisions below were the hard part.

| Milestone        | Goal                                       | State       |
| ---------------- | ------------------------------------------ | ----------- |
| 0 · Pipe         | Data flows end to end, no intelligence     | In progress |
| 1 · Ears         | Unstructured sources with clean provenance | Planned     |
| 2 · Opinion      | First analyst, signals with reasoning      | Planned     |
| 3 · Scorekeeping | Resolve signals against reality            | Planned     |
| 4 · Gate         | Risk limits, tested adversarially          | Planned     |
| 5 · Hands        | Paper trading, end to end                  | Planned     |
| 6 · Watch        | Replay, cost dashboard, alerting           | Planned     |
| 7 · Iterate      | Prompt versioning, shadow analysts         | Planned     |

Exit criteria for each: [`docs/roadmap.md`](docs/roadmap.md).

## Getting started

```bash
bun install
cp .env.example .env    # add ANTHROPIC_API_KEY and a Postgres URL
bun dev
```

`SONDE_EXECUTION_MODE` must be `paper`. The venue adapter refuses to construct in any other mode,
and changing that is not a config edit — it needs a new ADR
([0003](docs/decisions/0003-paper-first-execution.md)).

## Documentation

Docs are the source of truth; code implements against them.

| Doc                                            | What's in it                                          |
| ---------------------------------------------- | ----------------------------------------------------- |
| [`docs/goals.md`](docs/goals.md)               | What this is for, what it is explicitly not for       |
| [`docs/architecture.md`](docs/architecture.md) | Planes, dataflow, storage, cost model                 |
| [`docs/roadmap.md`](docs/roadmap.md)           | Milestones with observable exit criteria              |
| [`docs/glossary.md`](docs/glossary.md)         | Trading terms, written for people who don't trade     |
| [`docs/decisions/`](docs/decisions)            | 9 ADRs — the reasoning behind every structural choice |

**Start with [ADR 0004](docs/decisions/0004-no-llm-backtests.md).** The milestone ordering, the
storage schema, and the scoring apparatus all follow from it.

## Why it's built this way

A few decisions that were genuinely contested:

- **[0003](docs/decisions/0003-paper-first-execution.md) — paper only, and going live is an ADR, not a flag.** The usual failure isn't dramatic; it's a boolean that gets flipped while debugging and never flipped back.
- **[0005](docs/decisions/0005-llm-proposes-code-disposes.md) — the model can't reach the venue.** Its entire input surface is attacker-writable public text. Anyone who can publish a page Sonde reads can attempt prompt injection. A successful one should produce a rejected proposal and a log entry, not a trade.
- **[0006](docs/decisions/0006-event-driven-cadence.md) — wake on events, not on a timer.** A timer manufactures decision points, and a model asked "should I trade?" every 15 minutes will sometimes say yes for no better reason than having been asked.
- **[0008](docs/decisions/0008-append-only-signal-log.md) — signals are append-only, with mandatory provenance.** Without backtesting, the forward record is the entire evidence base. If it can be edited, there's nothing to stand on.

## Contributing

Personal project, but the docs are meant to be readable and issues are welcome. Conventional
Commits. Decisions go in ADRs before code, not after.

```bash
bun gates    # typecheck + lint (--deny-warnings) + format check
```

Linting is [oxlint + oxfmt](docs/decisions/0010-oxc-toolchain.md). The architectural boundaries are
lint rules rather than prose — `packages/risk` importing a model is a build error that cites the ADR
it violates. If lint blocks an import, that is the architecture talking; don't weaken the rule.

## Disclaimer

Sonde is a personal engineering project, built to be interesting to operate rather than profitable —
that ordering is [stated explicitly](docs/goals.md) and it shapes every design decision here.

It executes against paper and testnet accounts only. Nothing in this repository is financial or
investment advice, no output of this system is a recommendation, and no performance claim is made or
implied. Retail systematic trading is negative-sum after costs. If you fork this and point it at
real money, that is entirely your own call, and you should assume you will lose it.

## License

MIT © [Filip Ditrich](https://ditrich.me)

<h1 align="center">Sonde</h1>

<h4 align="center">Point-in-time market evidence, deterministic paper trading, and a glass cockpit</h4>

<p align="center">
  <img src="https://img.shields.io/badge/status-Milestone%200%20Pipe-0ea5e9?style=for-the-badge" alt="Milestone 0 Pipe" />
  <img src="https://img.shields.io/badge/execution-Alpaca%20paper%20only-16a34a?style=for-the-badge" alt="Alpaca paper only" />
  <img src="https://img.shields.io/badge/market-US%20common%20equities-334155?style=for-the-badge" alt="US common equities" />
  <img src="https://img.shields.io/badge/stack-TypeScript%20%7C%20Bun%20%7C%20Postgres-111111?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript | Bun | Postgres" />
  <img src="https://img.shields.io/badge/lint-oxlint%20%2B%20oxfmt-c96198?style=for-the-badge" alt="oxlint + oxfmt" />
</p>

Sonde watches point-in-time public information, forms deterministic market claims, paper-trades the
eligible ones, and records enough evidence to explain every action and non-action afterwards.

A _sonde_ is an instrument sent into an environment to sample it and telemeter readings back. That
is the product: public-source probes go out, typed evidence comes home, and a private operations
cockpit shows what the system knew, decided, executed, rejected, and learned.

The primary goal is a system worth operating and watching, not a performance claim.

## Strategy V1

The launch strategy trades one measured pattern:

- US-listed common equities, long only;
- median 20-session dollar volume above $20m;
- at least two distinct Section 16 reporting owners making Form 4 code-`P` purchases in the same
  Issuer and Decision Window;
- one final Signal at 09:20 ET for the next regular-session open;
- canonical outcome at the close twenty subsequent sessions later.

The founding out-of-sample cohort returned a +1.83% median with a 58.3% win rate, against +0.10% and
50.4% for liquid stocks on the same dates. Sonde treats those numbers as a labelled Bootstrap Prior,
not event confidence and not proof of an edge. Live forward Signals are scored regardless of whether
the paper system traded them.

Full rules: [`docs/strategy/charter.md`](docs/strategy/charter.md).

## Architecture at a glance

```text
EDGAR + SIP
    │
    ▼
Acquisition → Source Documents → Source Facts → Candidate Snapshots
                                                   │
                                                   ▼ 09:20 ET
                                Eligibility → Signal + Decision Packet
                                                   │
                                                   ▼
                         Data Readiness → Portfolio Planner → Proposal
                                                                  │
                                                                  ▼
                                               deterministic Risk Gate
                                                                  │
                                                                  ▼
                                                        Alpaca paper only
```

Every authoritative artifact is immutable or append-only. Ticker is not identity, money is not a
float, and a Decision Packet freezes the exact state used at each cutoff.

The model is not in the launch path. Milestone 6 adds one pinned Analyst Runtime that annotates
existing candidates and is forward-scored separately. A model never creates an Order Proposal,
imports into `packages/risk`, or reaches a venue. Any later influence is operator-promoted,
capability-specific, and initially limited to vetoing or reducing the deterministic baseline.

Full detail: [`docs/architecture.md`](docs/architecture.md).

## What the cockpit shows

The private cockpit is operations-first:

- current state and Data Readiness;
- market clock and next scheduled action;
- durable alerts and Telegram escalation;
- candidate funnel and live decision tape;
- positions, exposure, and auction execution;
- Strategy, Execution, and Realism Scorecards;
- forensic and reconstruction replay;
- a structured read-only Event Console with audited Operator Commands.

It has no shell and no discretionary order ticket.

## Honest measurement

Sonde keeps three truths separate:

1. **Signal Outcome** — the strategy's canonical open-to-horizon-close result.
2. **Execution Outcome** — what Alpaca paper actually filled and held.
3. **Realism Outcome** — a versioned estimate of effects the paper broker omits.

Every final Signal enters the Strategy Scorecard, including blocked, unexecuted, already-held, and
operationally unready cases. The primary metric is median excess return against the date-matched
point-in-time eligible universe.

LLM behavior is never backtested. Model weights may contain the historical outcome, so prompt and
model changes are evaluated only in sealed forward epochs. See
[ADR 0004](docs/decisions/0004-no-llm-backtests.md).

## Safety and scope

- `SONDE_EXECUTION_MODE` must be `paper`; real capital requires a new ADR superseding
  [0003](docs/decisions/0003-paper-first-execution.md).
- Strategy V1 supports US-listed common equities only.
- Sonde operates cash-like: no borrowing, shorts, options, futures, leverage, stops, or discretionary
  orders.
- New entries require `Active` state and passing decision-specific Data Readiness.
- Paused, Degraded, Halted, and Recovering states continue exits, cancellations, and reconciliation.
- The cockpit is authenticated even on loopback and is never directly public.

## Status

Milestone 0 now has a durable evidence spine, an ordinary-lane engine, and a loopback cockpit. The
exit is still observational: a live filing cluster on screen, counts that match storage, and stale
collection visibly different from a quiet source.

| Milestone         | Goal                                         | State       |
| ----------------- | -------------------------------------------- | ----------- |
| 0 · Pipe          | Immutable EDGAR + SIP evidence, visible      | In progress |
| 1 · Signal        | Deterministic Signals and Decision Packets   | Planned     |
| 2 · Scorekeeping  | Point-in-time outcomes and benchmarks        | Planned     |
| 3 · Gate          | Planner, readiness, risk, operational states | Planned     |
| 4 · Hands         | Auction-aligned Alpaca paper execution       | Planned     |
| 5 · Watch         | Replay, scorecards, alerts, forensics        | Planned     |
| 6 · Corroboration | One pinned analyst, scored separately        | Planned     |
| 7 · Iterate       | Sealed epochs and bounded promotion          | Planned     |

Observable exit criteria: [`docs/roadmap.md`](docs/roadmap.md).

## Getting started

```bash
bun install
cp .env.example .env
docker compose up -d
bun --cwd packages/db db:migrate
bun gates
bun --cwd apps/engine start
bun --cwd apps/web start
```

Open `http://127.0.0.1:3000/login`. Milestone 0 needs Postgres, `SONDE_CONTACT_EMAIL`,
`SONDE_OPERATOR_TOKEN`, and Alpaca paper/data credentials for calendar and SIP. A model key is not
required until Milestone 6. The cockpit may use `postgres://sonde_web:sonde_web@localhost:5432/sonde`.

## Documentation

| Document                                       | Purpose                                                |
| ---------------------------------------------- | ------------------------------------------------------ |
| [`docs/overview.md`](docs/overview.md)         | The whole intended system in one read                  |
| [`docs/goals.md`](docs/goals.md)               | Goals, non-goals, and success criteria                 |
| [`docs/architecture.md`](docs/architecture.md) | Planes, deep module seams, ledger, runtime, deployment |
| [`CONTEXT.md`](CONTEXT.md)                     | Canonical domain language                              |
| [`docs/strategy/`](docs/strategy)              | Measured strategy and end-to-end walkthrough           |
| [`docs/specs/`](docs/specs)                    | Implementation contracts                               |
| [`docs/roadmap.md`](docs/roadmap.md)           | Milestones with observable exit criteria               |
| [`docs/decisions/`](docs/decisions)            | Append-only architectural decisions                    |

Start with the [overview](docs/overview.md), then read [ADR 0004](docs/decisions/0004-no-llm-backtests.md)
and the [Strategy V1 charter](docs/strategy/charter.md).

## Contributing

This is a personal project, but issues are welcome. Docs lead code, structural decisions get ADRs,
and commits follow Conventional Commits.

```bash
bun gates
```

## Disclaimer

Sonde is a personal engineering project. It paper-trades simulated funds only. Nothing in this
repository is financial or investment advice, no output is a recommendation, and no performance
claim is made or implied.

## License

MIT © [Filip Ditrich](https://ditrich.me)

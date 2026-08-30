# Architecture decision records

ADRs in [Michael Nygard's format](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).
Numbered, append-only, never rewritten. Each records a decision that was genuinely contested — if
there was no real alternative, it does not need an ADR.

## Index

| #                                                             | Decision                                                   | Status     |
| ------------------------------------------------------------- | ---------------------------------------------------------- | ---------- |
| [0001](./0001-typescript-monorepo-turborepo-bun.md)           | TypeScript monorepo on Turborepo + Bun                     | Accepted   |
| [0002](./0002-crypto-first-ccxt.md)                           | Crypto venues first, CCXT as the venue abstraction         | Superseded |
| [0003](./0003-paper-first-execution.md)                       | Paper/testnet only, until an explicit live gate            | Accepted   |
| [0004](./0004-no-llm-backtests.md)                            | No LLM backtests — forward-testing only                    | Accepted   |
| [0005](./0005-llm-proposes-code-disposes.md)                  | The LLM proposes, deterministic code disposes              | Superseded |
| [0006](./0006-event-driven-cadence.md)                        | Event-driven decision cadence, not polling                 | Superseded |
| [0007](./0007-tiered-model-routing.md)                        | Tiered model routing with prompt caching                   | Superseded |
| [0008](./0008-append-only-signal-log.md)                      | Append-only signal log, reasoning as first-class           | Superseded |
| [0009](./0009-venue-is-source-of-truth.md)                    | Venue is source of truth; local state is a cache           | Accepted   |
| [0010](./0010-oxc-toolchain.md)                               | oxlint + oxfmt, with boundaries as lint rules              | Accepted   |
| [0011](./0011-source-acquisition-policy.md)                   | Source acquisition policy — tiers, no adversarial scraping | Accepted   |
| [0012](./0012-equity-signals-without-equity-execution.md)     | Equity signals without equity execution                    | Superseded |
| [0013](./0013-private-dashboard-public-repo.md)               | Dashboard private; only derived artifacts public           | Accepted   |
| [0014](./0014-equities-and-commodity-etfs-primary.md)         | US equities + commodity ETFs primary; crypto is a testbed  | Superseded |
| [0015](./0015-deterministic-planning-promotable-analysis.md)  | Deterministic planning with promotable analyst influence   | Accepted   |
| [0016](./0016-curated-origins-bounded-research.md)            | Curated sources originate; bounded research enriches       | Accepted   |
| [0017](./0017-audited-operator-control-plane.md)              | Separate audited operator control plane                    | Accepted   |
| [0018](./0018-scheduled-work-priority-market-actions.md)      | Scheduled work with a priority market-action lane          | Accepted   |
| [0019](./0019-operational-states-fail-closed.md)              | Operational states fail closed for entry                   | Accepted   |
| [0020](./0020-strategy-v1-common-equities-only.md)            | Strategy V1 trades US-listed common equities only          | Accepted   |
| [0021](./0021-immutable-evidence-lineage-and-dual-replay.md)  | Immutable evidence lineage and dual replay                 | Accepted   |
| [0022](./0022-point-in-time-market-primitives.md)             | Point-in-time market primitives                            | Accepted   |
| [0023](./0023-decision-specific-data-readiness.md)            | Decision-specific Data Readiness precedes planning         | Accepted   |
| [0024](./0024-auction-aligned-paper-execution.md)             | Auction-aligned paper execution                            | Accepted   |
| [0025](./0025-authoritative-market-data-and-paper-realism.md) | Authoritative market data and paper realism                | Accepted   |
| [0026](./0026-separated-scorecards-and-forward-promotion.md)  | Separated scorecards and forward promotion                 | Accepted   |
| [0027](./0027-single-pinned-analyst-runtime.md)               | One pinned analyst runtime before tiered routing           | Accepted   |
| [0028](./0028-operations-first-private-cockpit.md)            | Operations-first private cockpit                           | Accepted   |
| [0029](./0029-simple-local-operations.md)                     | Simple local operations for the personal system            | Accepted   |

If you read only one, read [0004](./0004-no-llm-backtests.md) — the milestone ordering, the storage
schema, and the scoring apparatus all follow from it.

## Superseding

Decisions change. When one does:

1. Write a new ADR with the next number.
2. Set its `Status` to `Accepted (supersedes NNNN)`.
3. Edit the old ADR's `Status` to `Superseded by NNNN`.
4. **Never rewrite the body of a superseded ADR.** The record of what was believed, and why, is the
   point.

## Open questions

Not yet decided, listed so they are not mistaken for oversights:

- The exact single-user authentication mechanism used when remote access is implemented
- The measured bar-volume or query-latency threshold that would justify revisiting plain Postgres

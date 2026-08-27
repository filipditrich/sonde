# Architecture decision records

ADRs in [Michael Nygard's format](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).
Numbered, append-only, never rewritten. Each records a decision that was genuinely contested — if
there was no real alternative, it does not need an ADR.

## Index

| #                                                   | Decision                                           | Status   |
| --------------------------------------------------- | -------------------------------------------------- | -------- |
| [0001](./0001-typescript-monorepo-turborepo-bun.md) | TypeScript monorepo on Turborepo + Bun             | Accepted |
| [0002](./0002-crypto-first-ccxt.md)                 | Crypto venues first, CCXT as the venue abstraction | Accepted |
| [0003](./0003-paper-first-execution.md)             | Paper/testnet only, until an explicit live gate    | Accepted |
| [0004](./0004-no-llm-backtests.md)                  | No LLM backtests — forward-testing only            | Accepted |
| [0005](./0005-llm-proposes-code-disposes.md)        | The LLM proposes, deterministic code disposes      | Accepted |
| [0006](./0006-event-driven-cadence.md)              | Event-driven decision cadence, not polling         | Accepted |
| [0007](./0007-tiered-model-routing.md)              | Tiered model routing with prompt caching           | Accepted |
| [0008](./0008-append-only-signal-log.md)            | Append-only signal log, reasoning as first-class   | Accepted |
| [0009](./0009-venue-is-source-of-truth.md)          | Venue is source of truth; local state is a cache   | Accepted |
| [0010](./0010-oxc-toolchain.md)                     | oxlint + oxfmt, with boundaries as lint rules      | Accepted |

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

- Deployment target and process supervision for `apps/engine`
- Whether TimescaleDB is warranted, and at what bar volume
- Alert transport (Telegram vs Slack vs both)
- Whether a Sonnet middle tier earns its complexity — deferred until the scoreboard can answer it
- Position sizing method (fixed fraction vs confidence-weighted) — needs calibration data from
  Milestone 3 first

# 0020: Strategy V1 and the initial application support common equities only

## Status

Accepted (supersedes 0002 and 0014, 2026-08-29)

## Context

ADR 0002 chose crypto as an accessible plumbing testbed before Sonde had a strategy. ADR 0014 pivoted the primary market to US equities and commodity ETFs but retained crypto for plumbing. Strategy V1 is now specifically an insider-purchase strategy: commodity ETFs cannot form its candidates, and crypto contributes neither evidence nor execution behavior to the initial trading loop. Keeping either in active scope would add probes, adapters, market semantics, and UI states with no path to a Strategy V1 position.

## Decision

1. Strategy V1 and the initial Sonde application support US-listed common equities only.
2. The active universe is rule-derived and requires the Strategy V1 liquidity threshold; instrument eligibility is evaluated separately from instrument identity.
3. Alpaca paper is the only initial broker and execution adapter. ADR 0003's paper-only boundary is unchanged.
4. Commodity ETFs are outside the active universe until a separately evidenced strategy gives them an entry path.
5. Crypto is not an initial probe, plumbing testbed, market-data dependency, or execution target.
6. `packages/venue` exposes a Sonde-shaped boundary so later brokers or instrument classes remain possible, but no generic multi-venue framework or unused adapter is built now.
7. Adding another instrument class or active market requires its own strategy evidence and a scope decision; it is not a configuration-only change.

## Consequences

- The initial system has one market calendar, one broker, one position model, and one active instrument class.
- CCXT and crypto-specific runtime assumptions leave the active architecture and roadmap.
- Commodity and crypto research remain historical context rather than implementation commitments.
- Finishing the complete evidence-to-paper-execution loop takes priority over demonstrating abstraction breadth.

## References

- [ADR 0002](./0002-crypto-first-ccxt.md)
- [ADR 0003](./0003-paper-first-execution.md)
- [ADR 0014](./0014-equities-and-commodity-etfs-primary.md)
- [ADR 0015](./0015-deterministic-planning-promotable-analysis.md)

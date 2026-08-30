# 0025: Authoritative market data and paper realism

## Status

Accepted (extends 0009, 2026-08-29)

## Context

The founding study used Alpaca's consolidated SIP daily bars. Free real-time Alpaca access is limited to IEX, whose trades and volume cover only one venue and cannot silently replace SIP without changing the liquidity universe and measured strategy. Real-time consolidated data is unnecessary for a strategy whose decisions use completed daily bars and market auctions.

Alpaca paper fills are broker truth for the simulated account, but the simulator omits effects including market impact, latency slippage, queue position, price improvement, regulatory fees, and dividends. Treating raw paper P&L as realistic would overstate what Sonde has learned; replacing it with Sonde's own synthetic fills would discard valuable broker behavior.

## Decision

1. Consolidated SIP daily bars are authoritative for universe eligibility, prior-close sizing inputs, canonical Signal Outcomes, and market-data-derived readiness checks.
2. Sonde initially uses SIP data after the provider's recent-data delay rather than purchasing real-time SIP. Startup and readiness checks verify the actual account entitlement. Unavailable SIP data fails closed and cannot silently fall back to IEX.
3. Real-time IEX data may appear in the cockpit only as a clearly labelled operational indication. It cannot determine eligibility, canonical outcomes, or claims of consolidated market state.
4. Broker-reported orders, fills, positions, and account state produce the immutable Execution Outcome. Sonde never adjusts or replaces those records to make the simulator look more realistic.
5. Sonde may calculate a separate, versioned Realism Outcome estimating spread, latency slippage, market impact, fees, dividends, and other omitted effects. Its method and input references are explicit; it never rewrites the Execution Outcome or Signal Outcome.
6. Broker trade-update streaming supplies immediate cockpit events. REST reconciliation remains authoritative and runs at startup, before market actions, after ambiguous requests, after auctions, and periodically.
7. Stream events, REST observations, and reconciliation comparisons are appended. Recovery is query-first: an ambiguous submission is looked up by deterministic client order identity before any retry.

## Consequences

- The initial cockpit can feel live without a real-time SIP subscription, but every quote surface must identify its feed and limitations.
- Daily strategy behavior remains comparable with the founding SIP-based study.
- Data entitlement is a tested runtime contract and a Data Readiness input, not an undocumented account assumption.
- Scoreboards show canonical strategy performance, raw paper execution, and estimated realism as separate series.
- Streaming improves immediacy but cannot become a second source of broker truth.

## References

- [ADR 0009](./0009-venue-is-source-of-truth.md)
- [ADR 0019](./0019-operational-states-fail-closed.md)
- [ADR 0021](./0021-immutable-evidence-lineage-and-dual-replay.md)
- [ADR 0022](./0022-point-in-time-market-primitives.md)
- [ADR 0024](./0024-auction-aligned-paper-execution.md)
- [Alpaca market-data FAQ](https://docs.alpaca.markets/us/docs/market-data-faq)
- [Alpaca paper-trading specification](https://docs.alpaca.markets/us/docs/paper-trading)

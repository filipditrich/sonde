# 0022: Point-in-time market primitives

## Status

Accepted (2026-08-29)

## Context

The founding schemas identify an instrument as a type-prefixed ticker, give observations a generic `occurredAt`, and allow probe parsing to pass through JavaScript numbers. Those conveniences are unsafe for a point-in-time equity system: tickers change and can be reused, an SEC filing has several distinct clocks, and binary floating point cannot authoritatively represent prices, quantities, or money.

The canonical Signal Outcome also needs to survive splits, mergers, delistings, and missing data without silently excluding inconvenient cases or substituting the last price.

## Decision

1. SEC CIK canonically identifies an Issuer for Strategy V1. An effective-dated Listing identifies a tradable security associated with that Issuer. A separate effective-dated Broker Asset maps the Listing to an execution adapter's identifier.
2. Ticker symbols are effective-dated attributes of Listings, never durable identities. Instrument eligibility is a dated policy result, not a property baked into identity.
3. Artifacts retain domain-specific Source Clocks, including SEC acceptance time, transaction date, publication time, and market-session boundaries where applicable. They also retain `observedAt`, when Sonde first had the information, and `recordedAt`, when it was durably stored. A generic `occurredAt` cannot substitute for those meanings.
4. Decision Windows and Market Horizons resolve through the versioned market calendar captured by the Decision Packet, not through elapsed durations or hard-coded exchange hours.
5. Authoritative prices, quantities, money, ratios, and returns use validated decimal strings or scaled integers in domain boundaries and database decimals in storage. JavaScript numbers are limited to explicitly non-authoritative display or statistical calculations.
6. Signal Outcomes use a documented total-return and corporate-action method where the required data exists. If it does not, Sonde writes an explicit Unresolvable Outcome with a reason and keeps it visible in denominators and quality reporting. It never silently drops the Signal or substitutes the last available price.
7. Execution Outcomes remain separate broker truth. Forced broker or corporate-action closures do not redefine the canonical Signal Outcome.

## Consequences

- The current ticker-shaped `AssetId`, two-clock Observation envelope, and numeric Form 4 parser are intentionally breaking migration targets before application implementation begins.
- Joins take more work than string matching, but historical filings, renamed listings, broker symbols, and market data remain attributable to the correct issuer and security.
- Source schemas become more explicit because each timestamp says what it means.
- Outcome reporting must expose unresolvable cases and data-quality reasons alongside resolved returns.

## References

- [ADR 0004](./0004-no-llm-backtests.md)
- [ADR 0020](./0020-strategy-v1-common-equities-only.md)
- [ADR 0021](./0021-immutable-evidence-lineage-and-dual-replay.md)
- [`docs/strategy/charter.md`](../strategy/charter.md)

# 0002: Crypto venues first, CCXT as the venue abstraction

## Status

Superseded by [0020](./0020-strategy-v1-common-equities-only.md) (2026-08-29). ADR 0014 first demoted crypto to a plumbing testbed; 0020 removes crypto and CCXT from the initial application entirely while preserving a Sonde-shaped venue boundary.

## Context

Sonde needs a market to operate in. The operator is EU-based (Czechia), which shapes what is
actually reachable.

Options considered:

1. **Crypto exchanges** (Kraken, Coinbase, Bitstamp, Binance — all with MiCA-regulated EU entities).
   Pure REST/WebSocket APIs, free and complete historical OHLCV, real testnets, 24/7 markets, and no
   desktop process in the loop.
2. **Interactive Brokers.** The realistic route to equities, options, and futures for EU retail.
   Real paper account. But the API historically requires a running TWS or IB Gateway desktop
   application, babysat in Docker with auto-login and a daily restart, and the good Python/TS
   ergonomics come from community libraries rather than IBKR.
3. **Saxo Bank.** Proper OpenAPI, EU-regulated, free simulation environment, higher fees.
4. **Trading212 / Degiro / Revolut / XTB.** Popular locally, no meaningful trading API. Not viable.

Forces:

- Milestone 0 must be reachable in a weekend. A venue that needs a supervised desktop process is not.
- 24/7 markets give a much tighter feedback loop than 8-hour equity sessions, which matters when the
  primary goal is something interesting to watch.
- Free, complete historical data removes an entire class of cost and licensing problems.
- Committing to one exchange's SDK would be a trap; the venue choice should be reversible.

## Decision

1. **Crypto first.** Kraken or Binance testnet as the initial venue.
2. **CCXT is the venue abstraction.** All venue access goes through `packages/venue`, which wraps
   CCXT. No exchange SDK is imported anywhere else in the tree.
3. **`packages/venue` exposes a Sonde-shaped interface, not a CCXT-shaped one.** CCXT types do not
   leak into `packages/core`. If CCXT is ever replaced, the blast radius is one package.
4. Equities via IBKR are explicitly deferred, not rejected. The abstraction is designed to accept a
   non-CCXT adapter later.

## Consequences

- Crypto markets are more volatile and considerably more manipulated than equities. Signal quality
  expectations should be set accordingly, and the scoreboard (Milestone 3) is what settles it.
- 24/7 operation means there is no overnight window for maintenance. The engine must tolerate
  restarts at any time — which forces the reconciliation discipline in
  [ADR 0009](./0009-venue-is-source-of-truth.md) early, which is good.
- CCXT normalizes away some venue-specific features. Acceptable at this scope; if a specific venue
  capability is ever needed, the adapter can drop to the raw client behind the same interface.
- Adding IBKR later is an adapter, not a rewrite.

## Milestones touched

- Milestone 0 (Pipe)
- Milestone 5 (Hands)

## References

- [`docs/architecture.md`](../architecture.md)
- [ADR 0003](./0003-paper-first-execution.md)

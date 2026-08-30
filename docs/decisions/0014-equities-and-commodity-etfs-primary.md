# 0014: US equities and commodity ETFs as the primary market

## Status

Superseded by [0020](./0020-strategy-v1-common-equities-only.md) (2026-08-29). US common equities remain the Strategy V1 market; 0020 removes commodity ETFs and the crypto plumbing testbed from the initial application.

## Context

[ADR 0002](./0002-crypto-first-ccxt.md) chose crypto first, and the reasoning was entirely about
**access friction** — free APIs, real testnets, no desktop gateway, no market hours. It was never an
argument that crypto was the right market for the strategy, because at the time there was no
strategy.

There is one now ([`docs/strategy/`](../strategy)): trade when independent _classes_ of evidence
agree. Two findings since then say crypto is the wrong venue for it.

**Crypto gives no corroboration window.** Source research
([source-viability.md](../research/source-viability.md)) found Kraken's listing feed announces
listings _as they go live_ — "AVL is available for trading!" — not ahead of them. The venue class is
coincident, not leading. That is not a Kraken quirk; markets that never close have no gap between an
event and the price reaction. A corroboration strategy in a 24/7 market is always arriving after the
move.

**Equities close, so the window exists structurally.** An 8-K after the bell, a Form 4 filed
overnight, sentiment building through the small hours — none of it is tradeable until 09:30 ET.
Sonde gets hours to assemble a thesis before anyone can act on it. The strategy's central
requirement is a free consequence of market structure rather than something to be engineered.

**The evidence classes also improve.** `chain` has no equity analogue and is lost. In exchange,
equities carry mandated disclosure with no crypto equivalent: Form 4 insider transactions on a
two-business-day clock, 8-K material events, congressional disclosures. Free, official, timestamped.

**And it fixes an independence hole.** The trade walkthrough exposed that "Kraken lists AVL" and
"CoinDesk reports Kraken listed AVL" are one event clearing a two-class bar — derivative reporting
masquerading as corroboration. In equities the classes have genuinely different causal origins: a
CFO buying their own stock is not downstream of a journalist writing about the company.

Access, which drove the original decision, is now resolved: an Alpaca paper account works from
Czechia, free market data covers IEX real-time plus everything older than 15 minutes, and a strategy
holding hours to days does not need tick data.

## Decision

1. **Primary market: US equities and commodity ETFs.** Commodity exposure via ETFs (GLD, SLV, USO,
   DBA and similar), which trade as ordinary equities on the same broker, data feed, and plumbing.
   Futures are deferred indefinitely — contract rolls, expiry, and margin buy nothing here.
2. **Crypto is demoted to a plumbing testbed.** It stays useful for exactly one thing: exercising
   probes, storage, and the venue adapter against live data with no account and no market hours.
   It is not a strategy target and holds no positions.
3. **Alpaca Crypto is not used at all.** Its agreement is a separate entity with no SIPC or FDIC
   coverage and omnibus commingled wallets. The testbed runs on public exchange endpoints via CCXT,
   which need no account and take no custody.
4. **The evidence classes become `filing`, `editorial`, `attention`, and `macro`.** `chain` is
   retired. `macro` (FRED, rates, commodity curves) is genuinely exogenous and is the natural
   corroborator for commodity ETFs.
5. **Broker: Alpaca, paper only.** Live trading remains gated by
   [ADR 0003](./0003-paper-first-execution.md) and is unaffected by this decision. Live-account
   eligibility for a Czech resident is untested and does not need answering yet.
6. **Market data: the free tier.** IEX real-time plus 15-minute-delayed everything is adequate for
   hours-to-days holds. If a strategy ever needs full-depth real-time data, that is a signal the
   strategy drifted, not a signal to buy data.
7. **`packages/venue` keeps its shape.** CCXT becomes one adapter behind the interface rather than
   the interface itself; Alpaca becomes another. ADR 0002's abstraction survives intact — this is
   the reversal it was designed to absorb.

## Consequences

- **The engine idles most of the day.** Roughly 6.5 trading hours out of 24, five days a week. That
  is a rhythm rather than a problem: overnight accumulation is the mechanic, and the pre-open window
  becomes the most interesting moment of the day to watch.
- **Weekend and holiday gaps become real.** Bar series are discontinuous in a way crypto never was,
  and anything computing a rolling baseline has to handle that explicitly rather than assume evenly
  spaced samples.
- **Signal volume will be lower.** Fewer events than a 24/7 market, which lengthens the time to a
  statistically meaningful scoreboard. Accepted — the alternative was more signals with no window to
  act in.
- **ADR 0012 inverts.** It held that equity signals would be scored but never executed; equities are
  now the execution target and crypto is the thing that is never executed.
- **Penny stocks and OTC are deferred, not declined.** They are out of scope for now and wanted
  later. The open proposal is detection rather than participation — scoring predictions of
  manipulation without ever taking a position — and it needs its own ADR before any of it is built.
  Nothing here forecloses it: the universe is configuration, and a manipulation-detection scoreboard
  reuses the attention machinery the strategy already requires.
- The trade walkthrough needs rewriting around an overnight filing rather than a crypto listing.
  That rewrite is the test of whether the overnight-window argument survives contact with a concrete
  trace.

## Milestones touched

- Milestone 1 (Ears)
- Milestone 2 (Opinion)
- Milestone 5 (Hands)

## References

- [`docs/research/source-viability.md`](../research/source-viability.md) — the coincident-venue finding
- [`docs/strategy/anatomy-of-a-trade.md`](../strategy/anatomy-of-a-trade.md)
- [ADR 0002](./0002-crypto-first-ccxt.md), [ADR 0003](./0003-paper-first-execution.md), [ADR 0012](./0012-equity-signals-without-equity-execution.md)

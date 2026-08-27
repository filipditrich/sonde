# 0012: Equity signals without equity execution

## Status

Accepted (Milestone 3, 2026-08-27)

## Context

Two of the most promising structured sources are equities data, not crypto:

- **SEC Form 4** — directors, officers, and 10%+ shareholders must file within **2 business days**,
  and filings reach EDGAR's `getcurrent` feed within seconds of acceptance. Free, official, no key.
- **Congressional disclosures** — the STOCK Act requires members to disclose transactions within
  **45 days**. Public and free to follow; acting on published disclosures is not insider trading.

Sonde is crypto-first, and equities execution via Interactive Brokers was deferred to "Beyond"
([ADR 0002](./0002-crypto-first-ccxt.md)) because the IBKR gateway is a standing operational cost.

The naive readings are both wrong. Ignoring these sources discards the best-timed structured data
available for free. Adopting them by standing up IBKR takes on real operational burden for signals
with no track record — and congressional disclosures in particular are the most-watched "edge" on
the internet, parsed by a dozen services the moment they land, with a 45-day head start against us.

The architecture already separates signal generation from execution
([ADR 0005](./0005-llm-proposes-code-disposes.md)), so the two do not have to move together.

## Decision

1. **Ingest and score equity signals; do not execute them.** Probes collect Form 4 and congressional
   disclosures, analysts emit signals, and Milestone 3 resolves them against real equity price data.
2. **Equity signals never reach a proposal.** The portfolio agent's asset universe is venue-backed
   instruments only. An equity signal that produced a proposal would be a bug.
3. **Equity price data for scoring only.** A free daily-bar source is sufficient to resolve a signal
   at its horizon; no order book, no live feed, no venue.
4. **Form 4 is the priority of the two.** Two business days versus forty-five is roughly a 20×
   timeliness advantage, from people with specific knowledge of one company.
5. **IBKR is gated on evidence.** Standing up equities execution requires a positive resolved-signal
   track record from Milestone 3 and its own ADR. Until then it stays in "Beyond".

## Consequences

- Free, well-timed structured data enters the scoreboard immediately, at the cost of a price feed
  and some parsing.
- Sonde will visibly produce signals it cannot act on. This is intentional and should be labelled as
  such in the UI — an unexecutable signal that scores well is exactly the evidence that would
  justify IBKR later.
- The scoreboard needs an execution-eligibility dimension so unexecutable signals are not mixed into
  headline performance figures.
- If these sources score poorly, the cost of finding out was a parser rather than a broker
  integration and a daily gateway restart.
- Congressional trades make a good dashboard panel regardless of edge, which is worth something in a
  project whose stated goal is being interesting to watch.

## Milestones touched

- Milestone 1 (Ears)
- Milestone 3 (Scorekeeping)

## References

- [ADR 0002](./0002-crypto-first-ccxt.md) — crypto-first, IBKR deferred
- [ADR 0011](./0011-source-acquisition-policy.md) — source tiers

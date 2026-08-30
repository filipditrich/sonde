# 0024: Auction-aligned paper execution

## Status

Accepted (2026-08-29)

## Context

Strategy V1's measured convention enters at the next regular-session open and exits at the horizon session's close. Alpaca supports opening- and closing-auction orders, but fractional quantities are limited to ordinary day orders. Exact 1% notional sizing and exact auction participation therefore cannot both be guaranteed. Auction prices and fill quantities are also unknown when an order is submitted.

The execution policy must preserve strategy fidelity without disguising partial fills, chasing a missed auction, using leverage, or turning a post-fill variance into an automatic discretionary exit.

## Decision

1. The Decision Cutoff is 09:20 America/New_York on the executable regular session. Sonde freezes the Decision Packet, evaluates Data Readiness, plans, gates, and submits before Alpaca's 09:28 opening-auction deadline.
2. Strategy V1's Sizing Target is 1% of current paper equity. The planner floors the whole-share quantity using the latest valid pre-cutoff sizing price. If one share exceeds the target, it appends a `below_minimum_order` Planning Decision and makes no proposal; the Signal remains scored.
3. The normal entry is a whole-share market-on-open order using `market` with `opg`. Any auction fill becomes the position, the unfilled remainder is allowed to cancel, and Sonde does not chase after the open or unwind a partial fill.
4. The 1.25% of paper-equity Position Breach Threshold is distinct from the Sizing Target. An auction fill above it enters `Halted`, blocking new entries until the operator acknowledges the breach and fresh reconciliation and Data Readiness pass. It never automatically flattens the position.
5. Sonde operates cash-like and unlevered even if the broker account exposes margin buying power: no borrowing, shorting, or sizing from leveraged buying power.
6. The normal strategy exit is a whole-position market-on-close order using `market` with `cls`, staged before Alpaca's 15:50 deadline on the horizon session.
7. Known fractional residue or an instrument incompatible with the close auction is closed by a deterministic regular-hours fallback when possible. A rejected or unfilled closing-auction order is retried at the next regular-session opportunity until flat.
8. Every partial fill, missed auction, rejected order, incompatible residue, and fallback is appended as an Execution Exception. It affects Execution Outcome, never the canonical Signal Outcome or Market Horizon.
9. Strategy V1 has no stop, take-profit, thesis-decay exit, post-open entry retry, or manual discretionary order path.

## Consequences

- “Fixed 1%” means a deterministic sizing target, not exact fractional notional or guaranteed post-fill exposure.
- Signals can resolve without positions, and positions can differ in size or timing from their Signals without corrupting the Signal Outcome series.
- The priority market-action lane must schedule both order staging and post-auction reconciliation around exchange and broker deadlines.
- Rare large opening gaps can trigger a fail-closed review without forcing a sale.
- Order fixtures must cover partial fills, zero fills, auction rejection, corporate-action residue, and restart around both auctions.

## References

- [ADR 0003](./0003-paper-first-execution.md)
- [ADR 0018](./0018-scheduled-work-priority-market-actions.md)
- [ADR 0019](./0019-operational-states-fail-closed.md)
- [ADR 0020](./0020-strategy-v1-common-equities-only.md)
- [ADR 0023](./0023-decision-specific-data-readiness.md)
- [Alpaca order API](https://docs.alpaca.markets/us/reference/postorder)

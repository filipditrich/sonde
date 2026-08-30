# 0026: Separated scorecards and forward promotion

## Status

Accepted (2026-08-29)

## Context

Sonde produces three materially different kinds of evidence: a strategy's prospective claims, the paper broker's realized portfolio, and an analyst behavior's forward predictions. Combining them into one P&L or confidence number would let execution failures select the strategy sample and let a rising market masquerade as strategy or analyst skill.

Analyst influence also needs a promotion path that respects ADR 0004. Tuning a prompt on the same resolved Signals used to approve it is a disguised backtest; promoting a whole analyst at once makes it impossible to attribute whether confidence, eligibility, or sizing helped.

## Decision

1. Strategy V1's primary metric is median Signal Excess Return: each Signal's canonical 20-session total return minus the median return of every point-in-time eligible Listing over the same entry session and Market Horizon.
2. The Strategy Scorecard also reports raw median and mean return, hit rate, distribution tails, resolution coverage, explicitly Unresolvable Outcomes, and secondary comparisons with the Signal's SIC major group and SPY. No secondary slice silently replaces the declared primary metric.
3. Every final Signal enters the primary population regardless of whether it was executed, blocked, already held, below the minimum order size, or operationally unready. Execution subsets are visible but never substitute for the full population.
4. The Execution Scorecard is separate and reports broker equity, time-weighted return, realized and unrealized P&L, drawdown, exposure, turnover, fill variance, and Realism Outcomes. It never becomes the Strategy Scorecard or the canonical Signal Outcome.
5. An Analyst Annotation contains a `supports`, `undercuts`, or `neutral` stance; a calibrated probability that the Signal beats the Primary Benchmark; a magnitude band; rationale; uncertainty; and typed Evidence Relations.
6. Analyst capabilities are promoted independently in this order of available scope: annotation-only, confidence contribution, eligibility modifier, and sizing modifier. A promoted analyst never constructs an Order Proposal or overrides deterministic eligibility exclusions or risk.
7. Initial eligibility and sizing influence is monotonically conservative: a promoted capability may veto an otherwise eligible entry or reduce the deterministic Sizing Target from 0% through 100%. It cannot increase exposure above baseline.
8. Each promotion capability has a rule frozen before a sealed Evaluation Epoch. The default minimum is both 50 resolved Signals and 12 weeks. Promotion additionally requires improved calibration against the constant Bootstrap Prior, positive estimated economic effect after costs, no material downside deterioration, and operator approval. Passing the floor is evidence, not proof.
9. Changing any part of an Analyst Behavior Version creates a new version and a future Evaluation Epoch. Outcomes inspected while developing the change cannot validate that change.
10. Only the authenticated operator can append a Promotion Decision or Revocation. It names the exact behavior version, Capability Grant, bounds, rationale, evidence packet, and effective time. Promotion is never automatic or a mutable configuration flag.
11. Annotation-only failure is recorded and does not block deterministic Strategy V1. Once an analyst capability is part of entry policy, unavailable or invalid output fails Data Readiness for that entry; Sonde neither reuses an old annotation nor silently falls back.

## Consequences

- A weak broker fill cannot falsify a good Signal, and an unexecuted winner cannot disappear from the evidence base.
- Benchmark membership and returns become point-in-time inputs and derived artifacts with their own provenance.
- Analyst evaluation uses proper probabilistic scoring and economic comparisons rather than self-reported confidence.
- Promotion will be slow at Strategy V1's expected cadence. That is intentional: the deterministic baseline keeps operating while evidence accumulates.
- A promoted model dependency makes entry availability stricter; failure remains observable and fail-closed.

## References

- [ADR 0004](./0004-no-llm-backtests.md)
- [ADR 0015](./0015-deterministic-planning-promotable-analysis.md)
- [ADR 0017](./0017-audited-operator-control-plane.md)
- [ADR 0021](./0021-immutable-evidence-lineage-and-dual-replay.md)
- [ADR 0023](./0023-decision-specific-data-readiness.md)
- [ADR 0025](./0025-authoritative-market-data-and-paper-realism.md)

# 0023: Decision-specific Data Readiness precedes planning

## Status

Accepted (extends 0019, 2026-08-29)

## Context

ADR 0019 established that new entries require both the Active operational state and Data Readiness. A generic probe-health light is insufficient: a source can be healthy while the specific calendar, listing, bar window, portfolio snapshot, or broker reconciliation required for one entry is missing or stale. Asking the risk gate to rediscover those facts would mix data quality with portfolio risk and make failures difficult to explain.

Signals must still be emitted and scored when the strategy's prospective claim is valid but operational inputs prevent a trade. Otherwise poor readiness would selectively erase counterfactual evidence.

## Decision

1. Sonde appends a versioned Data Readiness assessment for the decision path at its Decision Cutoff. It identifies the policy version and the status, age, and exact artifact reference for every mandatory input.
2. Strategy V1 readiness covers at least the market calendar, effective universe and Listing, price and liquidity window, required source completeness, portfolio snapshot, and broker reconciliation.
3. Probe health is telemetry and cannot imply readiness. Readiness is evaluated against action-specific freshness and completeness policies.
4. An eligible Signal is emitted and scored independently of execution readiness. The deterministic Portfolio Planner produces an Order Proposal only when Data Readiness passes and the operational state is Active; otherwise it appends a Planning Decision with a typed reason and no proposal.
5. The risk gate consumes a proposal and its readiness reference. It may verify the reference and policy version, but it does not fetch data, infer source completeness, or recompute readiness.
6. Recovery and operator resume cannot restore entry capability until a fresh readiness assessment and broker reconciliation pass, as required by ADR 0019.

## Consequences

- Sonde preserves the difference between “the strategy made a valid claim” and “the system was safe and sufficiently informed to act.”
- Fail-closed behavior does not bias the Signal Outcome series by hiding eligible but unexecuted Signals.
- Every no-trade caused by stale or incomplete data is inspectable in the cockpit and attributable to a specific policy check.
- Readiness schemas and policies must exist before the planner, risk gate, or paper-execution path is implemented.

## References

- [ADR 0017](./0017-audited-operator-control-plane.md)
- [ADR 0019](./0019-operational-states-fail-closed.md)
- [ADR 0021](./0021-immutable-evidence-lineage-and-dual-replay.md)
- [ADR 0022](./0022-point-in-time-market-primitives.md)

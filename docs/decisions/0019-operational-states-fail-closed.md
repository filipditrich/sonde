# 0019: Operational states fail closed for entry and preserve risk reduction

## Status

Accepted (2026-08-29)

## Context

Sonde already had a kill switch, daily-loss halt, dead-man's switch, source health, and reconciliation drift, but no shared semantics for what remained permitted during each condition. Treating every problem as a total stop can leave positions unmanaged; continuing to admit new positions when required evidence or venue state is uncertain is the opposite failure.

## Decision

1. Sonde has five explicit operational states: Active, Paused, Degraded, Halted, and Recovering.
2. New entries are permitted only while Active and after Data Readiness passes for the proposed action.
3. Paused is operator-requested. Degraded is entered when required source or system data is incomplete or stale. Halted represents a safety breach. Recovering rebuilds source and venue truth before entry can resume.
4. Exits, cancellations, venue queries, and reconciliation continue in every state where they are technically possible. A state that blocks entry must not by itself block risk-reducing action.
5. No operational state automatically flattens positions.
6. Resuming from Halted or Recovering requires successful Data Readiness and venue reconciliation. Operator-required transitions use the audited control plane from ADR 0017.
7. Every transition records its cause, initiator, time, previous state, new state, and outcome append-only.

## Consequences

- Source gaps and stale account state fail closed for new exposure without abandoning existing positions.
- The cockpit can explain whether Sonde is quiet, paused, impaired, halted, or rebuilding.
- Operational-state and Data Readiness rules must exist before control-plane or execution implementation.

## References

- [ADR 0003](./0003-paper-first-execution.md)
- [ADR 0009](./0009-venue-is-source-of-truth.md)
- [ADR 0017](./0017-audited-operator-control-plane.md)

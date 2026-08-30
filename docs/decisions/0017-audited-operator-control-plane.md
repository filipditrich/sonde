# 0017: A separate audited operator control plane

## Status

Accepted (2026-08-29)

## Context

Sonde's cockpit must remain trustworthy as a view over append-only evidence, but a real unattended trading system also needs operational control. Making the dashboard database role writable would blur evidence, control, and trading authority; forcing every intervention through an undocumented shell command would make the operational record incomplete.

## Decision

1. The Cockpit's evidence and analytical reads remain read-only.
2. Authenticated Operator Commands travel through a separate, narrow control boundary and are recorded append-only with actor, time, reason, requested action, and outcome.
3. Permitted controls are: pause or resume new entries, engage the kill switch, cancel pending orders, acknowledge alerts, and request a safe source re-poll or venue reconciliation.
4. The control plane cannot edit observations, candidates, signals, decisions, orders, fills, or outcomes.
5. The control plane cannot place discretionary orders or modify strategy evidence to manufacture one.
6. Resume and recovery preconditions are defined by the operational state machine before control implementation begins.

## Consequences

- Sonde has a genuine operational cockpit without becoming a manual brokerage terminal.
- The web read model can remain structurally unable to mutate the evidence base.
- Commands, acknowledgements, failures, and recoveries become part of the inspectable operational history.

## References

- [ADR 0003](./0003-paper-first-execution.md)
- [ADR 0008](./0008-append-only-signal-log.md)
- [ADR 0009](./0009-venue-is-source-of-truth.md)
- [ADR 0013](./0013-private-dashboard-public-repo.md)

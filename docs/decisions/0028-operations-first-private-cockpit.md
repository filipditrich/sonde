# 0028: Operations-first private cockpit

## Status

Accepted (extends 0013 and 0017, 2026-08-29)

## Context

Sonde is meant to be watched, but it is not a discretionary trading terminal. A chart-first screen, arbitrary shell, or manual order ticket would obscure the system's real product—its evidence and decision lineage—and create control paths outside deterministic planning and risk. The interface also needs to feel live without treating a browser connection as authoritative state.

The cockpit starts locally and may later be reached remotely by one operator. Retrofitting authenticated control after implementation would leave an avoidable boundary gap even if the first browser runs on the same machine.

## Decision

1. The cockpit home optimizes for operational awareness: operating state and Data Readiness, market clock and next action, urgent alerts, candidate funnel, live decision tape, positions and exposure, and compact Strategy and Execution Scorecard summaries.
2. Charts, research, artifact details, scorecards, and replay are drill-down surfaces rather than the home-screen organizing principle.
3. The Event Console is a structured, read-only view over append-only events with filters, lineage links, and raw artifact inspection. It is not an operating-system shell, raw log tail, or order-entry surface.
4. The Event Console's command palette exposes only the Operator Commands accepted by ADR 0017. Pause is immediate and idempotent. Halt, cancel-pending, Promotion Decisions, and Revocations show an impact preview and require confirmation. Each command returns a durable identity and visible completion state.
5. Server-Sent Events carry append-only event references to the browser and resume from a durable cursor. REST snapshots remain authoritative for rendered state; authenticated HTTP carries Operator Commands.
6. Every alert is first a durable in-app Operational Alert. Telegram additionally carries urgent Halted state, Position Breach, missed auction deadline, reconciliation drift, ambiguous broker response, and readiness failure near a cutoff.
7. An operator session is required even on loopback. Future remote access runs through a private network such as Tailscale plus strong single-user authentication; the cockpit is never directly exposed to the public internet.

## Consequences

- The application looks more like a mission-control console than a brokerage workstation.
- A dropped browser stream loses no state: it resumes event references and refreshes authoritative snapshots.
- The UI cannot create discretionary trades or bypass planner and risk boundaries.
- Authentication and audit semantics exist before remote deployment rather than being retrofitted around control endpoints.
- Telegram is the only initial external alert integration; Slack remains out of scope.

## References

- [ADR 0013](./0013-private-dashboard-public-repo.md)
- [ADR 0017](./0017-audited-operator-control-plane.md)
- [ADR 0019](./0019-operational-states-fail-closed.md)
- [ADR 0021](./0021-immutable-evidence-lineage-and-dual-replay.md)
- [ADR 0026](./0026-separated-scorecards-and-forward-promotion.md)

# 0029: Simple local operations for the personal system

## Status

Accepted (2026-08-29)

## Context

Sonde is a single-user personal paper-trading project. It needs to act reliably around market auctions, retain its forward evidence, and recover from ordinary machine or process failure. It does not need high availability, a distributed database, or an enterprise disaster-recovery program.

Previous documents also treated inference as the only recurring value-producing cost and proposed a fixed monthly ceiling. The deterministic system now provides the launch value; analyst calls arrive much later and should first be measured rather than stopped by an arbitrary budget.

## Decision

1. Through the paper-execution milestones Sonde runs on one always-on machine with separately supervised engine and web processes and a colocated Postgres instance.
2. Before Milestone 4 the host must restart processes automatically, maintain a synchronized clock, disable sleep during operation, and perform startup reconciliation. Development may remain interactive before that gate.
3. The evidence and decision spine is retained indefinitely. Source Document bytes are retained where acquisition policy permits. If policy or law requires content deletion, Sonde preserves a hash tombstone and unbroken lineage.
4. Recovery remains proportional to a personal project: maintain one simple automated backup copy of Postgres and retained document storage outside the live data directory. High availability, replication, point-in-time recovery infrastructure, and formal disaster-recovery exercises are out of scope.
5. Plain Postgres is sufficient initially. TimescaleDB or external bar storage requires measured query or storage pressure and a new decision; neither is installed speculatively.
6. Sonde records and displays model usage and monetary cost by Analyst Behavior Version, provider, and period. It has no warning threshold, hard monthly cap, or cost-triggered shutdown policy.

## Consequences

- A laptop that sleeps is acceptable for early collection work but is not a Milestone 4 execution host.
- The initial deployment has few moving parts and no distributed-systems recovery problem.
- Loss of the live data directory is recoverable from one basic backup, but Sonde makes no enterprise recovery-time or recovery-point promise.
- Postgres extensions and separate time-series infrastructure wait for evidence.
- Unexpected inference cost is visible to the operator but does not automatically alter collection, analysis, or trading behavior.

## References

- [ADR 0003](./0003-paper-first-execution.md)
- [ADR 0018](./0018-scheduled-work-priority-market-actions.md)
- [ADR 0021](./0021-immutable-evidence-lineage-and-dual-replay.md)
- [ADR 0027](./0027-single-pinned-analyst-runtime.md)
- [ADR 0028](./0028-operations-first-private-cockpit.md)

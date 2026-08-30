# 0018: Scheduled work with an isolated priority market-action lane

## Status

Accepted (supersedes 0006, 2026-08-29)

## Context

ADR 0006 assumed continuous crypto markets, streaming inputs, an LLM in the entry path, and an event bus with an outbox. Strategy V1 instead polls EDGAR on a minutes-scale cadence, refreshes bars daily, resolves signals after market sessions, and performs a small number of time-bound actions around the regular-session open. A single sequential loop is appropriately simple for ordinary work but could delay an entry, exit, or cancellation behind an unbounded acquisition or reconciliation job.

## Decision

1. `apps/engine` begins as one long-lived process with no queue broker or worker fleet.
2. Ordinary acquisition, resolution, research, and maintenance work runs through declarative jobs scheduled by source cadence or market-calendar events.
3. Committed source facts may trigger downstream deterministic work. Sonde does not poll a model for decisions merely because time passed.
4. Time-bound market actions run through an isolated priority scheduler and cannot queue behind acquisition, research, or reconciliation work.
5. Both lanes coordinate through durable Postgres state and idempotent operations. Process restart recovers from recorded state rather than replaying in-memory intent.
6. WebSockets or streaming connections are used only where a chosen source genuinely requires them; they are not a system-wide runtime assumption.
7. A later split into multiple processes occurs only when measured workload or fault isolation requires it; the job and market-action boundaries are the extraction seams.

## Consequences

- The runtime matches Strategy V1 without manufacturing infrastructure for continuous markets.
- Market-open entries, scheduled exits, and cancellations have an explicit latency boundary.
- The engine remains operationally simple while avoiding the correctness risk of one unbounded sequential queue.
- LLM work remains candidate-triggered, batched where appropriate, and outside the market-action lane.

## References

- [ADR 0006](./0006-event-driven-cadence.md)
- [ADR 0009](./0009-venue-is-source-of-truth.md)
- [ADR 0015](./0015-deterministic-planning-promotable-analysis.md)
- [`docs/specs/engine-runtime.md`](../specs/engine-runtime.md)

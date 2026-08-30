# 0006: Event-driven decision cadence, not polling

## Status

Superseded by [0018](./0018-scheduled-work-priority-market-actions.md) (2026-08-29). The decision to avoid timer-manufactured model opinions remains; 0018 replaces the continuous-market event-bus runtime with scheduled work and an isolated market-action lane.

## Context

An always-on agent needs a firing rule. The obvious one is a timer: wake every N minutes, look at
the world, decide. It is simple and it is wrong on two independent axes.

**Cost.** Inference is the only meaningful recurring expense
([`docs/architecture.md`](../architecture.md)). A polling loop's spend is a function of wall-clock
time and asset count, not of how much is actually happening. Polling 10 assets every 15 minutes is
~960 wake-ups a day, the overwhelming majority of which examine a market where nothing has changed
and produce no signal. Rough modelling puts that at $60–150/month against $10–30 for an
event-driven equivalent.

**Signal quality.** A timer manufactures decision points. Asked "should I trade?" every 15 minutes,
a model will sometimes say yes for no reason other than having been asked — and each of those is a
spread crossing plus fees. Sonde should act when something happened, not when a clock ticked.

## Decision

1. **Wake on events, not on a timer.** Triggers are: a new document from a probe, a price move
   beyond a per-asset threshold, a position crossing a risk boundary, or an explicit operator
   request.
2. **Triage is batched and debounced.** Documents accumulate into a window and are scored in one
   batched call. This clears the Haiku cache floor (see
   [ADR 0007](./0007-tiered-model-routing.md)) and cuts per-item cost at the same time.
3. **Escalation to deep read is threshold-based**, and the threshold is a tunable config value with
   its own version history — it is one of the highest-leverage cost knobs in the system.
4. **A heartbeat is not a decision cycle.** Liveness checks and reconciliation run on a timer and
   involve no model.
5. **A floor and a ceiling.** A minimum interval between deep reads per asset prevents a burst of
   correlated headlines from triggering a spending spike; a maximum interval guarantees at least one
   portfolio review per day even in total silence.

## Consequences

- Cost scales with market activity rather than with uptime, which is both cheaper and the right
  shape: quiet markets cost nothing.
- The engine needs real event plumbing — WebSocket subscriptions, debounce windows, an outbox — from
  Milestone 2 rather than a cron loop. More upfront work, better foundation.
- Bursty spend. A major news day costs many times a quiet one. The floor/ceiling rules and the cost
  dashboard (Milestone 6) exist to keep that bounded and visible.
- Testing needs event injection rather than clock advancement. Cleaner, in practice.

## Milestones touched

- Milestone 2 (Opinion)
- Milestone 6 (Watch)

## References

- [`docs/architecture.md`](../architecture.md) — Cost model
- [ADR 0007](./0007-tiered-model-routing.md)

# 0009: The venue is the source of truth; local state is a cache

## Status

Accepted (Milestone 5, 2026-08-27)

## Context

Sonde runs continuously against 24/7 markets ([ADR 0002](./0002-crypto-first-ccxt.md)), so there is
no quiet window for deploys or restarts. The engine will be killed mid-flight, repeatedly, forever.

The dangerous interval is between submitting an order and recording that it was submitted. A crash
there leaves local state and venue state disagreeing, and the instinct — replay the intent — is
exactly how one order becomes two.

Positions also drift for reasons that have nothing to do with crashes: partial fills, venue-side
liquidations, funding payments on perpetuals, fees deducted asynchronously, manual intervention by
the operator. Local arithmetic will diverge from the venue eventually no matter how correct it is.

## Decision

1. **The venue is authoritative for positions, balances, and order state.** Local tables are a cache
   to be corrected, never a ledger to be trusted.
2. **Every order carries a client-generated idempotency key** derived from proposal id and attempt
   number. A retry after an ambiguous failure reuses the same key, so the venue deduplicates rather
   than double-filling.
3. **Recovery is query-first, never replay-first.** On startup or after an ambiguous failure, query
   the venue for open orders and positions before acting. Never resubmit from local intent.
4. **A reconciler runs on a timer**, independent of the event loop and involving no model. It
   compares venue state to local state and corrects local state.
5. **Drift beyond a threshold halts trading** and raises an alert. Unexplained divergence means a
   bug or an intervention, and either way the correct response is to stop and let a human look.
6. **The risk gate reads reconciled state**, never optimistic local projections. A position that
   might exist is treated as existing for the purpose of limits.
7. **Reconciliation events are logged** like any other decision, and visible in the UI.

## Consequences

- More venue API calls, and rate limits become a real design constraint. Acceptable — reconciliation
  is cheap relative to the cost of a phantom position.
- Recovery is slower than replaying local intent, and correct.
- The reconciler is a second scheduled process alongside the event loop, with its own failure modes
  and its own heartbeat.
- Testing needs simulated partial failures — submit succeeds, record fails; venue reports a fill
  Sonde never recorded; two processes racing. These are the cases that matter and they are hard to
  discover by accident, so they are written as explicit tests.
- Because [ADR 0003](./0003-paper-first-execution.md) keeps execution on paper/testnet, this
  discipline is exercised for the whole life of the project before any real capital could depend on
  it. That ordering is deliberate.

## Milestones touched

- Milestone 4 (Gate)
- Milestone 5 (Hands)

## References

- [`docs/architecture.md`](../architecture.md) — Enforcement plane
- [ADR 0005](./0005-llm-proposes-code-disposes.md)

# Specs

Implementation contracts for the active roadmap. Cross-cutting contracts are written before the
first milestone that creates their data; later feature details remain just-in-time.

A spec covers: the problem, the data shapes, the failure modes, and the test cases. It does not
re-litigate decisions — those belong in [`../decisions`](../decisions).

If a feature is dropped, move its spec to `_archived/` with a one-line note at the top explaining
why. Do not delete it; the reasoning is often reusable.

## Written

- [`evidence-spine.md`](./evidence-spine.md) — common artifact envelope, lineage, identity, clocks,
  mutation, and transaction contracts
- [`strategy-v1.md`](./strategy-v1.md) — exact candidate, Signal, planning, risk, and auction behavior
- [`scoring-and-promotion.md`](./scoring-and-promotion.md) — outcomes, benchmarks, scorecards,
  Analyst Annotations, sealed epochs, and promotion
- [`engine-runtime.md`](./engine-runtime.md) — process model, scheduling, restart recovery, health

## Expected

| Spec                   | Needed before              |
| ---------------------- | -------------------------- |
| `edgar-acquisition.md` | Completing Milestone 0     |
| `market-data.md`       | Completing Milestone 0     |
| `risk-gate.md`         | Milestone 3 implementation |
| `alpaca-paper.md`      | Milestone 4 implementation |
| `analyst-runtime.md`   | Milestone 6 implementation |

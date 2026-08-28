# Specs

Per-feature implementation specs, written **just-in-time** before the milestone that consumes them —
not upfront. A spec written three milestones early is a guess that will be wrong.

A spec covers: the problem, the data shapes, the failure modes, and the test cases. It does not
re-litigate decisions — those belong in [`../decisions`](../decisions).

If a feature is dropped, move its spec to `_archived/` with a one-line note at the top explaining
why. Do not delete it; the reasoning is often reusable.

## Written

- [`engine-runtime.md`](./engine-runtime.md) — process model, scheduling, restart recovery, health

## Expected

| Spec           | Needed before              |
| -------------- | -------------------------- |
| `probes.md`    | Milestone 1 (Ears)         |
| `analysts.md`  | Milestone 2 (Opinion)      |
| `scoring.md`   | Milestone 3 (Scorekeeping) |
| `risk-gate.md` | Milestone 4 (Gate)         |
| `venue.md`     | Milestone 5 (Hands)        |

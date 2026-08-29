# UI

Dashboard information architecture and flows. Written just-in-time, like specs.

The dashboard is not a reporting layer bolted on at the end — it is the primary product surface
([`../goals.md`](../goals.md)). "Can you watch it think?" is a completion criterion, not a nice-to-have.

## Written

- [`first-screen.md`](./first-screen.md) — the Milestone 0 screen: funnel, qualifying events, probe health

## Surfaces

| Surface            | Answers                                                  | Milestone |
| ------------------ | -------------------------------------------------------- | --------- |
| Funnel             | What is it reading, and how much is it throwing away?    | 0         |
| Probe health       | Is anything stalled or silently failing?                 | 0         |
| Live tape          | What is it seeing and concluding, right now?             | 1         |
| Analyst scoreboard | Which sources and analysts actually carry information?   | 2         |
| Blocked            | What did the gate reject, and why?                       | 3         |
| Trade detail       | Why did it do that? Sources → rationale → gate → fill    | 4         |
| Cost               | What is this costing, by tier and probe, against budget? | 5         |
| Replay             | Scrub back and watch a decision re-form                  | 5         |

Milestone numbers follow the [roadmap as revised 2026-08-27](../roadmap.md). These are not eight
separate screens: the funnel is the spine, and most of the rows above are a stage appended to it or a
drill-down from one.

## Principle

Every number in the UI is traceable to its inputs in at most two clicks. A figure you cannot drill
into is a figure you cannot trust, and an untrustworthy dashboard is worse than none.

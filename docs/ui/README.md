# UI

Dashboard information architecture and flows. Written just-in-time, like specs.

The dashboard is not a reporting layer bolted on at the end — it is the primary product surface
([`../goals.md`](../goals.md)). "Can you watch it think?" is a completion criterion, not a nice-to-have.

## Surfaces

| Surface            | Answers                                                  | Milestone |
| ------------------ | -------------------------------------------------------- | --------- |
| Live tape          | What is it seeing and concluding, right now?             | 2         |
| Probe health       | Is anything stalled or silently failing?                 | 1         |
| Trade detail       | Why did it do that? Sources → rationale → gate → fill    | 5         |
| Analyst scoreboard | Which sources and analysts actually carry information?   | 3         |
| Blocked            | What did the gate reject, and why?                       | 4         |
| Cost               | What is this costing, by tier and probe, against budget? | 6         |
| Replay             | Scrub back and watch a decision re-form                  | 6         |

## Principle

Every number in the UI is traceable to its inputs in at most two clicks. A figure you cannot drill
into is a figure you cannot trust, and an untrustworthy dashboard is worse than none.

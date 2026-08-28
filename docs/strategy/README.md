# Strategy

What Sonde is looking for, and how a conclusion becomes a position.

The rest of `docs/` describes the machine — how data moves, what is enforced, what is measured.
This folder describes the **thesis**: what edge Sonde is hunting and the rules that turn evidence
into exposure. Without it the architecture is a very well-built system with nothing to do.

## Reading order

| Doc                                                | What it settles                                                               |
| -------------------------------------------------- | ----------------------------------------------------------------------------- |
| [`anatomy-of-a-trade.md`](./anatomy-of-a-trade.md) | One event traced end to end, minute by minute — the design's integration test |
| `charter.md` _(next)_                              | Edge, universe, holding period, what Sonde will not trade                     |
| `position-lifecycle.md` _(next)_                   | Entry, sizing, management, exit                                               |
| `scoring.md` _(next)_                              | How a signal resolves, what `flat` means, calibration                         |

## The edge, in one paragraph

Sonde does not trade any single source. It trades when **independent classes of evidence agree** —
a first-party venue announcement, an on-chain flow, a shift in attention, a reported story. Any one
of those alone is noise or is already priced. The bet is that agreement _across kinds of evidence_,
detected quickly and sized modestly, carries more information than any of them separately.

This is chosen partly because it is the only strategy that uses the whole probe architecture, and
partly because it produces the most interesting scoreboard: each class can be credited separately,
so after a few months Sonde can say which kinds of evidence actually carry information — which is a
more durable thing to learn than a P&L figure.

## Convention

Anything that cannot be settled without seeing real data is marked:

> **Assumes:** the claim, and what would confirm or refute it.

These are tracked and checked before the code that depends on them is written.

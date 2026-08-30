# Strategy

This folder defines the market hypothesis and exact rules that turn evidence into prospective
claims and paper exposure. The architecture is reusable only where the settled seams require it;
Strategy V1 itself is concrete.

## Strategy V1 in one paragraph

The Insider Cluster Strategy emits a long Signal when at least two distinct Section 16 reporting-
owner CIKs make qualifying Form 4 code-`P` purchases in the same liquid Issuer and Decision Window.
It closes the window at 09:20 ET, targets the next regular-session opening auction, and measures the
Signal through the close twenty subsequent sessions later. A single owner, an illiquid listing, or a
late filing does not qualify that window.

Cross-source research and LLM analysis are future annotations around this deterministic baseline,
not launch requirements. They must earn bounded influence through sealed forward evaluation.

## Reading order

| Document                                                                 | What it settles                                                          |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| [`charter.md`](./charter.md)                                             | Edge, universe, timing, sizing, correlation, and exclusions              |
| [`anatomy-of-a-trade.md`](./anatomy-of-a-trade.md)                       | One complete Signal and paper position traced through the evidence spine |
| [`../specs/strategy-v1.md`](../specs/strategy-v1.md)                     | Executable strategy, planning, and execution contract                    |
| [`../specs/scoring-and-promotion.md`](../specs/scoring-and-promotion.md) | Outcomes, benchmarks, analyst evaluation, and promotion                  |

## Evidence status

The founding study and its preregistered out-of-sample check support designing around the cluster,
liquidity threshold, and horizon. They do not eliminate survivorship, cost, regime, or portfolio
risk. The live Strategy Scorecard is the remedy.

Unmeasured choices are labelled as policy or guesses rather than laundered into the historical
result. The full evidence is in
[`../research/insider-filing-gap-study.md`](../research/insider-filing-gap-study.md).

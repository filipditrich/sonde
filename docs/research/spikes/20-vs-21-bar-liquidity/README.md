# Spike: founding-study 21-bar slice vs Strategy V1's 20-bar rule

**Status:** recorded · **Does not change** Strategy V1's twenty completed SIP bars.

The A4 filing-gap scripts label a "20-session median" but compute

```python
ss[max(0, i-20):i+1]   # inclusive — 21 bars when i >= 20
```

Strategy V1 takes the twenty completed regular-session SIP bars immediately preceding the entry
open and uses their exact-decimal VWAP×volume median, strictly greater than `$20,000,000`.

## What this spike compares

`compare.ts` walks a synthetic rising dollar-volume series (not live SIP, not a backtest) and
prints, for the same index:

- Python-style 21-bar median
- Strategy V1 20-bar median
- whether each clears the `$20m` floor
- the median delta

Run:

```bash
bun docs/research/spikes/20-vs-21-bar-liquidity/compare.ts
```

On that rising series the 21-bar slice is one older, cheaper bar larger, so its median sits
`$500,000` below the 20-bar median. Names whose true 20-bar median is just over `$20m` can fail
the Python slice and pass Strategy V1, and the reverse on a falling series.

## Cadence / cohort

This is not an oracle for the founding study's ~3.4 signals/week or its 214-event in-sample
cohort. It only shows that the off-by-one is large enough to change membership near the floor.
Milestone 1 therefore keeps the specified 20-bar rule and does not "correct" toward Python.

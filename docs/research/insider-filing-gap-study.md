# Insider filing gaps and forward returns

**Date:** 2026-08-27 · **Spike:** A4 · **Scripts:** [`spikes/a4-filing-gaps/`](./spikes/a4-filing-gaps)

Resolves assumption **A4** — _overnight gaps are usually small enough to trade through_ — and in
doing so refutes two design proposals that were about to be built.

## Method

|                 |                                                                                  |
| --------------- | -------------------------------------------------------------------------------- |
| Filings         | SEC structured Form 345 datasets, 2025 Q3 – 2026 Q1 (9 months)                   |
| Universe        | 121,748 Form 4 submissions → **14,644 code-`P` open-market acquisitions**        |
| Events          | Collapsed to **6,622 distinct (ticker, filing-date)** pairs; 15.2% multi-insider |
| Prices          | Alpaca daily bars, SIP feed, split-adjusted — 363,114 bars across 1,792 tickers  |
| Entry           | Open of the session after the filing date                                        |
| Reference       | Close of the filing date                                                         |
| Liquidity split | Median 20-session dollar volume, $20m threshold                                  |

**Benchmark:** every ticker, every session, same windows, pooled — a crude control that is negative
throughout (median −0.07% to −0.17%, win rate 47–49%), which is what makes the comparisons below
meaningful rather than a bull-market artifact.

---

## Finding 1 — A4 confirmed. Gaps are tradeable.

Absolute overnight gap, close → next open:

| Cohort                           |         n |    median |       p90 |       >2% |      >4% |
| -------------------------------- | --------: | --------: | --------: | --------: | -------: |
| All filing events                |     5,792 |     0.90% |     4.17% |     25.8% |    10.7% |
| **Liquid (>$20m ADV)**           | **1,605** | **0.85%** | **3.11%** | **20.7%** | **6.5%** |
| Baseline, liquid non-filing days |   122,181 |     0.49% |     1.95% |      9.5% |     2.7% |

A 4% guard would reject about **6.5%** of liquid theses. Tolerable, not fatal — **the overnight
window mechanic works.**

Filing days also gap roughly **1.7× the median of an ordinary day** and are **2.2× as likely** to
exceed 2%. Something real happens overnight after a code-`P` filing.

## Finding 2 — the gap guard is backwards

Signed, liquid, 3-session forward return from the entry price:

| Cohort                    |       n | gap median | fwd 3d median |
| ------------------------- | ------: | ---------: | ------------: |
| Surviving a 4% guard      |   1,501 |     +0.42% |    **−0.10%** |
| **Rejected by the guard** | **104** | **+5.28%** |    **+0.57%** |

**The guard rejects the winners.** Large gaps continue; the events it filters out are the ones that
kept going. As designed it would have made performance worse, and the reasoning behind it —
"a large gap means the thesis is stale" — is simply wrong for this signal.

Note also that **67.5% of gaps are positive** on a bullish thesis, meaning the market prices the
filing overnight and Sonde would be paying up on two trades in three.

## Finding 3 — the horizon in the trace is dead

Forward return from the next open, liquid names, by horizon:

| Cohort            |       1d |         3d |       5d |      10d |        20d |
| ----------------- | -------: | ---------: | -------: | -------: | ---------: |
| All liquid        |   +0.04% | **+0.00%** |   +0.16% |   +0.37% |     +0.54% |
| Single insider    |   +0.00% |     −0.05% |   +0.16% |   +0.29% |     +0.39% |
| **Multi-insider** |   +0.21% |     +0.04% |   +0.17% |   +0.81% | **+2.13%** |
| _Benchmark_       | _−0.07%_ |   _−0.12%_ | _−0.15%_ | _−0.17%_ |   _−0.10%_ |

Win rates at 20 sessions: all liquid **53.3%**, multi-insider **60.7%**, benchmark 48.9%.

**At the `P3D` horizon written into the trade walkthrough there is nothing at all** — median 0.00%,
win rate 49.8%, indistinguishable from a coin flip. Whatever is there emerges around 20 sessions.

## Finding 4 — multi-insider looks materially better

The strongest cut in the study: liquid, multi-insider, 20 sessions — **+2.13% median, 60.7% win**,
against a −0.10% / 48.9% benchmark. That is direct support for assumption **A2**.

> ### Read this before believing Finding 4
>
> **n = 214, and I sliced this data roughly ten ways.**
>
> That is precisely the pattern [ADR 0004](../decisions/0004-no-llm-backtests.md) exists to warn
> about: search a dataset enough times and the best-looking cut is the one most likely to be luck.
> A 60.7% win rate on 214 observations has wide error bars, and nothing here is out-of-sample.
>
> Three further gaps: **no cost model** (spread and fees come off the top and this is a 20-day hold
> in mid-caps), **no proper beta or sector control** (the pooled benchmark is crude), and **one
> nine-month window** spanning a single regime.
>
> Finding 4 is a **hypothesis to forward-test**, not a validated edge. Treating it as anything more
> would be doing exactly what this project was built to avoid.

---

## What this changes

| Was proposed                                       | Now                                                                                                               |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Gap guard rejects theses gapping >4%               | **Drop it.** Anti-selective — it filters out continuation. If anything, a large gap is mildly _positive_ evidence |
| Signal horizon `P3D`                               | **~20 sessions.** There is no measurable signal at 3 days                                                         |
| "Two independent pieces" treats all evidence alike | Multi-insider clusters look materially stronger than single filings — worth weighting, and worth _measuring_      |
| Universe unspecified                               | Liquid names. Illiquid cohorts show larger forward returns but with gaps and spreads that would consume them      |

The deeper point: **a code-`P` filing alone is largely priced by the next open.** That is not a
refutation of the strategy — Sonde's whole premise is that single sources are priced and only
_corroboration_ carries information ([`strategy/`](../strategy)). But it does mean the corroboration
has to carry all of the weight, and this study says nothing yet about whether it does.

## Assumption register updates

| ID  | Was                                | Now                                                                               |
| --- | ---------------------------------- | --------------------------------------------------------------------------------- |
| A4  | Gaps small enough to trade through | ✅ **Confirmed** — 6.5% of liquid theses exceed 4%                                |
| A2  | Multi-insider beats single         | 🟡 **Supported, weakly** — strong effect, small n, not out-of-sample              |
| A1  | Code-`P` filings carry information | 🟡 **Partly** — real overnight reaction, nothing at 3 days, possible 20-day drift |

## Next

1. **Out-of-sample check on Finding 4.** Earlier quarters are available as the same TSV downloads —
   cheap, and it is the single most valuable follow-up.
2. **Cost model.** A 20-day mid-cap hold with realistic spread and fees may erase the effect.
3. **The corroboration question**, which this study does not touch: do filings _plus_ independent
   evidence outperform filings alone? That needs the other probes built.

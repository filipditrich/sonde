# Pre-registration — out-of-sample test of Finding 4

**Written 2026-08-27, before any out-of-sample data was downloaded or inspected.**

Finding 4 of the [gap study](../../insider-filing-gap-study.md) came from roughly ten slices through
one nine-month window. This document fixes the hypothesis and the parameters **before** looking at
new data, so the result cannot be tuned into existence.

## Parameters — frozen, carried over unchanged

| Parameter     | Value                                                  | Where it came from |
| ------------- | ------------------------------------------------------ | ------------------ |
| Filing filter | Form 4, `TRANS_CODE = P`, `TRANS_ACQUIRED_DISP_CD = A` | in-sample          |
| Event unit    | distinct (ticker, filing-date)                         | in-sample          |
| Multi-insider | ≥2 distinct accession numbers, same ticker and date    | in-sample          |
| Liquidity     | median 20-session dollar volume > $20,000,000          | in-sample          |
| Entry         | open of the session after the filing date              | in-sample          |
| Horizon       | 20 trading sessions                                    | in-sample          |
| Benchmark     | all tickers, all sessions, same windows, pooled median | in-sample          |

**No parameter may be adjusted after seeing out-of-sample results.** If the effect only appears
under different settings, that is a negative result with a footnote, not a positive one.

## Hypothesis

> On out-of-sample quarters, **liquid multi-insider** code-`P` filing events show a positive median
> 20-session forward return from the next open that exceeds the pooled benchmark, with a win rate
> above 55%.

In-sample values, for comparison: **+2.13% median, 60.7% win, n=214**, benchmark −0.10% / 48.9%.

## Decision rule, fixed in advance

| Outcome                                   | Reading                                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| Median > benchmark **and** win rate > 55% | **Survives.** Still not proof — no cost model, no beta control — but worth designing around |
| Median > benchmark, win rate 50–55%       | **Weak.** Direction holds, magnitude does not. Do not weight multi-insider heavily          |
| Median ≤ benchmark **or** win rate < 50%  | **Fails.** Finding 4 was noise. Say so plainly and drop it                                  |

## What this does and does not establish

Out-of-sample here means **earlier** quarters, since later ones do not exist yet. That is a
robustness check across regimes, **not** a forward test — the strongest available evidence today,
and weaker than simply waiting.

Costs are still unmodelled. A 20-session mid-cap hold pays real spread, and nothing below accounts
for it.

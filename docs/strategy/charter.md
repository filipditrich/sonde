# Strategy charter

What Sonde trades, when, how much, and what it will not touch. Every number here is either measured
or explicitly marked as a guess.

Evidence: [`../research/insider-filing-gap-study.md`](../research/insider-filing-gap-study.md).

---

## 1. The signal Sonde actually launches on

**Two or more insiders making open-market purchases (Form 4, code `P`) in the same liquid company
on the same day.** Held twenty trading sessions.

Measured, out-of-sample, against a date-matched control:

|                           |     median |       win |       n |
| ------------------------- | ---------: | --------: | ------: |
| Multi-insider, liquid     | **+1.83%** | **58.3%** |     357 |
| Single insider, liquid    |     +0.07% |     50.2% |   2,767 |
| Liquid stocks, same dates |     +0.10% |     50.4% | 258,055 |

**The cluster is the signal.** A lone insider purchase is worth nothing.

### This supersedes the corroboration premise as the launch condition

Sonde was designed around cross-source corroboration — trade when independent classes of evidence
agree. The study says something inconvenient for that: **the multi-insider filing cluster carries
the measured edge on its own**, with no corroboration from `editorial`, `attention`, or `macro`.

Corroboration remains a good hypothesis. It is not a _tested_ one, and requiring it before trading
would mean gating a measured signal behind an unmeasured belief — while also importing the
attention class's multi-week cold start for no demonstrated benefit.

So the ordering inverts:

1. **Launch** on the measured signal. Corroborating evidence is collected, attached to every signal,
   and scored — but is **not required** to trade.
2. **Then test** whether corroboration improves outcomes, using the scoreboard, with real forward
   data.

If corroboration helps, the scoreboard will show it and the entry rule tightens. If it does not,
Sonde will have learned something genuinely interesting about its own founding assumption.

> This is the project's own principle applied to its own design: trade what is measured, test what
> is believed.

## 2. Universe — criteria, never a list

**Every US-listed common equity and commodity ETF with median 20-session dollar volume above $20m.**
Roughly **770 names**, recomputed daily. No hand-picked list.

The trade walkthrough said "forty US equities and six commodity ETFs." That was wrong, and the data
says why: over two years, **204 distinct names** produced a qualifying event out of a ~770-name
universe. A fixed list of forty would have caught roughly one event a month by luck. **The signal is
sparse and unpredictable in _which_ names it appears — so the universe must be wide and defined by
rule.**

### Why $20m

The threshold was frozen before the out-of-sample test and turned out to sit near the sweet spot:

| ADV floor | Universe | Events/week | 20d median |       Win |
| --------: | -------: | ----------: | ---------: | --------: |
|       $5m |   ~1,252 |         6.4 |     +0.81% |     53.3% |
|  **$20m** | **~774** |     **3.4** | **+1.83%** | **58.3%** |
|      $50m |     ~488 |         2.1 |     +1.68% |     57.9% |
|     $200m |     ~189 |         0.5 |     +3.49% |     70.0% |

Below $20m the effect dilutes badly. The $200m row looks spectacular and **is not acted on**: n=50
over two years, which makes 70% a number with enormous error bars, and 0.5 events/week is not a
strategy. Chasing it would be the exact slicing this project keeps warning about.

> **Not measured:** whether commodity ETFs produce any qualifying events at all. ETFs have no
> insiders, so under this signal they are **effectively out of scope** until a `macro`-driven entry
> rule exists. ADR 0014 kept them in the market scope; this charter notes they currently have no way
> in.

## 3. Direction — long only

**Sonde takes long positions only.**

Code `P` purchases were measured. Code `S` sales were not — and insider selling is far noisier, since
executives sell for diversification, tax, and pre-scheduled 10b5-1 reasons that carry no view at all.
Shorting on an unmeasured signal, with borrow costs and unbounded loss, is not a trade this project
has earned.

Pleasant side effect: long-only makes the conflicting-signal problem nearly disappear.

## 4. Position rules

| Rule                     | Value                                  | Basis                                                                      |
| ------------------------ | -------------------------------------- | -------------------------------------------------------------------------- |
| Size                     | 2% of equity × confidence, hard cap 2% | **Guess.** Confidence must move size; the cap bounds a miscalibrated model |
| Holding period           | 20 trading sessions                    | Measured                                                                   |
| Max concurrent positions | 20                                     | Derived: 3.4/week × 20 sessions ≈ 14 expected, with headroom               |
| One position per name    | Yes                                    | A second thesis on a held name extends the horizon; it never adds size     |
| Exit                     | Horizon expiry, or hard stop           | Measured — no gap guard, no take-profit                                    |
| Entry timing             | Market open, session after the filing  | Measured                                                                   |

**Expected deployment is low by design.** Fourteen concurrent positions at ~1.3% each is ~18% of
capital at work. At a measured +1.8% per 20-session cycle on the deployed portion, that is roughly
**4% a year gross, before costs** — modest, and stated plainly because the alternative is quietly
sizing up on a signal that still carries an unquantified survivorship bias.

> **Not measured:** the stop level. No stop was modelled in the study, so any number is invented.
> Proposal: begin with **no stop**, since the horizon is the exit and a stop on a 20-session hold in
> a volatile mid-cap mostly harvests noise. Revisit with forward data.

## 5. Correlation groups

Fourteen concurrent positions can easily be one bet. Insider buying clusters — a sector selloff
prompts executives across that sector to buy at once, and Sonde would happily open eight positions
in the same industry on the same week.

**Grouping uses SEC SIC codes**, available free from `data.sec.gov` submissions, which the filing
probe already reaches. No vendor classification needed.

| Rule                              | Value        | Basis     |
| --------------------------------- | ------------ | --------- |
| Max positions per SIC major group | 4            | **Guess** |
| Max exposure per SIC major group  | 6% of equity | **Guess** |

> **Not measured:** how often qualifying events actually cluster by sector and date. This is
> answerable from data already downloaded and is the next cheap spike.

## 6. Cold start

The usual cold-start problem — no measured weights, so no confidence — is **already solved for the
signal Sonde launches on**. The study _is_ the prior:

| Cohort                 | Prior win rate | Prior median |
| ---------------------- | -------------: | -----------: |
| Multi-insider, liquid  |          58.3% |       +1.83% |
| Single insider, liquid |          50.2% |       +0.07% |

Confidence at launch is derived from these base rates and replaced by Sonde's own resolved outcomes
as they accumulate. Bootstrap priors are labelled as such in the scoreboard so they are never
mistaken for measured performance.

The other classes cold-start differently and **none of them block launch**:

| Class       | Cold start                                    | Blocks trading?            |
| ----------- | --------------------------------------------- | -------------------------- |
| `filing`    | None — priors above                           | No                         |
| `editorial` | None — GDELT is queryable immediately         | No                         |
| `attention` | **Weeks** — firehose baseline must accumulate | No (not required to trade) |
| `macro`     | None — FRED is historical                     | No                         |

The attention collector should therefore start running **as early as possible**, well before it can
contribute, precisely because its baseline is the long pole.

## 7. What Sonde will not trade

|                                     | Why                                                         |
| ----------------------------------- | ----------------------------------------------------------- |
| Short positions                     | Unmeasured signal, borrow cost, unbounded loss              |
| Options, futures, leverage          | Not needed; adds failure modes the design has no answer for |
| Penny stocks and OTC                | Deferred by ADR 0014 — detection, not participation         |
| Crypto                              | Plumbing testbed only (ADR 0014)                            |
| Anything below $20m ADV             | Effect dilutes; spreads consume it                          |
| Anything on a single insider filing | Measured at +0.07% — indistinguishable from nothing         |
| Real money                          | ADR 0003, until an explicit live gate                       |

## 8. Open, and honest about it

- **Survivorship bias** in the founding study is unquantified and flatters the result. Live forward
  trading is the fix, since a position opened today is opened in a company that exists.
- **No cost model.** A 20-session mid-cap hold should survive spread and fees, but "should" is doing
  work there.
- **Sizing, stop, and correlation caps are guesses**, marked as such above.
- **Corroboration is untested.** The entire multi-probe architecture is, for now, a measurement
  apparatus for a hypothesis rather than a requirement for trading.
- **Commodity ETFs have no entry path** under this signal.

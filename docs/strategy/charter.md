# Strategy charter

What Sonde trades, when, how much, and what it will not touch. Every number here is either measured
or explicitly marked as a guess.

Evidence: [`../research/insider-filing-gap-study.md`](../research/insider-filing-gap-study.md).

---

## 1. The signal Sonde actually launches on

**Two or more distinct Section 16 reporting owners making open-market purchases (Form 4, code `P`)
in the same liquid company and Decision Window.** A Decision Window groups filings that share the
same next executable regular-session open. The canonical outcome runs from that open through the
close twenty subsequent trading sessions later.

Every unique reporting-owner CIK counts once per candidate, including officers, directors, and 10%
owners whether they are people or institutions. Repeated filings from one reporting owner do not
manufacture corroboration. Relationship type is retained for segmentation but does not change
Strategy V1 eligibility.

Measured, out-of-sample, against a date-matched control:

|                           |     median |       win |       n |
| ------------------------- | ---------: | --------: | ------: |
| Multi-insider, liquid     | **+1.83%** | **58.3%** |     357 |
| Single insider, liquid    |     +0.07% |     50.2% |   2,767 |
| Liquid stocks, same dates |     +0.10% |     50.4% | 258,055 |

**The cluster is the signal.** A lone reporting owner purchase is worth nothing.

The historical study grouped by SEC filing date. Decision Windows are the live, execution-aligned
definition and may differ around holidays or unusual acceptance times; Sonde records both so this
edge-case population difference can be measured rather than hidden.

Candidate snapshots are appended as qualifying filings arrive. At the pre-open Decision Cutoff,
Sonde emits at most one final signal for a company and Decision Window. A qualifying filing that
arrives after the cutoff belongs to the next Decision Window; it never mutates the closed one.

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

**Every US-listed common equity with median 20-session dollar volume above $20m.** Roughly **770
names**, recomputed daily. No hand-picked list. Strategy V1 and the initial application have no
active-instrument path for ETFs, crypto, or other markets ([ADR 0020](../decisions/0020-strategy-v1-common-equities-only.md)).

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

## 3. Direction — long only

**Sonde takes long positions only.**

Code `P` purchases were measured. Code `S` sales were not — and insider selling is far noisier, since
executives sell for diversification, tax, and pre-scheduled 10b5-1 reasons that carry no view at all.
Shorting on an unmeasured signal, with borrow costs and unbounded loss, is not a trade this project
has earned.

Pleasant side effect: long-only makes the conflicting-signal problem nearly disappear.

## 4. Position rules

| Rule                     | Value                                                  | Basis                                                        |
| ------------------------ | ------------------------------------------------------ | ------------------------------------------------------------ |
| Sizing target            | 1% of paper equity, floored to whole shares            | Conservative launch rule; not confidence-weighted            |
| Position breach          | 1.25% of paper equity after fill                       | Blocks new entries for review; never auto-flattens           |
| Signal horizon           | Entry open → close 20 subsequent sessions later        | Exact measured horizon; entry session is index 0             |
| Max concurrent positions | 20                                                     | Derived: 3.4/week × 21 sessions ≈ 14 expected, with headroom |
| One position per name    | Yes; later signals are scored, but never add or extend | Keeps signal evaluation independent from portfolio state     |
| Strategy exit            | Horizon close only                                     | No stop, take-profit, or thesis-decay exit was measured      |
| Decision Cutoff          | 09:20 America/New_York on the executable session       | Eight-minute opening-auction submission buffer               |
| Entry order              | Whole-share market-on-open (`market` + `opg`)          | Matches the measured open; no fractional auction orders      |
| Exit order               | Whole-position market-on-close (`market` + `cls`)      | Matches the canonical horizon close                          |

**Expected deployment is low by design.** Fourteen concurrent positions at the 1% target is roughly
14% of paper equity at work before sector and portfolio limits. The fixed target is deliberately
boring: Sonde does not yet have event-level confidence calibration that would justify varying it.
Quantity is floored using the valid pre-cutoff sizing price. If one share exceeds the target, the
Signal is scored but the planner records `below_minimum_order` and makes no proposal. Sonde operates
cash-like and never sizes from margin buying power.

A signal outcome always measures the canonical open-to-horizon-close strategy, even when no order
was placed or the paper venue filled differently. Execution outcomes record the separate broker
truth. Forced broker or corporate-action closures are execution exceptions, not silent changes to
the strategy definition.

A later qualifying Decision Window for an already-held company emits and resolves an independent
signal. The planner appends a no-proposal decision with `already_held` as its reason; it neither adds
size nor moves the existing position's exit.

Any opening-auction fill becomes the position; Sonde lets an unfilled remainder cancel and does not
chase it after the open. A close-auction rejection, unfilled order, or incompatible fractional
residue follows the deterministic fallback policy until the broker position is flat. Each departure
from the auction-aligned path is an Execution Exception, never a change to the Signal.

## 5. Correlation groups

Fourteen concurrent positions can easily be one bet. Insider buying clusters — a sector selloff
prompts executives across that sector to buy at once, and Sonde would happily open eight positions
in the same industry on the same week.

**Grouping uses SEC SIC codes**, available free from `data.sec.gov` submissions, which the filing
probe already reaches. No vendor classification needed.

| Rule                              | Value | Basis     |
| --------------------------------- | ----: | --------- |
| Max positions per SIC major group |     6 | **Guess** |

There is no separate sector-exposure percentage in Strategy V1. Six positions at the 1% Sizing
Target give 6% nominal exposure; whole-share and auction-price variance is governed by the separate
Position Breach Threshold rather than a duplicate sector rule.

> **Not measured:** how often qualifying events actually cluster by sector and date. This is
> answerable from data already downloaded and is the next cheap spike.

## 6. Cold start

The study supplies a **bootstrap prior**, not event-level confidence:

| Cohort                 | Prior win rate | Prior median |
| ---------------------- | -------------: | -----------: |
| Multi-insider, liquid  |          58.3% |       +1.83% |
| Single insider, liquid |          50.2% |       +0.07% |

Bootstrap priors are labelled separately in the scoreboard and never used to size an individual
entry. Confidence may affect strategy policy or sizing only after forward outcomes calibrate a
specific producer and an operator explicitly promotes that behavior.

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

|                                      | Why                                                         |
| ------------------------------------ | ----------------------------------------------------------- |
| Short positions                      | Unmeasured signal, borrow cost, unbounded loss              |
| Options, futures, leverage           | Not needed; adds failure modes the design has no answer for |
| Penny stocks and OTC                 | Outside Strategy V1; any future detector is non-trading     |
| Commodity ETFs and other instruments | No Strategy V1 entry path or active-instrument support      |
| Crypto                               | Outside the initial application                             |
| Anything below $20m ADV              | Effect dilutes; spreads consume it                          |
| Anything on a single insider filing  | Measured at +0.07% — indistinguishable from nothing         |
| Real money                           | ADR 0003; requires a new superseding ADR                    |

## 8. Open, and honest about it

- **Survivorship bias** in the founding study is unquantified and flatters the result. Live forward
  trading is the fix, since a position opened today is opened in a company that exists.
- **No cost model.** A 20-session mid-cap hold should survive spread and fees, but "should" is doing
  work there.
- **The fixed launch size and correlation cap remain open to forward evidence.**
- **Corroboration is untested.** The entire multi-probe architecture is, for now, a measurement
  apparatus for a hypothesis rather than a requirement for trading.
- **Other instruments require a separately evidenced strategy and architecture decision.**

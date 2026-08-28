# Anatomy of a trade

One event, traced end to end. This document is the design's integration test: every gap in the
strategy layer shows up here as a sentence that cannot be written without inventing a rule.

Rules invented along the way are marked **[PROPOSAL]** and carry a rationale. They are proposals,
not decisions — each becomes a settled rule in `charter.md` or `position-lifecycle.md` once agreed.

---

## Setup

Sonde has been running three weeks. Paper account, €10,000 notional. Twelve assets in the universe.
No open positions. It is Tuesday.

## The four evidence classes

Corroboration only means something if the sources are actually independent. Forty outlets carrying
one Reuters story is **not** four corroborating sources — it is one story, which is why clustering
runs before triage (ADR 0011).

Independence is therefore defined across _classes of evidence_, not across outlets:

| Class       | What it is                              | Why it is independent                  |
| ----------- | --------------------------------------- | -------------------------------------- |
| `venue`     | Exchange announcements, listings, halts | First-party fact, not commentary       |
| `chain`     | On-chain flows, TVL, exchange balances  | Mechanical; expensive to fake at scale |
| `attention` | Social mention velocity vs baseline     | The crowd, measured rather than read   |
| `editorial` | Reported news — GDELT, RSS              | Curated third-party reporting          |

> **[PROPOSAL] GDELT and RSS are one class, not two.** Both are journalists reporting the same
> world, frequently the same wire copy. Counting them separately would manufacture corroboration
> out of syndication — the exact failure clustering exists to prevent.

This reuses `trustClass` from `@sonde/core`, which now earns a second job: it was introduced to mark
attacker-authored text, and it also happens to be the independence axis.

---

## 14:03:12 — first evidence

`probe:kraken-announcements` (RSS, Tier A) pulls a new item.

```
Kraken will list XYZ on 2026-09-01. Deposits open 2026-08-30.
```

- Raw payload stored, content-hashed, **before** anything is derived from it
- `occurredAt` 14:02:40 (feed `pubDate`), `observedAt` 14:03:12
- `trustClass: official`, evidence class `venue`, `assets: [crypto:XYZ]`
- Clustering finds no near-duplicate — a single-outlet cluster

**One class is not a thesis.** Sonde opens a **thesis candidate** for `crypto:XYZ` and starts a
corroboration window. Nothing is proposed. Nothing is traded.

> **[PROPOSAL] Corroboration window is 6 hours.** Long enough for a slow on-chain poll or an
> attention build to arrive; short enough that unrelated events a day apart are not welded into a
> false thesis. Evidence older than the window ages out of the candidate.

## 14:03:13 — triage

The announcement arrives in a batch with 14 other items from the last five-minute window. One Haiku
call scores all fifteen — batching is what clears the 4096-token cache floor (ADR 0007) and it costs
about $0.004.

XYZ scores high salience. Escalation flagged, but held: **there is still only one class.**

> The five-minute debounce costs five minutes of latency. On an eight-hour holding period that is
> noise — a fact that only holds because of the strategy chosen. A news-reaction strategy could not
> afford this batching, and would cost roughly ten times as much per day.

## 14:04:50 — second evidence, and the first genuinely hard call

`probe:onchain` reports XYZ net exchange inflow at **+240% versus its 7-day baseline**.

A rules engine scores this bearish without hesitating: coins moving _onto_ exchanges is supply
arriving to be sold. That is the textbook reading and here it is probably wrong — inflow ahead of a
listing announcement is market makers positioning to provide liquidity.

**This is the case for an LLM in the loop.** Not sentiment reading, which is largely commoditised —
context-dependent interpretation of a structured signal whose meaning inverts based on a fact
carried by a different source class.

> **[PROPOSAL] Evidence classes carry a direction _and_ an interpretation, not a raw value.**
> The chain probe emits the measurement; assigning direction is the analyst's job, because the
> correct sign depends on context the probe cannot see.

Two classes now agree. **This clears the bar to form a thesis.**

## 14:07:22 — third evidence

`probe:bluesky` reports mention velocity for XYZ at **8× its 7-day baseline**, and flags it
`organic-led`: the median follower count of posting accounts is low, and low-follower posts
_precede_ high-follower ones rather than following them.

> **Assumes:** organic-versus-amplified is separable from follower counts and post ordering alone.
> Plausible, unvalidated. Confirmed or refuted by comparing the organic flag against realized
> outcomes once the scoreboard has resolved signals — a flag that does not move the hit rate is a
> flag to delete.

Third class. Confidence rises rather than the thesis changing.

## 14:08:01 — deep read

Three classes inside five minutes crosses the escalation threshold. Opus is called once, and sees:

- the announcement text (`official`)
- the on-chain series with its 7-day baseline (`chain`)
- the attention series and a sample of posts — **delimited and marked adversarial** (`attention`)
- current price, spread, and 24h volume for XYZ
- open positions and remaining risk budget

It returns a `Signal`:

```
asset       crypto:XYZ
direction   long
confidence  0.71
horizon     PT8H
rationale   Kraken listing confirmed for Sep 1 with deposits opening Aug 30. Exchange
            inflow of +240% vs baseline is consistent with market makers positioning
            for the listing rather than distribution — the flow began after the
            announcement, not before it. Attention is 8x baseline and organic-led.
sourceIds   [venue-obs, chain-obs, attention-obs]
```

Cost: roughly $0.05. Note the rationale reasons about _ordering_ — flow began after the
announcement — which is exactly the discrimination that makes the inflow bullish rather than
bearish.

> **[PROPOSAL] Confidence is composed, not invented.** The analyst proposes a confidence; the
> portfolio layer recomputes it from class count and each class's _measured_ historical hit rate,
> and the lower of the two is used. Until the scoreboard has data, bootstrap weights apply:
> 2 classes → cap 0.6, 3 classes → cap 0.75, 4 classes → cap 0.85. A single model call should not be
> able to talk itself into a large position.

## 14:08:02 — proposal and gate

> **[PROPOSAL] Size = 2% of equity × confidence, hard cap 2%.** Confidence is only meaningful if it
> moves size. The cap means a miscalibrated 0.95 still risks no more than 2%.

0.71 × 2% = **1.42%** → €142.

The gate runs, deterministically, with no model anywhere near it:

| Check                                        | Result                                        |
| -------------------------------------------- | --------------------------------------------- |
| Position cap ≤ 2%                            | 1.42% — pass                                  |
| Correlation group exposure                   | XYZ not in `majors`; no group exposure — pass |
| Daily loss halt                              | none today — pass                             |
| Order rate ≤ 20/h                            | third this hour — pass                        |
| Liquidity sanity: order < 0.5% of 24h volume | pass                                          |

**ACCEPTED.** Order submitted with an idempotency key derived from the proposal id. Paper fill at
14:08:04.

---

## 16:30 — the thesis weakens

Attention decays to 2× baseline. The thesis that opened this position was three classes; it is now
effectively two.

**The trace cannot continue without a rule that does not exist.** This is the largest hole the
walkthrough exposed, and it splits into two questions: does decaying evidence close a position, and
is the signal's horizon also the holding period?

> **[PROPOSAL] Exit on whichever comes first:**
>
> 1. **Horizon expiry** — the signal claimed PT8H; at 22:08 the claim is spent
> 2. **Thesis decay** — evidence falls below two concurrent classes
> 3. **Stop** — a hard adverse move, percentage to be set in `position-lifecycle.md`
>
> Explicitly **no take-profit**. A take-profit level is a fitted parameter and there is no data to
> fit it against; adding one now would be inventing a number and calling it a rule.

> **[PROPOSAL] Horizon is the holding period.** Keeping the prediction horizon and the holding
> period identical means the scoreboard measures exactly what was traded. Decoupling them is
> defensible later, but it makes every scored number one step removed from the position that was
> actually held.

## 22:08 — exit and scoring

Horizon expires. Position closed at market. A `SignalResult` is written **once**:

```
priceAtSignal        0.4120
priceAtHorizon       0.4398
realizedReturn       +0.0675
directionallyCorrect true
```

> **[PROPOSAL] `flat` scores against a dead band of ±0.5%.** Without one, `flat` is almost never
> correct and the direction becomes useless as an output.

The scoreboard credits each contributing class. Over months this is the interesting artefact: not
whether Sonde made money, but whether `chain` evidence outperforms `attention` evidence, and whether
three-class theses genuinely beat two-class ones — the assumption the entire strategy rests on.

---

## What the trace exposed

Nine rules had to be invented to finish one trade. Each is a proposal above and needs settling:

| #   | Question                                      | Proposed                                                               |
| --- | --------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | What counts as independent evidence?          | Four classes; GDELT + RSS are one                                      |
| 2   | How long does corroboration stay valid?       | 6-hour window                                                          |
| 3   | Minimum classes to form a thesis?             | 2                                                                      |
| 4   | Who assigns direction to a structured signal? | The analyst, not the probe                                             |
| 5   | How is confidence computed?                   | Composed and capped by class count; measured weights after Milestone 3 |
| 6   | Position sizing?                              | 2% × confidence, hard cap 2%                                           |
| 7   | Exit conditions?                              | First of horizon / thesis decay / stop; no take-profit                 |
| 8   | Is horizon the holding period?                | Yes, initially                                                         |
| 9   | Dead band for `flat`?                         | ±0.5%                                                                  |

Still unanswered, deferred to `charter.md`:

- **Universe** — which twelve assets, and on what criteria
- **Conflicting signals** — a `short` arrives while a `long` is open
- **Correlation groups** — which assets count as one bet
- **Cold start** — Sonde's first weeks have no measured class weights to compose confidence from

# Anatomy of a trade

One event, traced end to end. This document is the design's integration test: every gap in the
strategy layer shows up here as a sentence that cannot be written without inventing a rule.

Rules invented along the way are marked **[PROPOSAL]** and carry a rationale. They are proposals,
not decisions — each becomes a settled rule in `charter.md` or `position-lifecycle.md` once agreed.

> **Rewritten 2026-08-27** for US equities ([ADR 0014](../decisions/0014-equities-and-commodity-etfs-primary.md)).
> The previous version traced a crypto listing and rested on a pre-listing window that
> [does not exist](../research/source-viability.md). The rewrite exists to test the claim that
> replaced it — that equity market hours supply a corroboration window for free. **That claim
> survives, but not for free: see 09:30.**

---

## Setup

Alpaca paper account, $10,000 notional. Universe of forty US equities and six commodity ETFs. No
open positions. It is Tuesday, and the market closed ninety minutes ago.

## The mechanic

Crypto never closes, so an event and its price reaction are simultaneous — a corroboration strategy
there is always arriving after the move. US equities close at 16:00 ET and reopen at 09:30 ET the
next day. **Anything that happens in between cannot be acted on by anyone.**

That is seventeen and a half hours in which evidence accumulates and nobody can trade on it. Sonde's
central requirement — time to let independent evidence agree — is a property of the market rather
than something to be engineered.

## The four evidence classes

| Class       | What it is                                       | Source                   |
| ----------- | ------------------------------------------------ | ------------------------ |
| `filing`    | Mandated disclosure — Form 4, 8-K, congressional | SEC EDGAR, House/Senate  |
| `editorial` | Reported news                                    | GDELT, RSS               |
| `attention` | Social mention velocity vs baseline              | Bluesky firehose, Reddit |
| `macro`     | Rates, commodity curves, sector moves            | FRED, ETF prices         |

---

## 16:47 ET — the filing

`probe:edgar` polls EDGAR's `getcurrent` feed. A **Form 4** for a mid-cap industrial:

```
Reporting person   [CFO]
Transaction code   P  — open-market purchase
Shares             12,400 @ $27.41   ($339,884)
Post-transaction   holdings +18%
```

**The transaction code is the entire signal.** Form 4 traffic is overwhelmingly codes `A` (grant),
`M` (option exercise), and `F` (shares withheld for tax) — that is compensation machinery, not
conviction. Code `P` is an executive spending their own money on the open market.

A naive "insider buying" probe that ignores codes is measuring payroll. This is the equity analogue
of the crypto inflow problem from the previous draft: the raw event is meaningless until something
interprets it.

> **[PROPOSAL] The filing probe filters on transaction code and emits `A`/`M`/`F` as observations
> but never as evidence.** They are stored — a pattern of grants preceding a purchase may matter —
> but they cannot contribute to a thesis.

One class. A thesis candidate opens with a corroboration window. Nothing is proposed.

## 17:02 ET — a second insider, and a hole in my own rule

A second Form 4, code `P`, from a **different reporting person** — a director, $96,000.

Two executives independently deciding to buy is meaningfully more than one. But both are `filing`
class, and the rule from the previous draft was **"two distinct classes."** Under that rule this
does not corroborate at all.

The rule was wrong. Class was standing in for independence, and it is only a proxy.

> **[PROPOSAL] Independence is causal, not categorical.** Two pieces of evidence corroborate when
> neither is _downstream of_ the other. Two insiders filing separately are independent decisions by
> different people and count separately. A news article about a filing is downstream of it and does
> not. Class remains a useful default grouping, but the test is causal origin.

Under the corrected rule: **two independent pieces of evidence.** The thesis forms.

## 18:20 ET — evidence that correctly does not count

A wire story: _"[Company] insiders buy shares after guidance cut."_ GDELT carries it, and by 19:40
it has been syndicated to eleven outlets.

Clustering collapses eleven copies into one event ([ADR 0011](../decisions/0011-source-acquisition-policy.md)),
and then the causal-independence rule rejects that event as evidence: **it is a report of the filing
Sonde already has.** It contributes nothing.

It is still stored, still shown on the tape, and still useful — outlet count is a decent proxy for
how widely the fact has propagated, which bears on whether the market has already digested it by the
open. But it does not corroborate.

> This is the rule working. Under the old class-based test, `filing` + `editorial` would have cleared
> the bar on what is a single fact counted twice — precisely the failure the equities pivot was
> supposed to fix.

## 21:40 ET — attention, mostly derivative

Bluesky and Reddit mention velocity reaches 4× baseline. Sampling the posts, most link the wire
story — derivative again. A minority reference a separate thread: a supplier contract rumour that
predates the filing by two days.

> **[PROPOSAL] Attention is split into derivative and independent components before it counts.**
> Posts that cite, link, or paraphrase evidence Sonde already holds are derivative. Only the
> residual counts, and only if it clears the velocity threshold on its own.

The residual does not clear it. **Attention contributes nothing tonight.** Two independent pieces of
evidence stand.

## 06:15 ET — macro, genuinely exogenous

Pre-market: the industrials sector ETF is up 1.1%, and a FRED series shows a rate expectation shift
overnight. Neither has anything to do with this company.

> **[PROPOSAL] `macro` is a modifier, not a corroborator.** Sector tailwind does not make an
> insider purchase more informative — it moves the whole sector, including companies where nobody
> bought anything. It adjusts sizing and it can veto, but it cannot form or strengthen a thesis.

Applied as a mild tailwind. Thesis unchanged at two independent pieces.

## 09:25 ET — deep read

Five minutes before the open, Opus is called once and sees the assembled thesis: both Form 4s with
codes and amounts, the derivative editorial cluster with its outlet count, the attention split, the
macro context, and last night's close with pre-market indication.

```
asset       equity:XXXX
direction   long
confidence  0.64
horizon     P3D
rationale   Two insiders, a CFO and a director, made open-market purchases (code P)
            within fifteen minutes of each other on the same afternoon, following a
            guidance cut. The CFO's stake rose 18%. Press coverage is derivative of
            the filings rather than independent, and social attention is largely
            downstream of that coverage, so the market has had one news cycle to
            digest this. Sector is a mild tailwind.
```

Note what the model does with the derivative evidence: it does not treat it as confirmation, it
treats it as **evidence the information has already propagated** — which argues for lower confidence,
not higher. That is the reasoning the corroboration design is trying to buy.

Cost: roughly $0.05. One deep call for a thesis that took seventeen hours to assemble.

## 09:30 ET — the overnight window is not free

The stock opens at **$29.05**. Last night's close was $27.38. **It gapped +6.1%.**

The thesis was built on a $27.41 purchase price. Entering at $29.05 means buying meaningfully above
where the insiders bought, and a large part of the move the thesis predicted has already happened —
in a print nobody could trade.

**This is what the overnight window costs.** Crypto gives no time to think but lets you act at the
price you reasoned about. Equities give seventeen hours to think and then reprice the asset before
you can act. The window is real, and so is the toll.

> **[PROPOSAL] A gap guard in the risk gate.** If the open gaps beyond a threshold from the
> reference price the thesis was built on, the proposal is rejected as stale rather than chased.
> Threshold to be set in `position-lifecycle.md`; it is a genuine parameter and should be measured
> rather than guessed.
>
> This belongs in the **gate**, not the analyst. It is a deterministic, checkable condition, and a
> model asked "has this moved too much?" will sometimes talk itself into yes.

Assume the guard is set at 4%. The proposal is **rejected**. Sonde logs the thesis, the reasoning,
the gap, and the rejection — and takes no position.

**The most instructive path through this system ends in not trading.** The rejection is rendered on
the dashboard next to the fills, because a thesis that was right about direction and unusable on
price is exactly the thing worth seeing.

## 09:30 ET — the counterfactual

Had the stock opened at $27.60, a +0.8% gap:

- Gap guard passes
- Sizing: **[PROPOSAL] 2% of equity × confidence** → 0.64 × 2% = 1.28% → $128
- Correlation group `industrials` has no existing exposure — pass
- Order rate, daily loss, liquidity sanity — pass
- **ACCEPTED**, market order at the open, idempotency key from the proposal id

## Exit and scoring

Horizon `P3D` — three trading days, closing Friday. **Calendar duration and trading duration are not
the same thing**, which crypto never forced anyone to notice.

> **[PROPOSAL] Horizons are in trading days, not calendar time.** `P3D` spanning a weekend resolves
> after three _sessions_. A horizon that expires while the market is shut is meaningless, and a
> scoreboard that measures across a closed market is measuring nothing.

Exit on whichever comes first: horizon expiry, thesis decay below the entry bar, or a hard stop. No
take-profit — it is a fitted parameter and there is nothing to fit it against.

A `SignalResult` is written once, and the scoreboard credits each contributing piece of evidence.
The interesting long-run question is not the P&L: it is whether code-`P` filings outperform, whether
multi-insider clusters beat single ones, and whether the gap guard rejected trades that would have
worked — which is measurable, because rejections are logged with everything needed to score them
counterfactually.

---

## What the trace exposed

| #   | Question                                       | Proposed                                                        |
| --- | ---------------------------------------------- | --------------------------------------------------------------- |
| 1   | What makes evidence independent?               | **Causal, not categorical** — corrected from the previous draft |
| 2   | Which Form 4 codes count?                      | `P` only; `A`/`M`/`F` stored, never evidence                    |
| 3   | Does reporting corroborate the thing reported? | No — derivative, but outlet count informs propagation           |
| 4   | Does derivative social count?                  | Only the residual after removing posts citing known evidence    |
| 5   | What role does `macro` play?                   | Modifier and veto, never a corroborator                         |
| 6   | What happens when the open gaps?               | Gate-level gap guard; reject rather than chase                  |
| 7   | Sizing                                         | 2% × confidence, hard cap 2%                                    |
| 8   | Exit                                           | First of horizon / decay / stop; no take-profit                 |
| 9   | Horizon units                                  | **Trading days, not calendar days**                             |

Still open, deferred to `charter.md`:

- **Universe** — which forty equities and six ETFs, on what criteria
- **Conflicting signals** — a `short` thesis forms while a `long` is open
- **Correlation groups** — sector definitions, and whether ETFs collide with their holdings
- **Cold start** — no measured evidence weights, and the attention baseline needs weeks of firehose
- **Gap guard threshold** — a real number, to be measured rather than invented
- **Pre-market and extended hours** — currently ignored entirely; acting at 09:30 is a choice, not a
  given

## Assumption register

| ID  | Assumption                                                   | Resolution                                                                                                                                                                                  |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Code-`P` Form 4s carry information                           | Scoreboard, months                                                                                                                                                                          |
| A2  | Multi-insider clusters beat single filings                   | Scoreboard, months                                                                                                                                                                          |
| A3  | Derivative attention is separable from independent attention | Needs real post data — untested                                                                                                                                                             |
| A4  | Overnight gaps are usually small enough to trade through     | **Directly measurable now** from historical opens against filing dates. Highest-value next spike — if most filing-driven theses gap past the guard, the strategy is unworkable in this form |
| A5  | EDGAR `getcurrent` latency is seconds, not minutes           | Untested; one afternoon of polling settles it                                                                                                                                               |

# Roadmap

Milestones are ordered by dependency, not ambition. Each has an exit criterion that is
**observable** — something you can look at and say yes or no. A milestone is not done because the
code exists; it is done when the criterion is met.

> **Revised 2026-08-27.** The previous roadmap was written for the crypto/corroboration design and
> put the first analyst at Milestone 2. Two things changed it: the market moved to US equities
> ([ADR 0014](./decisions/0014-equities-and-commodity-etfs-primary.md)), and the
> [filing study](./research/insider-filing-gap-study.md) measured an edge in a signal that is
> **entirely deterministic**. The model now enters at Milestone 6 with a specific job and a baseline
> to beat, rather than sitting in the entry path on the assumption it belongs there.

**Two rules govern the ordering:**

1. **Measurement precedes action.** Scoring is built before anything can trade.
2. **No model call until the deterministic baseline is running and scored.** Otherwise there is
   nothing to compare the model against, and "did the LLM help?" becomes unanswerable.

---

## Milestone 0 — Pipe

**Goal:** the two probes that matter, flowing into storage, visible on screen. No intelligence.

- `@sonde/probes`: **EDGAR probe** — poll `getcurrent`, filter Form 4 code-`P`, group by issuer and
  filing date, keep clusters of two or more
- `@sonde/probes`: **Alpaca price probe** — daily bars, rolling 20-session median dollar volume
- Shared fetch layer with **per-source profiles** — user agent, rate ceiling, conditional requests
  ([research](./research/source-viability.md) found SEC requires a declared contact, not just a rate limit)
- `apps/web`: a chart and a probe-health panel

**Exit:** a filing cluster appearing in the UI within minutes of hitting EDGAR, next to a price chart
Sonde populated itself.

## Milestone 1 — Signal

**Goal:** the measured signal, emitting `Signal` records. Still no trading.

- Deterministic signal engine: cluster + liquidity gate → `Signal`
- Bootstrap confidence from the study's base rates (58.3% multi-insider, 50.2% single), **labelled
  as priors** so they are never mistaken for measured performance
- SIC major group attached from `data.sec.gov` for correlation grouping
- Live tape UI — signals as they form, expandable to the filings that caused them

**Exit:** a week of live signals whose count and cadence match the study's ~3.4/week. If the rate is
badly off, the implementation disagrees with the research and one of them is wrong.

## Milestone 2 — Scorekeeping

**Goal:** know whether any of it means anything. **The milestone that makes the project honest.**

- Signal resolution at 20 trading sessions against realized price
- `signal_results`, written once
- Scoreboard: hit rate and calibration, segmented by cluster size, liquidity band, and SIC group
- Comparison against the study's out-of-sample figures — does live match history?

**Exit:** enough resolved signals to state whether live behaviour tracks the +1.83% / 58.3% baseline.

> Deliberately before any order is placed. Building execution before measurement is how you end up
> trading a signal you never checked — and here it doubles as the survivorship check the historical
> study could not do.

## Milestone 3 — Gate

**Goal:** the safety layer, built and tested before anything can use it.

- `@sonde/risk`: position cap, daily loss halt, order rate, sector cap (**6 per SIC major group**),
  liquidity sanity, kill switch, dead-man's switch
- Property tests and adversarial cases: absurd sizes, NaN prices, duplicate ids, clock skew
- Gate decisions logged with reasons and rendered in the UI
- Dependency rule enforced: `risk` cannot import `agents`

**Exit:** a test suite demonstrating every limit rejecting, and a "Blocked" panel in the UI.

## Milestone 4 — Hands

**Goal:** paper trading, end to end.

- `@sonde/venue`: Alpaca paper adapter with idempotency keys
- Reconciler — venue as source of truth, drift detection and halt
- Entry at the open of the session after the filing; exit at horizon expiry
- Full trade detail: filings → signal → gate decision → fill → outcome

**Exit:** an unattended fortnight with orders flowing, at least one gate rejection logged, and every
trade traceable to the filings that caused it.

## Milestone 5 — Watch

**Goal:** make it worth leaving open.

- Time-travel replay
- Cost dashboard against budget
- "What it decided not to do" — blocked and near-miss signals with counterfactual scoring
- Alerting to Telegram or Slack on halts, drift, and probe failure

**Exit:** the dashboard is the thing you actually open, not the logs.

## Milestone 6 — Corroboration

**Goal:** the model enters, with a job and a baseline to beat.

The charter demoted cross-source corroboration from launch condition to open hypothesis. This is
where it gets tested.

- `@sonde/probes`: GDELT, RSS, Bluesky firehose, FRED — the evidence classes that were deferred
- Near-duplicate clustering before triage
- `@sonde/agents`: triage (Haiku 4.5, batched) and a corroboration analyst (Opus 5) that reads the
  evidence around each filing cluster and judges whether it supports or undercuts the thesis
- **The model's judgment is scored separately from the signal.** It does not gate entry initially —
  it annotates, and the scoreboard measures whether its annotations carry information

**Exit:** enough resolved signals to answer, with evidence, whether corroboration improves outcomes.
A negative answer is a real result and gets written up as one.

> The attention class needs weeks of firehose before its baseline means anything
> ([research](./research/source-viability.md)), so **its collector should start running during
> Milestone 0**, long before it can contribute.

## Milestone 7 — Iterate

**Goal:** the honest version of "teaching it".

- Prompt versioning with per-version track records
- Shadow analysts — new prompts scored live without touching order flow
- Promotion on evidence: propose, shadow, compare on resolved signals, promote or discard
- If Milestone 6 showed corroboration helps, promote it from annotation to entry condition

**Exit:** a change promoted on evidence rather than on a hunch.

---

## Beyond

Deliberately unscheduled, listed so they are not mistaken for oversights:

- **Real capital.** Requires an ADR superseding [0003](./decisions/0003-paper-first-execution.md), a
  positive live track record, and a sum that can be lost entirely.
- **Penny stocks and OTC — detection, not participation.** Wanted, deferred. Sonde would flag
  coordinated attention spikes in illiquid names and score them as predictions of manipulation,
  never taking a position. Reuses the attention machinery Milestone 6 builds, so the marginal cost
  is a scoreboard panel. Needs its own ADR.
- **Commodity ETFs.** In market scope per ADR 0014 but with **no entry path** — ETFs have no
  insiders. Needs a `macro`-driven rule that earns its way in.
- **Short signals.** Code-`S` filings were never measured; insider selling is dominated by
  diversification, tax, and 10b5-1 schedules.
- **ML components.** Narrow models for sizing or regime, only once the scoreboard can prove they
  help.

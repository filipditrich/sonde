# Roadmap

Milestones are ordered by dependency, not ambition. Each has an exit criterion that is
**observable** — something you can look at and say yes or no. A milestone is not done because the
code exists; it is done when the criterion is met.

> **Revised 2026-08-30.** The previous roadmap was written for the crypto/corroboration design and
> put the first analyst at Milestone 2. Two things changed it: the market moved to US common
> equities ([ADR 0020](./decisions/0020-strategy-v1-common-equities-only.md)), and the
> [filing study](./research/insider-filing-gap-study.md) measured an edge in a signal that is
> **entirely deterministic**. The model now enters at Milestone 6 with a specific job and a baseline
> to beat, rather than sitting in the entry path on the assumption it belongs there.

**Two rules govern the ordering:**

1. **Measurement precedes action.** Scoring is built before anything can trade.
2. **No model call until the deterministic baseline is running and scored.** Otherwise there is
   nothing to compare the model against, and "did the LLM help?" becomes unanswerable.

"Scored" means the forward resolver and scoreboard work on real emitted signals. It does not mean
the sample must already be statistically meaningful before paper execution begins; paper orders are
themselves part of forward evidence collection.

---

## Milestone 0 — Pipe

**Goal:** the two probes that matter, flowing into storage, visible on screen. No intelligence.

- `@sonde/probes`: **EDGAR acquisition** — poll `getcurrent`; append each Acquisition Attempt,
  retain immutable content-addressed Source Documents for every Form 4, and parse typed Source Facts
  for every transaction. Acquisition does not discard non-`P` filings on strategy grounds.
- `@sonde/probes`: **Alpaca price probe** — delayed consolidated SIP daily bars, rolling 20-session
  median dollar volume, and an entitlement check that fails readiness rather than falling back to
  IEX
- Shared fetch layer with **per-source profiles** — user agent, rate ceiling, conditional requests
  ([research](./research/source-viability.md) found SEC requires a declared contact, not just a rate limit)
- `apps/web`: the authenticated operations cockpit's real Milestone 0 panels—candidate funnel,
  recent Source Facts, and source/market-data health

**Exit:** a filing cluster appears in the cockpit within minutes of hitting EDGAR, every displayed
count matches its stored population, and stale collection is visibly distinguishable from a quiet
source.

## Milestone 1 — Signal

**Goal:** the measured signal, emitting `Signal` records. Still no trading.

- Deterministic strategy: code-`P` Source Facts → Decision Window candidate → Eligibility Decision →
  `Signal`
- Append Candidate Snapshots as filings arrive; at the pre-open Decision Cutoff, emit at most one
  final Signal per company and Decision Window. Late filings enter the next window.
- Freeze a Decision Packet with typed Input References to the exact calendar, universe, market data,
  policy, and candidate state used; issuer identity is SEC CIK, not ticker
- Bootstrap cohort statistics from the study, labelled as priors and kept separate from event-level
  confidence
- Reproduce the founding-study cohort with both the historical 21-bar liquidity slice and Strategy
  V1's exact 20-bar rule; document cadence, membership, and metric differences before treating the
  study rate as an implementation oracle
- SIC major group attached from `data.sec.gov` for correlation grouping
- Live tape UI — signals as they form, expandable to the filings that caused them

**Exit:** a week of live signals whose count and cadence match the study's ~3.4/week. If the rate is
badly off, the implementation disagrees with the research and one of them is wrong.

## Milestone 2 — Scorekeeping

**Goal:** know whether any of it means anything. **The milestone that makes the project honest.**

- Signal resolution from the entry open to the close 20 subsequent sessions later, using the
  documented total-return and corporate-action method
- Append one terminal Signal Outcome—resolved or explicitly unresolvable with a visible reason;
  never silently exclude missing or delisted cases
- Strategy Scorecard over every final Signal, led by median excess return against the date-matched
  point-in-time eligible-universe median; include raw return, mean, hit rate, tails, resolution
  coverage, unresolvable outcomes, and SIC-group and SPY comparisons
- Comparison against the study's out-of-sample figures — does live match history without a rising
  market or one sector carrying it?

**Exit:** at least one live signal has resolved end to end, its write-once outcome is reproduced by
the scoreboard, and unresolved signals cannot leak future outcomes. Statistical sufficiency is not
a gate on subsequent paper execution.

> Deliberately before any order is placed. Building execution before measurement is how you end up
> trading a signal you never checked — and here it doubles as the survivorship check the historical
> study could not do.

## Milestone 3 — Gate

**Goal:** the safety layer, built and tested before anything can use it.

- `@sonde/risk`: 1% Sizing Target, 1.25% post-fill Position Breach Threshold, daily loss halt, order
  rate, sector cap (**6 per SIC major group**), liquidity sanity, kill switch, dead-man's switch
- Versioned, decision-specific Data Readiness policy covering the exact calendar, universe,
  market-data, source-completeness, portfolio, and broker inputs required for entry
- Deterministic Portfolio Planner emits a proposal only while Active with passing Data Readiness;
  otherwise it appends a typed no-proposal Planning Decision. Eligible Signals are still scored.
- Property tests and adversarial cases: absurd sizes, NaN prices, duplicate ids, clock skew
- Gate decisions logged with reasons and rendered in the UI
- Dependency rule enforced: `risk` cannot import `agents`

**Exit:** a test suite demonstrating every limit rejecting, and a "Blocked" panel in the UI.

## Milestone 4 — Hands

**Goal:** paper trading, end to end.

- `@sonde/venue`: Alpaca paper adapter with idempotency keys
- Trade-update stream for immediate events plus query-first REST reconciliation at startup, before
  market actions, after ambiguous requests, after auctions, and periodically
- Entry at the Decision Window's next executable regular-session open; strategy exit at the close
  20 subsequent sessions later (entry session is index 0)
- Whole-share market-on-open entry staged after the 09:20 ET cutoff; retain partial fills and never
  chase after the auction. Whole-position market-on-close exit with deterministic, recorded fallback
  until flat.
- Full trade detail: filings → signal → gate decision → fill → outcome

**Exit:** an unattended fortnight with orders flowing, at least one gate rejection logged, and every
trade traceable to the filings that caused it.

## Milestone 5 — Watch

**Goal:** make it worth leaving open.

- Forensic Replay from captured Decision Packet inputs and separately labelled Reconstruction Replay
  against corrected or newly fetched data, with field-level differences
- Three distinct performance series: canonical Signal Outcomes, raw paper Execution Outcomes, and
  versioned Realism Outcomes estimating costs and effects omitted by Alpaca paper
- Model usage and cost attribution by behavior, provider, and period, with no automatic budget cap
- "What it decided not to do" — blocked and near-miss signals with counterfactual scoring
- Durable in-app alerts plus Telegram for urgent halts, breaches, missed deadlines,
  reconciliation drift, ambiguous broker responses, and readiness failures near cutoff

**Exit:** the dashboard is the thing you actually open, not the logs.

## Milestone 6 — Corroboration

**Goal:** the model enters, with a job and a baseline to beat.

The charter demoted cross-source corroboration from launch condition to open hypothesis. This is
where it gets tested.

- `@sonde/probes`: GDELT, RSS, Bluesky firehose, FRED — the evidence classes that were deferred
- Deterministic source selection, near-duplicate removal, aggregation, and token bounds before one
  high-quality candidate-level analyst call through a narrow provider adapter
- Analyst Annotations emit `supports`, `undercuts`, or `neutral`; probability of beating the Primary
  Benchmark; magnitude band; rationale; uncertainty; and typed Evidence Relations
- Exact Analyst Behavior Version and immutable request, response, validation, usage, latency, and
  failure artifacts. No triage tier until measured volume or cost earns one.
- **The model's judgment is scored separately from the Signal.** It does not gate entry initially;
  it annotates, and the scoreboard measures calibration and economic information.

**Exit:** enough resolved signals to answer, with evidence, whether corroboration improves outcomes.
A negative answer is a real result and gets written up as one.

> The attention class needs weeks of firehose before its baseline means anything
> ([research](./research/source-viability.md)), so **its collector should start running during
> Milestone 0**, long before it can contribute.

## Milestone 7 — Iterate

**Goal:** the honest version of "teaching it".

- Sealed Evaluation Epochs: freeze each Analyst Behavior Version before its forward outcomes arrive
- Shadow analysts — new behaviors scored live without touching order flow
- Capability-specific promotion: confidence, eligibility reduction, and sizing reduction are
  evidenced and granted independently; model influence can only veto or reduce the deterministic
  baseline initially
- Default promotion floor of 50 resolved Signals and 12 weeks, improved calibration against the
  Bootstrap Prior, positive estimated effect after costs, no material downside deterioration, and
  an append-only authenticated operator Promotion Decision
- Revocation is append-only and forward-effective; no automatic promotion or mutable enable flag

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
- **ETFs, crypto, and other instruments.** Outside the initial application under
  [ADR 0020](./decisions/0020-strategy-v1-common-equities-only.md). Each requires a separately
  evidenced strategy and an explicit architecture decision before it becomes active.
- **Short signals.** Code-`S` filings were never measured; insider selling is dominated by
  diversification, tax, and 10b5-1 schedules.
- **ML components.** Narrow models for sizing or regime, only once the scoreboard can prove they
  help.

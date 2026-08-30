# Glossary

Canonical Sonde domain terms and relationships live in [`../CONTEXT.md`](../CONTEXT.md). This
glossary explains the market and evaluation language used by those terms.

## Market and orders

**Regular session** — the standard US equity session, normally 09:30–16:00 US/Eastern. Sonde uses a
versioned market calendar rather than assuming those times apply every weekday.

**MOO / market-on-open** — a market order intended for the opening auction. Strategy V1 enters with
Alpaca's `market` + `opg` paper order semantics.

**MOC / market-on-close** — a market order intended for the closing auction. Strategy V1 stages
Alpaca's `market` + `cls` paper order semantics for its horizon exit.

**Spread** — the gap between the best bid and ask. Crossing it is an execution cost omitted or
idealized by many paper simulators.

**Slippage** — the difference between an expected reference price and the actual fill. It includes
spread, timing, queue, and market-impact effects.

**Liquidity** — the ability to trade without materially moving price. Strategy V1's eligibility
proxy is median daily dollar volume over exactly twenty completed regular-session SIP bars.

**SIP** — the consolidated US Securities Information Processor feed. Sonde's delayed consolidated
SIP bars are authoritative for decisions; IEX may be shown only as a labelled UI indication.

**OHLCV bar** — open, high, low, close, and volume aggregated for an interval. Timestamps, session,
feed, adjustment status, and Listing identity are part of the bar's meaning.

**Corporate action** — a split, dividend, merger, spin-off, or similar issuer action that changes
how returns must be calculated. Sonde versions its total-return method and marks cases Unresolvable
when it cannot establish a defensible value.

**Long / flat** — long exposure benefits when price rises; flat means no position. Strategy V1 is
long-only.

## Portfolio and execution

**Sizing Target** — desired position value before whole-share rounding. Strategy V1 starts at 1% of
reconciled paper equity and a promoted analyst may only reduce it.

**Position Breach Threshold** — the post-fill exposure boundary that triggers a Halted state. It is
1.25% for Strategy V1 and does not cause automatic liquidation.

**Exposure** — capital subject to market movement. Gross exposure sums absolute position values;
net exposure accounts for direction. Strategy V1 is unlevered and long-only.

**Drawdown** — decline from a prior peak in account equity.

**Partial fill** — only part of an order executes. Strategy V1 keeps an opening partial fill and
does not chase the remainder after the auction.

**Reconciliation** — comparing local projections with authoritative broker REST state and appending
the differences and resulting facts. Streaming broker events are immediate but not authoritative.

**Idempotency key** — stable client order identity used to recognize a retry as the same intent.
After an ambiguous request Sonde queries by this identity before submitting again.

**Paper trading** — simulated execution against real market data. It is useful for operating and
forward evaluation but usually understates spread, queue, impact, rejection, and partial-fill risk.
Sonde records raw paper outcomes separately from versioned Realism Outcomes.

## Evaluation

**Signal Outcome** — the canonical market result of a Signal, whether or not Sonde traded it. For
Strategy V1 it is total return from the entry-session open to the close twenty subsequent sessions
later.

**Primary Benchmark** — the median same-window return of the Signal's frozen, point-in-time eligible
universe. Signal Excess Return is the Signal Outcome minus this benchmark.

**Bootstrap Prior** — the historical cohort rate used as a labelled constant baseline. It is not
event-level confidence and cannot be personalized to a new Signal without forward evidence.

**Hit rate** — fraction of resolved outcomes above a declared threshold, such as positive raw return
or positive Signal Excess Return. The threshold must be stated.

**Calibration** — agreement between predicted probabilities and observed frequencies. A behavior
that predicts 0.7 should see its declared event occur roughly 70% of the time over a suitable sample.

**Brier score / log loss** — proper scoring rules for probabilistic predictions. Lower is better;
both penalize unjustified certainty.

**Forward evaluation** — fixing a strategy or analyst behavior before future observations resolve,
then scoring every eligible result. This is Sonde's basis for analyst promotion.

**Backtest** — applying fixed deterministic rules to historical point-in-time data. Deterministic
components may be backtested. Sonde does not backtest the LLM path because model training data and
behavior make historical isolation unreliable; see
[ADR 0004](./decisions/0004-no-llm-backtests.md).

**Look-ahead bias** — using information unavailable at the decision time. Sonde prevents it with
typed Input References, observed and recorded clocks, frozen Decision Packets, and point-in-time
universe and identity snapshots.

**Survivorship bias** — evaluating only entities or outcomes that remain easy to observe. Sonde
keeps every final Signal in the scorecard and exposes Unresolvable outcomes rather than dropping
them.

**Forensic Replay** — reproducing projections from the exact captured inputs and versions available
then.

**Reconstruction Replay** — recomputing against corrected or newly available data and explicitly
showing differences from the forensic record.

## Operations

**Data Readiness** — a versioned, decision-specific proof that every required input is available,
fresh, authoritative, and internally consistent. It is not one global green light.

**Dead-man condition** — missing expected engine liveness or scheduling evidence. Entry fails closed;
position management continues when possible.

**Pause** — stop new entries while continuing position management, cancellation, reconciliation,
and scoring.

**Halt** — fail-closed operating state caused by a safety or operator action. It blocks new entries
but does not automatically flatten positions.

**Kill switch** — the operator command that enters Halted state. It is not a manual liquidation
button.

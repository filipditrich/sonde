# Sonde Context

Sonde is a personal autonomous paper-trading system that turns point-in-time public information into inspectable market decisions. Its private cockpit exposes what it observed, concluded, proposed, executed, rejected, and later learned.

## Strategy and reasoning

**Strategy**:
A versioned market hypothesis and its rules for forming candidates, emitting signals, and managing positions.
_Avoid_: Bot, plugin

**Insider Cluster Strategy**:
Sonde's first strategy, based on multiple distinct insiders making qualifying open-market purchases in the same eligible company before the same executable market session.
_Avoid_: Sonde strategy, universal strategy

**Candidate**:
A strategy-specific opportunity assembled from observations that has not yet become a market claim or order proposal.
_Avoid_: Event cluster, signal, trade

**Candidate Snapshot**:
An immutable record of one Candidate as it existed after a particular change in its evidence or eligibility state.
_Avoid_: Mutable candidate, signal

**Decision Window**:
The interval whose qualifying observations share the same next executable regular-session open under the market calendar.
_Avoid_: Filing date, UTC day

**Decision Cutoff**:
The 09:20 America/New_York boundary on an executable session at which Strategy V1 closes the Decision Window and may emit one Signal; later observations belong to the next actionable window.
_Avoid_: Signal time, market open

**Decision Packet**:
An immutable manifest frozen at a Decision Cutoff that identifies the exact candidate, policy, calendar, universe, market data, readiness-policy inputs, portfolio, strategy, and model inputs available to that decision path. The downstream Data Readiness artifact references this packet; the packet cannot reference its own result.
_Avoid_: Database snapshot, current state

**Reporting Owner**:
A Section 16 filer identified by reporting-owner CIK; Strategy V1 counts each distinct reporting owner once per candidate regardless of whether it is a person or institution.
_Avoid_: Filing, insider name

**Signal**:
An immutable prospective market claim emitted by a strategy, with a direction, horizon, rationale, and traceable evidence.
_Avoid_: Analyst output, recommendation, order

**Market Horizon**:
A market-calendar-relative distance from an entry session to a defined future session and price observation.
_Avoid_: Calendar duration, ISO duration

**Signal Outcome**:
The canonical result of a Signal under its stated market-price and horizon convention, independent of whether or how an order filled.
_Avoid_: Trade P&L, execution outcome

**Primary Benchmark**:
The median total return over the same Market Horizon of every point-in-time eligible Listing on the Signal's entry session.
_Avoid_: SPY return, paper portfolio

**Signal Excess Return**:
A Signal's canonical total return minus its date-matched Primary Benchmark return.
_Avoid_: Raw return, execution P&L

**Analyst Annotation**:
A model-produced `supports`, `undercuts`, or `neutral` assessment with a calibrated probability that a Signal beats its Primary Benchmark, a magnitude band, rationale, uncertainty, and typed evidence relations; it never directly creates an order proposal.
_Avoid_: Signal, model decision

**Analyst Behavior Version**:
The immutable combination of provider, exact model identifier, system and task prompts, tool contract, output schema, and runtime policy that produced an Analyst Annotation.
_Avoid_: Model alias, prompt name

**Evaluation Epoch**:
A sealed forward interval whose outcomes may evaluate an already-frozen Analyst Behavior Version but may not be used to modify that same version.
_Avoid_: Rolling training set, LLM backtest

**Promotion**:
An explicit human decision allowing one versioned analyst behavior to influence deterministic strategy policy after forward evidence justifies it.
_Avoid_: Self-learning, autonomous retraining

**Capability Grant**:
The bounded influence conferred by a Promotion Decision—confidence contribution, eligibility reduction, or sizing reduction—independently evidenced and revocable for one Analyst Behavior Version.
_Avoid_: Analyst enabled, risk override

**Promotion Decision**:
An authenticated append-only operator decision naming the behavior version, Capability Grant, bounds, evidence packet, rationale, and effective time.
_Avoid_: Configuration toggle, automatic promotion

## Trading

**Issuer**:
The company whose securities and Section 16 reporting owners a strategy reasons about, identified canonically by SEC CIK.
_Avoid_: Ticker, asset

**Listing**:
An effective-dated tradable security listing associated with an Issuer and identified independently from its current ticker symbol.
_Avoid_: Issuer, ticker-as-identity

**Broker Asset**:
A broker-specific, effective-dated mapping from a Listing to the instrument accepted by an execution adapter.
_Avoid_: Issuer, canonical listing

**Portfolio Planner**:
The deterministic decision-maker that converts eligible signals and current portfolio state into order proposals.
_Avoid_: Portfolio agent, trader model

**Order Proposal**:
An immutable request for a particular order, awaiting a risk decision and not yet submitted to a broker.
_Avoid_: Order, trade

**Sizing Target**:
The desired Strategy V1 entry exposure of 1% of paper equity, converted to a floored whole-share quantity for opening-auction execution; it is not a promise about the eventual fill value.
_Avoid_: Position cap, exact notional

**Position Breach Threshold**:
The 1.25% of paper-equity post-fill exposure at which Strategy V1 halts new entries for review without automatically flattening the position.
_Avoid_: Sizing target, stop loss

**Planning Decision**:
The deterministic record of whether an eligible Signal produced an Order Proposal, including a reason when it did not.
_Avoid_: Eligibility decision, risk decision

**Risk Decision**:
The deterministic acceptance or rejection of an order proposal under portfolio and operational limits.
_Avoid_: Eligibility decision, broker rejection

**Eligibility Decision**:
The deterministic inclusion or exclusion of a candidate under one version of strategy policy.
_Avoid_: Risk decision, broker rejection, filter

**Bootstrap Prior**:
A historical cohort statistic used as labelled context until forward evidence accumulates, never as event-specific confidence.
_Avoid_: Confidence, prediction

**Paper Execution**:
Order handling against simulated broker funds using real current market and broker state, always labelled as paper.
_Avoid_: Live trading, simulated market

**Execution Outcome**:
The realized paper result derived from broker-reported fills and position events, kept separate from the canonical Signal Outcome.
_Avoid_: Signal outcome, backtest result

**Execution Exception**:
An append-only record that execution departed from the normal auction-aligned policy, including partial or missing fills, incompatible residue, broker rejection, and deterministic fallback actions.
_Avoid_: Strategy exception, hidden retry

**Realism Outcome**:
A separately labelled estimate of costs and effects omitted by the paper broker, such as spread, latency slippage, market impact, fees, and dividends; it never rewrites the Execution Outcome.
_Avoid_: Broker fill, signal outcome

## Measurement

**Strategy Scorecard**:
The forward record over every final Signal, led by median Signal Excess Return and accompanied by raw return, mean, hit rate, tails, SIC-group and SPY comparisons, resolution coverage, and explicitly unresolvable outcomes.
_Avoid_: Portfolio P&L, executed-only results

**Execution Scorecard**:
The separate paper-portfolio record of broker equity, time-weighted return, realized and unrealized P&L, drawdown, exposure, turnover, fill variance, and Realism Outcomes.
_Avoid_: Strategy scorecard, signal accuracy

## Sources

**Acquisition Attempt**:
An append-only record of one request to a source, including request identity, timing, response status, and any resulting Source Document hash.
_Avoid_: Source document, mutable fetch state

**Source Document**:
Immutable source bytes identified by content hash and retained with media type and parsing-version provenance independently of how often or where they were acquired.
_Avoid_: Acquisition attempt, URL

**Candidate Source**:
A configured public source whose observations are permitted to originate strategy candidates.
_Avoid_: Research source, arbitrary web result

**Research Source**:
A source discovered during bounded investigation of an existing candidate; it may enrich or challenge that candidate but cannot originate one until explicitly promoted.
_Avoid_: Candidate source

**Source Fact**:
A typed statement parsed from acquired source material and retained independently of whether a strategy considers it useful.
_Avoid_: Signal, feature

**Input Reference**:
A typed direct reference from a derived artifact to an exact upstream artifact it consumed.
_Avoid_: Generic source ID, evidence relation

**Evidence Relation**:
An append-only semantic edge classifying how one artifact bears on another, such as `supports`, `undercuts`, `context`, `propagation`, or `ignored`; it supplements rather than replaces direct Input References.
_Avoid_: Input reference, mutable tag

## Point-in-time semantics

**Source Clock**:
A domain-specific timestamp supplied or implied by the source, such as SEC acceptance time, transaction date, publication time, or a market-session boundary.
_Avoid_: Generic occurredAt

**Knowledge Clock**:
The pair of `observedAt`—when Sonde first had the information—and `recordedAt`—when Sonde durably stored the artifact.
_Avoid_: Source clock, database time as event time

**Forensic Replay**:
Re-execution or inspection using the exact captured inputs and versions from a historical Decision Packet; for model work, the preserved request and response are the historical truth.
_Avoid_: Refetch, fresh model rerun

**Reconstruction Replay**:
A separately labelled rerun using corrected or newly fetched inputs, compared field by field with the forensic record.
_Avoid_: Forensic replay, silent correction

**Unresolvable Outcome**:
An explicit terminal Signal Outcome used when the documented total-return method cannot determine a canonical result; it remains visible and is never silently excluded.
_Avoid_: Voided trade, dropped row

## Operations

**Cockpit**:
The private operations-first interface showing current state and readiness, market clock and next action, alerts, candidate funnel, decision tape, positions, scorecards, forensics, and narrowly scoped audited control.
_Avoid_: Public dashboard, brokerage terminal

**Event Console**:
A read-only, filterable live view over structured append-only events and their lineage, paired with a command palette that exposes only authenticated Operator Commands.
_Avoid_: Shell, order ticket, raw log tail

**Operational Alert**:
A durable acknowledged or unacknowledged record that Sonde needs attention; urgent alerts may additionally be delivered through Telegram.
_Avoid_: Ephemeral notification, signal

**Operator Command**:
An authenticated, durable, audited instruction controlling Sonde's operation, never a discretionary trade or an edit to recorded evidence.
_Avoid_: Manual trade, database edit

**Data Readiness**:
An append-only, versioned, decision-specific assessment at the Decision Cutoff that every mandatory calendar, universe, market-data, source-completeness, portfolio, and broker input required for entry is sufficiently complete, current, and reconciled.
_Avoid_: Probe health, risk decision

**Active**:
The operational state in which new entries and position management are permitted.

**Paused**:
An operator-requested state that blocks new entries while allowing exits, cancellations, and reconciliation.

**Degraded**:
An automatically entered state in which incomplete or stale required data blocks new entries while existing positions remain managed.

**Halted**:
A safety state that blocks new entries while preserving risk-reducing actions wherever technically possible.

**Recovering**:
The state in which Sonde rebuilds source and venue truth before Data Readiness can permit new entries again.

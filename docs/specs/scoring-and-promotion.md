# Scoring and promotion

**Status:** accepted contract · **Milestones:** 2, 5, 6, and 7 · **Constrained by:**
[ADR 0004](../decisions/0004-no-llm-backtests.md),
[ADR 0021](../decisions/0021-immutable-evidence-lineage-and-dual-replay.md), and
[ADR 0026](../decisions/0026-separated-scorecards-and-forward-promotion.md)

This spec keeps three questions separate:

1. Did the deterministic strategy's prospective claim carry information?
2. What happened to the paper portfolio after planning, risk, and broker simulation?
3. Did a versioned analyst behavior add forward information beyond the deterministic baseline?

No scorecard may answer one question with another population.

## Canonical Signal Outcome

Every final Signal receives exactly one terminal Signal Outcome. Execution status is not an input to
whether the outcome belongs in the population.

For a resolved long Signal:

```text
entryPrice   = regular-session open on the Signal's Decision Window session
exitPrice    = regular-session close twenty subsequent sessions later
signalReturn = totalReturn(entryPrice, exitPrice, corporateActions)
```

The entry session is index `0`; the exit is index `20`, so the observation spans 21 trading
sessions inclusively. Prices and corporate actions use exact decimals and name their Source Facts,
Listing identity, calendar version, and adjustment-method version.

A Signal is `Unresolvable` rather than omitted when Sonde cannot establish a defensible terminal
return. Reasons include unresolved Listing identity, missing authoritative bars, unresolved merger
consideration, delisting without a terminal value, or inconsistent corporate-action inputs. The
reason and all attempted inputs remain visible. A later correction appends a new resolution artifact
and supersession relation; it does not update the original record.

## Primary Benchmark

At the Signal entry open, freeze the exact point-in-time Universe Snapshot produced by Strategy V1.
For each Listing in that snapshot, compute total return over the Signal's exact entry and horizon
sessions with the same method used for the Signal.

```text
primaryBenchmark = median(resolved universe member returns)
signalExcess     = signalReturn - primaryBenchmark
```

The Benchmark Outcome records the Universe Snapshot, every member outcome or unresolvable reason,
resolution coverage, median algorithm, and method versions. It is invalid when benchmark coverage
falls below the versioned scorecard policy; the Signal remains visible and unresolved for the
primary metric rather than falling back to a different benchmark.

SIC-major-group and SPY comparisons are secondary diagnostics. They never replace the declared
Primary Benchmark.

## Strategy Scorecard

The population is every final Signal emitted by one Strategy Version in the selected forward time
range. It includes Signals that were blocked, operationally unready, already held, too small to
order, partially filled, or never sent to the venue.

Report at least:

- population count, resolved count, Unresolvable count, pending count, and resolution coverage;
- median Signal Excess Return as the primary metric;
- raw mean and median return, positive-return hit rate, and positive-excess hit rate;
- p10, p25, p75, and p90 returns and worst resolved outcome;
- secondary SIC-major-group and SPY excess returns;
- cohorts by immutable Strategy Version and Decision Packet policy versions;
- visibly labelled execution-status slices that cannot replace the full population.

Scorecards are reproducible projections over immutable artifacts. A displayed aggregate carries a
query/as-of time and links to its exact population.

## Execution and realism scorecards

The Execution Scorecard uses authoritative reconciled paper-account and order artifacts. It reports
broker equity, time-weighted return, realized and unrealized P&L, drawdown, gross and net exposure,
turnover, fill rate, partial-fill rate, and variance from the canonical Signal entry and exit prices.

The raw Execution Outcome records what Alpaca paper reported. A separately versioned Realism Outcome
estimates spread, fees, queue effects, market impact, or fill behavior the simulator omitted. It
names the model and inputs used and never rewrites the raw outcome.

Neither execution nor realism metrics alter canonical Signal Outcomes.

## Analyst Annotation

An Annotation is an immutable prediction by one Analyst Behavior Version for one Signal and sealed
evidence set. It contains:

- `supports`, `undercuts`, or `neutral` stance;
- probability, from `0` through `1`, that Signal Excess Return will be greater than zero;
- a versioned magnitude band;
- non-empty rationale and uncertainty statement;
- typed Evidence Relations to every relied-on or contradicted Source Fact;
- exact behavior, request, schema, validation, usage, latency, and failure references.

The predicted event is fixed before the outcome exists. Evaluation reports Brier score, log loss,
calibration bins with counts, discrimination diagnostics, and estimated economic effect after the
versioned Realism policy. The constant Bootstrap Prior is the comparison baseline; it is never
presented as event-specific confidence.

## Sealed Evaluation Epoch

An Evaluation Epoch is appended before its first eligible outcome is known. It freezes:

- Analyst Behavior Version;
- eligible Signal rule and time range;
- predicted target and scoring methods;
- Bootstrap Prior;
- Realism policy;
- capability under evaluation and proposed decision rule;
- downside and materiality thresholds.

Every eligible Signal is assigned deterministically. Missing, invalid, or late analyst output stays
in the epoch as a failure. Behavior changes require a new version and a future epoch. Outcomes
inspected while creating a behavior cannot validate it.

## Capability grants

Capabilities are independent and cumulative only when separately granted:

1. annotation only;
2. confidence contribution;
3. eligibility reduction;
4. sizing reduction.

Initial execution-affecting rules are monotonically conservative. An analyst may veto an otherwise
eligible entry or multiply baseline size by an allowed factor from `0` through `1`. It cannot make an
ineligible Signal eligible, increase baseline size, construct a proposal, waive Data Readiness, or
override risk.

A Promotion Decision requires all of:

- at least 50 resolved eligible Signals and at least 12 elapsed weeks;
- better calibration than the constant Bootstrap Prior under the frozen method;
- positive estimated economic effect after costs;
- no material downside deterioration under the frozen threshold;
- authenticated operator approval.

The floor permits a decision; it does not compel one. Promotion is never automatic. The appended
decision names the exact evidence packet, behavior version, capability, bounds, rationale, operator,
and effective time.

A Revocation is also append-only and forward-effective. It may respond to drift, repeated runtime
failure, policy change, or operator judgment. Historical decisions retain the capability state that
was effective when they were made.

## Failure semantics

- Annotation-only absence or invalidity is recorded and does not block Strategy V1.
- When an active Capability Grant requires an Annotation for entry policy, absence, invalidity, or a
  version mismatch fails Data Readiness for that entry.
- Sonde never reuses a prior Annotation, substitutes another behavior, or silently falls back after
  a required analyst failure.
- Scorecard computation failure changes operational health, not stored outcomes.

## Required tests

- blocked and unexecuted Signals remain in the Strategy Scorecard population;
- entry index `0` resolves at exit index `20` across holidays and early closes;
- splits, dividends, mergers, ticker changes, and delistings either reproduce a total return or
  append a typed Unresolvable reason;
- benchmark membership is the frozen entry-time Universe Snapshot, not today's universe;
- insufficient benchmark coverage cannot silently fall back to SPY;
- Execution Outcomes never mutate or substitute for Signal Outcomes;
- missing Analyst Annotations remain in Evaluation Epoch denominators;
- changing any behavior component creates a different behavior identity;
- no promotion can occur before both minimum floors or without operator approval;
- a grant cannot increase size, reverse an exclusion, bypass readiness, or bypass risk;
- revocation affects only decisions at or after its effective time.

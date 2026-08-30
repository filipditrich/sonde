# Strategy V1

**Status:** accepted contract · **Consumes:** evidence spine · **Milestones:** 1, 3, and 4

The executable contract for the Insider Cluster Strategy, deterministic planning, and its
auction-aligned paper lifecycle. The charter explains why; this spec defines what code must do.

## Active scope

- US-listed common equities only;
- long only;
- Alpaca paper only;
- Form 4 non-derivative open-market acquisitions, transaction code `P` and acquired/disposed code
  `A`;
- exactly one final Signal per Issuer and Decision Window;
- no stop, take-profit, thesis-decay exit, add, or horizon extension.

## Required inputs

| Input                         | Point-in-time requirement                                                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Form 4 Source Facts           | exact document/parser provenance, Issuer CIK, reporting-owner CIK, acceptance and observation times, typed transaction fields |
| Market calendar               | captured calendar version covering candidate, entry, and horizon sessions                                                     |
| Listing and Broker Asset maps | effective at the intended entry session                                                                                       |
| Universe Snapshot             | exact policy version and SIP-bar inputs for the intended entry session                                                        |
| Operating state               | latest durable state transition as of the cutoff                                                                              |
| Portfolio and open orders     | reconciled broker snapshot within readiness policy                                                                            |
| Paper equity and sizing price | exact decimal values captured before planning                                                                                 |
| Active Capability Grants      | exact behavior versions and bounds, if any                                                                                    |

## Decision Window assignment

The actionable time of a Source Fact is its `observedAt`: Sonde cannot act on a filing before it
possesses it, even if SEC accepted it earlier.

For a fact observed before or at a session's 09:20 ET Decision Cutoff, the Decision Window targets
that session's 09:30 regular open. A fact observed after the cutoff targets the next executable
regular-session open in the captured market calendar.

The candidate key is:

```text
(strategyVersion, issuerCik, decisionWindowOpen)
```

Filing date, UTC day, ticker, and accession are not candidate keys.

## Qualifying purchase fact

A Form 4 transaction qualifies when all are true:

- transaction code is `P`;
- acquired/disposed code is `A`;
- non-derivative shares are greater than zero;
- price per share is greater than zero;
- Issuer, reporting-owner, and Listing resolution pass schema validation.

All reporting-owner types count, including officers, directors, and 10% owners, whether people or
institutions. A reporting-owner CIK counts once per candidate. Repeated transactions, filings, names,
or relationship roles from that CIK do not add corroboration.

Nonqualifying and malformed transactions remain Source Facts or parse failures. Strategy policy
does not erase them.

## Liquidity eligibility

For the intended entry session, use the twenty completed regular-session SIP daily bars immediately
preceding the entry open. For each bar:

```text
dollarVolume = volumeWeightedAveragePrice × volume
```

The Listing passes when the median of the twenty exact decimal dollar-volume values is strictly
greater than `$20,000,000`.

Missing, non-SIP, duplicate, unadjusted, or incomplete bars fail universe eligibility for that
snapshot. The eligibility record names every input bar and exclusion reason.

> **Research parity note:** the historical scripts label this a 20-session median but their Python
> slice contains 21 completed bars. Strategy V1 intentionally specifies twenty. Before Milestone 1
> exits, a parity spike must quantify whether the correction materially changes cadence or the
> founding cohort; it must not silently change this rule.

## Candidate lifecycle

1. A first qualifying purchase appends a forming Candidate Snapshot.
2. Every newly consumed qualifying fact appends another snapshot with the full ordered input set and
   distinct reporting-owner set.
3. Corrections or reference-data changes append new snapshots with their causal input.
4. The current projection may point at the latest snapshot, but the strategy never updates one.
5. At 09:20 ET the priority lane closes every due candidate exactly once.

Snapshots may be provisionally qualifying before cutoff. That state is observable but cannot emit a
Signal or proposal early.

## Eligibility at cutoff

The final Eligibility Decision evaluates, in order:

1. candidate key and window are due;
2. no final decision already exists for the key;
3. Issuer and effective Listing resolve;
4. security type is US-listed common equity;
5. Universe Snapshot includes the Listing under the exact liquidity rule;
6. at least two distinct reporting-owner CIKs have qualifying facts;
7. every qualifying fact was observed by the cutoff.

Source completeness, broker state, and current portfolio are not strategy eligibility. They belong
to Data Readiness and planning so an otherwise valid Signal remains scoreable.

An eligible decision emits one long Signal. An ineligible decision emits no Signal and names all
failed checks. A unique semantic key enforces at most one final Signal per candidate key.

## Signal contract

The Signal declares:

- Issuer and effective Listing;
- long direction;
- entry price convention: regular-session opening price on the Decision Window session;
- Market Horizon: close of the session twenty subsequent sessions after entry, where entry is index
  `0`;
- non-empty deterministic rationale and typed Input References;
- labelled multi-insider liquid Bootstrap Prior;
- strategy and policy versions.

It declares no model confidence, stop, take-profit, or promise of execution.

## Decision Packet and Data Readiness

Closing the window freezes a Decision Packet under the evidence-spine contract. Data Readiness
directly references that packet and then checks at least:

- market calendar and session deadline;
- effective Listing and Broker Asset;
- SIP entitlement, twenty-bar liquidity window, and sizing input freshness;
- EDGAR completeness and unresolved acquisition gaps;
- paper account, equity, positions, open orders, and latest reconciliation;
- operating state;
- required promoted analyst output, if a Capability Grant makes it part of policy.

Annotation-only model absence never fails readiness. A required promoted behavior that is missing,
invalid, or version-mismatched does.

## Planning

The planner always appends one Planning Decision for an eligible Signal.

No proposal is produced when any applies:

- state is not `Active`;
- Data Readiness fails;
- the Issuer already has an open or pending position;
- the 20-position or six-position SIC major-group capacity is already reserved;
- one whole share exceeds the 1% Sizing Target;
- a deterministic exclusion or promoted eligibility veto applies.

Typed reasons include at least `not_active`, `not_ready`, `already_held`, `portfolio_capacity`,
`sector_capacity`, `below_minimum_order`, `deterministic_exclusion`, and `promoted_veto`.

For a proposal:

```text
baselineTarget = paperEquity × 0.01
promotedTarget = baselineTarget × permittedReductionFactor  // 0 through 1
wholeShares    = floor(promotedTarget / sizingPrice)
```

All operations use exact decimal arithmetic. The proposal is a whole-share, long, market-on-open
intent for the Decision Window session.

When multiple Signals compete for capacity at one cutoff, process them deterministically by the
instant their Candidate first reached two distinct owners, then Issuer CIK. Accepted proposals and
pending orders reserve capacity before the next Signal is planned. This ordering is launch policy,
not a claim that earlier clusters are stronger.

## Risk

Risk consumes a proposal and immutable risk snapshot and returns one Risk Decision. It revalidates
proposal shape, position and sector capacity, daily-loss policy, order rate, price sanity,
operational state, dead-man state, kill switch, and readiness reference/version.

The detailed numeric daily-loss, order-rate, dead-man, and price-sanity policies belong in the
Milestone 3 risk-gate spec. Risk cannot fetch data, call a model, alter the proposal, or submit it.

## Entry execution

1. Submit accepted intent before 09:28 ET as `market` + `opg` with whole-share quantity and
   deterministic client-order identity.
2. Append submission intent before network I/O.
3. On ambiguity, query by client-order identity before any retry.
4. Retain every fill, including partial fills.
5. Allow the auction-unfilled remainder to cancel; never chase or unwind solely because it was
   partial.
6. Reconcile after the auction.
7. If filled exposure exceeds 1.25% of paper equity, append the breach and enter `Halted`; do not
   auto-flatten.

## Held-name behavior

A later qualifying Decision Window for a held Issuer emits and resolves an independent Signal. The
planner records `already_held`. It does not add size, replace the original thesis, or change the
existing exit session.

## Exit execution

1. Stage `market` + `cls` for the full whole-share broker position before 15:50 ET on the horizon
   session.
2. Close known incompatible fractional residue with the deterministic regular-hours fallback when
   possible.
3. If the close order rejects or remains unfilled, append an Execution Exception and retry at the
   next regular-session opportunity until flat.
4. Continue exits, cancellation, and reconciliation while Paused, Degraded, Halted, or Recovering.
5. Never redefine the Signal Outcome because execution departed from the canonical horizon.

## Required tests

- facts observed at 09:20:00 are in the current window; facts after it enter the next window;
- holidays and early closes use the captured calendar without hard-coded dates;
- repeated filings from one owner CIK count once;
- person and institutional owners both count;
- exactly one final Signal is emitted under duplicate cutoff execution;
- missing source completeness blocks planning but not eligible Signal emission;
- whole-share sizing floors and produces `below_minimum_order` at zero shares;
- concurrent Signals reserve portfolio and sector capacity in deterministic order;
- a promoted factor cannot exceed `1` or turn an exclusion into eligibility;
- partial opening fills are retained and not chased;
- exposure breach enters Halted without a sell order;
- a held-name Signal resolves independently without add or extension;
- close failure records fallback and eventually reconciles flat;
- every Signal resolves independently of its execution path.

# Anatomy of a Strategy V1 trade

An illustrative end-to-end trace. Names and prices are fictional; the artifact order and policies
are normative. This is the integration story every implementation must be able to render from the
evidence ledger.

## Starting state

- Tuesday is a regular market session; Wednesday opens at 09:30 ET.
- Sonde is `Active` with passing source and broker health.
- Paper equity is `$100,000`; there is no position in ExampleCo.
- ExampleCo is a US-listed common equity mapped from Issuer CIK `0000123456` to one effective
  Listing and Alpaca Broker Asset.
- Its completed SIP bars show median 20-session dollar volume of `$84m`, above the `$20m` threshold.
- Its SIC major group has two open positions, below the cap of six.

## 1. Sonde acquires the first filing

Tuesday 17:02 ET, the EDGAR live job sees a Form 4 accession. It appends:

1. an Acquisition Attempt with request, response, and Knowledge Clocks;
2. a content-addressed Source Document containing the exact XML bytes;
3. typed Source Facts for every reported transaction, not only purchases.

One fact says reporting-owner CIK `0001000001` acquired common shares in an open-market code-`P`
transaction. SEC acceptance time is the actionability clock; transaction date remains a separate
source fact.

Strategy V1 assigns the fact to the Decision Window whose next executable open is Wednesday 09:30.
It appends Candidate Snapshot 1:

```text
issuer                 0000123456
decisionWindowOpen     Wednesday 09:30 America/New_York
distinctOwners         1
qualifyingPurchases    1
liquidityStatus        eligible
state                  forming
```

There is no Signal. One reporting owner measured no useful edge in the founding study.

## 2. A second owner completes the cluster

Wednesday 08:41 ET, another Form 4 is acquired for the same Issuer. Reporting-owner CIK
`0001000002` reports a qualifying code-`P` purchase. The two owners are counted once each even if
either filed repeated transactions.

Candidate Snapshot 2 is appended with two distinct reporting owners and direct Input References to
both Source Facts. The Candidate now appears as provisionally qualifying in the cockpit, but the
Decision Window remains open. Nothing is emitted or ordered early.

If the same filing arrived after 09:20, it would belong to the next Decision Window. It would never
rewrite this one.

## 3. The 09:20 Decision Cutoff

At exactly 09:20 ET, the priority market-action lane closes the window. Strategy V1 evaluates the
final Candidate Snapshot under one immutable policy version:

| Check                                                | Result       |
| ---------------------------------------------------- | ------------ |
| Instrument is a US-listed common equity              | Pass         |
| Listing is effective and broker-mapped               | Pass         |
| Median 20-session SIP dollar volume exceeds `$20m`   | Pass: `$84m` |
| At least two distinct reporting-owner CIKs           | Pass: `2`    |
| Both facts belong to this Decision Window            | Pass         |
| No final Signal already exists for Issuer and window | Pass         |

Sonde appends an eligible Eligibility Decision and one final Signal:

```text
direction              long
entry                  Wednesday regular-session open
horizon                close 20 subsequent sessions later
rationale              two distinct reporting owners made qualifying code-P purchases
bootstrapPrior         multi-insider liquid cohort; labelled, not event confidence
```

The Signal has typed Input References and a non-empty rationale. It is now part of the Strategy
Scorecard forever, regardless of what happens next.

## 4. Sonde freezes the Decision Packet

The Decision Packet identifies the exact:

- Candidate Snapshot and Eligibility Decision;
- strategy and policy versions;
- market calendar and Decision Window;
- Issuer, Listing, and Broker Asset mapping;
- SIP liquidity window and pre-cutoff sizing price;
- universe membership and SIC group;
- operating state, readiness policy and its raw inputs, portfolio, and broker reconciliation;
- any active analyst Capability Grants and their required behavior versions.

This packet is the input manifest for Forensic Replay. The Data Readiness result is computed next
and references the packet; it is not cyclically embedded in its own input. Re-querying today's
listing or portfolio cannot replace either artifact.

## 5. Data Readiness and planning

Data Readiness passes because the calendar, universe, SIP data, source completeness, account,
positions, open orders, and latest reconciliation meet their versioned freshness rules.

The Portfolio Planner uses a valid pre-cutoff sizing price of `$40.00`:

```text
paper equity           $100,000
sizing target          1% = $1,000
whole shares           floor($1,000 / $40.00) = 25
existing position      none
operating state        Active
```

It appends a Planning Decision that produces an Order Proposal for 25 whole shares. If one share had
cost more than `$1,000`, it would instead record `below_minimum_order`. If ExampleCo were already
held, it would record `already_held`. In both cases the Signal would still resolve.

## 6. Deterministic risk

The Risk Gate consumes the immutable proposal and risk snapshot. It checks the 1% target, portfolio
and sector caps, daily-loss and order-rate limits, price sanity, operational state, dead-man state,
and kill switch.

It returns an accepted Risk Decision. The gate has no model, network, database query, or Alpaca
client. A rejected proposal would stop here and remain visible beside accepted decisions.

## 7. Opening-auction execution

At 09:23 ET the venue adapter submits a paper `market` order with `time_in_force=opg` and a
deterministic client-order identity. Alpaca fills 18 shares at `$40.50`; the remaining seven cancel
after the auction.

Sonde keeps the partial fill and does not chase it:

```text
target value           $1,000
filled value           $729
actual exposure        0.729% of paper equity
remainder              cancelled
execution exception    partial opening-auction fill
```

Broker trade updates make the fill appear immediately. Post-auction REST reconciliation confirms
the authoritative order, fill, cash, and position state.

Had the fill exceeded 1.25% of paper equity, Sonde would enter `Halted`, continue managing the
position, and require operator acknowledgement plus fresh reconciliation and readiness before new
entries. It would not auto-sell.

## 8. While the position is held

There is no stop, take-profit, thesis-decay exit, or model-managed position. Sonde continues source
acquisition, reconciliation, alerts, and scorekeeping.

If another qualifying Decision Window occurs for ExampleCo, Sonde emits and scores a new independent
Signal. The planner records `already_held`; it does not add size or extend this position's exit.

## 9. Horizon close

The entry session is index 0. On the session twenty subsequent sessions later, Sonde stages a
whole-position `market` order with `time_in_force=cls` before 15:50 ET.

If the close auction cannot flatten a fractional corporate-action residue, or the order is rejected
or unfilled, the venue module appends an Execution Exception and follows the deterministic
regular-session fallback until flat. That changes execution history, not the Signal's Market
Horizon.

## 10. Three outcomes

After authoritative SIP and broker data arrive, Sonde writes separate results:

1. **Signal Outcome** — total return from the official entry-session open to the horizon-session
   close, using the documented corporate-action method.
2. **Execution Outcome** — return from the actual partial opening fill through the broker-reported
   closing fills and position events.
3. **Realism Outcome** — a versioned estimate of paper omissions such as spread, latency slippage,
   market impact, fees, and dividends.

If corporate-action or market data cannot support the canonical calculation, the Signal gets an
explicit Unresolvable Outcome and remains visible in resolution coverage. It is never dropped.

## 11. Benchmark and scorecards

The Outcome Resolver also computes the median total return of every Listing that was eligible on
the same entry session over the same horizon. The Signal's return minus that Primary Benchmark is
its Signal Excess Return.

The Strategy Scorecard includes this Signal whether the paper entry filled, partially filled, was
blocked, or was never proposed. The Execution Scorecard separately updates equity, time-weighted
return, P&L, drawdown, exposure, turnover, and fill variance.

## 12. Analyst annotation, later

From Milestone 6, one pinned Analyst Runtime may read bounded evidence around the already-existing
Signal and append a structured `supports`, `undercuts`, or `neutral` annotation with a probability
of beating the Primary Benchmark.

Initially it changes nothing. Only a future authenticated Promotion Decision backed by a sealed
Evaluation Epoch can grant bounded influence. Even then, early model influence can only veto or
reduce the deterministic baseline; it cannot create this proposal, increase its size, or override
risk.

## Integration assertions

An implementation of this trace is complete only when tests demonstrate:

- each artifact is append-only and directly references its exact inputs;
- two owner CIKs count once each and a late filing enters the next window;
- closing the same window twice emits at most one final Signal;
- the Signal resolves even when planning, readiness, risk, or execution prevents a fill;
- partial opening fills are retained and never chased;
- a later held-name Signal is scored without adding or extending the position;
- post-fill breach halts entries without automatic liquidation;
- closing-auction failure follows a recorded fallback until flat;
- Signal, Execution, and Realism Outcomes never overwrite one another;
- Forensic Replay uses the captured packet, while Reconstruction Replay reports differences.

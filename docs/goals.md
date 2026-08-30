# Goals and non-goals

## Primary goal

**Build a personal autonomous paper-trading system that is genuinely interesting to operate and
observe.**

Success means the cockpit is worth leaving open because it makes the full causal path legible: what
Sonde acquired, what was knowable then, which candidate formed, why a Signal did or did not become a
proposal, what risk and the broker did, and what the strategy and execution later returned.

Profit is not the top-line metric. Treating it as one would invite selective backtests, hide
operational failures, and collapse strategy, execution, and model quality into one flattering
number.

## Secondary goals

1. **Point-in-time honesty.** Exact source bytes, clocks, identities, inputs, policies, and outcomes
   remain attributable to the decision that used them.
2. **Prospective measurement.** Every final Signal resolves, even when it was blocked or unexecuted.
   Strategy, execution, realism, and analyst performance remain separate.
3. **Safe autonomy.** Deterministic planning and risk own order creation and admission. Models,
   hostile source text, and the cockpit cannot bypass those modules.
4. **Operational legibility.** State, readiness, next action, alerts, non-actions, reconciliation,
   and replay are product surfaces rather than log archaeology.
5. **Proportionate simplicity.** One strategy, instrument class, broker, host, database, operator,
   and model adapter until measured pressure earns another.
6. **Visible cost.** Source, model, storage, and runtime usage are observable without an arbitrary
   automated spending policy.
7. **Repository legibility.** A new contributor can understand the goal, strategy, architecture,
   and current milestone in one sitting.

## Explicit non-goals

| Not doing                                                              | Why                                                                              |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Trading real capital                                                   | Paper-only is the safety boundary; changing it requires a new ADR                |
| Proving market-beating performance                                     | The project is an evidence and operations system, not an alpha claim             |
| Managing anyone else's money                                           | Sonde is single-user and personal                                                |
| Discretionary order entry                                              | It would bypass deterministic planning, risk, and lineage                        |
| Crypto, ETFs, options, futures, shorts, or leverage in the initial app | Strategy V1 has no measured entry path for them                                  |
| High-frequency or latency arbitrage                                    | The workload is minutes-to-daily and auction-aligned                             |
| An LLM backtesting engine                                              | Historical outcomes may already exist in model weights; see ADR 0004             |
| Automatic self-modification or promotion                               | Sparse non-stationary evidence requires sealed evaluation and operator authority |
| A generic multi-strategy, multi-broker, or multi-model framework       | The initial system has one concrete path to finish and measure                   |
| Enterprise availability or disaster recovery                           | One always-on personal host and a simple backup are proportionate                |
| A public market-data dashboard                                         | The cockpit is private and operator-only                                         |
| Financial advice                                                       | Signals are internal prospective claims, not recommendations                     |

## What “learning” means

Sonde does not retrain itself. It learns through versioned forward evidence:

- deterministic strategy versions own Signals and track records;
- Analyst Behavior Versions make structured predictions in sealed Evaluation Epochs;
- scorecards compare those predictions with later point-in-time outcomes;
- the authenticated operator may append a narrow Promotion Decision or Revocation;
- promoted model influence initially only vetoes or reduces deterministic behavior.

Changing a prompt, model, tool contract, output schema, or runtime policy creates a new behavior
version. Historical outcomes used to design that change cannot validate it.

## Success criteria

Sonde is working when all of these are true:

- [ ] It runs unattended on an always-on host through a fortnight containing both entry and exit
      actions.
- [ ] Every final Signal is traceable to exact Source Documents, Source Facts, Candidate Snapshots,
      policy versions, and its Decision Packet.
- [ ] Every Signal receives one resolved or explicitly Unresolvable Outcome without execution-based
      selection.
- [ ] At least one Planning or Risk Decision records a legible non-action and remains visible beside
      fills.
- [ ] Startup, pre-action, post-auction, and ambiguous-request reconciliation are demonstrated.
- [ ] Paused, Degraded, Halted, and Recovering states block entries while position management
      continues.
- [ ] The cockpit shows state, readiness, next action, alerts, lineage, positions, and separate
      scorecards without consulting raw logs.
- [ ] Forensic Replay reproduces captured inputs, and Reconstruction Replay visibly differs when
      corrected inputs are supplied.
- [ ] Model usage and cost are attributable to exact Analyst Behavior Versions once Milestone 6
      begins.
- [ ] A new contributor can identify the active strategy, safety boundary, and next milestone from
      the README and overview.

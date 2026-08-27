# 0004: No LLM backtests — forward-testing is the only honest evaluation

## Status

Accepted (Milestone 0, 2026-08-27)

**This is the load-bearing decision in the project.** Milestone ordering, the storage schema, and
the entire scoring apparatus follow from it.

## Context

The reflexive way to evaluate a trading strategy is to run it over historical data and look at the
equity curve. For a strategy whose decisions come from a large language model, that number is not
meaningful.

The model was trained on text that includes the period you are testing over. Asked to analyse a
headline from a date inside its training window, it is not reasoning forward from that headline —
it is drawing on a corpus that contains the outcome. It knows which bank failed, which token
collapsed, which announcement was a nothing-burger. The backtest comes out excellent and measures
memory, not skill.

This is recognized in the literature rather than speculative. The [TradingAgents multi-agent
framework](https://arxiv.org/html/2412.20138v5) evaluates over a short window (Jan–Mar 2024) with
careful temporal data constraints on the _inputs_ — but as subsequent work observes, input-side
protections address survivorship, data-snooping, and pipeline leakage while **none of them address
the bias residing in the model's weights**. LLMs memorize historical financial time-series present
in their training corpora, which inflates backtest results directly. There is now a [standardized
benchmark for look-ahead bias in point-in-time LLMs for finance](https://arxiv.org/pdf/2601.13770),
[work specifically on mitigating look-ahead bias in LLM-driven
backtesting](https://arxiv.org/pdf/2605.24564), and [TradeTrap](https://arxiv.org/pdf/2512.02261),
which interrogates whether LLM trading agents are reliable and faithful at all. The recurring
finding is that most frameworks evaluate on short historical windows without bias control, leaving
open whether reported gains reflect reasoning or contamination.

Mitigations exist and all of them are partial: restricting to windows after the training cutoff
(shrinking, and the cutoff is not sharply knowable), obfuscating entity names (destroys the very
signal an LLM is good at extracting), synthetic scenarios (tests something else entirely).

Alternatives considered:

1. **Backtest anyway with caveats.** Rejected — a number with a caveat still anchors decisions, and
   caveats do not survive contact with an equity curve.
2. **Backtest only on post-cutoff data.** Rejected as a primary method — the window is small,
   shrinks with every model release, and the cutoff is fuzzy. Usable as a weak sanity check, never
   as evidence.
3. **Forward-test only.** Slower, honest, and the results are real.

## Decision

1. **No backtesting engine is built for the LLM path.** It is not on the roadmap and a PR adding one
   should be rejected on sight.
2. **Forward-testing is the evaluation method.** Signals are scored against realized price movement
   at their stated horizon, prospectively, from the moment they are emitted.
3. **Signal scoring is built before order execution** — Milestone 3 precedes Milestone 5. Measurement
   comes before action, deliberately.
4. **No performance claim is made from any pre-deployment window**, in the README, in the UI, or
   anywhere else.
5. **Deterministic components may be backtested normally.** The risk gate, position sizing
   arithmetic, and any non-LLM baseline (SMA crossover, buy-and-hold) have no contamination problem
   and are tested over history as usual. The prohibition is specific to LLM-in-the-loop decisions.
6. The point-in-time discipline in the storage layer (`observed_at` / `occurred_at`) is retained
   regardless. It does not solve weight contamination, but it eliminates pipeline leakage, which is
   the other half of the problem and the half we control.

## Consequences

- Evaluation is slow. A 4-hour-horizon signal takes 4 hours to resolve, and a usable sample takes
  weeks. This is the actual cost of the decision and it is accepted.
- The project cannot answer "is this profitable?" early. It can answer "is this analyst calibrated?"
  early, which is the more useful question anyway.
- Milestone ordering is fixed by this: measurement infrastructure is not optional scaffolding, it is
  the only source of truth the project has.
- Prompt and routing changes are evaluated by shadow-running them live against the incumbent
  (Milestone 7), not by re-running history.
- Sonde will never publish a backtested Sharpe ratio. Given how easily those are inflated by short
  windows and repeated trials, this is not much of a loss.

## Milestones touched

- Milestone 2 (Opinion)
- Milestone 3 (Scorekeeping)
- Milestone 7 (Iterate)

## References

- [TradingAgents: Multi-Agents LLM Financial Trading Framework](https://arxiv.org/html/2412.20138v5)
- [Look-Ahead-Bench: a Standardized Benchmark of Look-ahead Bias in Point-in-Time LLMs for Finance](https://arxiv.org/pdf/2601.13770)
- [Summoning the Oracle to Slay It: Mitigating Look-Ahead Bias in Financial Backtesting with LLMs](https://arxiv.org/pdf/2605.24564)
- [TradeTrap: Are LLM-based Trading Agents Truly Reliable and Faithful?](https://arxiv.org/pdf/2512.02261)
- [`docs/goals.md`](../goals.md)
- [`docs/roadmap.md`](../roadmap.md) — Milestone 3

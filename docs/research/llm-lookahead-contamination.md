# LLM look-ahead contamination in financial backtesting

**Status:** promoted → [ADR 0004](../decisions/0004-no-llm-backtests.md)

## Question

Can an LLM-driven trading strategy be meaningfully backtested over historical market data?

## Finding

No — not with the methods available to this project.

Standard backtesting hygiene addresses bias on the **input** side: survivorship, data snooping,
pipeline leakage, point-in-time correctness. Frameworks in this space do take that seriously —
[TradingAgents](https://arxiv.org/html/2412.20138v5) evaluates over Jan–Mar 2024 with decisions
constrained to data available up to each trading day.

The problem is that none of it touches the bias in the model's **weights**. An LLM has read the
period you are testing over. Its analysis of a historical headline is informed by a training corpus
containing the outcome. The measured result is partly recall, and there is no clean way to separate
the two.

The literature has converged on this as a named problem rather than a footnote:

| Work                                                                | Contribution                                                                 |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [Look-Ahead-Bench](https://arxiv.org/pdf/2601.13770)                | Standardized benchmark for look-ahead bias in point-in-time LLMs for finance |
| [Summoning the Oracle to Slay It](https://arxiv.org/pdf/2605.24564) | Methods for mitigating look-ahead bias in LLM-driven backtesting             |
| [TradeTrap](https://arxiv.org/pdf/2512.02261)                       | Whether LLM trading agents are reliable and faithful at all                  |
| [BacktestBench](https://arxiv.org/pdf/2605.17937)                   | Benchmarking LLMs for automated quantitative strategy backtesting            |
| [AlphaForgeBench](https://arxiv.org/pdf/2602.18481)                 | End-to-end trading strategy design with LLMs                                 |

The recurring observation across this work: most trading-agent frameworks evaluate on short
historical windows without bias control, leaving open whether reported gains reflect genuine
reasoning or contamination of the evaluation regime. Related work notes that models may memorize
historical financial time-series present in their training corpora, inflating backtest results
directly.

[FinMem](https://arxiv.org/html/2412.20138v5)-style layered-memory approaches improve trading
performance on their own benchmarks but address a different problem — long-term memory for decision
making — and do not resolve weight contamination either.

## Mitigations considered, and why each is partial

| Mitigation                          | Problem                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| Test only after the training cutoff | Window is small, shrinks with every model release, and the cutoff is not sharply knowable  |
| Obfuscate entity names and dates    | Destroys the entity knowledge that is the main reason to use an LLM here                   |
| Synthetic or perturbed scenarios    | Tests a different question than "does this work on real markets"                           |
| Accept the number with a caveat     | A caveat does not survive contact with an equity curve; the number still anchors decisions |

## Consequence for Sonde

Forward-testing is the only honest evaluation, which forces:

- Signal scoring infrastructure **before** order execution — measurement precedes action
- Weeks rather than minutes to get an answer
- No performance claims from any pre-deployment window
- Prompt changes evaluated by live shadow-running against the incumbent, not by re-running history

Point-in-time discipline (`observed_at` / `occurred_at`) is retained regardless. It does not fix
weight contamination, but it eliminates pipeline leakage, which is the half of the problem we
control.

Deterministic components — the risk gate, sizing arithmetic, non-LLM baselines — have no
contamination problem and are backtested normally.

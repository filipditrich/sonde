# Research

Evidence and options, gathered before committing. A research doc preserves what was found and what
was rejected without creating roadmap obligation.

Research is promoted into a spec and one or more ADRs before implementation. It is never
implemented directly.

## Current

- [20 vs 21 bar liquidity](./spikes/20-vs-21-bar-liquidity/README.md) — founding-study Python
  slice is 21 bars; Strategy V1 keeps twenty. Does not change the rule.
- [LLM look-ahead contamination](./llm-lookahead-contamination.md) — why backtesting an LLM trader
  produces meaningless numbers. Promoted to [ADR 0004](../decisions/0004-no-llm-backtests.md).

## Open threads

- Which free sources actually carry information (GDELT, RSS, EDGAR, FRED, on-chain) — answerable
  only from Milestone 3 scoreboard data, not from reading about them.
- Funding-rate and basis mechanics on perpetuals as a signal source.
- Calibration methodology: what a defensible calibration curve needs in sample size.

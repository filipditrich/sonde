# Goals and non-goals

## What Sonde is

Sonde is a personal, autonomous market-analysis and paper-trading platform. Probes collect
unstructured and structured data from public sources, LLM analysts turn that into typed signals
with their reasoning attached, a portfolio agent proposes orders, and a deterministic risk gate
decides whether any of it reaches a venue.

The reasoning trail is a first-class product surface, not a debug log. If you cannot watch Sonde
think, it is not finished.

## Primary goal

**Build a system that is genuinely interesting to operate and observe.** Success is measured by
whether the dashboard is worth leaving open — whether you can watch it read the world, form an
opinion, act or get blocked, and be right or wrong in a way you can inspect afterwards.

This is a stated, deliberate ordering. Profit is not the top-line metric, and pretending otherwise
would distort every design decision downstream — most obviously, it would push us toward
backtest-driven development, which for an LLM-based system produces numbers that mean nothing
(see [ADR 0004](./decisions/0004-no-llm-backtests.md)).

## Secondary goals

1. **Honest evaluation.** Every signal is scored against what actually happened afterwards. Sources
   and analysts get a track record. Nothing is graded on vibes.
2. **Cheap to run.** Venue costs are zero by construction (paper/testnet). Inference is the only
   real recurring cost, and the architecture treats it as a budget to defend — tiered routing,
   prompt caching, event-driven cadence.
3. **Safe by construction.** The model can be wrong, hallucinate, or be prompt-injected by a
   hostile news article. None of that should be able to move money. The risk gate is deterministic
   code the model cannot reach around.
4. **Legible.** A stranger reading the repo should understand what it does and why in ten minutes.

## Explicit non-goals

| Not doing                           | Why                                                                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Beating the market                  | Retail systematic trading is negative-sum after costs. Designing for alpha would mean lying to ourselves about results. |
| Managing anyone else's money        | Personal account, personal capital. Anything else is a regulated activity.                                              |
| High-frequency or latency arbitrage | Requires colocation and infrastructure that is not available at this budget, and the edges are gone.                    |
| A self-modifying model              | Continuous autonomous retraining on non-stationary, low-signal data is a machine for overfitting recent noise.          |
| Financial advice, for anyone        | Not a licensed activity we are in. The repo is public; the output is not a recommendation.                              |
| Backtested performance claims       | Structurally unavailable for LLM agents. See ADR 0004.                                                                  |

## How "teaching it" actually works

The original instinct was a bot that continuously learns. The honest version of that, given
non-stationary markets and a model whose weights we do not control:

- **Signals are scored, not the model.** Every signal is resolved against realized price movement
  at its stated horizon. Sources, analysts, and prompt versions accumulate hit rates and
  calibration curves.
- **Prompts and routing are versioned artifacts.** A change to an analyst prompt is a new version
  with its own track record, promoted or rolled back on evidence.
- **A human is in the promotion loop.** Sonde surfaces which configurations are performing. It does
  not silently rewrite its own strategy.

That is a real learning system. It just puts the operator, not the model, at the point of change.

## Success criteria

Sonde is working when all of these are true:

- [ ] It runs unattended for a week without manual intervention or a crash.
- [ ] Every order in the log can be traced back to the source documents that caused it.
- [ ] The risk gate has blocked at least one order, and the block is legible in the UI.
- [ ] The analyst scoreboard has enough resolved signals to say something about which sources help.
- [ ] Monthly inference cost is known, bounded, and under the budget in [`architecture.md`](./architecture.md).
- [ ] Someone unfamiliar with the project can read the README and understand the point.

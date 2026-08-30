# 0015: Deterministic planning with promotable analyst influence

## Status

Accepted (supersedes 0005, 2026-08-29)

## Context

Sonde's original architecture made an LLM portfolio agent the producer of order proposals. Research then produced a deterministic launch strategy and reordered the roadmap so paper execution precedes any model call. Preserving an LLM proposal path would leave the launch system without an owner for order construction and make later model influence difficult to compare with the deterministic baseline.

The product is an autonomous trading system rather than a general strategy laboratory. The multi-insider Form 4 strategy is its first strategy, not its permanent identity, so the boundary must admit later strategies without requiring a plugin framework now.

## Decision

1. A versioned strategy forms candidates and emits signals. The Insider Cluster Strategy is Strategy V1.
2. A deterministic Portfolio Planner converts eligible signals and reconciled portfolio state into typed Order Proposals.
3. The Portfolio Planner has no model dependency. An analyst cannot submit an order, construct a broker command, or bypass deterministic planning and risk.
4. LLM analysts initially emit Analyst Annotations that are forward-scored without affecting order flow.
5. A specific, versioned analyst behavior may influence strategy eligibility, confidence, or sizing only after forward evidence and explicit human promotion. Promotion changes deterministic policy configuration; the model does not promote itself.
6. Every Order Proposal still passes through the pure deterministic risk boundary before paper execution.
7. Sonde exposes a narrow strategy contract needed by its own strategies. It does not build a generic plugin or user-authored strategy platform.

## Consequences

- The safety boundary from ADR 0005 remains, but its statement that agents emit proposals is replaced: analysts annotate, deterministic planning proposes, and deterministic risk disposes.
- The deterministic baseline and any later analyst contribution can be evaluated separately.
- Signal producer identity cannot be model-only; schemas must distinguish strategy versions from analyst versions.
- A future strategy can reuse the evidence, planning, risk, execution, and scoring spine without making the launch architecture generic prematurely.

## References

- [ADR 0004](./0004-no-llm-backtests.md)
- [ADR 0005](./0005-llm-proposes-code-disposes.md)
- [`docs/roadmap.md`](../roadmap.md)
- [`docs/strategy/charter.md`](../strategy/charter.md)

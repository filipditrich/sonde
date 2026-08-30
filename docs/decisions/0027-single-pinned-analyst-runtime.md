# 0027: One pinned analyst runtime before tiered routing

## Status

Accepted (supersedes 0007, 2026-08-29)

## Context

ADR 0007 committed Sonde to a batched cheap triage model, an expensive deep model, provider-specific cache floors, and a portfolio-agent role before the launch strategy or evidence volume was known. Strategy V1 is now deterministic, produces only a few candidates per week, and does not call a model until Milestone 6. Building a routing hierarchy before measuring candidate volume, document volume, or inference cost would create framework complexity with no demonstrated benefit.

Model reproducibility still requires more than a friendly model alias. Provider behavior, prompts, tools, schemas, and retry policy jointly define what is being forward-scored.

## Decision

1. Milestone 6 begins with one concrete provider adapter behind a narrow Sonde-owned Analyst Runtime. Sonde does not build a multi-provider orchestration framework.
2. Deterministic source selection, deduplication, aggregation, and token limits bound the candidate evidence before one high-quality analyst call.
3. Each Analyst Behavior Version records the provider, exact immutable model identifier, system and task prompt hashes, tool-contract hash, output-schema hash, and runtime-policy version. Moving a provider alias or changing any recorded component creates a new version.
4. Model requests, responses, validation results, usage, latency, and failures are immutable artifacts with typed Input References to exactly what the model received.
5. Source documents are delimited and identified as untrusted data. The Analyst Runtime exposes no venue, operator-control, database-mutation, or general network tool.
6. A cheap triage tier is added only after measured evidence volume or cost crosses a documented operational threshold. It is then a separately versioned analyst behavior with its own forward evaluation; it is not prebuilt as dormant infrastructure.
7. Prompt caching and batching are optimizations, not architectural roles. Stable instructions remain separated from volatile evidence so a chosen provider can cache safely, but provider-specific cache thresholds and model names live in versioned runtime policy and tests rather than permanent agent instructions.
8. The failure semantics and promotion boundaries from ADR 0026 apply unchanged.

## Consequences

- Initial model integration is one deep, inspectable module rather than a routing subsystem.
- Model and prompt changes cannot silently contaminate an analyst track record.
- Sonde may use a different provider later by adding an adapter and creating new behavior versions, without pretending outputs are equivalent.
- The existing Haiku batching and fixed Opus escalation assumptions leave the canonical architecture and agent instructions.
- Cost controls still matter, but their limits remain an operational decision to settle from measured usage.

## References

- [ADR 0004](./0004-no-llm-backtests.md)
- [ADR 0015](./0015-deterministic-planning-promotable-analysis.md)
- [ADR 0016](./0016-curated-origins-bounded-research.md)
- [ADR 0021](./0021-immutable-evidence-lineage-and-dual-replay.md)
- [ADR 0026](./0026-separated-scorecards-and-forward-promotion.md)

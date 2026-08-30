# 0005: The LLM proposes, deterministic code disposes

## Status

Superseded by [0015](./0015-deterministic-planning-promotable-analysis.md) (2026-08-29). The hard safety boundary remains; 0015 replaces the LLM-owned proposal path with deterministic planning and promotable analyst influence.

## Context

Sonde's analysts read arbitrary text from the public internet — news articles, forum posts, protocol
announcements — and produce trading opinions. Three distinct failure modes follow from that:

1. **Hallucination.** The model states something the source does not support.
2. **Prompt injection.** A source document contains text addressed to the model. This is not
   hypothetical for a system whose entire input surface is attacker-writable public text: anyone who
   can publish a page Sonde reads can attempt it.
3. **Ordinary wrongness.** The model reasons correctly over the evidence and is simply mistaken,
   which is the expected case most of the time.

An architecture where the model can call an order endpoint means all three of those failures reach
the venue. Guarding against them with better prompting is guarding a boundary with a request.

Alternatives considered:

1. **Model calls the venue via tools, with limits stated in the prompt.** Rejected — prompt-stated
   limits are not enforcement, and the injection case attacks exactly that layer.
2. **Model calls the venue, with a monitor that can intervene.** Rejected — asynchronous, racy, and
   the monitor is either another model (same problem) or the deterministic checks we could have run
   inline.
3. **Model emits a proposal; deterministic code decides.** Chosen.

## Decision

1. **The reasoning plane has no venue access.** `packages/agents` does not import `packages/venue`.
   Enforced by the dependency graph, not convention.
2. **`packages/risk` does not import `packages/agents`.** The gate cannot reach a model, so it
   cannot be talked into anything.
3. **Agents emit a typed `Proposal`.** That is the entire output surface. There is no tool that
   places an order.
4. **The gate is pure, synchronous, deterministic TypeScript** with no network calls and no model.
   Given the same proposal and the same account state it returns the same decision, always.
5. **Every gate decision is persisted with a reason** and rendered in the UI. Rejections are shown
   next to fills, not hidden in logs.
6. **The gate is the first thing built with real test coverage** (Milestone 4), and it is built
   before anything can call it.
7. **Source documents are data, never instructions.** Analyst prompts state this explicitly, and
   document content is delimited when passed to a model. This is defence in depth — it reduces
   injection success rate but is not what makes injection safe. Point 1 is what makes it safe.

## Consequences

- The model cannot do anything clever the gate does not permit. Some legitimately good ideas will be
  rejected by a blunt limit. Accepted, and visible: the "Blocked" panel makes the cost of each limit
  observable rather than theoretical.
- Rejection reasons turn out to be one of the more interesting UI surfaces — they show where the
  model's judgment and the operator's constraints actually diverge.
- The gate's determinism makes it exhaustively testable, including adversarial inputs (NaN prices,
  absurd sizes, duplicate ids, clock skew).
- A successful prompt injection produces a rejected proposal and a visible log entry, not a trade.

## Milestones touched

- Milestone 4 (Gate)
- Milestone 5 (Hands)

## References

- [`docs/architecture.md`](../architecture.md) — Enforcement plane
- [ADR 0003](./0003-paper-first-execution.md)
- [ADR 0009](./0009-venue-is-source-of-truth.md)

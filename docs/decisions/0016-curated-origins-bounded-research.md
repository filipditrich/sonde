# 0016: Curated sources originate candidates; bounded research enriches them

## Status

Accepted (amends 0011, 2026-08-29)

## Context

Sonde should investigate real-world information without allowing arbitrary web discovery to become an unbounded trading trigger. Configured feeds provide reproducible acquisition, known provenance, and measurable health; bounded research provides wider context but carries less predictable availability, cost, authorship, and prompt-injection risk.

## Decision

1. Only configured Candidate Sources may originate strategy candidates.
2. A strategy or analyst may perform bounded research after a candidate exists, subject to explicit time, request, source-policy, and inference budgets.
3. Every research document is acquired, timestamped, retained according to its source policy, and related to the candidate with its evidential role.
4. Research Sources may support, challenge, contextualize, or show propagation of an existing candidate. They cannot independently originate a candidate or trade.
5. A research source class may become a Candidate Source only through an explicit human promotion backed by forward scoring and a documented acquisition policy.
6. Retrieved content remains data, never instructions, and the reasoning plane retains no venue access.

## Consequences

- Sonde can investigate beyond fixed feeds without making arbitrary search results tradeable.
- Candidate formation remains reproducible and source health remains measurable.
- The domain must distinguish candidate-originating observations from research context and record evidential roles rather than treating every input as supporting evidence.

## References

- [ADR 0011](./0011-source-acquisition-policy.md)
- [ADR 0015](./0015-deterministic-planning-promotable-analysis.md)

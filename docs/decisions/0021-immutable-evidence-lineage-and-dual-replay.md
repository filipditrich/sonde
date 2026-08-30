# 0021: Immutable evidence lineage and dual replay

## Status

Accepted (supersedes 0008, 2026-08-29)

## Context

ADR 0008 made Signals append-only and required a flat list of source identifiers. That protected the model-era signal log, but Strategy V1 now has meaningful decisions before and after a Signal: acquisition, parsing, candidate formation, eligibility, deterministic planning, risk, execution, and two different kinds of outcome. A source URL or a mutable current-state query cannot prove what bytes or state a historical decision actually used.

The cockpit must answer two different questions: “Why did Sonde make that decision then?” and “What would Sonde conclude using corrected information now?” Calling both replay would silently contaminate the forward record.

## Decision

1. Sonde's canonical evidence spine is Acquisition Attempt → Source Document → Source Fact → Candidate Snapshot → Eligibility Decision → Signal → Planning Decision and optional Order Proposal → Risk Decision → Order and Execution Event → Signal Outcome and Execution Outcome. Operational Events and Analyst Annotations attach to this spine without bypassing it.
2. Every derived artifact on the spine is immutable and append-only. A changed view is a new artifact that directly references the artifact or inputs it supersedes; no historical artifact is edited in place.
3. Acquisition Attempts and Source Documents are separate. An Acquisition Attempt records request and response metadata and may reference a Source Document. A Source Document stores exact immutable bytes under a content hash with media-type and parser-version provenance. Multiple attempts may produce the same document; one resource may produce different documents over time.
4. Every derived artifact carries typed direct Input References to the exact upstream artifacts it consumed. Append-only Evidence Relations classify `supports`, `undercuts`, `context`, `propagation`, and `ignored`; they supplement direct inputs and never replace them.
5. At each Decision Cutoff, Sonde freezes a Decision Packet identifying the final Candidate Snapshot and the exact policy, market calendar, universe, market data, Data Readiness, portfolio, strategy, and model versions or hashes used on that decision path.
6. Forensic Replay uses only the captured inputs and versions in the Decision Packet. A model's preserved request and response are its historical truth; a fresh call is never presented as an identical replay.
7. Reconstruction Replay is separately labelled, may use corrected or newly fetched inputs, and reports field-level differences from the forensic record. It cannot mutate or replace the original decision or outcome.
8. The cockpit renders the lineage and distinguishes observed history, forensic replay, and reconstruction. Missing provenance is a schema failure, not a display omission.

## Consequences

- The existing `raw_documents`, `observations`, flat `sourceIds`, and model-owned Signal shape are migration inputs, not the target schema.
- Storage grows monotonically, including acquisition failures and decisions that produce no proposal. At Sonde's volume this is inexpensive and is the product's evidentiary value.
- Point-in-time queries operate over exact artifact references rather than inferring historical state from the latest rows.
- Shadow analysis can compare a new behavior with the preserved baseline without rewriting history or pretending a newly sampled model response is deterministic.
- The UI can explain non-actions and operational failures through the same lineage as fills.

## References

- [ADR 0004](./0004-no-llm-backtests.md)
- [ADR 0015](./0015-deterministic-planning-promotable-analysis.md)
- [ADR 0019](./0019-operational-states-fail-closed.md)
- [`CONTEXT.md`](../../CONTEXT.md)

# Evidence spine

**Status:** accepted contract · **First consumer:** Milestone 0

The cross-cutting storage and domain contract. Feature specs may add fields but cannot weaken these
invariants without a superseding ADR.

## Invariants

1. Every authoritative artifact is immutable or append-only.
2. Every derived decision carries a non-empty rationale and typed direct Input References to every
   artifact it actually consumed.
3. Evidence Relations add semantic meaning and never substitute for direct inputs.
4. Source Document bytes exist before parsing or derivation.
5. Source clocks retain domain names; `observedAt` and `recordedAt` retain knowledge semantics.
6. Issuer, Listing, and Broker Asset identities are separate and effective-dated.
7. Authoritative financial quantities use validated decimal strings or scaled integers at domain
   interfaces and database decimals in storage.
8. Mutable projections are disposable and identify the ledger cursor through which they are built.

## Common artifact envelope

Every artifact schema includes:

| Field           | Contract                                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| `id`            | Stable artifact identity; never reused for a changed artifact                                               |
| `kind`          | Closed discriminator owned by `packages/core`                                                               |
| `schemaVersion` | Version of the Zod schema that validated the artifact                                                       |
| `recordedAt`    | UTC instant the artifact became durable                                                                     |
| `inputRefs`     | Typed direct references to consumed upstream artifacts; empty only for source-origin artifacts              |
| `rationale`     | Required on decisions and derived interpretations; typed source facts may instead carry parser provenance   |
| `supersedesId`  | Optional prior artifact whose meaning this artifact replaces prospectively; the prior row remains unchanged |

An Input Reference contains the upstream `kind`, `id`, and role expected by the consuming schema.
The database enforces referential existence and rejects kind mismatches. Generic UUID arrays are not
valid provenance.

## Source lineage

### Acquisition Attempt

One row per real request, successful or not:

- configured source identity and source-policy version;
- canonical request identity, method, resource locator, and sanitized headers;
- `requestedAt`, `completedAt`, response status, retry classification, and error code;
- optional resulting Source Document hash;
- `observedAt`, the first instant Sonde possessed the returned information.

A retry is a new Acquisition Attempt even when it returns identical bytes.

### Source Document

- SHA-256 identity of exact bytes;
- immutable byte storage reference, size, media type, encoding, and integrity result;
- acquisition-policy retention class;
- no URL as identity.

Many Acquisition Attempts may reference one Source Document. If policy requires deletion, retain a
hash tombstone, metadata, reason, and lineage.

### Parse Run and Source Fact

A Parse Run identifies Source Document hash, parser name/version, start and completion, validation
result, and either the complete emitted fact set or a typed failure. Parser failure cannot roll back
the acquisition.

Form 4 parsing emits every typed transaction. A transaction fact includes at least:

- accession number, document hash, Issuer CIK, reporting-owner CIK, and owner relationship flags;
- SEC acceptance time, transaction date, and Sonde Knowledge Clocks;
- security title, transaction code, acquired/disposed code, direct/indirect ownership;
- shares and price per share as decimals, plus footnote references;
- a stable source locator within the document.

Strategy eligibility is downstream policy; the parser does not discard non-`P` transactions.

## Market identity and reference data

| Artifact          | Canonical identity                        | Required effective data                                                   |
| ----------------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| Issuer            | SEC CIK                                   | legal name and provenance                                                 |
| Listing           | Sonde listing id                          | Issuer, security type, venue, ticker history, effective interval          |
| Broker Asset      | broker + broker asset id                  | Listing, broker symbol, tradable/fractionable flags, effective interval   |
| Universe Snapshot | strategy + entry session + policy version | included Listings, exclusions with reasons, SIP input refs                |
| Market Calendar   | calendar version                          | sessions, open/close instants, early-close status, acquisition provenance |

Universe eligibility is a dated policy result. It is never embedded into identity.

## Decision lineage

Required artifact order:

```text
Source Facts
  → Candidate Snapshot
  → Eligibility Decision
  → Signal
  → Decision Packet
  → Data Readiness
  → Planning Decision
  → optional Order Proposal
  → Risk Decision
  → optional Order and Execution Events
  → Signal Outcome / Execution Outcome / Realism Outcome
```

### Candidate Snapshot

Identifies strategy/version, Issuer, Decision Window, ordered qualifying fact references, distinct
reporting-owner CIKs, relevant Listing and universe status, derived counts, state, and the transition
that caused the snapshot. It is never updated in place.

### Eligibility Decision

Identifies the final Candidate Snapshot, strategy-policy version, ordered checks and results, final
`eligible` or `ineligible` status, and rationale. Every closed candidate gets one.

### Signal

Identifies the eligible decision, Issuer and Listing, long direction, entry session/open price
convention, Market Horizon, rationale, and labelled Bootstrap Prior. It has no model-owned analyst
field and no claim of event confidence.

### Decision Packet

An immutable manifest of exact references and hashes for candidate, eligibility, strategy, policy,
calendar, universe, market data, identity mappings, operating state, readiness policy and raw
readiness inputs, portfolio, broker reconciliation, and any active Analyst Behavior Version and
Capability Grants. It contains references and declared digests, not a database dump.

The packet does not reference the Data Readiness result. Data Readiness is derived next and directly
references the packet, preventing a causal cycle while preserving every input needed to reproduce
the assessment.

### Readiness, planning, and risk

- Data Readiness records every required input check, age, policy threshold, artifact reference,
  result, and aggregate status.
- Planning Decision records proposal or no-proposal and one or more typed reasons.
- Order Proposal contains the intended broker asset, side, whole-share quantity, auction order type,
  client-order identity, target session, and relevant planning/readiness references.
- Risk Decision records the complete risk-policy version, snapshot reference, ordered checks, and
  accept/reject result.

## Execution lineage

Never model one mutable Order row as broker truth. Append normalized observations of:

- submission attempt and ambiguous result;
- broker order acknowledgement and status transitions;
- fills and partial fills;
- cancellation request and result;
- account, position, and open-order reconciliation snapshots;
- drift detections and Execution Exceptions;
- deterministic fallback intent and result.

Materialized current orders and positions are replaceable projections. The broker remains
authoritative for paper execution state.

## Outcomes

- A Signal receives exactly one terminal resolved or Unresolvable Outcome for a given resolver
  version.
- An Execution Outcome derives only from broker-reported history.
- A Realism Outcome names its method version and inputs and never replaces either other outcome.
- Corrections create a new explicitly versioned outcome that supersedes the prior artifact; they do
  not update it.

## Evidence relations

The initial closed relation set is:

| Relation      | Meaning                                             |
| ------------- | --------------------------------------------------- |
| `supports`    | Evidence increases belief in a claim                |
| `undercuts`   | Evidence decreases belief in a claim                |
| `context`     | Relevant without directional effect                 |
| `propagation` | Artifact is downstream repetition of another source |
| `ignored`     | Considered and excluded with a reason               |

Adding a relation is a schema change. Relations are append-only and identify the behavior or
operator that asserted them.

## Transactions and recovery

1. Acquisition Attempt, Source Document, and their link commit before parsing.
2. A Parse Run commits either its complete fact set or a typed failure.
3. Closing a Decision Window atomically appends the final Candidate Snapshot, Eligibility Decision,
   optional Signal, and Decision Packet identity guard; Data Readiness then references that packet.
4. Planning and risk each commit their decision before a side effect is attempted.
5. Broker submission appends intent before I/O; ambiguity triggers query-first recovery by client
   order identity.

## Database enforcement

- deny `UPDATE` and `DELETE` on evidence tables;
- unique semantic keys prevent duplicate derived artifacts;
- typed foreign keys or equivalent database checks protect Input Reference kind and existence;
- Source Document hash integrity is verified on write and read;
- only explicit projection tables permit mutation;
- the cockpit query role cannot insert evidence; the control role can only append Operator Commands.

## Contract tests

- every evidence table rejects update and delete;
- the same document from two attempts stores two attempts and one document;
- parse failure retains acquisition and bytes;
- non-`P` Form 4 transactions survive parsing;
- a derived artifact with a missing or wrong-kind Input Reference fails;
- ticker change preserves Issuer and Listing history;
- decimal round trips are exact;
- closing the same Decision Window twice produces one semantic decision set;
- ambiguous broker submission queries before retrying;
- projections rebuild to the same state from a known ledger cursor.

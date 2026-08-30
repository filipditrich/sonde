# Engine runtime

**Status:** accepted contract · **Milestone:** 0 · **Consumes:** `@sonde/probes`, `@sonde/db`

How `apps/engine` schedules work, survives restarts, and reports its own health. Written before the
app exists because two of the decisions below shape the database schema, and retrofitting them is
expensive.

---

## The shape of the workload

Worth stating plainly, because it rules out an architecture the earlier docs assumed:

| Work                       | Cadence               | Latency that matters |
| -------------------------- | --------------------- | -------------------- |
| EDGAR live poll            | ~5 min                | minutes              |
| EDGAR daily reconciliation | daily                 | hours                |
| Price bars + ADV           | daily, after close    | hours                |
| Candidate snapshots        | after each EDGAR poll | seconds              |
| Decision cutoff + entry    | 09:20–09:28 ET        | seconds              |
| Signal resolution          | daily                 | hours                |
| Horizon exit staging       | before 15:50 ET       | seconds              |

**The strategy workload is not stream-shaped.** Cadences run minutes to daily, and the trading
horizon is twenty sessions. Broker trade updates later arrive as a stream for cockpit immediacy,
but durable REST reconciliation remains authoritative. Sonde therefore needs schedules and one
adapter stream, not a general internal event bus.

## D1 — One process, two scheduling lanes

`apps/engine` is a single long-lived Bun process with two isolated schedulers over durable Postgres
state ([ADR 0018](../decisions/0018-scheduled-work-priority-market-actions.md)):

- an ordinary lane for probes, reconciliation, snapshots, resolution, and housekeeping;
- a priority market-action lane for the 09:20 Decision Cutoff, opening-auction submission,
  close-auction staging, and post-auction reconciliation.

```ts
type Job = {
	name: string;
	cadence: { every: Duration } | { dailyAfter: MarketEvent };
	run: (ctx: JobContext) => Promise<JobOutcome>;
};
```

Ordinary work cannot delay a due priority action. Both lanes use idempotent operations and durable
run records, so restart recovery reconstructs intent from Postgres rather than memory.

**No external queue broker and no distributed worker pool.** Process death is handled by the restart
policy of whatever runs it. The lane boundary is the seam if separate processes ever become
necessary.

## D2 — Idempotency follows domain identity

Repeated acquisition is evidence, while repeated derivation from the same captured inputs is not a
new fact. IDs therefore follow the semantics of each artifact instead of applying one deduplication
rule to the entire pipeline.

| Artifact            | Identity rule                                                          |
| ------------------- | ---------------------------------------------------------------------- |
| Acquisition Attempt | Fresh time-ordered id for each real request                            |
| Source Document     | SHA-256 of exact bytes                                                 |
| Source Fact         | Source Document hash + parser version + stable fact locator            |
| Candidate Snapshot  | Strategy/version + Issuer + Decision Window + ordered Input References |
| Signal              | Strategy/version + Issuer + closed Decision Window                     |
| Order Proposal      | Planning Decision identity                                             |
| Broker submission   | Proposal + execution intent + explicit attempt ordinal                 |

Source-derived and decision writes reject semantic duplicates. Acquisition attempts do not: a
retry is a new historical fact even when it returns identical bytes. On an ambiguous broker
response, recovery queries by the deterministic client-order identity before creating another
attempt ordinal.

## D3 — Live feed for latency, daily index for completeness

The live `getcurrent` feed returns the most recent 100 filings. **870 Form 4s were filed on
2026-08-27**, concentrated in the hours after the close — at peak the feed holds roughly forty
minutes of filings.

| Job               | Source                              | Cadence         |
| ----------------- | ----------------------------------- | --------------- |
| `edgar-live`      | `getcurrent` atom, 100 entries      | every 5 min     |
| `edgar-reconcile` | `daily-index/.../form.YYYYMMDD.idx` | daily, 02:00 ET |

Five minutes leaves a wide margin; thirty would not. The daily index is authoritative and lists
every filing, so reconciliation catches anything the feed rotated past — and because writes are
idempotent (D2), it can simply re-process the whole day.

### Overflow detection

Polling faster is a guess; **knowing** you fell behind is better. On each poll, if the _oldest_
entry in the feed has not been seen before, filings rotated past between polls:

```
oldest entry unseen  ⇒  the window moved further than we did  ⇒  flag gap, let reconcile clean up
```

Cheap, self-reporting, and it turns "is 5 minutes enough?" from an assumption into a measurement
surfaced on the health panel.

> **Cost note.** Transaction codes are not in the feed — only the filing's own XML has them — so
> every Form 4 must be fetched to learn whether it is a purchase. That is ~870 filings × 2 requests
> ≈ 1,740 requests/day, about 4.4 minutes of fetching at the 150ms SEC spacing. Acceptable, and not
> avoidable: the feed carries the _reporting owner's_ CIK, not the issuer's, so it cannot be
> pre-filtered by ticker either.

## D4 — Market calendar from Alpaca, not hardcoded

`GET /v2/calendar` returns real sessions including early closes and extended hours:

```json
{ "date": "2026-08-28", "open": "09:30", "close": "16:00", "session_open": "0400", "session_close": "2000" }
```

Fetched once daily and cached. Hardcoding holidays means being wrong on Thanksgiving and on every
early close, silently.

`dailyAfter: 'close'` and `dailyAfter: 'open'` cadences resolve against this, so jobs never encode
clock times.

## D5 — Failures are isolated and recorded

Every job run appends lifecycle events rather than updating a run row:

```
JobRunStarted(runId, job, startedAt, policyVersion)
JobRunFinished(runId, finishedAt, outcome, items, meta)
JobRunFailed(runId, failedAt, error, meta)
```

- A job that throws is caught, recorded, and does not touch the other ordinary jobs or the priority
  lane
- Consecutive failures derive an unhealthy status; any mutable health projection is a disposable
  cache over the append-only events
- `meta` carries per-job detail — filings seen, code-`P` emitted, gap flags from D3

This table is also the substrate for the dead-man's switch in Milestone 3, so it is worth getting
right now rather than bolting a second mechanism on later.

## D6 — Acquisition is durable before derivation

[ADR 0021](../decisions/0021-immutable-evidence-lineage-and-dual-replay.md) requires an Acquisition
Attempt and immutable Source Document before any derived Source Facts. Enforced structurally rather
than by ordering discipline:

```
BEGIN
  INSERT INTO acquisition_attempts …
  INSERT INTO source_documents … ON CONFLICT DO NOTHING
  INSERT INTO acquisition_documents …
COMMIT

BEGIN
  INSERT INTO parse_runs …
  INSERT INTO source_facts … ON CONFLICT DO NOTHING   -- typed Input Reference to Source Document
COMMIT
```

The first transaction preserves what Sonde fetched even if parsing fails. The second either appends
a complete typed fact set or a parse-failure event; it cannot erase the acquisition. Combined with
D2, a crash leaves recoverable evidence and the next run derives the same semantic facts.

## What runs where

Milestone 0 may run interactively under `bun dev`. Before Milestone 4, the engine and web app run as
separately supervised processes on one always-on host with colocated Postgres, automatic process
restart, synchronized clock, sleep disabled during operation, and startup reconciliation. One simple
automated backup copy lives outside the live data directory. See
[ADR 0029](../decisions/0029-simple-local-operations.md).

## Open

- **Backpressure on a filing storm.** 870/day is comfortable; a 10× day would push the live poll
  past its own interval. The tick loop should skip a job that is still running rather than stacking
  runs, but the behaviour beyond that is unspecified.

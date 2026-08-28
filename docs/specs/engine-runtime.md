# Engine runtime

**Status:** proposed · **Milestone:** 0 · **Consumes:** `@sonde/probes`, `@sonde/db`

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
| Signal emission            | after each EDGAR poll | seconds              |
| Signal resolution          | daily                 | hours                |
| Order placement _(M4)_     | market open           | seconds              |

**Nothing here is streaming.** Cadences run minutes to daily, and the trading horizon is twenty
sessions. [`architecture.md`](../architecture.md) proposed an in-process event bus with a
Postgres-backed outbox; that was written when the design assumed continuous crypto markets and an
LLM in the entry path. **This is a cron-shaped workload**, and a bus would be machinery for a
problem Sonde does not have.

## D1 — One process, one tick loop

`apps/engine` is a single long-lived Bun process with a tick loop over a declarative job registry.

```ts
type Job = {
	name: string;
	cadence: { every: Duration } | { dailyAfter: MarketEvent };
	run: (ctx: JobContext) => Promise<JobOutcome>;
};
```

The loop wakes every 30s, asks each job whether it is due, and runs those that are — sequentially,
because nothing here is throughput-bound and sequential execution makes the logs readable.

**No supervisor, no worker pool, no queue.** Process death is handled by the restart policy of
whatever runs it. If a second process is ever genuinely needed, the job registry is the seam to
split on.

## D2 — Deterministic ids, so restart recovery costs nothing

**The important decision.** `pollOnce` currently returns a `seen` set of accession numbers, which
implies somewhere to persist it, which implies a state table and a crash-consistency story.

Instead: **derive every id deterministically from the source's own identifiers, and let the database
reject duplicates.**

| Row             | Id derivation                               |
| --------------- | ------------------------------------------- |
| `raw_documents` | `sha256(content)` — already the primary key |
| `observations`  | `uuidv5(accession + document)`              |
| `signals`       | `uuidv5(eventClusterId + analyst version)`  |

Every write is `ON CONFLICT DO NOTHING`. Re-processing a filing is then a **no-op**, which means:

- A crash mid-poll needs no recovery — the next poll re-reads and re-writes harmlessly
- The `seen` set becomes a within-poll optimisation, held in memory, discarded freely
- No probe state table, no checkpointing, no partial-write reasoning
- Re-running the whole day is safe, which makes the daily reconciliation below trivial

The tradeoff is a wasted fetch on restart. At 150ms per request and a feed of 100 entries, that is
under a minute — a good trade for deleting an entire class of bug.

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

Every job run writes a row **before and after** it runs:

```
job_runs(id, job, started_at, finished_at, outcome, items, error, meta)
```

- A job that throws is caught, recorded, and does not touch the others
- Consecutive failures set an unhealthy flag; the health panel reads this table directly
- `meta` carries per-job detail — filings seen, code-`P` emitted, gap flags from D3

This table is also the substrate for the dead-man's switch in Milestone 3, so it is worth getting
right now rather than bolting a second mechanism on later.

## D6 — One transaction per filing, raw document first

[ADR 0008](../decisions/0008-append-only-signal-log.md) requires the raw payload to be persisted
before anything derived from it. Enforced structurally rather than by ordering discipline:

```
BEGIN
  INSERT INTO raw_documents … ON CONFLICT DO NOTHING
  INSERT INTO observations … ON CONFLICT DO NOTHING   -- FK to raw_documents
COMMIT
```

The foreign key makes the wrong order impossible, and the transaction makes a half-written filing
impossible. Combined with D2, a crash anywhere leaves the database consistent and the next poll
finishes the job.

## What runs where

Locally under `bun dev` for Milestone 0. The engine needs an always-on host eventually — it must
hold a schedule and, from Milestone 4, act at the open. **Deployment target is deliberately not
decided here**; nothing in this spec depends on it.

## Open

- **Does order placement live in this process?** Probably yes at Milestone 4 — but it is the one job
  with a hard latency requirement (the open), and mixing it with a sequential tick loop that might
  be mid-reconciliation deserves a second look then.
- **Backpressure on a filing storm.** 870/day is comfortable; a 10× day would push the live poll
  past its own interval. The tick loop should skip a job that is still running rather than stacking
  runs, but the behaviour beyond that is unspecified.

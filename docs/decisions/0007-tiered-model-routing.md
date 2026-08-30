# 0007: Tiered model routing with prompt caching

## Status

Superseded by 0027 (2026-08-29)

## Context

Venue fees are zero by construction ([ADR 0003](./0003-paper-first-execution.md)), which makes
inference the entire recurring cost of running Sonde. The stated budget is under $30/month
([`docs/architecture.md`](../architecture.md)), and the cost model has to be designed in rather than
optimized later.

Current pricing, per million tokens:

| Model            | Input | Output | Min. cacheable prefix |
| ---------------- | ----- | ------ | --------------------- |
| Claude Haiku 4.5 | $1    | $5     | 4096 tokens           |
| Claude Sonnet 5  | $3    | $15    | 1024 tokens           |
| Claude Opus 5    | $5    | $25    | 512 tokens            |

Two structural facts drive the design:

**The work is not uniform.** Deciding whether a headline is worth reading at all is a cheap
classification. Weighing several sources against an open portfolio and proposing a position is not.
Running both on the same model overpays for the first or underpowers the second.

**The prompt is mostly stable.** System prompt, strategy rules, asset universe, and portfolio state
are near-identical between consecutive calls; only the new document and current price change. That
is exactly the shape prompt caching rewards — cache reads bill at roughly 0.1× input price.

The cache floors are the trap. They are **not monotonic**: the cheap model has the _highest_
minimum. A naive design — short single-item prompts on Haiku — silently gets no caching at all. No
error is raised; `cache_read_input_tokens` simply stays zero.

## Decision

1. **Two tiers.**
   - **Triage** — `claude-haiku-4-5`. Batched scoring of many documents per call. Filters hard.
   - **Deep read and portfolio proposals** — `claude-opus-5`. Only sees what survives triage.

   `claude-sonnet-5` is available as a middle tier but is not wired in by default; adding a tier has
   its own complexity cost and should be justified by scoreboard evidence.

2. **Batch triage to clear the 4096-token floor.** Documents are accumulated and scored in groups.
   This is a correctness requirement for caching, not just an efficiency one — and it aligns with
   the debounce window in [ADR 0006](./0006-event-driven-cadence.md).

3. **Prompt layout is cache-shaped, and this is a structural constraint on prompt code.**
   Render order is `tools` → `system` → `messages`. Stable content goes first with the cache
   breakpoint at the end of it; volatile content (the new document, current price, timestamps) goes
   strictly after. **No timestamp, UUID, or per-request id may appear in the system prompt** — it
   invalidates the whole prefix.

4. **TTL default is 5 minutes.** Cache writes cost 1.25× at 5-minute TTL and 2× at 1-hour; the
   5-minute tier breaks even at two requests, the 1-hour tier needs three or more. An event-driven
   loop firing more often than every 5 minutes keeps the cache warm for free. The 1-hour TTL is
   considered only for genuinely bursty patterns with long idle gaps.

5. **Cache effectiveness is monitored, not assumed.** `cache_read_input_tokens` is recorded on every
   call and surfaced on the cost dashboard. A sustained zero is an alertable bug, because that is
   exactly how a silent invalidator presents.

6. **Research workloads use the Batch API.** Scoring a historical corpus to build an evaluation set
   is not latency-sensitive and runs at 50% off.

7. **Model ids are config, not literals.** One place to change, so a model upgrade is one edit and
   the routing thresholds can be re-tuned against the scoreboard.

## Consequences

- Triage carries a latency floor from the debounce window. Irrelevant at Sonde's horizons.
- The escalation threshold is the dominant cost knob. Set too high, interesting items are dropped
  before anyone reads them; too low, Opus spend climbs. It is versioned and tracked so the tradeoff
  is empirical.
- Prompt construction is constrained by cache layout. This is a real constraint on how prompt code
  is written and it needs to be respected from the first analyst, because retrofitting it means
  rewriting every prompt.
- Two tiers means two prompt sets to maintain and two sets of scoreboard entries.
- Model upgrades change both cost and cache floors. Any migration re-checks the floors — an upgrade
  that raises the minimum prefix can silently disable caching on a working path.

## Milestones touched

- Milestone 2 (Opinion)
- Milestone 5 (Hands)
- Milestone 6 (Watch)

## References

- [`docs/architecture.md`](../architecture.md) — Cost model
- [ADR 0006](./0006-event-driven-cadence.md)

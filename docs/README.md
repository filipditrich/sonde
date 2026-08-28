# Sonde docs

This folder is the **source of truth** for architecture, decisions, and scope on Sonde. Code implements against these docs; docs are not generated from code.

If a doc disagrees with the code, either the doc is right and the code is a bug, or the doc is stale and a new ADR must supersede it. Do not silently desync.

## Layout

| Path                                   | Purpose                                                                | Lifecycle                        |
| -------------------------------------- | ---------------------------------------------------------------------- | -------------------------------- |
| [`overview.md`](./overview.md)         | **The whole picture** — planes, flows, diagrams, components, status    | Living                           |
| [`goals.md`](./goals.md)               | What Sonde is for, what it is explicitly not for, how we call it a win | Living                           |
| [`architecture.md`](./architecture.md) | Planes, dataflow, runtime boundaries, storage, cost model              | Living                           |
| [`roadmap.md`](./roadmap.md)           | Milestone 0..N with goal + exit criteria for each                      | Living                           |
| [`glossary.md`](./glossary.md)         | Trading and market-structure terms, defined for people who don't trade | Living                           |
| [`strategy/`](./strategy)              | The thesis — what edge, how evidence becomes a position                | Living                           |
| [`decisions/`](./decisions)            | ADRs in Nygard format, numbered, append-only                           | Append-only                      |
| [`specs/`](./specs)                    | Per-feature implementation specs                                       | Just-in-time, before a milestone |
| [`research/`](./research)              | Evidence and options, before any commitment                            | Exploratory → promoted           |
| [`ui/`](./ui)                          | Dashboard information architecture and flows                           | Just-in-time                     |

## Lifecycle conventions

- **Living docs** (goals, architecture, roadmap, glossary) — edit any time. The commit body should say _why_ it changed, not just _what_.
- **ADRs** — append-only. If a decision changes:
  1. Write a new ADR with the next number.
  2. Set the new ADR's `Status` to `Accepted (supersedes NNNN)`.
  3. Edit the old ADR's `Status` to `Superseded by NNNN`.
  4. Never rewrite the body of a superseded ADR.
- **Specs** — written just-in-time before the milestone that consumes them. If a feature is dropped, move its spec to `specs/_archived/` with a one-line note at the top.
- **Research** — preserve evidence and rejected alternatives without creating roadmap commitment.

## Start here

New to the project? Read in this order:

0. [`overview.md`](./overview.md) — **the whole system in one document, with diagrams**
1. [`goals.md`](./goals.md) — the honest framing, including what this will not do
2. [ADR 0004](./decisions/0004-no-llm-backtests.md) — the single constraint that shapes everything else
3. [`architecture.md`](./architecture.md) — how the pieces fit
4. [`roadmap.md`](./roadmap.md) — what gets built, in order

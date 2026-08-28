# Roadmap

Milestones are ordered by dependency, not ambition. Each one has an exit criterion that is
observable — something you can look at and say yes or no. A milestone is not done because the code
exists; it is done when the criterion is met.

**Rule: no milestone adds a model call until the milestone before it is observable in the UI.**
The failure mode for this kind of project is a clever agent wired to a pipeline nobody can see.

---

## Milestone 0 — Pipe

**Goal:** prove data flows end to end with no intelligence anywhere.

- Bun + Turborepo workspace, `packages/core` with Zod domain types
- Postgres schema and migrations for `raw_documents`, `observations`
- One price probe against a public exchange endpoint via CCXT
- Next.js app with a single live chart reading from Postgres

**Exit:** a chart in the browser updating from data Sonde collected and stored itself.

**Not in scope:** signals, LLMs, orders, risk.

---

## Milestone 1 — Ears

**Goal:** ingest unstructured sources and store them with clean provenance.

- GDELT probe, RSS probe
- Content-hash deduplication, `observed_at` / `occurred_at` discipline
- Raw payload persistence before any processing
- Probe health surface in the UI: last run, item count, error state

**Exit:** a browsable, deduplicated document feed with correct timestamps, and a probe status panel
that makes a stalled probe obvious.

---

## Milestone 2 — Opinion

**Goal:** first model in the loop. Still no trading.

- `packages/agents` with the triage analyst (Haiku 4.5, batched to clear the 4096-token cache floor)
- Structured `Signal` output with `rationale` and `sourceIds` mandatory
- Append-only signal log
- Live tape UI: signals as they form, each expandable to its source documents
- Token spend counter, visible from the first call

**Exit:** run it for a week and read the signals. They should be legible and traceable even when
wrong. Spend should be a known number.

---

## Milestone 3 — Scorekeeping

**Goal:** know whether any of it means anything. **This is the milestone that makes the project honest.**

- Signal resolution job: score every signal against realized price at its stated horizon
- `signal_results` table
- Analyst scoreboard: hit rate and calibration per source, per analyst, per prompt version
- Calibration plot — when it says 0.8, is it right 80% of the time?

**Exit:** enough resolved signals to make a defensible statement about which sources carry
information and which are noise.

> This milestone is deliberately placed before any order is ever proposed. Building execution
> before measurement is how you end up trading a signal you never checked.

---

## Milestone 4 — Gate

**Goal:** the safety layer, built and tested before anything can use it.

- `packages/risk`: position caps, daily loss halt, order rate limit, sanity bounds, kill switch,
  dead-man's switch
- Property tests and adversarial cases: absurd sizes, NaN prices, duplicate ids, clock skew
- Gate decisions logged with reasons and rendered in the UI
- Dependency-graph rule enforced: `risk` cannot import `agents`

**Exit:** a test suite that demonstrates every limit rejecting, and a "Blocked" panel in the UI.

---

## Milestone 5 — Hands

**Goal:** paper trading, end to end.

- Portfolio agent (Opus 5, tool-use) turning signals into order proposals
- Venue adapter against paper/testnet with idempotency keys
- Reconciler: venue as source of truth, drift detection and correction
- Full trade detail view — sources → rationale → proposal → gate decision → fill

**Exit:** an unattended week with orders flowing, at least one gate rejection in the log, and every
trade traceable to the documents that caused it.

---

## Milestone 6 — Watch

**Goal:** make it worth leaving open.

- Time-travel replay: scrub the tape and watch decisions re-form
- Cost dashboard by tier and probe against budget
- "What it decided not to do" — near-miss signals and their outcomes
- Alerting to Telegram or Slack on halts, drift, and probe failure

**Exit:** the dashboard is the thing you actually open, not the logs.

---

## Milestone 7 — Iterate

**Goal:** the honest version of "teaching it".

- Prompt versioning with per-version track records
- Promotion workflow: propose a change, run it in shadow alongside the incumbent, compare on
  resolved signals, promote or discard
- Shadow analysts — new prompts scored live without touching order flow

**Exit:** a prompt change that was promoted on evidence rather than on a hunch.

---

## Beyond

Deliberately unscheduled, listed so they are not mistaken for oversights:

- **Real capital.** Requires an explicit live gate — see [ADR 0003](./decisions/0003-paper-first-execution.md).
  Not a milestone; a separate decision with its own ADR, its own limits, and a sum that can be lost
  entirely.
- **Equities via Interactive Brokers.** The venue abstraction is designed for it
  ([ADR 0002](./decisions/0002-crypto-first-ccxt.md)), but IBKR's gateway process is a real
  operational cost and buys nothing until crypto is boring.
- **ML components.** Regime classification or position sizing as narrow models inside a
  human-reviewed strategy. Only once the scoreboard can prove they help.
- **Penny stocks and OTC — detection, not participation.** Wanted, deliberately deferred. Sonde
  would flag coordinated attention spikes in illiquid names and score them as predictions of
  manipulation, never taking a position: penny markets are where pump-and-dump lives, and a bot
  buying attention spikes there is the designed victim rather than a participant. It reuses the
  attention machinery the main strategy already needs, so the marginal cost is a scoreboard panel
  rather than a new subsystem. Needs its own ADR first.

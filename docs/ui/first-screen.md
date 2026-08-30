# Operations cockpit

**Status:** accepted contract · **Begins:** Milestone 0 · **Grows through:** Milestone 7 ·
**Constrained by:** [ADR 0028](../decisions/0028-operations-first-private-cockpit.md)

The cockpit is the primary product surface: a private, authenticated view of what Sonde knows, what
it decided, what will happen next, and whether it is safe to continue. It is not a brokerage
workstation and never exposes a discretionary order ticket or operating-system shell.

## Home-screen questions

The home screen must answer, in order:

1. Is Sonde Active, and is the next decision or market action ready?
2. What requires the operator's attention now?
3. What is the next scheduled action and its deadline?
4. What evidence is entering the funnel, and what decisions are forming?
5. What is held, blocked, or in flight?
6. Is the strategy learning anything, and how does paper execution differ from it?

Milestones progressively add truthful panels. A missing subsystem renders as “not built in this
milestone,” never as mock data, zero performance, or a green health state.

## Information hierarchy

### Status rail

Always visible:

- durable operating state: `Active`, `Paused`, `Degraded`, `Halted`, or `Recovering`;
- current entry Data Readiness and its policy version;
- US/Eastern market-session clock, next priority action, and deadline;
- age of the latest authoritative snapshot and SSE connection status;
- unacknowledged Operational Alert count.

State is derived from append-only transitions. Browser connectivity is not operating state.

### Urgent attention

Show unacknowledged alerts first, ordered by severity and creation time. At minimum, Halted state,
Position Breach, missed auction deadline, reconciliation drift, ambiguous broker response, and
readiness failure near cutoff are urgent. Acknowledgement appends an Operator Command and never
deletes or mutates the alert.

### Next action

Show the next scheduled priority-lane action, its prerequisites, current readiness, and remaining
time. Examples are Decision Window cutoff, MOO submission deadline, auction reconciliation, MOC
staging, and exit fallback. The panel links to the exact readiness and policy inputs.

### Candidate funnel and decision tape

The funnel is retained because selectivity and silent parser failure are important:

```text
Form 4 documents → typed transactions → qualifying purchases
→ distinct-owner candidates → liquid eligible Signals → proposals → orders → fills
```

Counts are projections over stored immutable facts and decisions, not engine-maintained counters.
Each stage drills into its population. The live decision tape shows append-only Candidate Snapshots,
Eligibility Decisions, Signals, Planning Decisions, Risk Decisions, orders, and execution events.
Every row links to its rationale and typed Input References.

Research cadence is context, not a hard health threshold. Unexpected funnel ratios create a warning
for investigation; they cannot halt entries without a versioned readiness or risk policy.

### Positions and exposure

From Milestone 4, show reconciled positions, pending orders, cash, gross exposure, open-position
count, SIC-major-group occupancy, entry/horizon sessions, and the next required exit action. Broker
REST reconciliation is authoritative. Stream updates may render immediately but remain visibly
provisional until reconciled.

### Scorecard summary

From Milestone 2, show Strategy Scorecard population, resolution coverage, and median Signal Excess
Return. From Milestone 4, add a clearly separate Execution Scorecard summary. From Milestone 6, add
analyst calibration and current Capability Grants. Never combine these into one performance number.

### Runtime health

Show source acquisition, parsing, market data, broker reconciliation, priority-lane deadlines,
clock synchronization, backup recency, and analyst runtime when present. Each item carries its own
data age and last successful and failed run.

## Drill-down surfaces

| Surface       | Purpose                                                                        |
| ------------- | ------------------------------------------------------------------------------ |
| Candidate     | Snapshots, owners, transactions, eligibility checks, and Decision Packet       |
| Signal        | Canonical claim, rationale, inputs, outcome, and benchmark population          |
| Trade         | Planning, readiness, risk, order, fills, reconciliation, and execution outcome |
| Source        | Acquisition attempts, immutable bytes, parse versions, and Source Facts        |
| Scorecards    | Full Strategy, Execution, Realism, and Analyst populations and methods         |
| Replay        | Forensic Replay and separately labelled Reconstruction Replay                  |
| Event Console | Structured append-only event inspection and permitted operator commands        |

The Event Console supports filtering, durable cursors, lineage navigation, and raw artifact views.
It is read-only except for the fixed command palette.

## Operator commands

The authenticated single operator may request pause, resume, halt, cancel pending orders,
acknowledge alerts, repoll/reconcile, and append Promotion Decisions or Revocations.

- Pause is immediate and idempotent.
- Halt, cancel-pending, Promotion Decisions, and Revocations require an impact preview and explicit
  confirmation.
- Every request receives a durable command identity, accepted/rejected result, rationale, operator,
  and completion status.
- Commands are handled by the engine boundary. The browser never writes evidence, decisions,
  positions, or orders directly.

There is no manual buy/sell command, arbitrary SQL, raw shell, evidence editor, or state-toggle
shortcut.

## Transport and read model

- Authenticated REST snapshots are authoritative for rendered state.
- SSE carries append-only event references and resumes from a durable cursor.
- On connection, cursor loss, or suspected gap, the client refreshes the relevant REST snapshot.
- Authenticated HTTP submits Operator Commands and returns their durable identities.
- Every panel shows its own as-of time and source age; one global “live” light is insufficient.

The server may use a read-only database role for projections. Command handling uses a narrowly
privileged role or engine API that can append only Operator Command records. Browser credentials can
never directly mutate Postgres.

## Security and data display

Authentication is required even on loopback. Future remote access is private-network-only with
strong single-user authentication; Sonde is never directly exposed to the public internet.

Delayed consolidated SIP data is authoritative. IEX data, if displayed as an immediate UI
indication, is labelled provisional and never feeds decisions. Market-data licensing constraints
apply to screenshots and published artifacts under [ADR 0013](../decisions/0013-private-dashboard-public-repo.md).

## Initial layout

```text
┌ state · readiness · market clock · next action · snapshot age · alerts ┐
├ urgent attention ────────────────┬ next scheduled action ───────────────┤
├ candidate funnel ────────────────┴ live decision tape ─────────────────┤
├ positions and exposure ──────────┬ scorecard summaries ────────────────┤
└ source, market, broker, engine, backup, and analyst health ────────────┘
```

At Milestone 0, the candidate funnel, recent Source Facts, and source/market-data health are real;
later panels state their milestone rather than showing fabricated content.

## Acceptance

- a new EDGAR Source Fact appears through SSE and an authoritative refresh within ten minutes;
- reconnecting from a durable cursor produces no duplicate rendered event and detects cursor gaps;
- funnel counts equal direct projection queries for the same as-of time and population;
- every displayed decision reaches rationale and direct Input References within two interactions;
- killing the engine makes stale runtime state visible without inventing a state transition;
- readiness failure near cutoff creates a durable in-app alert and urgent Telegram notification;
- browser and read-model roles cannot insert, update, or delete evidence or decisions;
- every command is authenticated, idempotent where defined, audited, and visibly completed;
- destructive or influence-changing commands require preview and confirmation;
- no UI route or command can create a discretionary order;
- no empty or not-yet-built panel displays fake observations, returns, or health.

## Deferred choices

- exact single-user remote authentication mechanism, before remote access;
- visual design and chart library, after the information hierarchy works with real data;
- alert quiet hours and escalation timing, after operating experience.

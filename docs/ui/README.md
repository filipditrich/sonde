# UI

The dashboard is Sonde's private operations cockpit, not a discretionary trading terminal. Its home
screen, transport, command boundaries, and progressive milestone behavior are specified in
[`first-screen.md`](./first-screen.md).

## Surfaces

| Surface                          | Answers                                                               | Begins |
| -------------------------------- | --------------------------------------------------------------------- | ------ |
| Home status rail                 | Is Sonde safe, ready, fresh, and on schedule?                         | 0      |
| Candidate funnel                 | What entered, survived, and formed a decision?                        | 0      |
| Runtime health                   | Are sources, market data, clocks, and jobs healthy?                   | 0      |
| Candidate and Signal detail      | What exactly did Sonde know and conclude?                             | 1      |
| Strategy Scorecard               | Do all final Signals carry forward information?                       | 2      |
| Blocked decisions                | What did readiness, planning, or risk reject, and why?                | 3      |
| Positions and trade detail       | What is held or in flight, and how did it reach the venue?            | 4      |
| Execution and Realism Scorecards | What did paper execution do, and what does it omit?                   | 4–5    |
| Replay                           | What was captured then, and what reconstructs differently now?        | 5      |
| Analyst evaluation               | Does a behavior add calibrated, economic information?                 | 6      |
| Promotion controls               | Which behavior capabilities are active, bounded, or revoked?          | 7      |
| Event Console                    | What append-only event happened, and which safe command is available? | 0–7    |

Every number is traceable to its population or direct inputs within two interactions. Strategy,
execution, realism, and analyst evaluation remain visibly distinct.

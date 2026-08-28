# 0013: The dashboard is private; only derived artifacts are public

## Status

Accepted (Milestone 0, 2026-08-27)

## Context

The repository is public. The dashboard is the primary product surface — [`goals.md`](../goals.md)
states that if you cannot watch Sonde think, it is not finished — and the natural instinct with
something worth watching is to let other people watch it.

Alpaca's Customer Agreement §30 forecloses that instinct:

> "I agree not to reproduce, distribute, sell or commercially exploit the market data in any manner
> without written consent from Alpaca."

The clause is broad, and a publicly reachable page rendering live quotes is plausibly covered by it.
§30 also hinges on **non-professional** status, defined in the _NASDAQ OMX Global Subscriber
Agreement_ and the _NYSE Market Data Display Services Agreement_ — both incorporated by reference
into the agreement rather than presented with it.

This is not an Alpaca-specific problem. Nearly every venue asserts a proprietary interest in its
market data, so a rule that only covers one broker would need rewriting on the next integration.

Alternatives considered:

1. **Public dashboard, request written consent.** A real option, but consent is not guaranteed, and
   the project does not need to be public to be worth building.
2. **Public dashboard showing only delayed data.** Delay does not by itself resolve redistribution,
   and the incorporated agreements are where the actual rules live.
3. **Private dashboard, public repository.** Chosen — costs nothing that matters.

## Decision

1. **The dashboard is never public.** Local, or auth-gated to the operator. No unauthenticated
   deployment, no "just a demo link".
2. **The repository stays public.** Code, docs, and decisions are ours to publish.
3. **Two categories, and the line between them is load-bearing:**

   | Theirs — never republished                                | Ours — freely publishable                          |
   | --------------------------------------------------------- | -------------------------------------------------- |
   | Quotes, bars, order book, anything from a market data API | Signals, rationale, confidence                     |
   | Raw venue payloads                                        | Gate decisions and their reasons                   |
   | Third-party article bodies (also ADR 0011)                | Hit rates, calibration curves, source-class scores |

   Derived analytics are Sonde's own artifacts and carry no venue claim. Prices are the venue's.

4. **No market data is committed, ever.** `data/` is gitignored — now for a stated reason rather
   than tidiness.
5. **Screenshots in the repository, README, or docs must not contain live quotes.** Synthetic or
   redacted values only. This is the rule most likely to be broken by accident, because a screenshot
   is the obvious way to show off a dashboard.
6. **The rule is keyed to each source's terms, not to Alpaca.** GDELT, SEC EDGAR, and FRED are
   public or permissive and may be quoted freely; venue data generally may not. Every new probe
   records its redistribution position in its spec.
7. **Non-professional status is preserved deliberately.** No monetisation, no commercial framing.
   Flipping to professional changes both the fees and the terms.

## Consequences

- The showcase instinct has to be satisfied by _derived_ artifacts — a calibration curve or an
  analyst scoreboard is publishable and, for this project, more interesting than a price chart.
- Screenshot discipline is a standing constraint on documentation, not a one-time cleanup.
- Nothing about the build changes. The dashboard was always going to run locally first; this only
  removes a future temptation.
- A public dashboard remains reachable later via written consent. The decision is reversible in the
  permissive direction, which is the right way round.
- Because the boundary is drawn per source rather than per broker, adding IBKR or a data vendor
  later is a spec entry rather than a re-litigation.

## Milestones touched

- Milestone 0 (Pipe)
- Milestone 6 (Watch)

## References

- Alpaca Customer Agreement §30 (Use of Market Data), §46 (arbitration), reviewed 2026-08-27
- [ADR 0011](./0011-source-acquisition-policy.md) — source tiers and what may be stored
- [`docs/goals.md`](../goals.md)

# 0001: TypeScript monorepo on Turborepo + Bun

## Status

Accepted (Milestone 0, 2026-08-27)

## Context

Sonde needs a data/trading engine and a dashboard that share domain types. The two obvious shapes
are a Python core with a TypeScript frontend, or all TypeScript.

Python owns most of the public quant ecosystem — NautilusTrader, Freqtrade, vectorbt, the whole
pandas/scikit stack. That is a real pull. But Sonde is deliberately not doing the thing that
ecosystem is built for: there is no backtesting engine in the design
([ADR 0004](./0004-no-llm-backtests.md)), and without backtesting, most of the Python advantage
evaporates. What remains is CCXT (which has a first-class TypeScript build), HTTP clients, and
Postgres.

Against that, a language split has a standing cost: the `Signal` type would exist twice, in two
type systems, with a serialization boundary between them that drifts silently.

Forces:

- The reasoning trail must be typed end to end, from analyst output to the UI that renders it. One
  Zod schema shared by both is worth a lot.
- The operator is fluent in TypeScript and already runs a Bun + Turborepo monorepo (Invoicey);
  matching that means no new tooling to learn or maintain.
- The Anthropic SDK and CCXT are both first-class in TypeScript.

## Decision

1. **All TypeScript.** No Python in the runtime path.
2. **Bun** as runtime and package manager; **Turborepo** for task orchestration.
3. `apps/*` for deployables (`engine`, `web`), `packages/*` for shared libraries.
4. **Zod schemas in `packages/core` are the single source of truth** for domain types. Everything
   else infers from them — no hand-written interfaces duplicating a schema.
5. Strict TypeScript with `noUncheckedIndexedAccess`. Market data is full of gaps and this is the
   compiler flag that makes them visible.

## Consequences

- No vectorbt, no pandas. Numerical work is written by hand or pulled from npm, and npm's numerical
  ecosystem is thinner. Accepted: the volume of numerical work here is small and mostly aggregation.
- If a genuine need for the Python quant stack appears later, it enters as a separate service behind
  an HTTP boundary — not as a second language inside the monorepo.
- Shared Zod schemas mean a domain change is one edit, caught at compile time on both sides.
- Tooling matches the operator's other projects, so muscle memory carries over.

## Milestones touched

- Milestone 0 (Pipe)

## References

- [`docs/architecture.md`](../architecture.md) — repository layout

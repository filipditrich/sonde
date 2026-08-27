# 0010: oxlint and oxfmt as the lint and format toolchain

## Status

Accepted (Milestone 0, 2026-08-27)

## Context

Sonde needs a linter and a formatter. The default choice is ESLint plus Prettier; the initial
scaffold used Prettier alone with no linter.

Two things push away from that default.

**Speed matters more here than in a typical app.** The engine is a long-lived process that will be
edited while running, and the lint pass is part of the inner loop. ESLint with `typescript-eslint`
on a monorepo is measured in seconds; oxlint is measured in milliseconds. That difference decides
whether linting happens on save or only in CI.

**The architectural invariants need enforcement, not documentation.** ADR 0005 says the risk gate
cannot import a model, and ADR 0002 says CCXT does not leak out of `packages/venue`. Written down,
those hold until someone — human or agent — writes the convenient import. An agent obeys what fails
and skims what is documented, and this repository is explicitly meant to be worked on with agents.
A linter is the mechanism that turns an ADR into something that cannot be quietly violated.

There is also a consistency argument: `nfctron-hub` already runs this toolchain, so the house style
and the mental model carry over rather than forking.

Alternatives considered:

1. **ESLint + Prettier.** Largest rule ecosystem, slowest, and `typescript-eslint` drags in a
   TypeScript peer that has caused version conflicts in the hub migration.
2. **Biome.** Fast and combines both jobs. Rejected: smaller rule set for the boundary enforcement
   we need, and it is not what the other project runs.
3. **oxlint + oxfmt.** Chosen — fastest, native type-aware linting via `oxlint-tsgolint` without a
   `typescript-eslint` peer, and consistent with `nfctron-hub`.

## Decision

1. **`oxlint` for linting, `oxfmt` for formatting.** Prettier is removed. Config lives in
   `oxlint.config.ts` and `.oxfmtrc.jsonc` at the repository root.
2. **House style is inherited from `nfctron-hub`**: tabs, single quotes, trailing commas, semicolons,
   `printWidth` 150.
3. **Architectural boundaries are lint rules.** `no-restricted-imports` overrides encode, per
   package:
   - `packages/risk` may not import `@sonde/agents`, `@sonde/venue`, the Anthropic SDK, or `ccxt`
   - `packages/agents` may not import `@sonde/venue` or `ccxt`
   - nothing outside `packages/venue` may import `ccxt`

   Every restriction carries a message naming the ADR it enforces. **These lists may only grow.**

4. **Complexity is capped, not merely discouraged.** `complexity` is enabled at `max: 12` with the
   `modified` variant, alongside `max-depth`, `max-params`, `max-nested-callbacks`, and
   `max-lines-per-function`. The oxlint default of 20 is too loose for a codebase whose value is
   being followable.
5. **`packages/risk` is held to a stricter bar** — complexity `max: 8`, depth 2, 60 lines per
   function, no `console`. It is the one component whose correctness is not recoverable after the
   fact, so it stays small enough to read in one sitting.
6. **Type-aware linting is on** (`options.typeAware`), as an addition to `tsc --noEmit` rather than a
   replacement for it.
7. **`bun gates`** runs typecheck, lint with `--deny-warnings`, and a format check — the single
   command CI and pre-push both use.

## Consequences

- Full lint on the tree is milliseconds, so it can run on save and in a pre-commit hook without
  friction.
- `oxlint.config.ts` is a TypeScript config, which oxlint treats as experimental and loads via
  Node. It works, and it is worth it: the restricted-import lists are typed and carry their
  rationale inline instead of living in dead JSON.
- oxlint's rule catalogue is smaller than ESLint's. Nothing currently needed is missing; if
  something is, the fallback is a custom JS plugin (as `nfctron-hub` does for its anti-slop rules)
  rather than reintroducing ESLint.
- oxfmt formats fenced code blocks inside Markdown, so the house style reaches the docs too.
- The complexity caps will occasionally reject code that is genuinely fine. The correct response is
  extraction, not raising the cap. Raising it needs an ADR.
- Enforcement lands **before** the packages exist, so the boundaries are true from the first commit
  in each rather than retrofitted.

## Milestones touched

- Milestone 0 (Pipe)
- Milestone 4 (Gate)

## References

- [oxlint `complexity` rule](https://oxc.rs/docs/guide/usage/linter/rules/eslint/complexity)
- [ADR 0002](./0002-crypto-first-ccxt.md) — CCXT confinement
- [ADR 0005](./0005-llm-proposes-code-disposes.md) — the boundary these rules enforce

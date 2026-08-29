# Domain Docs

How the engineering skills should consume this repo's domain documentation.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root.
- **`docs/decisions/`** for ADRs that touch the area being explored.

If either is absent, proceed silently. The `/domain-modeling` skill creates `CONTEXT.md` lazily when domain terms or decisions are resolved.

## File structure

This is a single-context repo:

```text
/
├── CONTEXT.md
├── docs/
│   └── decisions/
│       ├── 0001-...
│       └── 0002-...
└── packages/
```

## Use the glossary's vocabulary

When output names a domain concept (in an issue title, refactor proposal, hypothesis, or test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept needed isn't in the glossary yet, note it for `/domain-modeling`.

## Flag ADR conflicts

If output contradicts an existing ADR, surface it explicitly rather than silently overriding it:

> _Contradicts ADR-XXXX, but worth reopening because…_

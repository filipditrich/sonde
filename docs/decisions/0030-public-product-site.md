# 0030: Independent public product site

## Status

Accepted (2026-08-31)

## Context

Sonde needs a public, build-in-public product surface at `sonde.ditrich.me`. The existing `apps/web` application is an operations-first cockpit: it exposes authoritative state, carries authenticated operator controls, and is intentionally available only to an operator session on loopback. It cannot become a public marketing surface without weakening its deployment and access boundary.

The public site must explain the system honestly while Milestone 0 is in progress. It must not expose live or historical operational state, private evidence, credentials, controls, runtime endpoints, or a path into the cockpit.

## Decision

1. Add `apps/site` as a standalone Next.js App Router application for the public product site. It deploys independently of the engine, database, and private cockpit.
2. The site is static-first and read-only. Its content is versioned source copy and local public assets; it has no operational API, database access, authentication, forms, tracking, or runtime control surface.
3. `apps/site` must not import `@sonde/*` packages, `apps/web`, engine modules, private runtime endpoints, or secrets. It may link to public repository documentation as a normal browser navigation.
4. The private cockpit remains `apps/web`, authenticated and loopback-only. A future remote cockpit must use a private network and strong single-user authentication; the public site is never a gateway to it.
5. Public copy must visibly preserve Sonde's paper-only scope, current milestone, non-advice disclaimer, and the distinction between present functionality and roadmap work.

## Consequences

- The public site can be deployed with a public host without changing the operational deployment model.
- A product screenshot is explanatory artwork, not a live dashboard or a promise of public cockpit access.
- Site content can describe the evidence spine and safety constraints without acquiring or serving private state.
- Changes that add live data, controls, or cross-package operational imports require a new architecture decision rather than an incremental site feature.

## References

- [ADR 0003](./0003-paper-first-execution.md)
- [ADR 0013](./0013-private-dashboard-public-repo.md)
- [ADR 0021](./0021-immutable-evidence-lineage-and-dual-replay.md)
- [ADR 0028](./0028-operations-first-private-cockpit.md)
- [ADR 0029](./0029-simple-local-operations.md)

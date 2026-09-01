/**
 * `@sonde/db` — storage.
 *
 * Writers use the tables from `./schema` directly. **Analyst-facing reads must go through
 * `asAnalystSaw`**, which requires an explicit `asOf` and filters on `observed_at`. Reaching
 * for the raw tables on a read path that feeds a model is the mistake this package exists to
 * make visible.
 */

export * from './client';
export * from './cockpit-health';
export * from './cockpit-read';
export * from './document-preview';
export * from './milestone-one';
export * from './milestone-zero';
export * from './schema';

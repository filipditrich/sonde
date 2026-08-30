/**
 * `@sonde/db` — storage.
 *
 * Writers use the tables from `./schema` directly. **Analyst-facing reads must go through
 * `asAnalystSaw`**, which requires an explicit `asOf` and filters on `observed_at`. Reaching
 * for the raw tables on a read path that feeds a model is the mistake this package exists to
 * make visible.
 */

export * from './client';
export * from './milestone-zero';
export * from './schema';

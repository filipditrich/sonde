import { and, asc, desc, eq, lte } from 'drizzle-orm';

import type { ObservedAt } from '@sonde/core';

import type { Database } from './client';
import { candles, observations } from './schema';

/**
 * Point-in-time reads.
 *
 * Everything an analyst is shown goes through here. The `asOf` argument is required rather
 * than defaulted, so there is no accidental path to "just read the table" — a caller has to
 * state, at the call site, which moment it is reasoning about.
 *
 * The filter is on `observed_at`, never `occurred_at`. That distinction is the whole point:
 * a candle backfilled from 2019 has an `occurred_at` in 2019 but an `observed_at` of the day
 * we imported it, and an analyst reasoning about 2020 must not see it. Filtering on
 * `occurred_at` would look correct and leak the future.
 *
 * This does not solve look-ahead bias in a *model's weights* — nothing at the query layer
 * can, which is why Sonde does not backtest LLM decisions at all (ADR 0004). It eliminates
 * pipeline leakage, which is the half of the problem we control.
 */
export const asAnalystSaw = (db: Database, asOf: ObservedAt) => {
	const cutoff = new Date(asOf);

	return {
		/** Observations Sonde had actually seen by `asOf`, newest first. */
		observations: (limit = 100) =>
			db.select().from(observations).where(lte(observations.observedAt, cutoff)).orderBy(desc(observations.observedAt)).limit(limit),

		/** Every observation in one event cluster, so outlet count is available to the analyst. */
		cluster: (eventClusterId: string) =>
			db
				.select()
				.from(observations)
				.where(and(eq(observations.eventClusterId, eventClusterId), lte(observations.observedAt, cutoff)))
				.orderBy(asc(observations.observedAt)),

		/** Bars whose *rows* had reached us by `asOf` — not merely bars that had closed. */
		candles: (asset: string, interval: string, limit = 500) =>
			db
				.select()
				.from(candles)
				.where(and(eq(candles.asset, asset), eq(candles.interval, interval), lte(candles.observedAt, cutoff)))
				.orderBy(desc(candles.occurredAt))
				.limit(limit),
	};
};

/**
 * The present-tense reader, for the live loop and the dashboard.
 *
 * Named to be conspicuous at the call site: seeing `now()` in a code path that is supposed to
 * be reasoning about a past moment should read as wrong.
 */
export const asAnalystSeesNow = (db: Database) => asAnalystSaw(db, new Date().toISOString() as ObservedAt);

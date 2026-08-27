import { boolean, index, numeric, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/**
 * Storage schema. Mirrors `@sonde/core` — if a shape here disagrees with a Zod schema there,
 * `@sonde/core` is right and this is the bug.
 *
 * Two conventions run through every table:
 *
 * 1. **Decimals are `numeric`, never `double precision`.** Drizzle surfaces `numeric` as a
 *    string, which lines up with `Decimal` in core and keeps float math impossible by
 *    construction.
 * 2. **Append-only tables are enforced in the database**, not by discipline — see the
 *    triggers in the first migration. Without backtesting, this record is the entire evidence
 *    base (ADR 0004, ADR 0008), so it must not be editable by a stray `UPDATE`.
 */

/**
 * Immutable original payloads, keyed by content hash and written *before* anything is
 * derived from them. Everything else can be rebuilt from this table, which is what makes
 * replay and shadow analysts possible later.
 */
export const rawDocuments = pgTable(
	'raw_documents',
	{
		sha256: text('sha256').primaryKey(),
		probe: text('probe').notNull(),
		sourceUrl: text('source_url'),
		contentType: text('content_type'),
		byteSize: numeric('byte_size').notNull(),
		content: text('content').notNull(),
		fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull(),
	},
	(table) => [index('raw_documents_fetched_at_idx').on(table.fetchedAt)],
);

/**
 * Normalized probe output.
 *
 * `observed_at` and `occurred_at` are both stored and both indexed. Every analyst-facing read
 * filters on `observed_at` (see `asAnalystSaw`), so the index is on the hot path rather than
 * decorative.
 */
export const observations = pgTable(
	'observations',
	{
		id: uuid('id').primaryKey(),
		probe: text('probe').notNull(),
		trustClass: text('trust_class').notNull(),

		rawDocumentSha256: text('raw_document_sha256')
			.notNull()
			.references(() => rawDocuments.sha256),
		sourceUrl: text('source_url'),

		eventClusterId: uuid('event_cluster_id').notNull(),
		outlets: text('outlets').array().notNull(),

		title: text('title'),
		body: text('body'),
		assets: text('assets').array().notNull(),

		observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
		occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
	},
	(table) => [
		index('observations_observed_at_idx').on(table.observedAt),
		index('observations_cluster_idx').on(table.eventClusterId),
		index('observations_probe_idx').on(table.probe),
	],
);

/**
 * OHLCV bars. Primary key is the natural key so a backfill re-run is idempotent — importing
 * the same month twice updates nothing rather than duplicating rows.
 */
export const candles = pgTable(
	'candles',
	{
		asset: text('asset').notNull(),
		venue: text('venue').notNull(),
		interval: text('interval').notNull(),

		open: numeric('open').notNull(),
		high: numeric('high').notNull(),
		low: numeric('low').notNull(),
		close: numeric('close').notNull(),
		volume: numeric('volume').notNull(),

		/** bar open time, per the venue */
		occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
		observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
		origin: text('origin').notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.asset, table.venue, table.interval, table.occurredAt] }),
		index('candles_lookup_idx').on(table.asset, table.interval, table.occurredAt),
	],
);

/** Analyst output. Append-only: a revision is a new row pointing at its predecessor. */
export const signals = pgTable(
	'signals',
	{
		id: uuid('id').primaryKey(),
		asset: text('asset').notNull(),
		direction: text('direction').notNull(),
		confidence: numeric('confidence').notNull(),
		horizon: text('horizon').notNull(),

		rationale: text('rationale').notNull(),
		sourceIds: uuid('source_ids').array().notNull(),

		analystTier: text('analyst_tier').notNull(),
		analystModel: text('analyst_model').notNull(),
		analystPromptVersion: text('analyst_prompt_version').notNull(),

		supersedes: uuid('supersedes'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
	},
	(table) => [
		index('signals_created_at_idx').on(table.createdAt),
		index('signals_asset_idx').on(table.asset),
		index('signals_analyst_idx').on(table.analystTier, table.analystModel, table.analystPromptVersion),
	],
);

/**
 * Resolved outcomes, written exactly once. Kept out of `signals` so there is no way to
 * accidentally update a prediction to match what happened.
 */
export const signalResults = pgTable(
	'signal_results',
	{
		signalId: uuid('signal_id')
			.primaryKey()
			.references(() => signals.id),

		priceAtSignal: numeric('price_at_signal').notNull(),
		priceAtHorizon: numeric('price_at_horizon').notNull(),
		realizedReturn: numeric('realized_return').notNull(),
		directionallyCorrect: boolean('directionally_correct').notNull(),

		resolvedAt: timestamp('resolved_at', { withTimezone: true }).notNull(),
	},
	(table) => [uniqueIndex('signal_results_signal_id_key').on(table.signalId)],
);

/** Tables the database refuses to `UPDATE` or `DELETE`. Kept here so the list is reviewable. */
export const APPEND_ONLY_TABLES = ['raw_documents', 'observations', 'signals', 'signal_results'] as const;

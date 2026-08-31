import { bigint, boolean, customType, index, jsonb, numeric, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type { InputReference } from '@sonde/core';

const inputRefs = jsonb('input_refs').$type<InputReference[]>().notNull();

const bytea = customType<{ data: Uint8Array; driverData: Buffer }>({
	dataType: () => 'bytea',
	toDriver: (value) => Buffer.from(value),
	fromDriver: (value) => new Uint8Array(value),
});

/** Active M0 API. Legacy pre-contract tables intentionally remain only in old migrations. */
export const acquisitionAttempts = pgTable(
	'm0_acquisition_attempts',
	{
		id: uuid('id').primaryKey(),
		schemaVersion: text('schema_version').notNull().default('m0'),
		source: text('source').notNull(),
		sourcePolicyVersion: text('source_policy_version').notNull(),
		method: text('method').notNull(),
		resource: text('resource').notNull(),
		requestedAt: timestamp('requested_at', { withTimezone: true }).notNull(),
		completedAt: timestamp('completed_at', { withTimezone: true }).notNull(),
		observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
		httpStatus: bigint('http_status', { mode: 'number' }),
		etag: text('etag'),
		lastModified: text('last_modified'),
		byteSize: bigint('byte_size', { mode: 'number' }),
		mediaType: text('media_type'),
		documentSha256: text('document_sha256').references(() => sourceDocuments.sha256),
		failure: jsonb('failure'),
		recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
	},
	(table) => [index('m0_attempts_observed_idx').on(table.observedAt)],
);
export const sourceDocuments = pgTable('m0_source_documents', {
	sha256: text('sha256').primaryKey(),
	schemaVersion: text('schema_version').notNull().default('m0'),
	bytes: bytea('bytes').notNull(),
	byteSize: bigint('byte_size', { mode: 'number' }).notNull(),
	mediaType: text('media_type').notNull(),
	encoding: text('encoding'),
	retentionClass: text('retention_class').notNull(),
	recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
});
export const parseRuns = pgTable(
	'm0_parse_runs',
	{
		id: uuid('id').primaryKey(),
		schemaVersion: text('schema_version').notNull().default('m0'),
		documentSha256: text('document_sha256')
			.notNull()
			.references(() => sourceDocuments.sha256),
		parser: text('parser').notNull(),
		parserVersion: text('parser_version').notNull(),
		startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
		completedAt: timestamp('completed_at', { withTimezone: true }).notNull(),
		status: text('status').notNull(),
		failure: jsonb('failure'),
		inputRefs,
		recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
	},
	(table) => [uniqueIndex('m0_parse_run_semantic_key').on(table.documentSha256, table.parser, table.parserVersion)],
);
export const form4TransactionFacts = pgTable(
	'm0_form4_transaction_facts',
	{
		id: uuid('id').primaryKey(),
		schemaVersion: text('schema_version').notNull().default('m0'),
		parseRunId: uuid('parse_run_id')
			.notNull()
			.references(() => parseRuns.id),
		documentSha256: text('document_sha256')
			.notNull()
			.references(() => sourceDocuments.sha256),
		accession: text('accession').notNull(),
		issuerCik: text('issuer_cik').notNull(),
		issuerName: text('issuer_name').notNull(),
		issuerTicker: text('issuer_ticker'),
		reportingOwnerCik: text('reporting_owner_cik').notNull(),
		reportingOwnerName: text('reporting_owner_name').notNull(),
		isDirector: boolean('is_director').notNull(),
		isOfficer: boolean('is_officer').notNull(),
		isTenPercentOwner: boolean('is_ten_percent_owner').notNull(),
		acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull(),
		transactionDate: text('transaction_date').notNull(),
		securityTitle: text('security_title').notNull(),
		transactionCode: text('transaction_code').notNull(),
		acquiredDisposed: text('acquired_disposed').notNull(),
		ownership: text('ownership').notNull(),
		shares: numeric('shares').notNull(),
		pricePerShare: numeric('price_per_share').notNull(),
		footnoteRefs: text('footnote_refs').array().notNull(),
		sourceLocator: text('source_locator').notNull(),
		observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
		recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
		inputRefs,
	},
	(table) => [
		uniqueIndex('m0_form4_semantic_key').on(table.documentSha256, table.sourceLocator),
		index('m0_form4_observed_idx').on(table.observedAt),
	],
);
export const issuers = pgTable(
	'm0_issuers',
	{
		id: uuid('id').primaryKey(),
		schemaVersion: text('schema_version').notNull().default('m0'),
		cik: text('cik').notNull(),
		legalName: text('legal_name').notNull(),
		effectiveFrom: text('effective_from').notNull(),
		effectiveTo: text('effective_to'),
		recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
	},
	(table) => [uniqueIndex('m0_issuer_effective_key').on(table.cik, table.effectiveFrom)],
);
export const listings = pgTable('m0_listings', {
	id: uuid('id').primaryKey(),
	schemaVersion: text('schema_version').notNull().default('m0'),
	issuerId: uuid('issuer_id')
		.notNull()
		.references(() => issuers.id),
	ticker: text('ticker').notNull(),
	venue: text('venue').notNull(),
	securityType: text('security_type').notNull(),
	effectiveFrom: text('effective_from').notNull(),
	effectiveTo: text('effective_to'),
	recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
});
export const brokerAssets = pgTable(
	'm0_broker_assets',
	{
		id: uuid('id').primaryKey(),
		schemaVersion: text('schema_version').notNull().default('m0'),
		listingId: uuid('listing_id')
			.notNull()
			.references(() => listings.id),
		broker: text('broker').notNull(),
		brokerAssetId: text('broker_asset_id').notNull(),
		symbol: text('symbol').notNull(),
		tradable: boolean('tradable').notNull(),
		fractionable: boolean('fractionable').notNull(),
		effectiveFrom: text('effective_from').notNull(),
		effectiveTo: text('effective_to'),
		recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
	},
	(table) => [uniqueIndex('m0_broker_asset_effective_key').on(table.broker, table.brokerAssetId, table.effectiveFrom)],
);
export const sipDailyBars = pgTable(
	'm0_sip_daily_bars',
	{
		schemaVersion: text('schema_version').notNull().default('m0'),
		acquisitionAttemptId: uuid('acquisition_attempt_id')
			.notNull()
			.references(() => acquisitionAttempts.id),
		listingId: uuid('listing_id')
			.notNull()
			.references(() => listings.id),
		sessionDate: text('session_date').notNull(),
		feed: text('feed').notNull(),
		adjustment: text('adjustment').notNull(),
		open: numeric('open').notNull(),
		high: numeric('high').notNull(),
		low: numeric('low').notNull(),
		close: numeric('close').notNull(),
		volume: numeric('volume').notNull(),
		vwap: numeric('vwap'),
		observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
		recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
		inputRefs,
	},
	(table) => [primaryKey({ columns: [table.listingId, table.sessionDate, table.feed, table.adjustment] })],
);
export const marketSessions = pgTable(
	'm0_market_sessions',
	{
		id: uuid('id').primaryKey(),
		schemaVersion: text('schema_version').notNull().default('m0'),
		acquisitionAttemptId: uuid('acquisition_attempt_id')
			.notNull()
			.references(() => acquisitionAttempts.id),
		calendarVersion: text('calendar_version').notNull(),
		sessionDate: text('session_date').notNull(),
		opensAt: timestamp('opens_at', { withTimezone: true }).notNull(),
		closesAt: timestamp('closes_at', { withTimezone: true }).notNull(),
		earlyClose: boolean('early_close').notNull(),
		source: text('source').notNull(),
		observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
		recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
		inputRefs,
	},
	(table) => [uniqueIndex('m0_market_session_key').on(table.calendarVersion, table.sessionDate)],
);
/** Mutable operational state only: validators and scheduler checkpoints, never authoritative evidence. */
export const runtimeCheckpoints = pgTable('m0_runtime_checkpoints', {
	key: text('key').primaryKey(),
	value: jsonb('value').notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
	ledgerCursor: bigint('ledger_cursor', { mode: 'number' }).notNull().default(0),
});
export const jobRunEvents = pgTable(
	'm0_job_run_events',
	{
		cursor: bigint('cursor', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
		id: uuid('id').notNull(),
		schemaVersion: text('schema_version').notNull().default('m0'),
		runId: uuid('run_id').notNull(),
		job: text('job').notNull(),
		lane: text('lane').notNull(),
		event: text('event').notNull(),
		at: timestamp('at', { withTimezone: true }).notNull(),
		outcome: text('outcome'),
		meta: jsonb('meta').notNull(),
		recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
	},
	(table) => [uniqueIndex('m0_job_event_identity').on(table.id), index('m0_job_events_run_idx').on(table.runId, table.cursor)],
);
export const cockpitEvents = pgTable('m0_cockpit_events', {
	cursor: bigint('cursor', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
	schemaVersion: text('schema_version').notNull().default('m0'),
	kind: text('kind').notNull(),
	artifactId: text('artifact_id').notNull(),
	recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
});
export const candidateSnapshots = pgTable(
	'm1_candidate_snapshots',
	{
		id: uuid('id').primaryKey(),
		schemaVersion: text('schema_version').notNull().default('m1'),
		strategyVersion: text('strategy_version').notNull(),
		issuerCik: text('issuer_cik').notNull(),
		decisionWindowOpen: timestamp('decision_window_open', { withTimezone: true }).notNull(),
		cutoffAt: timestamp('cutoff_at', { withTimezone: true }).notNull(),
		qualifyingFactIds: text('qualifying_fact_ids').array().notNull(),
		reportingOwnerCiks: text('reporting_owner_ciks').array().notNull(),
		observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
		recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
		inputRefs,
	},
	(table) => [uniqueIndex('m1_candidate_snapshot_id').on(table.id)],
);
export const universeSnapshots = pgTable('m1_universe_snapshots', {
	id: uuid('id').primaryKey(),
	schemaVersion: text('schema_version').notNull().default('m1'),
	policyVersion: text('policy_version').notNull(),
	listingId: uuid('listing_id').references(() => listings.id),
	entrySessionDate: text('entry_session_date').notNull(),
	barKeys: text('bar_keys').array().notNull(),
	medianDollarVolume: numeric('median_dollar_volume'),
	included: boolean('included').notNull(),
	exclusionReasons: text('exclusion_reasons').array().notNull(),
	observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
	recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
	inputRefs,
});
export const eligibilityDecisions = pgTable(
	'm1_eligibility_decisions',
	{
		id: uuid('id').primaryKey(),
		schemaVersion: text('schema_version').notNull().default('m1'),
		strategyVersion: text('strategy_version').notNull(),
		issuerCik: text('issuer_cik').notNull(),
		decisionWindowOpen: timestamp('decision_window_open', { withTimezone: true }).notNull(),
		eligible: boolean('eligible').notNull(),
		failedChecks: jsonb('failed_checks').notNull(),
		candidateSnapshotId: uuid('candidate_snapshot_id')
			.notNull()
			.references(() => candidateSnapshots.id),
		universeSnapshotId: uuid('universe_snapshot_id').references(() => universeSnapshots.id),
		observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
		recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
		inputRefs,
	},
	(table) => [uniqueIndex('m1_eligibility_key').on(table.strategyVersion, table.issuerCik, table.decisionWindowOpen)],
);
export const signals = pgTable(
	'm1_signals',
	{
		id: uuid('id').primaryKey(),
		schemaVersion: text('schema_version').notNull().default('m1'),
		strategyVersion: text('strategy_version').notNull(),
		policyVersion: text('policy_version').notNull(),
		issuerCik: text('issuer_cik').notNull(),
		listingId: uuid('listing_id')
			.notNull()
			.references(() => listings.id),
		direction: text('direction').notNull(),
		entryConvention: text('entry_convention').notNull(),
		decisionWindowOpen: timestamp('decision_window_open', { withTimezone: true }).notNull(),
		horizonCloseAt: timestamp('horizon_close_at', { withTimezone: true }).notNull(),
		rationale: text('rationale').notNull(),
		sourceIds: text('source_ids').array().notNull(),
		bootstrapPrior: jsonb('bootstrap_prior').notNull(),
		observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
		recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
		inputRefs,
	},
	(table) => [uniqueIndex('m1_signal_key').on(table.strategyVersion, table.issuerCik, table.decisionWindowOpen)],
);
export const decisionPackets = pgTable(
	'm1_decision_packets',
	{
		id: uuid('id').primaryKey(),
		schemaVersion: text('schema_version').notNull().default('m1'),
		strategyVersion: text('strategy_version').notNull(),
		policyVersion: text('policy_version').notNull(),
		issuerCik: text('issuer_cik').notNull(),
		decisionWindowOpen: timestamp('decision_window_open', { withTimezone: true }).notNull(),
		calendarVersion: text('calendar_version').notNull(),
		eligibilityDecisionId: uuid('eligibility_decision_id')
			.notNull()
			.references(() => eligibilityDecisions.id),
		signalId: uuid('signal_id').references(() => signals.id),
		observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
		recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
		inputRefs,
	},
	(table) => [uniqueIndex('m1_decision_packet_key').on(table.strategyVersion, table.issuerCik, table.decisionWindowOpen)],
);
export const APPEND_ONLY_TABLES = [
	'm0_acquisition_attempts',
	'm0_source_documents',
	'm0_parse_runs',
	'm0_form4_transaction_facts',
	'm0_issuers',
	'm0_listings',
	'm0_broker_assets',
	'm0_sip_daily_bars',
	'm0_market_sessions',
	'm0_job_run_events',
	'm0_cockpit_events',
	'm1_candidate_snapshots',
	'm1_universe_snapshots',
	'm1_eligibility_decisions',
	'm1_signals',
	'm1_decision_packets',
] as const;

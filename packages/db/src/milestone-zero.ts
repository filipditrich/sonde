import { desc, eq, gt, isNull, lte, sql } from 'drizzle-orm';
import { createHash } from 'node:crypto';

import {
	CockpitSnapshot,
	CockpitStreamEvent,
	Form4TransactionFact,
	STRATEGY_VERSION,
	type AcquisitionAttempt,
	type CockpitSnapshot as CockpitSnapshotType,
	type CockpitStreamEvent as CockpitStreamEventType,
	type Form4TransactionFact as Form4TransactionFactType,
	type IssuerSicClassification,
	type ObservedAt,
	type ParseRun,
	artifactIdFrom,
	upcomingCutoff,
} from '@sonde/core';

const digestSha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const assertDocumentHash = (bytes: Uint8Array, sha256: string) => {
	const digest = digestSha256(bytes);
	if (digest !== sha256) throw new Error('source document hash mismatch');
	return digest;
};

import type { Database } from './client';
import { freshnessOf, ORDINARY_JOBS } from './cockpit-health';
import { readDecisionTape } from './milestone-one';
import { cockpitNextAction } from './next-action';
import {
	acquisitionAttempts,
	cockpitEvents,
	form4TransactionFacts,
	issuers,
	issuerSicClassifications,
	jobRunEvents,
	listings,
	marketSessions,
	parseRuns,
	runtimeCheckpoints,
	sipDailyBars,
	sourceDocuments,
} from './schema';

export const appendAcquisition = async (db: Database, input: typeof acquisitionAttempts.$inferInsert) => db.insert(acquisitionAttempts).values(input);
export const retainDocument = async (db: Database, input: typeof sourceDocuments.$inferInsert) =>
	db.insert(sourceDocuments).values(input).onConflictDoNothing();
/** Acquisition and its optional immutable document commit together; bytes always precede references. */
export const persistAcquisition = async (
	db: Database,
	attempt: AcquisitionAttempt,
	document?: { bytes: Uint8Array; mediaType: string; retentionClass: string },
) =>
	db.transaction(async (tx) => {
		if (document && attempt.documentSha256) {
			assertDocumentHash(document.bytes, attempt.documentSha256);
			await tx
				.insert(sourceDocuments)
				.values({
					sha256: attempt.documentSha256,
					bytes: document.bytes,
					byteSize: document.bytes.byteLength,
					mediaType: document.mediaType,
					retentionClass: document.retentionClass,
					recordedAt: new Date(attempt.recordedAt),
				})
				.onConflictDoNothing();
		}
		await tx.insert(acquisitionAttempts).values({
			id: attempt.id,
			source: attempt.source,
			sourcePolicyVersion: attempt.sourcePolicyVersion,
			method: attempt.method,
			resource: attempt.resource,
			requestedAt: new Date(attempt.requestedAt),
			completedAt: new Date(attempt.completedAt),
			observedAt: new Date(attempt.observedAt),
			httpStatus: attempt.httpStatus,
			etag: attempt.etag,
			lastModified: attempt.lastModified,
			byteSize: attempt.byteSize,
			mediaType: attempt.mediaType,
			documentSha256: attempt.documentSha256,
			failure: attempt.failure,
			recordedAt: new Date(attempt.recordedAt),
		});
	});
export const appendParseRun = async (db: Database, input: typeof parseRuns.$inferInsert) => db.insert(parseRuns).values(input);
export const readSourceDocument = async (db: Database, sha256: string) => {
	const [row] = await db.select().from(sourceDocuments).where(eq(sourceDocuments.sha256, sha256)).limit(1);
	if (!row) return undefined;
	assertDocumentHash(row.bytes, row.sha256);
	return row;
};
const factRow = (fact: Form4TransactionFactType, parseRunId: string) => ({
	id: fact.id,
	parseRunId,
	documentSha256: fact.documentSha256,
	accession: fact.accession,
	issuerCik: fact.issuerCik,
	issuerName: fact.issuerName,
	issuerTicker: fact.issuerTicker,
	reportingOwnerCik: fact.reportingOwnerCik,
	reportingOwnerName: fact.reportingOwnerName,
	isDirector: fact.isDirector,
	isOfficer: fact.isOfficer,
	isTenPercentOwner: fact.isTenPercentOwner,
	acceptedAt: new Date(fact.sourceClock.acceptedAt),
	transactionDate: fact.transactionDate,
	securityTitle: fact.securityTitle,
	transactionCode: fact.transactionCode,
	acquiredDisposed: fact.acquiredDisposed,
	ownership: fact.ownership,
	shares: fact.shares,
	pricePerShare: fact.pricePerShare,
	footnoteRefs: fact.footnoteRefs,
	sourceLocator: fact.sourceLocator,
	observedAt: new Date(fact.observedAt),
	recordedAt: new Date(fact.recordedAt),
	inputRefs: fact.inputRefs,
});
const upsertListingsFromFacts = async (tx: Pick<Database, 'insert'>, facts: readonly Form4TransactionFactType[]) => {
	for (const fact of facts) {
		if (!fact.issuerTicker) continue;
		const issuerId = artifactIdFrom(`issuer:m0:${fact.issuerCik}`);
		await tx
			.insert(issuers)
			.values({
				id: issuerId,
				cik: fact.issuerCik,
				legalName: fact.issuerName,
				effectiveFrom: fact.transactionDate,
				recordedAt: new Date(fact.recordedAt),
			})
			.onConflictDoNothing();
		await tx
			.insert(listings)
			.values({
				id: artifactIdFrom(`listing:m0:${fact.issuerCik}:${fact.issuerTicker}`),
				issuerId,
				ticker: fact.issuerTicker,
				venue: 'unspecified',
				securityType: 'common',
				effectiveFrom: fact.transactionDate,
				recordedAt: new Date(fact.recordedAt),
			})
			.onConflictDoNothing();
	}
};

export const appendForm4Facts = async (db: Database, parseRunId: string, facts: readonly Form4TransactionFactType[]) => {
	if (facts.length === 0) return;
	await db
		.insert(form4TransactionFacts)
		.values(facts.map((fact) => factRow(fact, parseRunId)))
		.onConflictDoNothing();
};
/** A parse run commits either its complete fact set or a typed failure; acquisition is already durable. */
export const commitParse = async (db: Database, run: ParseRun, facts: readonly Form4TransactionFactType[] = []) =>
	db.transaction(async (tx) => {
		await tx
			.insert(parseRuns)
			.values({
				id: run.id,
				documentSha256: run.documentSha256,
				parser: run.parser,
				parserVersion: run.parserVersion,
				startedAt: new Date(run.startedAt),
				completedAt: new Date(run.completedAt),
				status: run.status,
				failure: run.failure,
				inputRefs: run.inputRefs,
				recordedAt: new Date(run.recordedAt),
			})
			.onConflictDoNothing();
		if (facts.length)
			await tx
				.insert(form4TransactionFacts)
				.values(facts.map((fact) => factRow(fact, run.id)))
				.onConflictDoNothing();
		await upsertListingsFromFacts(tx, facts);
		return run.id;
	});
export const appendJobRunEvent = async (db: Database, event: import('@sonde/core').JobRunEvent) =>
	db.insert(jobRunEvents).values({
		id: event.id,
		runId: event.runId,
		job: event.job,
		lane: event.lane,
		event: event.event,
		at: new Date(event.at),
		outcome: event.outcome,
		meta: event.meta,
		recordedAt: new Date(event.recordedAt),
	});
export const appendMarketSession = async (db: Database, session: import('@sonde/core').MarketSession, acquisitionAttemptId: string) =>
	db
		.insert(marketSessions)
		.values({
			id: session.id,
			acquisitionAttemptId,
			calendarVersion: session.calendarVersion,
			sessionDate: session.sessionDate,
			opensAt: new Date(session.opensAt),
			closesAt: new Date(session.closesAt),
			earlyClose: session.earlyClose,
			source: session.source,
			observedAt: new Date(session.observedAt),
			recordedAt: new Date(session.recordedAt),
			inputRefs: session.inputRefs,
		})
		.onConflictDoNothing();
export const appendSipDailyBar = async (db: Database, bar: import('@sonde/core').SipDailyBar, acquisitionAttemptId: string) =>
	db
		.insert(sipDailyBars)
		.values({
			acquisitionAttemptId,
			listingId: bar.listingId,
			sessionDate: bar.sessionDate,
			feed: bar.feed,
			adjustment: bar.adjustment,
			open: bar.open,
			high: bar.high,
			low: bar.low,
			close: bar.close,
			volume: bar.volume,
			vwap: bar.vwap,
			observedAt: new Date(bar.observedAt),
			recordedAt: new Date(bar.recordedAt),
			inputRefs: bar.inputRefs,
		})
		.onConflictDoNothing();

/** Mutable recovery state only; evidence tables never use this update path. */
export const readRuntimeCheckpoint = async <T>(db: Database, key: string): Promise<T | undefined> => {
	const [row] = await db.select({ value: runtimeCheckpoints.value }).from(runtimeCheckpoints).where(eq(runtimeCheckpoints.key, key)).limit(1);
	return row?.value as T | undefined;
};
export const saveRuntimeCheckpoint = async (db: Database, key: string, value: object, updatedAt = new Date()) =>
	db.insert(runtimeCheckpoints).values({ key, value, updatedAt }).onConflictDoUpdate({ target: runtimeCheckpoints.key, set: { value, updatedAt } });

export const listActiveListings = (db: Database) =>
	db
		.select({ id: listings.id, ticker: listings.ticker, issuerCik: issuers.cik, securityType: listings.securityType })
		.from(listings)
		.innerJoin(issuers, eq(listings.issuerId, issuers.id))
		.where(isNull(listings.effectiveTo));

export const listMarketSessionCandidates = async (db: Database) => {
	const rows = await db.select().from(marketSessions);
	return rows
		.filter((row) => row.source === 'alpaca')
		.map((row) => ({
			calendarVersion: row.calendarVersion,
			sessionDate: row.sessionDate,
			opensAt: row.opensAt.toISOString(),
			closesAt: row.closesAt.toISOString(),
			earlyClose: row.earlyClose,
			source: 'alpaca' as const,
			observedAt: row.observedAt.toISOString(),
		}));
};

export const asOfForm4Facts = (db: Database, asOf: ObservedAt, limit = 100) =>
	db
		.select()
		.from(form4TransactionFacts)
		.where(lte(form4TransactionFacts.observedAt, new Date(asOf)))
		.orderBy(desc(form4TransactionFacts.observedAt))
		.limit(limit);

export const listIssuersMissingSic = async (db: Database) => {
	const rows = await db.execute<{ id: string; cik: string }>(sql`
		SELECT DISTINCT ON (issuer.cik) issuer.id::text AS id, issuer.cik
		FROM m0_issuers issuer
		WHERE NOT EXISTS (
			SELECT 1 FROM m0_issuer_sic_classifications classified
			WHERE classified.issuer_cik = issuer.cik
		)
	`);
	return [...rows];
};

export const appendIssuerSicClassification = async (db: Database, classification: IssuerSicClassification) =>
	db
		.insert(issuerSicClassifications)
		.values({
			id: classification.id,
			issuerId: classification.issuerId,
			issuerCik: classification.issuerCik,
			sic: classification.sic,
			sicMajorGroup: classification.sicMajorGroup,
			sicDescription: classification.sicDescription,
			observedAt: new Date(classification.observedAt),
			recordedAt: new Date(classification.recordedAt),
			inputRefs: classification.inputRefs,
		})
		.onConflictDoNothing();

export const lastFinishedJobOutcome = async (db: Database, job: string) => {
	const [row] = await db.execute<{ outcome: string | null }>(sql`
		SELECT outcome FROM m0_job_run_events
		WHERE job = ${job} AND event = 'finished'
		ORDER BY cursor DESC
		LIMIT 1
	`);
	return row?.outcome ?? undefined;
};

export const readFunnelAsOf = async (db: Database, asOf: Date) => {
	const instant = asOf.toISOString();
	const [row] = await db.execute<{
		documents: number;
		transactions: number;
		qualifying_purchases: number;
		distinct_owner_candidates: number;
		liquid_signals: number;
	}>(sql`
		SELECT
			(SELECT count(*)::int FROM m0_source_documents WHERE recorded_at <= ${instant}) AS documents,
			(SELECT count(*)::int FROM m0_form4_transaction_facts WHERE observed_at <= ${instant}) AS transactions,
			(SELECT count(*)::int FROM m0_form4_transaction_facts
				WHERE observed_at <= ${instant} AND transaction_code = 'P' AND acquired_disposed = 'A'
				AND shares::numeric > 0 AND price_per_share::numeric > 0) AS qualifying_purchases,
			(SELECT count(*)::int FROM (
				SELECT DISTINCT ON (issuer_cik, decision_window_open) cardinality(reporting_owner_ciks) AS owners
				FROM m1_candidate_snapshots
				WHERE recorded_at <= ${instant} AND strategy_version = ${STRATEGY_VERSION}
				ORDER BY issuer_cik, decision_window_open, cardinality(qualifying_fact_ids) DESC, recorded_at DESC
			) latest WHERE owners >= 2) AS distinct_owner_candidates,
			(SELECT count(*)::int FROM m1_signals WHERE recorded_at <= ${instant}) AS liquid_signals
	`);
	return {
		documents: Number(row?.documents ?? 0),
		transactions: Number(row?.transactions ?? 0),
		qualifyingPurchases: Number(row?.qualifying_purchases ?? 0),
		distinctOwnerCandidates: Number(row?.distinct_owner_candidates ?? 0),
		liquidSignals: Number(row?.liquid_signals ?? 0),
	};
};

const dueCutoff = async (db: Database, asOf: Date) => {
	const [row] = await db.execute<{ session_date: string; calendar_version: string; opens_at: Date; cutoff_at: Date }>(sql`
		SELECT session.session_date, session.calendar_version, snapshot.decision_window_open AS opens_at, snapshot.cutoff_at
		FROM m1_candidate_snapshots snapshot
		JOIN m0_market_sessions session
			ON session.opens_at = snapshot.decision_window_open AND session.source = 'alpaca'
		WHERE snapshot.strategy_version = ${STRATEGY_VERSION}
		  AND snapshot.cutoff_at <= ${asOf.toISOString()}
		  AND NOT EXISTS (
			SELECT 1 FROM m1_eligibility_decisions decision
			WHERE decision.strategy_version = snapshot.strategy_version
			  AND decision.issuer_cik = snapshot.issuer_cik
			  AND decision.decision_window_open = snapshot.decision_window_open
		  )
		ORDER BY snapshot.cutoff_at ASC
		LIMIT 1
	`);
	if (!row) return undefined;
	return {
		sessionDate: row.session_date,
		calendarVersion: row.calendar_version,
		decisionWindowOpen: new Date(row.opens_at).toISOString(),
		deadline: new Date(row.cutoff_at).toISOString(),
	};
};

export const readNextAction = async (db: Database, asOf: Date) => {
	const due = await dueCutoff(db, asOf);
	const sessions = await listMarketSessionCandidates(db);
	return cockpitNextAction(due ?? upcomingCutoff(sessions, asOf.getTime()), {
		calendar: await lastFinishedJobOutcome(db, 'calendar-refresh'),
		sip: await lastFinishedJobOutcome(db, 'sip-daily-bars'),
	});
};

const toForm4Fact = (fact: typeof form4TransactionFacts.$inferSelect): Form4TransactionFactType =>
	Form4TransactionFact.parse({
		id: fact.id,
		kind: 'form4-transaction-fact',
		schemaVersion: 'm0',
		recordedAt: fact.recordedAt.toISOString(),
		inputRefs: [{ kind: 'source-document', id: fact.documentSha256, role: 'parsed-document' }],
		documentSha256: fact.documentSha256,
		accession: fact.accession,
		issuerCik: fact.issuerCik,
		issuerName: fact.issuerName,
		...(fact.issuerTicker ? { issuerTicker: fact.issuerTicker } : {}),
		reportingOwnerCik: fact.reportingOwnerCik,
		reportingOwnerName: fact.reportingOwnerName,
		isDirector: fact.isDirector,
		isOfficer: fact.isOfficer,
		isTenPercentOwner: fact.isTenPercentOwner,
		sourceClock: { kind: 'sec-acceptance', acceptedAt: fact.acceptedAt.toISOString() },
		transactionDate: fact.transactionDate,
		securityTitle: fact.securityTitle,
		transactionCode: fact.transactionCode,
		acquiredDisposed: fact.acquiredDisposed,
		ownership: fact.ownership,
		shares: fact.shares,
		pricePerShare: fact.pricePerShare,
		footnoteRefs: fact.footnoteRefs,
		sourceLocator: fact.sourceLocator,
		observedAt: fact.observedAt.toISOString(),
	});

const projectHealth = (events: (typeof jobRunEvents.$inferSelect)[], asOf: Date) => {
	const latest = new Map(events.toReversed().map((event) => [event.job, event]));
	return ORDINARY_JOBS.map((job) => {
		const event = latest.get(job);
		if (!event) return { job, lastEventAt: asOf.toISOString(), freshness: 'unseen' as const };
		const meta = event.meta && typeof event.meta === 'object' && !Array.isArray(event.meta) ? (event.meta as Record<string, string>) : {};
		const lastEventAt = new Date(event.at).toISOString();
		return {
			job,
			lastEventAt,
			...(event.outcome ? { outcome: event.outcome } : {}),
			freshness: freshnessOf({ job, lastEventAt, event: event.event, outcome: event.outcome ?? undefined, meta, asOf }),
		};
	});
};

export const readCockpitSnapshot = async (db: Database, asOf = new Date()): Promise<CockpitSnapshot> => {
	const facts = await asOfForm4Facts(db, asOf.toISOString() as ObservedAt, 20);
	const events = await db.execute<typeof jobRunEvents.$inferSelect>(sql`
		SELECT DISTINCT ON (job) cursor, id, schema_version, run_id, job, lane, event, at, outcome, meta, recorded_at
		FROM m0_job_run_events
		WHERE at <= ${asOf.toISOString()}::timestamptz
		ORDER BY job, cursor DESC
	`);
	const cursorRows = await db.select({ cursor: sql<number>`coalesce(max(${cockpitEvents.cursor}), 0)` }).from(cockpitEvents);
	return CockpitSnapshot.parse({
		cursor: Number(cursorRows[0]?.cursor ?? 0),
		asOf: asOf.toISOString() as CockpitSnapshotType['asOf'],
		funnel: await readFunnelAsOf(db, asOf),
		nextAction: await readNextAction(db, asOf),
		facts: facts.map(toForm4Fact),
		health: projectHealth([...events], asOf),
		tape: await readDecisionTape(db, asOf),
	});
};

export const readCockpitEventsAfter = async (db: Database, cursor: number): Promise<CockpitStreamEventType[]> => {
	const rows = await db.select().from(cockpitEvents).where(gt(cockpitEvents.cursor, cursor)).orderBy(cockpitEvents.cursor).limit(500);
	return rows.map((row) =>
		CockpitStreamEvent.parse({
			cursor: row.cursor,
			kind: row.kind as CockpitStreamEventType['kind'],
			artifactId: row.artifactId,
			recordedAt: row.recordedAt.toISOString(),
		}),
	);
};

import { desc, eq, gt, lte, sql } from 'drizzle-orm';
import { createHash } from 'node:crypto';

import {
	CockpitSnapshot,
	CockpitStreamEvent,
	Form4TransactionFact,
	type AcquisitionAttempt,
	type CockpitSnapshot as CockpitSnapshotType,
	type CockpitStreamEvent as CockpitStreamEventType,
	type Form4TransactionFact as Form4TransactionFactType,
	type ObservedAt,
	type ParseRun,
} from '@sonde/core';

const digestSha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const assertDocumentHash = (bytes: Uint8Array, sha256: string) => {
	const digest = digestSha256(bytes);
	if (digest !== sha256) throw new Error('source document hash mismatch');
	return digest;
};

import type { Database } from './client';
import {
	acquisitionAttempts,
	cockpitEvents,
	form4TransactionFacts,
	jobRunEvents,
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

export const asOfForm4Facts = (db: Database, asOf: ObservedAt, limit = 100) =>
	db
		.select()
		.from(form4TransactionFacts)
		.where(lte(form4TransactionFacts.observedAt, new Date(asOf)))
		.orderBy(desc(form4TransactionFacts.observedAt))
		.limit(limit);

export const readCockpitSnapshot = async (db: Database): Promise<CockpitSnapshot> => {
	const [counts] = await db
		.select({
			documents: sql<number>`(select count(*) from ${sourceDocuments})`,
			transactions: sql<number>`count(*)`,
			qualifyingPurchases: sql<number>`count(*) filter (where ${form4TransactionFacts.transactionCode} = 'P' and ${form4TransactionFacts.acquiredDisposed} = 'A')`,
		})
		.from(form4TransactionFacts)
		.leftJoin(sourceDocuments, eq(form4TransactionFacts.documentSha256, sourceDocuments.sha256));
	const facts = await db.select().from(form4TransactionFacts).orderBy(desc(form4TransactionFacts.observedAt)).limit(20);
	const events = await db.select().from(jobRunEvents).orderBy(desc(jobRunEvents.cursor)).limit(40);
	const cursorRows = await db.select({ cursor: sql<number>`coalesce(max(${cockpitEvents.cursor}), 0)` }).from(cockpitEvents);
	const health = [
		...new Map(
			events
				.reverse()
				.map((event) => [event.job, { job: event.job, lastEventAt: event.at.toISOString(), ...(event.outcome ? { outcome: event.outcome } : {}) }]),
		).values(),
	];
	const mappedFacts = facts.map((fact) =>
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
		}),
	);
	return CockpitSnapshot.parse({
		cursor: cursorRows[0]?.cursor ?? 0,
		asOf: new Date().toISOString() as CockpitSnapshotType['asOf'],
		funnel: {
			documents: Number(counts?.documents ?? 0),
			transactions: Number(counts?.transactions ?? 0),
			qualifyingPurchases: Number(counts?.qualifyingPurchases ?? 0),
		},
		facts: mappedFacts,
		health,
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

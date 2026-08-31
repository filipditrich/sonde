import { AcquisitionAttempt, CandidateSnapshot, ParseRun, parseRunIdFrom } from '@sonde/core';
import {
	appendCandidateSnapshot,
	appendDecisionPacket,
	appendEligibilityDecision,
	appendMarketSession,
	appendSignal,
	appendSipDailyBar,
	appendUniverseSnapshot,
	commitParse,
	hasDueCandidates,
	lastFinishedJobOutcome,
	listActiveListings,
	listEligibilityKeys,
	listLatestCandidateSnapshots,
	listMarketSessionCandidates,
	listSipBarsForListing,
	listStrategyFacts,
	persistAcquisition,
	readRuntimeCheckpoint,
	saveRuntimeCheckpoint,
	type Database,
} from '@sonde/db';
import { type FetchResult, edgar } from '@sonde/probes';

import type { EvidenceWriter } from './jobs';
import { closeDueCandidates, syncCandidateSnapshots, type StrategyWriter } from './strategy';

export type EngineRepository = EvidenceWriter & {
	appendMarketSessions(acquisitionAttemptId: string, sessions: readonly import('@sonde/core').MarketSession[]): Promise<void>;
	appendSipDailyBars(acquisitionAttemptId: string, bars: readonly import('@sonde/core').SipDailyBar[]): Promise<void>;
	loadCheckpoint<T>(key: string): Promise<T | undefined>;
	saveCheckpoint(key: string, value: object): Promise<void>;
};

export const createEvidenceWriter = (db: Database): EngineRepository => ({
	persistFetch: async ({ source, resource, result }: { source: string; resource: string; result: FetchResult }) => {
		const documentSha256 = result.status === 'ok' ? await edgar.documentHash(result.bytes) : undefined;
		const attempt = AcquisitionAttempt.parse({
			id: crypto.randomUUID(),
			kind: 'acquisition-attempt',
			schemaVersion: 'm0',
			recordedAt: result.completedAt,
			inputRefs: [],
			source,
			sourcePolicyVersion: 'm0',
			method: 'GET',
			resource,
			requestedAt: result.requestedAt,
			completedAt: result.completedAt,
			observedAt: result.completedAt,
			httpStatus: result.httpStatus,
			documentSha256,
			...(result.status === 'ok' ? { byteSize: result.bytes.byteLength, mediaType: result.mediaType ?? 'application/octet-stream' } : {}),
			...(result.status === 'failed' ? { failure: result.failure } : {}),
		});
		await persistAcquisition(
			db,
			attempt,
			result.status === 'ok'
				? { bytes: result.bytes, mediaType: result.mediaType ?? 'application/octet-stream', retentionClass: 'immutable' }
				: undefined,
		);
		return { attemptId: attempt.id, ...(documentSha256 ? { documentSha256 } : {}) };
	},
	commitParse: async (input) => {
		const run = ParseRun.parse({
			id: parseRunIdFrom(input.documentSha256, edgar.FORM4_PARSER, edgar.FORM4_PARSER_VERSION),
			kind: 'parse-run',
			schemaVersion: 'm0',
			recordedAt: input.recordedAt,
			inputRefs: [{ kind: 'source-document', id: input.documentSha256, role: 'parsed-document' }],
			documentSha256: input.documentSha256,
			parser: edgar.FORM4_PARSER,
			parserVersion: edgar.FORM4_PARSER_VERSION,
			startedAt: input.recordedAt,
			completedAt: input.recordedAt,
			status: input.status,
			...(input.failure ? { failure: input.failure } : {}),
		});
		await commitParse(db, run, input.facts);
		return run.id;
	},
	appendMarketSessions: async (acquisitionAttemptId, sessions) => {
		for (const session of sessions) await appendMarketSession(db, session, acquisitionAttemptId);
	},
	appendSipDailyBars: async (acquisitionAttemptId, bars) => {
		for (const bar of bars) await appendSipDailyBar(db, bar, acquisitionAttemptId);
	},
	loadCheckpoint: <T>(key: string) => readRuntimeCheckpoint<T>(db, key),
	saveCheckpoint: async (key, value) => {
		await saveRuntimeCheckpoint(db, key, value);
	},
	listListings: () => listActiveListings(db),
	listMarketSessions: () => listMarketSessionCandidates(db),
	syncCandidateSnapshots: (now) => syncCandidateSnapshots(strategyWriter(db), now.toISOString()),
	closeDueCandidates: (now) => closeDueCandidates(strategyWriter(db), now),
	hasDueCandidates: (now) => hasDueCandidates(db, now),
	lastFinishedOutcome: (job) => lastFinishedJobOutcome(db, job),
});

const toSnapshot = (row: Awaited<ReturnType<typeof listLatestCandidateSnapshots>>[number]) =>
	CandidateSnapshot.parse({
		id: row.id,
		kind: 'candidate-snapshot',
		schemaVersion: 'm1',
		recordedAt: row.recordedAt.toISOString(),
		inputRefs: row.inputRefs,
		strategyVersion: row.strategyVersion,
		issuerCik: row.issuerCik,
		decisionWindowOpen: row.decisionWindowOpen.toISOString(),
		cutoffAt: row.cutoffAt.toISOString(),
		qualifyingFactIds: row.qualifyingFactIds,
		reportingOwnerCiks: row.reportingOwnerCiks,
		observedAt: row.observedAt.toISOString(),
	});

const strategyWriter = (db: Database): StrategyWriter => ({
	listStrategyFacts: () => listStrategyFacts(db),
	listMarketSessions: () => listMarketSessionCandidates(db),
	listResolvedListings: async () => {
		const rows = await listActiveListings(db);
		return rows.map((row) => ({ id: row.id as never, ticker: row.ticker, issuerCik: row.issuerCik, securityType: row.securityType }));
	},
	listSipBars: async (listingId) => {
		const rows = await listSipBarsForListing(db, listingId);
		return rows.map((row) => ({
			listingId: row.listingId as never,
			sessionDate: row.sessionDate,
			feed: 'sip' as const,
			adjustment: row.adjustment as 'raw',
			open: row.open,
			high: row.high,
			low: row.low,
			close: row.close,
			volume: row.volume,
			observedAt: row.observedAt.toISOString(),
			...(row.vwap ? { vwap: row.vwap } : {}),
		}));
	},
	appendCandidateSnapshot: async (snapshot) => {
		await appendCandidateSnapshot(db, snapshot);
	},
	persistCutoff: async (result) => {
		await appendUniverseSnapshot(db, result.universe);
		await appendEligibilityDecision(db, result.eligibility);
		if (result.signal) await appendSignal(db, result.signal);
		await appendDecisionPacket(db, result.packet);
	},
	listLatestCandidateSnapshots: async () => (await listLatestCandidateSnapshots(db)).map(toSnapshot),
	eligibilityKeys: () => listEligibilityKeys(db),
	hasDueCandidates: (now) => hasDueCandidates(db, now),
});

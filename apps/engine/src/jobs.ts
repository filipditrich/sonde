import type { ArtifactId, MarketSession, SipDailyBar } from '@sonde/core';
import {
	type AlpacaCredentials,
	type AlpacaFetch,
	type FetchResult,
	type MarketSessionCandidate,
	type PoliteFetcher,
	edgar,
	fetchAlpacaCalendar,
	fetchSipDailyBars,
	materializeMarketSessions,
	materializeSipDailyBars,
	previousEasternDate,
	selectCompletedSipBars,
} from '@sonde/probes';

import type { EngineJobs } from './composition';
import type { Job } from './scheduler';
import { createSicJob } from './sic';

export { previousEasternDate };

export type EvidenceWriter = {
	persistFetch(input: { source: string; resource: string; result: FetchResult }): Promise<{ attemptId: string; documentSha256?: string }>;
	commitParse(input: {
		documentSha256: string;
		status: 'succeeded' | 'partial' | 'failed';
		recordedAt: string;
		failure?: { code: string; detail: string };
		facts: ReturnType<typeof edgar.parseForm4Facts>['facts'];
	}): Promise<string>;
	loadCheckpoint<T>(key: string): Promise<T | undefined>;
	saveCheckpoint(key: string, value: object): Promise<void>;
	appendMarketSessions?(acquisitionAttemptId: string, sessions: readonly MarketSession[]): Promise<void>;
	appendSipDailyBars?(acquisitionAttemptId: string, bars: readonly SipDailyBar[]): Promise<void>;
	listListings?(): Promise<readonly { id: string; ticker: string }[]>;
	listMarketSessions?(): Promise<readonly MarketSessionCandidate[]>;
	syncCandidateSnapshots?(now: Date): Promise<number>;
	closeDueCandidates?(now: Date): Promise<{ signals: number; decisions: number }>;
	hasDueCandidates?(now: Date): Promise<boolean>;
	lastFinishedOutcome?(job: string): Promise<string | undefined>;
	listIssuersMissingSic?(): Promise<readonly { id: string; cik: string }[]>;
	appendIssuerSic?(classification: import('@sonde/core').IssuerSicClassification): Promise<void>;
};

const EDGAR_LIVE_CHECKPOINT = 'edgar-live';

type PersistedReceipt = { attemptId: string; documentSha256?: string };
type CapturedDocument = { url: string; accession: string; acceptedAt: string; result: Extract<FetchResult, { status: 'ok' }> };

const persistCaptures = (writer: EvidenceWriter, receipts: Map<string, PersistedReceipt>) => async (resource: string, result: FetchResult) => {
	receipts.set(resource, await writer.persistFetch({ source: 'sec-edgar', resource, result }));
};

/** Captured bytes are committed before this parser is ever invoked. */
const parseCapturedDocuments = async (
	documents: readonly CapturedDocument[],
	receipts: ReadonlyMap<string, PersistedReceipt>,
	writer: EvidenceWriter,
	now: () => Date,
): Promise<number> => {
	let facts = 0;
	for (const document of documents) {
		const recordedAt = now().toISOString();
		const hash = receipts.get(document.url)?.documentSha256;
		if (!hash) throw new Error(`missing persisted XML acquisition for ${document.url}`);
		const parsed = edgar.parseForm4Facts(document.result.body, {
			accession: document.accession as never,
			documentSha256: hash as never,
			acceptedAt: document.acceptedAt as never,
			observedAt: document.result.completedAt as never,
			recordedAt: recordedAt as never,
		});
		const failure = parsed.failures[0];
		await writer.commitParse({
			documentSha256: hash,
			status: failure ? (parsed.facts.length ? 'partial' : 'failed') : 'succeeded',
			recordedAt,
			facts: parsed.facts,
			...(failure ? { failure: { code: failure.code, detail: failure.detail } } : {}),
		});
		facts += parsed.facts.length;
	}
	return facts;
};

/** Live and reconciliation jobs share this document path, making captured bytes durable before parsing. */
export const ingestEdgarPoll = async (
	fetcher: PoliteFetcher,
	writer: EvidenceWriter,
	now: () => Date = () => new Date(),
): Promise<{ documents: number; facts: number; gapDetected: boolean }> => {
	const receipts = new Map<string, { attemptId: string; documentSha256?: string }>();
	const capture = persistCaptures(writer, receipts);
	const prior = (await writer.loadCheckpoint<edgar.EdgarPollState>(EDGAR_LIVE_CHECKPOINT)) ?? edgar.emptyState();
	const poll = await edgar.pollOnce(fetcher, prior, async ({ resource, result }) => capture(resource, result));
	const facts = await parseCapturedDocuments(
		poll.documents.map((document) => ({
			url: document.url,
			accession: document.ref.accession,
			acceptedAt: document.ref.updatedAt,
			result: document.result,
		})),
		receipts,
		writer,
		now,
	);
	await writer.saveCheckpoint(EDGAR_LIVE_CHECKPOINT, poll.state);
	if (writer.syncCandidateSnapshots) await writer.syncCandidateSnapshots(now());
	return { documents: poll.documents.length, facts, gapDetected: poll.gapDetected };
};

/** Reconcile the SEC daily master index; it never substitutes the live feed. */
export const ingestEdgarReconciliation = async (
	fetcher: PoliteFetcher,
	date: string,
	writer: EvidenceWriter,
	now: () => Date = () => new Date(),
): Promise<{ documents: number; facts: number }> => {
	const receipts = new Map<string, PersistedReceipt>();
	const capture = persistCaptures(writer, receipts);
	const documents = await edgar.reconcileDaily(fetcher, date, capture);
	const facts = await parseCapturedDocuments(
		documents.map((document) => ({
			url: document.url,
			accession: document.ref.accession,
			acceptedAt: document.ref.acceptedAt,
			result: document.result,
		})),
		receipts,
		writer,
		now,
	);
	if (writer.syncCandidateSnapshots) await writer.syncCandidateSnapshots(now());
	return { documents: documents.length, facts };
};

/** Persist the Alpaca calendar capture first; sessions are derived only from those bytes. */
export const ingestAlpacaCalendar = async (
	writer: EvidenceWriter,
	credentials: AlpacaCredentials,
	options: { fetchImpl?: AlpacaFetch; now?: () => Date; calendarVersion?: string } = {},
): Promise<{ sessions: number; failure?: string }> => {
	const now = options.now ?? (() => new Date());
	const { capture, sessions, failure } = await fetchAlpacaCalendar({
		credentials,
		fetchImpl: options.fetchImpl,
		now,
		calendarVersion: options.calendarVersion ?? 'alpaca-m0',
	});
	const { attemptId } = await writer.persistFetch({ source: 'alpaca', resource: capture.resource, result: capture.result });
	if (failure || !writer.appendMarketSessions) return { sessions: 0, failure: failure ?? 'calendar-writer-missing' };
	const materialized = materializeMarketSessions(sessions, attemptId as ArtifactId);
	await writer.appendMarketSessions(attemptId, materialized);
	return { sessions: materialized.length };
};

const persistListingBars = async (input: {
	writer: EvidenceWriter;
	listing: { id: string; ticker: string };
	sessions: readonly MarketSessionCandidate[];
	credentials: AlpacaCredentials;
	fetchImpl?: AlpacaFetch;
	now: () => Date;
}): Promise<{ bars: number; failure?: string }> => {
	const fetched = await fetchSipDailyBars({
		listingId: input.listing.id as ArtifactId,
		symbol: input.listing.ticker,
		credentials: input.credentials,
		fetchImpl: input.fetchImpl,
		now: input.now,
	});
	const { attemptId } = await input.writer.persistFetch({ source: 'alpaca', resource: fetched.capture.resource, result: fetched.capture.result });
	if (fetched.failure) return { bars: 0, failure: fetched.failure };
	const selected = selectCompletedSipBars(fetched.bars, input.sessions, input.now());
	if (selected.failure) return { bars: 0, failure: selected.failure };
	if (!input.writer.appendSipDailyBars) return { bars: 0, failure: 'sip-writer-missing' };
	const materialized = materializeSipDailyBars(selected.bars, attemptId as ArtifactId);
	await input.writer.appendSipDailyBars(attemptId, materialized);
	return { bars: materialized.length };
};

/** US common tickers only; fixture ISS/LIST and non-letter symbols never hit Alpaca. */
export const isSipSymbol = (ticker: string) => /^[A-Z]{1,5}$/.test(ticker) && ticker !== 'ISS' && ticker !== 'LIST';

const notReadyFailure = (failure: string) =>
	failure === 'no-listings' || failure === 'skipped-listings' || failure === 'alpaca-http' || failure.startsWith('alpaca-sip-');

/** SIP bars only for known listings; missing universe is not-ready, never an IEX fallback. */
export const ingestSipDailyBars = async (
	writer: EvidenceWriter,
	credentials: AlpacaCredentials,
	options: { fetchImpl?: AlpacaFetch; now?: () => Date } = {},
): Promise<{ bars: number; failure?: string; skipped?: number }> => {
	const listings = (await writer.listListings?.()) ?? [];
	if (!listings.length) return { bars: 0, failure: 'no-listings' };
	const tradeable = listings.filter((listing) => isSipSymbol(listing.ticker));
	const skipped = listings.length - tradeable.length;
	if (!tradeable.length) return { bars: 0, failure: 'skipped-listings', skipped };
	const sessions = (await writer.listMarketSessions?.()) ?? [];
	let bars = 0;
	let failure: string | undefined;
	const now = options.now ?? (() => new Date());
	for (const listing of tradeable) {
		const result = await persistListingBars({ writer, listing, sessions, credentials, fetchImpl: options.fetchImpl, now });
		bars += result.bars;
		failure ??= result.failure;
	}
	return bars > 0 ? { bars, skipped } : { bars, failure, skipped };
};

const unconfigured = (name: string): Job => ({
	name,
	lane: 'ordinary',
	run: async () => {
		throw new Error(`${name} adapter requires explicit runtime configuration`);
	},
});

type AlpacaRuntime = { credentials: AlpacaCredentials; fetchImpl?: AlpacaFetch };

const calendarJob = (writer: EvidenceWriter, alpaca: AlpacaRuntime, now: () => Date): Job => ({
	name: 'calendar-refresh',
	lane: 'ordinary',
	run: async () => {
		const result = await ingestAlpacaCalendar(writer, alpaca.credentials, { fetchImpl: alpaca.fetchImpl, now });
		if (!result.failure && writer.syncCandidateSnapshots) await writer.syncCandidateSnapshots(now());
		return {
			outcome: result.failure ? 'failed' : 'ok',
			meta: { sessions: String(result.sessions), ...(result.failure ? { failure: result.failure } : {}) },
		};
	},
});

const sipJob = (writer: EvidenceWriter, alpaca: AlpacaRuntime, now: () => Date): Job => ({
	name: 'sip-daily-bars',
	lane: 'ordinary',
	due: async () => (await writer.lastFinishedOutcome?.('sip-daily-bars')) !== 'ok',
	run: async () => {
		const result = await ingestSipDailyBars(writer, alpaca.credentials, { fetchImpl: alpaca.fetchImpl, now });
		const outcome = !result.failure ? 'ok' : notReadyFailure(result.failure) ? 'not-ready' : 'failed';
		return {
			outcome,
			meta: {
				bars: String(result.bars),
				...(result.skipped ? { skipped: String(result.skipped) } : {}),
				...(result.failure ? { failure: result.failure } : {}),
			},
		};
	},
});

const cutoffJob = (writer: EvidenceWriter, now: () => Date): import('./composition').PriorityJob => {
	const run = async () => {
		if (!writer.closeDueCandidates) {
			const meta: Record<string, string> = { failure: 'cutoff-writer-missing' };
			return { outcome: 'not-ready', meta };
		}
		const result = await writer.closeDueCandidates(now());
		const meta: Record<string, string> = { signals: String(result.signals), decisions: String(result.decisions) };
		return { outcome: 'ok', meta };
	};
	return { name: 'decision-cutoff', lane: 'priority', due: async () => (writer.hasDueCandidates ? writer.hasDueCandidates(now()) : false), run };
};

/** Wires ordinary M0 jobs plus the isolated 09:20 priority cutoff. */
export const createOrdinaryJobs = (input: {
	fetcher: PoliteFetcher;
	writer: EvidenceWriter;
	now?: () => Date;
	alpaca?: AlpacaRuntime;
}): EngineJobs => {
	const now = input.now ?? (() => new Date());
	const alpaca = input.alpaca;
	return {
		edgarLive: {
			name: 'edgar-live',
			lane: 'ordinary',
			run: async () => {
				const result = await ingestEdgarPoll(input.fetcher, input.writer, now);
				return {
					outcome: result.gapDetected ? 'gap-detected' : 'ok',
					meta: { documents: String(result.documents), facts: String(result.facts), gapDetected: String(result.gapDetected) },
				};
			},
		},
		edgarReconcile: {
			name: 'edgar-reconcile',
			lane: 'ordinary',
			run: async () => {
				const date = previousEasternDate(now());
				const result = await ingestEdgarReconciliation(input.fetcher, date, input.writer, now);
				return { outcome: 'ok', meta: { date, documents: String(result.documents), facts: String(result.facts) } };
			},
		},
		calendarRefresh: alpaca ? calendarJob(input.writer, alpaca, now) : unconfigured('calendar-refresh'),
		sipDailyBars: alpaca ? sipJob(input.writer, alpaca, now) : unconfigured('sip-daily-bars'),
		sicRefresh: createSicJob(
			input.fetcher,
			{
				persistFetch: (request) => input.writer.persistFetch(request),
				listIssuersMissingSic: async () => (await input.writer.listIssuersMissingSic?.()) ?? [],
				appendIssuerSic: async (classification) => {
					await input.writer.appendIssuerSic?.(classification);
				},
			},
			now,
		),
		decisionCutoff: cutoffJob(input.writer, now),
	};
};

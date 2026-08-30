import type { ArtifactId, MarketSession } from '@sonde/core';
import {
	type AlpacaCredentials,
	type AlpacaFetch,
	type FetchResult,
	type PoliteFetcher,
	edgar,
	fetchAlpacaCalendar,
	materializeMarketSessions,
} from '@sonde/probes';

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
};

const EDGAR_LIVE_CHECKPOINT = 'edgar-live';

/** Civil date in America/New_York minus one day — the daily index that should already be complete. */
export const previousEasternDate = (now: Date): string => {
	const eastern = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
	const cursor = new Date(`${eastern}T12:00:00.000Z`);
	cursor.setUTCDate(cursor.getUTCDate() - 1);
	return cursor.toISOString().slice(0, 10);
};

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

const unconfigured = (name: string) => ({
	name,
	lane: 'ordinary' as const,
	run: async () => {
		throw new Error(`${name} adapter requires explicit runtime configuration`);
	},
});

/** Wires the four ordinary M0 jobs. Reconcile always uses the daily master index. */
export const createOrdinaryJobs = (input: {
	fetcher: PoliteFetcher;
	writer: EvidenceWriter;
	now?: () => Date;
	alpaca?: { credentials: AlpacaCredentials; fetchImpl?: AlpacaFetch };
}): import('./composition').EngineJobs => {
	const now = input.now ?? (() => new Date());
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
		calendarRefresh: input.alpaca
			? {
					name: 'calendar-refresh',
					lane: 'ordinary',
					run: async () => {
						const result = await ingestAlpacaCalendar(input.writer, input.alpaca!.credentials, { fetchImpl: input.alpaca!.fetchImpl, now });
						return result.failure
							? { outcome: 'failed', meta: { failure: result.failure, sessions: String(result.sessions) } }
							: { outcome: 'ok', meta: { sessions: String(result.sessions) } };
					},
				}
			: unconfigured('calendar-refresh'),
		sipDailyBars: unconfigured('sip-daily-bars'),
	};
};

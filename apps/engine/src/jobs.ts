import { type FetchResult, type PoliteFetcher, edgar } from '@sonde/probes';

export type EvidenceWriter = {
	persistFetch(input: { source: string; resource: string; result: FetchResult }): Promise<{ attemptId: string; documentSha256?: string }>;
	commitParse(input: {
		documentSha256: string;
		status: 'succeeded' | 'partial' | 'failed';
		recordedAt: string;
		failure?: { code: string; detail: string };
		facts: ReturnType<typeof edgar.parseForm4Facts>['facts'];
	}): Promise<string>;
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
): Promise<{ documents: number; facts: number }> => {
	const receipts = new Map<string, { attemptId: string; documentSha256?: string }>();
	const capture = persistCaptures(writer, receipts);
	const poll = await edgar.pollOnce(fetcher, undefined, async ({ resource, result }) => capture(resource, result));
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
	return { documents: poll.documents.length, facts };
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

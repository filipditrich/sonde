import type { AccessionNumber, SecAcceptedAt, Sha256 } from '@sonde/core';

import type { CacheValidators, FetchResult, PoliteFetcher } from '../fetch';
import { CURRENT_FEED_URL, findForm4Document, parseCurrentFeed, type FilingRef } from './feed';

export const PROBE_NAME = 'sec-edgar-form4';
export type EdgarDocument = { readonly ref: FilingRef; readonly url: string; readonly result: Extract<FetchResult, { status: 'ok' }> };
export type EdgarCapture = { readonly resource: string; readonly result: FetchResult };
export type EdgarPollState = {
	readonly feedValidators: CacheValidators;
	/** Durable filing identities already expanded from the bounded SEC feed. */
	readonly seenAccessions: readonly string[];
	readonly oldestEntryAccession?: string;
};
export type EdgarPoll = {
	readonly feed: FetchResult;
	readonly documents: readonly EdgarDocument[];
	readonly state: EdgarPollState;
	readonly gapDetected: boolean;
};
export const emptyState = (): EdgarPollState => ({ feedValidators: {}, seenAccessions: [] });

const isForm4 = (ref: FilingRef) => ref.formType === '4' || ref.formType === '4/A';

const capturedGet =
	(fetcher: PoliteFetcher, capture: (capture: EdgarCapture) => Promise<void>) => async (resource: string, validators?: CacheValidators) => {
		const result = await fetcher.get(resource, validators);
		await capture({ resource, result });
		return result;
	};

const uniqueForm4Refs = (body: string) => [
	...new Map(
		parseCurrentFeed(body)
			.filter(isForm4)
			.map((ref) => [ref.accession, ref]),
	).values(),
];

const acquireUnseenDocuments = async (
	get: (resource: string) => Promise<FetchResult>,
	refs: readonly FilingRef[],
	seen: ReadonlySet<string>,
): Promise<readonly EdgarDocument[]> => {
	const documents: EdgarDocument[] = [];
	for (const ref of refs) {
		if (seen.has(ref.accession)) continue;
		const listing = await get(`${ref.directoryUrl}index.json`);
		if (listing.status !== 'ok') continue;
		const filename = findForm4Document(listing.body);
		if (!filename) continue;
		const url = `${ref.directoryUrl}${filename}`;
		const result = await get(url);
		if (result.status === 'ok') documents.push({ ref, url, result });
	}
	return documents;
};

const nextPollState = (state: EdgarPollState, feed: FetchResult, refs: readonly FilingRef[]): EdgarPollState => {
	if (feed.status !== 'ok') return { ...state, feedValidators: feed.status === 'unchanged' ? feed.validators : state.feedValidators };
	const oldestEntryAccession = refs.at(-1)?.accession;
	return {
		feedValidators: feed.validators,
		seenAccessions: [...new Set([...state.seenAccessions, ...refs.map((ref) => ref.accession)])].slice(-1_000),
		...(oldestEntryAccession ? { oldestEntryAccession } : {}),
	};
};

/** Fetch every listed Form 4 document; no transaction-code filtering occurs at this boundary. */
export const pollOnce = async (
	fetcher: PoliteFetcher,
	state = emptyState(),
	capture: (capture: EdgarCapture) => Promise<void> = async () => undefined,
): Promise<EdgarPoll> => {
	const get = capturedGet(fetcher, capture);
	const feed = await get(CURRENT_FEED_URL, state.feedValidators);
	if (feed.status !== 'ok') return { feed, documents: [], state: nextPollState(state, feed, []), gapDetected: false };
	const uniqueRefs = uniqueForm4Refs(feed.body);
	const oldestEntryAccession = uniqueRefs.at(-1)?.accession;
	const gapDetected = state.seenAccessions.length > 0 && Boolean(oldestEntryAccession && !state.seenAccessions.includes(oldestEntryAccession));
	return {
		feed,
		documents: await acquireUnseenDocuments(get, uniqueRefs, new Set(state.seenAccessions)),
		state: nextPollState(state, feed, uniqueRefs),
		gapDetected,
	};
};

export const accession = (ref: FilingRef): AccessionNumber => ref.accession as AccessionNumber;
export const sourceClock = (ref: FilingRef): SecAcceptedAt => ref.updatedAt as SecAcceptedAt;
export const documentHash = async (bytes: Uint8Array): Promise<Sha256> => {
	const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes));
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('') as Sha256;
};

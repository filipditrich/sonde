import type { AssetId, ObservedAt, OccurredAt, Sha256 } from '@sonde/core';

import type { CacheValidators, PoliteFetcher } from '../fetch';
import { CURRENT_FEED_URL, findForm4Document, parseCurrentFeed } from './feed';
import { type Form4, openMarketPurchases, parseForm4 } from './form4';

export const PROBE_NAME = 'sec-edgar-form4';

/** A filing, normalised. The probe interprets nothing beyond "is this an open-market purchase". */
export type Form4Observation = {
	readonly probe: typeof PROBE_NAME;
	readonly trustClass: 'official';
	readonly accession: string;
	readonly rawDocumentSha256: Sha256;
	readonly sourceUrl: string;
	/**
	 * Deterministic over (issuer, filing date), so two insiders filing on the same issuer the
	 * same day land in one cluster without any coordination between fetches. The signal engine
	 * then only has to count cluster members — "multi-insider" falls out of the identifier
	 * rather than needing its own join.
	 */
	readonly eventClusterId: string;
	readonly assets: readonly AssetId[];
	readonly title: string;
	/**
	 * When EDGAR published, **not** when the trade happened.
	 *
	 * A Form 4 reports a transaction up to two business days old. Nobody could act on it before
	 * disclosure, so the disclosure is the event; the trade date is metadata. Getting this
	 * backwards would let a signal appear to precede its own cause.
	 */
	readonly occurredAt: OccurredAt;
	readonly observedAt: ObservedAt;
	readonly form4: Form4;
	readonly rawDocument: string;
};

const sha256 = async (text: string): Promise<Sha256> => {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('') as Sha256;
};

/** Stable 64-hex id over (issuer, filing date). Not a secret — just needs to be collision-free. */
const clusterId = async (issuerCik: string, filingDate: string): Promise<string> => sha256(`${issuerCik}:${filingDate}`);

export type ProbeState = {
	/** accessions already emitted — the feed re-lists recent filings on every poll */
	readonly seen: ReadonlySet<string>;
	readonly feedValidators: CacheValidators;
};

export const emptyState = (): ProbeState => ({ seen: new Set(), feedValidators: {} });

export type PollResult = {
	readonly observations: readonly Form4Observation[];
	readonly state: ProbeState;
	/** filings seen but carrying no open-market purchase — counted for probe health, not stored */
	readonly skipped: number;
};

/**
 * One poll of the live feed.
 *
 * Only filings containing a code-`P` acquisition produce an observation. Everything else is
 * compensation traffic and is the overwhelming majority — the study found roughly 12% of Form 4
 * rows are open-market purchases, so a probe that emitted every filing would flood storage with
 * payroll.
 */
export const pollOnce = async (fetcher: PoliteFetcher, state: ProbeState, now: () => Date = () => new Date()): Promise<PollResult> => {
	const feed = await fetcher.get(CURRENT_FEED_URL, state.feedValidators);
	if (feed.status === 'unchanged') return { observations: [], state, skipped: 0 };

	const seen = new Set(state.seen);
	const observations: Form4Observation[] = [];
	let skipped = 0;

	for (const ref of parseCurrentFeed(feed.body)) {
		if (seen.has(ref.accession)) continue;
		seen.add(ref.accession);

		const observation = await fetchFiling(fetcher, ref.directoryUrl, ref.updatedAt, now);
		if (observation) observations.push({ ...observation, accession: ref.accession });
		else skipped += 1;
	}

	return {
		observations,
		state: { seen, feedValidators: feed.validators },
		skipped,
	};
};

type PartialObservation = Omit<Form4Observation, 'accession'>;

const fetchFiling = async (
	fetcher: PoliteFetcher,
	directoryUrl: string,
	updatedAt: string,
	now: () => Date,
): Promise<PartialObservation | undefined> => {
	const listing = await fetcher.get(`${directoryUrl}index.json`);
	if (listing.status !== 'ok') return undefined;

	const document = findForm4Document(listing.body);
	if (!document) return undefined;

	const sourceUrl = `${directoryUrl}${document}`;
	const doc = await fetcher.get(sourceUrl);
	if (doc.status !== 'ok') return undefined;

	const form4 = parseForm4(doc.body);
	const purchases = openMarketPurchases(form4);
	if (purchases.length === 0 || !form4.issuerTradingSymbol) return undefined;

	const filingDate = updatedAt.slice(0, 10);
	return {
		probe: PROBE_NAME,
		trustClass: 'official',
		rawDocumentSha256: await sha256(doc.body),
		sourceUrl,
		eventClusterId: await clusterId(form4.issuerCik, filingDate),
		assets: [`equity:${form4.issuerTradingSymbol}` as AssetId],
		title: `${form4.reportingOwnerName} bought ${form4.issuerTradingSymbol}`,
		occurredAt: updatedAt as OccurredAt,
		observedAt: now().toISOString() as ObservedAt,
		form4,
		rawDocument: doc.body,
	};
};

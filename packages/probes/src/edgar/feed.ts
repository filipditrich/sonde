import { XMLParser } from 'fast-xml-parser';

/** One filing announced on EDGAR's `getcurrent` feed. */
export type FilingRef = {
	/** dashed form, e.g. `0001739310-26-000004` */
	readonly accession: string;
	readonly formType: string;
	/** directory holding the filing's documents, with trailing slash */
	readonly directoryUrl: string;
	/** when EDGAR published it — this becomes `occurredAt` */
	readonly updatedAt: string;
};

/**
 * The live feed of newly accepted filings.
 *
 * `owner=only` is load-bearing and easy to omit: without it EDGAR applies `type` loosely and
 * unrelated forms (424B2, 485BXT) come back alongside Form 4s. Verified against the live
 * endpoint — see the fixture in `__fixtures__/`.
 */
export const CURRENT_FEED_URL = 'https://www.sec.gov/cgi-bin/browse-edgar' + '?action=getcurrent&type=4&owner=only&count=100&output=atom';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

const ACCESSION = /accession-number=([\d-]+)/;

const asArray = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

/**
 * Derive the document directory from the index URL.
 *
 * The accession cannot be used to build this path directly: the URL is keyed on the *reporting
 * owner's* CIK while the documents inside are filed under the *issuer's*. Trimming the observed
 * URL avoids guessing which.
 */
const directoryOf = (indexUrl: string): string => indexUrl.replace(/[^/]*$/, '');

/** Pure over the feed body — no network, so it is testable against a saved fixture. */
export const parseCurrentFeed = (xml: string): FilingRef[] => {
	const entries = asArray<Record<string, unknown>>((parser.parse(xml) as { feed?: { entry?: unknown } }).feed?.entry as never);

	return entries.flatMap((entry): FilingRef[] => {
		const id = entry['id'];
		const accession = typeof id === 'string' ? ACCESSION.exec(id)?.[1] : undefined;
		const link = entry['link'] as { '@_href'?: string } | undefined;
		const category = entry['category'] as { '@_term'?: string } | undefined;
		const href = link?.['@_href'];
		if (!accession || !href) return [];

		return [
			{
				accession,
				formType: category?.['@_term'] ?? '',
				directoryUrl: directoryOf(href),
				updatedAt: new Date(typeof entry['updated'] === 'string' ? entry['updated'] : '').toISOString(),
			},
		];
	});
};

/**
 * Locate the filing's raw XML in the directory listing.
 *
 * Every Form 4 directory contains two `.xml` entries: the raw document and an `xslF345X06/…`
 * stylesheet rendering of the same thing. Taking the first `.xml` would work most of the time
 * and silently parse a rendering the rest of it.
 */
export const findForm4Document = (indexJson: string): string | undefined => {
	const parsed = JSON.parse(indexJson) as { directory?: { item?: { name?: string }[] } };
	return parsed.directory?.item?.map((i) => i.name ?? '').find((name) => name.endsWith('.xml') && !name.includes('xsl'));
};

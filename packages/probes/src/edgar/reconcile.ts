import type { FetchResult, PoliteFetcher } from '../fetch';
import { findForm4Document } from './feed';

export type DailyForm4 = { accession: string; directoryUrl: string; submissionUrl: string };
export type DailyEdgarDocument = { ref: DailyForm4 & { acceptedAt: string }; url: string; result: Extract<FetchResult, { status: 'ok' }> };

const easternOffset = (date: string) => {
	const [year, month, day] = date.split('-').map(Number);
	const instant = new Date(Date.UTC(year!, month! - 1, day!, 12));
	const zone = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'longOffset' })
		.formatToParts(instant)
		.find((part) => part.type === 'timeZoneName')?.value;
	return zone?.replace('GMT', '') ?? undefined;
};

/** SEC submission headers, unlike daily-index filing dates, carry the authoritative acceptance clock. */
export const parseSecAcceptanceDatetime = (submission: string): string | undefined => {
	const compact = /<?ACCEPTANCE-DATETIME>?:?\s*([0-9]{14})/.exec(submission)?.[1];
	if (!compact) return undefined;
	const date = `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
	const offset = easternOffset(date);
	if (!offset) return undefined;
	return `${date}T${compact.slice(8, 10)}:${compact.slice(10, 12)}:${compact.slice(12, 14)}${offset}`;
};
export const dailyMasterIndexUrl = (date: string) => {
	const [year, month, day] = date.split('-');
	return `https://www.sec.gov/Archives/edgar/daily-index/${year}/QTR${Math.ceil(Number(month) / 3)}/master.${year}${month}${day}.idx`;
};
export const parseDailyForm4 = (body: string): DailyForm4[] =>
	body.split(/\r?\n/).flatMap((line) => {
		const fields = line.split('|');
		const [, , form, , filename] = fields;
		if ((form !== '4' && form !== '4/A') || !filename) return [];
		const path = filename.replace(/[^/]+$/, '');
		const compact = filename.match(/(\d{18})/)?.[1];
		const accession = compact ? `${compact.slice(0, 10)}-${compact.slice(10, 12)}-${compact.slice(12)}` : filename.match(/(\d{10}-\d{2}-\d{6})/)?.[1];
		return accession
			? [{ accession, directoryUrl: `https://www.sec.gov/Archives/${path}`, submissionUrl: `https://www.sec.gov/Archives/${filename}` }]
			: [];
	});
export const reconcileDaily = async (
	fetcher: PoliteFetcher,
	date: string,
	capture: (resource: string, result: FetchResult) => Promise<void>,
): Promise<readonly DailyEdgarDocument[]> => {
	const indexUrl = dailyMasterIndexUrl(date);
	const index = await fetcher.get(indexUrl);
	await capture(indexUrl, index);
	if (index.status !== 'ok') return [];
	const documents: DailyEdgarDocument[] = [];
	for (const ref of parseDailyForm4(index.body)) {
		const submission = await fetcher.get(ref.submissionUrl);
		await capture(ref.submissionUrl, submission);
		const acceptedAt = submission.status === 'ok' ? parseSecAcceptanceDatetime(submission.body) : undefined;
		if (!acceptedAt) continue;
		const listingUrl = `${ref.directoryUrl}index.json`;
		const listing = await fetcher.get(listingUrl);
		await capture(listingUrl, listing);
		if (listing.status !== 'ok') continue;
		const file = findForm4Document(listing.body);
		if (!file) continue;
		const url = `${ref.directoryUrl}${file}`;
		const result = await fetcher.get(url);
		await capture(url, result);
		if (result.status === 'ok') documents.push({ ref: { ...ref, acceptedAt }, url, result });
	}
	return documents;
};

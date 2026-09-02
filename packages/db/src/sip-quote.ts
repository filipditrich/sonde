import { and, asc, desc, eq, sql } from 'drizzle-orm';

import { CockpitListingQuote, STRATEGY_VERSION, type CockpitSipBar } from '@sonde/core';

import type { Database } from './client';
import { issuers, listings, sipDailyBars } from './schema';

const STRIP_BARS = 21;

const stripQuote = (quote: CockpitListingQuote | undefined): quote is CockpitListingQuote =>
	Boolean(quote && quote.bars.length && quote.ticker !== 'N/A');

const asBar = (row: typeof sipDailyBars.$inferSelect): CockpitSipBar => ({
	sessionDate: row.sessionDate,
	open: String(row.open),
	high: String(row.high),
	low: String(row.low),
	close: String(row.close),
	volume: String(row.volume),
	...(row.vwap ? { vwap: String(row.vwap) } : {}),
});

export const loadSipBars = async (db: Database, listingId: string, limit?: number) => {
	const where = and(eq(sipDailyBars.listingId, listingId), eq(sipDailyBars.feed, 'sip'));
	if (limit) {
		const rows = await db.select().from(sipDailyBars).where(where).orderBy(desc(sipDailyBars.sessionDate)).limit(limit);
		return rows.map(asBar).toReversed();
	}
	const rows = await db.select().from(sipDailyBars).where(where).orderBy(asc(sipDailyBars.sessionDate));
	return rows.map(asBar);
};

const listingForIssuer = async (db: Database, issuerCik: string) => {
	const [row] = await db
		.select({
			listingId: listings.id,
			ticker: listings.ticker,
			venue: listings.venue,
			issuerCik: issuers.cik,
			issuerName: issuers.legalName,
		})
		.from(listings)
		.innerJoin(issuers, eq(listings.issuerId, issuers.id))
		.where(eq(issuers.cik, issuerCik))
		.orderBy(desc(listings.recordedAt))
		.limit(1);
	return row;
};

export const readListingQuote = async (db: Database, issuerCik: string, href?: string, barLimit?: number) => {
	const listing = await listingForIssuer(db, issuerCik);
	if (!listing) return undefined;
	return CockpitListingQuote.parse({
		ticker: listing.ticker,
		venue: listing.venue,
		listingId: listing.listingId,
		issuerCik: listing.issuerCik,
		issuerName: listing.issuerName,
		feed: 'sip',
		delay: 'delayed-daily',
		bars: await loadSipBars(db, listing.listingId, barLimit),
		...(href ? { href } : {}),
	});
};

export const readCockpitQuotes = async (db: Database, asOf: Date, extraCiks: readonly string[] = []) => {
	const candidates = await db.execute<{ id: string; issuer_cik: string }>(sql`
		SELECT id, issuer_cik FROM (
			SELECT DISTINCT ON (issuer_cik)
				id::text AS id,
				issuer_cik,
				recorded_at
			FROM m1_candidate_snapshots
			WHERE recorded_at <= ${asOf.toISOString()}::timestamptz
			  AND strategy_version = ${STRATEGY_VERSION}
			  AND cardinality(reporting_owner_ciks) >= 2
			ORDER BY issuer_cik, recorded_at DESC
		) latest
		ORDER BY recorded_at DESC
		LIMIT 16
	`);
	const quotes: CockpitListingQuote[] = [];
	const seen = new Set<string>();
	for (const row of candidates) {
		const quote = await readListingQuote(db, row.issuer_cik, `/candidates/${row.id}`, STRIP_BARS);
		if (!stripQuote(quote)) continue;
		quotes.push(quote);
		seen.add(row.issuer_cik);
	}
	for (const cik of extraCiks) {
		if (quotes.length >= 16 || seen.has(cik)) continue;
		const quote = await readListingQuote(db, cik, undefined, STRIP_BARS);
		if (!stripQuote(quote)) continue;
		quotes.push(quote);
		seen.add(cik);
	}
	return quotes;
};

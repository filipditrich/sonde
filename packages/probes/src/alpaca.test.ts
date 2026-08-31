import { expect, test } from 'bun:test';

import { completedTwentyBarLiquidity, fetchAlpacaCalendar, fetchSipDailyBars, multiplyDecimals } from './alpaca';

test('uses exact VWAP dollar volume and the two-middle median', () => {
	const bars = Array.from({ length: 20 }, (_, index) => ({ feed: 'sip', vwap: `${index + 1}.1`, volume: '10', close: '999' })) as never;
	expect(completedTwentyBarLiquidity(bars).medianDollarVolume).toBe('106');
	expect(multiplyDecimals('0.10000000000000001', '3')).toBe('0.30000000000000003');
});

test('SIP bar request asks Alpaca for a trailing year of daily bars', async () => {
	const urls: string[] = [];
	await fetchSipDailyBars({
		listingId: '0199a1f0-0000-7000-8000-000000000001' as never,
		symbol: 'CAKE',
		credentials: { key: 'k', secret: 's' },
		now: () => new Date('2026-08-31T12:00:00.000Z'),
		fetchImpl: async (url) => {
			urls.push(url);
			return new Response(JSON.stringify({ bars: [] }), { status: 200 });
		},
	});
	expect(urls[0]).toContain('feed=sip');
	expect(urls[0]).toContain('start=2025-07-27');
	expect(urls[0]).toContain('end=2026-08-31');
});

test('calendar request asks Alpaca for one trailing year and six forward months', async () => {
	const urls: string[] = [];
	await fetchAlpacaCalendar({
		credentials: { key: 'k', secret: 's' },
		calendarVersion: 'alpaca-1',
		now: () => new Date('2026-08-31T12:00:00.000Z'),
		fetchImpl: async (url) => {
			urls.push(url);
			return new Response('[]', { status: 200 });
		},
	});
	expect(urls[0]).toContain('start=2025-07-27');
	expect(urls[0]).toContain('end=2027-02-27');
});

test('records Alpaca HTTP failures without inventing bars or sessions', async () => {
	const fetchImpl = (async () => new Response('no', { status: 403 })) as unknown as typeof fetch;
	const credentials = { key: 'k', secret: 's' };
	const listingId = '0199a1f0-0000-7000-8000-000000000001' as never;
	const bars = await fetchSipDailyBars({ listingId, symbol: 'ISS', credentials, fetchImpl });
	const calendar = await fetchAlpacaCalendar({ credentials, fetchImpl, calendarVersion: 'alpaca-1' });
	expect(bars).toMatchObject({ bars: [], failure: 'alpaca-http' });
	expect(calendar).toMatchObject({ sessions: [], failure: 'alpaca-http' });
});

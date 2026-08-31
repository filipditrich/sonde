import { expect, test } from 'bun:test';

import { completedTwentyBarLiquidity, fetchAlpacaCalendar, fetchSipDailyBars, multiplyDecimals, selectCompletedSipBars } from './alpaca';

test('uses exact VWAP dollar volume and the two-middle median', () => {
	const bars = Array.from({ length: 20 }, (_, index) => ({ feed: 'sip', vwap: `${index + 1}.1`, volume: '10', close: '999' })) as never;
	expect(completedTwentyBarLiquidity(bars).medianDollarVolume).toBe('106');
	expect(multiplyDecimals('0.10000000000000001', '3')).toBe('0.30000000000000003');
	const liquid = Array.from({ length: 20 }, () => ({ feed: 'sip', vwap: '20', volume: '2000000' })) as never;
	expect(completedTwentyBarLiquidity(liquid).medianDollarVolume).toBe('40000000');
});

test('completed SIP window ignores a stale calendar version with a Saturday session', () => {
	const weekday = (date: string, version: string, observedAt: string) => ({
		calendarVersion: version,
		sessionDate: date,
		opensAt: `${date}T13:30:00.000Z`,
		closesAt: `${date}T20:00:00.000Z`,
		earlyClose: false,
		source: 'alpaca' as const,
		observedAt,
	});
	const dates = [
		'2026-08-03',
		'2026-08-04',
		'2026-08-05',
		'2026-08-06',
		'2026-08-07',
		'2026-08-10',
		'2026-08-11',
		'2026-08-12',
		'2026-08-13',
		'2026-08-14',
		'2026-08-17',
		'2026-08-18',
		'2026-08-19',
		'2026-08-20',
		'2026-08-21',
		'2026-08-24',
		'2026-08-25',
		'2026-08-26',
		'2026-08-27',
		'2026-08-28',
	];
	const sessions = [
		...dates.map((date) => weekday(date, 'alpaca-m0', '2026-08-31T00:00:00.000Z')),
		weekday('2026-08-29', 'alpaca-1', '2026-08-30T00:00:00.000Z'),
	];
	const bars = dates.map((sessionDate) => ({
		listingId: '0199a1f0-0000-7000-8000-000000000001' as never,
		sessionDate,
		feed: 'sip' as const,
		adjustment: 'raw' as const,
		open: '1',
		high: '1',
		low: '1',
		close: '1',
		volume: '1',
		vwap: '1',
		observedAt: '2026-08-31T00:00:00.000Z',
	}));
	expect(selectCompletedSipBars(bars, sessions, new Date('2026-08-31T12:00:00.000Z')).bars).toHaveLength(20);
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
	expect(urls[0]).toContain('end=2026-08-30');
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

test('spaces sequential Alpaca requests by at least 200ms', async () => {
	const times: number[] = [];
	const fetchImpl = async () => {
		times.push(Date.now());
		return new Response('[]', { status: 200 });
	};
	const credentials = { key: 'k', secret: 's' };
	await fetchAlpacaCalendar({ credentials, fetchImpl, calendarVersion: 'alpaca-1' });
	await fetchAlpacaCalendar({ credentials, fetchImpl, calendarVersion: 'alpaca-1' });
	expect(times).toHaveLength(2);
	expect((times[1] ?? 0) - (times[0] ?? 0)).toBeGreaterThanOrEqual(200);
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

import { expect, test } from 'bun:test';

import { completedTwentyBarLiquidity, fetchAlpacaCalendar, fetchSipDailyBars, multiplyDecimals } from './alpaca';

test('uses exact VWAP dollar volume and the two-middle median', () => {
	const bars = Array.from({ length: 20 }, (_, index) => ({ feed: 'sip', vwap: `${index + 1}.1`, volume: '10', close: '999' })) as never;
	expect(completedTwentyBarLiquidity(bars).medianDollarVolume).toBe('106');
	expect(multiplyDecimals('0.10000000000000001', '3')).toBe('0.30000000000000003');
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

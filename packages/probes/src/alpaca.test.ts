import { expect, test } from 'bun:test';

import { completedTwentyBarLiquidity, multiplyDecimals } from './alpaca';

test('uses exact VWAP dollar volume and the two-middle median', () => {
	const bars = Array.from({ length: 20 }, (_, index) => ({ feed: 'sip', vwap: `${index + 1}.1`, volume: '10', close: '999' })) as never;
	expect(completedTwentyBarLiquidity(bars).medianDollarVolume).toBe('106');
	expect(multiplyDecimals('0.10000000000000001', '3')).toBe('0.30000000000000003');
});

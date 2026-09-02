import { expect, test } from 'bun:test';

import { barsForRange, compareDecimals, percentChange, sessionChange, signedDecimal, subtractDecimals, weekRange } from './sip-quote';

test('subtracts quote closes without Number', () => {
	expect(subtractDecimals('88.48', '88.37')).toBe('0.11');
	expect(subtractDecimals('3.14', '4.00')).toBe('-0.86');
});

test('percent change is scaled from the previous close', () => {
	expect(percentChange('88.48', '88.37')).toBe('0.12');
	expect(percentChange('1', '0')).toBeUndefined();
});

test('session change signs a last-vs-previous close', () => {
	const bars = [
		{ sessionDate: '2026-08-31', open: '1', high: '1', low: '1', close: '88.37', volume: '1' },
		{ sessionDate: '2026-09-01', open: '1', high: '1', low: '1', close: '88.48', volume: '1' },
	];
	expect(sessionChange(bars)).toMatchObject({ change: '0.11', pct: '0.12', direction: 'up' });
	expect(signedDecimal('0.11')).toBe('+0.11');
});

test('1d is the last retained session, not an intraday window', () => {
	const bars = [
		{ sessionDate: '2026-08-28', open: '1', high: '2', low: '1', close: '1.5', volume: '1' },
		{ sessionDate: '2026-08-31', open: '1', high: '2', low: '1', close: '1.6', volume: '1' },
		{ sessionDate: '2026-09-01', open: '1', high: '2', low: '1', close: '1.7', volume: '1' },
	];
	expect(barsForRange(bars, '1d').map((bar) => bar.sessionDate)).toEqual(['2026-09-01']);
	expect(barsForRange(bars, '5d')).toHaveLength(3);
	expect(barsForRange(bars, 'ytd')[0]?.sessionDate).toBe('2026-08-28');
});

test('52-session range compares decimals, not strings', () => {
	expect(compareDecimals('10.1', '9.9')).toBe(1);
	const bars = [
		{ sessionDate: '2026-08-28', open: '1', high: '9.9', low: '8', close: '9', volume: '1' },
		{ sessionDate: '2026-08-31', open: '1', high: '10.1', low: '7.5', close: '10', volume: '1' },
	];
	expect(weekRange(bars)).toEqual({ sessions: 2, high: '10.1', low: '7.5' });
});

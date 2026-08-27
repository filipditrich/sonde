import { describe, expect, test } from 'bun:test';

import { AssetId, Confidence, Decimal, Duration, ObservedAt, Sha256, assetClassOf, isExecutable } from './primitives';

describe('timestamps', () => {
	test('require an explicit offset — a naive datetime is ambiguous', () => {
		expect(ObservedAt.safeParse('2026-08-27T10:00:00Z').success).toBe(true);
		expect(ObservedAt.safeParse('2026-08-27T12:00:00+02:00').success).toBe(true);
		expect(ObservedAt.safeParse('2026-08-27T10:00:00').success).toBe(false);
		expect(ObservedAt.safeParse('2026-08-27').success).toBe(false);
	});
});

describe('Decimal', () => {
	test('accepts decimal strings', () => {
		for (const ok of ['0', '61204.55', '-12.5', '0.00000001']) {
			expect(Decimal.safeParse(ok).success).toBe(true);
		}
	});

	test('rejects anything that would tempt float math', () => {
		for (const bad of [61204.55, '1e5', '1,000.5', '', 'NaN', 'Infinity', '01.5', '.5']) {
			expect(Decimal.safeParse(bad).success).toBe(false);
		}
	});
});

describe('Duration', () => {
	test('accepts ISO 8601 durations used as signal horizons', () => {
		for (const ok of ['PT4H', 'P1D', 'PT30M', 'P1W', 'PT1H30M']) {
			expect(Duration.safeParse(ok).success).toBe(true);
		}
	});

	test('rejects prose and bare P', () => {
		for (const bad of ['4h', 'P', '', 'PT', '4 hours']) {
			expect(Duration.safeParse(bad).success).toBe(false);
		}
	});
});

describe('Confidence', () => {
	test('is bounded to 0..1 so calibration means something', () => {
		expect(Confidence.safeParse(0).success).toBe(true);
		expect(Confidence.safeParse(1).success).toBe(true);
		expect(Confidence.safeParse(0.62).success).toBe(true);
		expect(Confidence.safeParse(1.1).success).toBe(false);
		expect(Confidence.safeParse(-0.1).success).toBe(false);
	});
});

describe('Sha256', () => {
	test('requires lowercase hex of exactly 64 chars', () => {
		expect(Sha256.safeParse('a'.repeat(64)).success).toBe(true);
		expect(Sha256.safeParse('A'.repeat(64)).success).toBe(false);
		expect(Sha256.safeParse('a'.repeat(63)).success).toBe(false);
	});
});

describe('AssetId', () => {
	test('carries its class in the identifier', () => {
		expect(AssetId.safeParse('crypto:BTC').success).toBe(true);
		expect(AssetId.safeParse('equity:AAPL').success).toBe(true);
		expect(AssetId.safeParse('crypto:BTC-PERP').success).toBe(true);
		expect(AssetId.safeParse('BTC').success).toBe(false);
		expect(AssetId.safeParse('forex:EURUSD').success).toBe(false);
		expect(AssetId.safeParse('crypto:btc').success).toBe(false);
	});

	test('only crypto is executable — ADR 0012', () => {
		const btc = AssetId.parse('crypto:BTC');
		const aapl = AssetId.parse('equity:AAPL');

		expect(assetClassOf(btc)).toBe('crypto');
		expect(assetClassOf(aapl)).toBe('equity');
		expect(isExecutable(btc)).toBe(true);
		expect(isExecutable(aapl)).toBe(false);
	});
});

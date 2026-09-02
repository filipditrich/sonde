import { expect, test } from 'bun:test';

import { sipChartSvg, sparklineSvg } from './chart';

const bars = [
	{ sessionDate: '2026-08-28', open: '1', high: '2', low: '1', close: '1.5', volume: '1' },
	{ sessionDate: '2026-08-31', open: '1', high: '2', low: '1', close: '1.6', volume: '1' },
	{ sessionDate: '2026-09-01', open: '1', high: '2', low: '1', close: '1.7', volume: '1' },
];

test('1d chart is the last session, not an intraday window', () => {
	const svg = sipChartSvg(bars, '1d', '1.6');
	expect(svg).toContain('2026-09-01');
	expect(svg).not.toContain('2026-08-28');
	expect(svg).toContain('previous close 1.6');
	expect(svg).toContain('<circle');
});

test('longer ranges plot a polyline of retained closes', () => {
	const svg = sipChartSvg(bars, '5d');
	expect(svg).toContain('polyline');
	expect(svg).toContain('2026-08-28');
	expect(svg).toContain('2026-09-01');
});

test('empty series is labelled, not a fake zero line', () => {
	expect(sipChartSvg([], '1d')).toContain('no SIP bars retained');
	expect(sparklineSvg(['1'])).toBe('');
	expect(sparklineSvg(['1.5', '1.7'])).toContain('polyline');
});

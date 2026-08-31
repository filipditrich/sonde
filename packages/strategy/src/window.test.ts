import { expect, test } from 'bun:test';

import type { MarketSessionCandidate } from '@sonde/probes';

import { assignDecisionWindow, decisionCutoffAt } from './window';

const session = (date: string, version = 'alpaca-m0'): MarketSessionCandidate => ({
	calendarVersion: version,
	sessionDate: date,
	opensAt: `${date}T13:30:00.000Z`,
	closesAt: `${date}T20:00:00.000Z`,
	earlyClose: false,
	source: 'alpaca',
	observedAt: '2026-08-31T00:00:00.000Z',
});

const calendar = [session('2026-08-31'), session('2026-09-01'), session('2026-09-02')];

test('observedAt at 09:20:00 ET is in the current window; after cutoff uses the next captured open', () => {
	expect(decisionCutoffAt('2026-08-31')).toBe('2026-08-31T09:20:00.000-04:00');
	expect(assignDecisionWindow('2026-08-31T13:20:00.000Z', calendar)?.sessionDate).toBe('2026-08-31');
	expect(assignDecisionWindow('2026-08-31T09:20:00.000-04:00', calendar)?.decisionWindowOpen).toBe('2026-08-31T13:30:00.000Z');
	expect(assignDecisionWindow('2026-08-31T13:20:00.001Z', calendar)?.sessionDate).toBe('2026-09-01');
});

test('holidays use the captured calendar without a hard-coded date list', () => {
	const skippedTuesday = [session('2026-08-31'), session('2026-09-02')];
	expect(assignDecisionWindow('2026-08-31T13:20:00.001Z', skippedTuesday)?.sessionDate).toBe('2026-09-02');
});

import { expect, test } from 'bun:test';

import { decisionCutoffAt, upcomingCutoff } from './cutoff-clock';

const session = (date: string) => ({
	calendarVersion: 'alpaca-m0',
	sessionDate: date,
	opensAt: `${date}T13:30:00.000Z`,
});

test('Decision Cutoff is 09:20 ET on the captured session date', () => {
	expect(decisionCutoffAt('2026-08-31')).toBe('2026-08-31T09:20:00.000-04:00');
	expect(decisionCutoffAt('2026-11-02')).toBe('2026-11-02T09:20:00.000-05:00');
});

test('upcoming cutoff stays on the current session through 09:20 ET, then the next captured open', () => {
	const calendar = [session('2026-08-31'), session('2026-09-01'), session('2026-09-02')];
	expect(upcomingCutoff(calendar, Date.parse('2026-08-31T13:19:59.000Z'))?.sessionDate).toBe('2026-08-31');
	expect(upcomingCutoff(calendar, Date.parse('2026-08-31T13:20:00.000Z'))?.sessionDate).toBe('2026-08-31');
	expect(upcomingCutoff(calendar, Date.parse('2026-08-31T13:20:00.001Z'))?.sessionDate).toBe('2026-09-01');
	expect(upcomingCutoff(calendar, Date.parse('2026-09-03T13:20:00.000Z'))).toBeUndefined();
});

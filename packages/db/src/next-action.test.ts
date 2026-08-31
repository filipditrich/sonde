import { expect, test } from 'bun:test';

import { cockpitNextAction } from './next-action';

const cutoff = {
	sessionDate: '2026-09-01',
	calendarVersion: 'alpaca-m0',
	decisionWindowOpen: '2026-09-01T13:30:00.000Z',
	deadline: '2026-09-01T09:20:00.000-04:00',
};

test('next action is unavailable when the captured calendar has no remaining cutoff', () => {
	expect(cockpitNextAction(undefined, {}).kind).toBe('unavailable');
});

test('Decision Cutoff prerequisites are ready only when calendar and SIP last finished ok', () => {
	const action = cockpitNextAction(cutoff, { calendar: 'ok', sip: 'ok' });
	expect(action).toMatchObject({
		kind: 'decision-cutoff',
		sessionDate: '2026-09-01',
		prerequisites: [
			{ name: 'calendar-refresh', ready: true, detail: 'ok' },
			{ name: 'sip-daily-bars', ready: true, detail: 'ok' },
		],
	});
	const blocked = cockpitNextAction(cutoff, { calendar: 'ok' });
	expect(blocked.kind === 'decision-cutoff' && blocked.prerequisites[1]?.ready).toBe(false);
	expect(blocked.kind === 'decision-cutoff' && blocked.prerequisites[1]?.detail).toBe('unseen');
});

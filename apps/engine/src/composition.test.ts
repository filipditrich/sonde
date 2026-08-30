import { expect, test } from 'bun:test';

import { startEngine } from './composition';

test('registers live, reconcile, calendar, and SIP jobs', () => {
	const calls: string[] = [];
	const scheduler = {
		run: async (job: { name: string }) => {
			calls.push(job.name);
		},
	} as never;
	const handles: unknown[] = [];
	const runtime = startEngine(
		scheduler,
		{
			edgarLive: { name: 'edgar-live', lane: 'ordinary', run: async () => ({ outcome: 'ok' }) },
			edgarReconcile: { name: 'edgar-reconcile', lane: 'ordinary', run: async () => ({ outcome: 'ok' }) },
			calendarRefresh: { name: 'calendar-refresh', lane: 'ordinary', run: async () => ({ outcome: 'ok' }) },
			sipDailyBars: { name: 'sip-daily-bars', lane: 'ordinary', run: async () => ({ outcome: 'ok' }) },
		},
		{
			setInterval: ((callback: () => void) => {
				handles.push(callback);
				return handles.length as never;
			}) as never,
			clearInterval: (() => undefined) as never,
		},
	);
	expect(handles).toHaveLength(4);
	runtime.stop();
});

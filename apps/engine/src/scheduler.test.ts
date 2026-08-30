import { describe, expect, test } from 'bun:test';

import { Scheduler } from './scheduler';

describe('scheduler', () => {
	test('records a durable lifecycle around an injected ordinary job', async () => {
		const events: string[] = [];
		const scheduler = new Scheduler(
			{
				append: async (event) => {
					events.push(event.event);
				},
			},
			() => '2026-08-30T00:00:00.000Z',
		);
		await scheduler.run({ name: 'edgar-live', lane: 'ordinary', run: async () => ({ outcome: 'ok' }) });
		expect(events).toEqual(['started', 'finished']);
	});
});

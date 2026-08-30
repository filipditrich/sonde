import { describe, expect, test } from 'bun:test';

import type { CockpitSnapshot, CockpitStreamEvent } from '@sonde/core';

import { createCockpitServer } from './server';

const token = 'a-long-local-operator-token';
const app = createCockpitServer(
	{
		snapshot: async () =>
			({
				cursor: 2,
				asOf: '2026-08-30T00:00:00.000Z',
				funnel: { documents: 0, transactions: 0, qualifyingPurchases: 0 },
				facts: [],
				health: [],
			}) as unknown as CockpitSnapshot,
		eventsAfter: async (cursor) =>
			(cursor === 1
				? [{ cursor: 2, kind: 'job-run-event', artifactId: 'run', recordedAt: '2026-08-30T00:00:00.000Z' }]
				: []) as unknown as CockpitStreamEvent[],
	},
	token,
);
const authenticated = async () => {
	const response = await app.fetch(new Request('http://local/session', { method: 'POST', headers: { authorization: `Bearer ${token}` } }));
	return { cookie: response.headers.get('set-cookie')!.split(';')[0]! };
};

describe('cockpit server', () => {
	test('denies unauthenticated snapshots and has no write routes', async () => {
		expect((await app.fetch(new Request('http://local/api/snapshot'))).status).toBe(401);
		expect((await app.fetch(new Request('http://local/api/snapshot', { method: 'POST', headers: await authenticated() }))).status).toBe(404);
	});
	test('returns authoritative snapshot and resumes SSE from Last-Event-ID', async () => {
		const headers = await authenticated();
		const snapshot = await app.fetch(new Request('http://local/api/snapshot', { headers }));
		expect(((await snapshot.json()) as { funnel: { documents: number } }).funnel.documents).toBe(0);
		const controller = new AbortController();
		const stream = await app.fetch(
			new Request('http://local/api/events', { headers: { ...headers, 'last-event-id': '1' }, signal: controller.signal }),
		);
		const chunk = await stream.body!.getReader().read();
		controller.abort();
		expect(new TextDecoder().decode(chunk.value)).toContain('id: 2');
	});
});

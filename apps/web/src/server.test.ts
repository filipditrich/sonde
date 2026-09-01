import { describe, expect, test } from 'bun:test';

import type { CockpitSnapshot, CockpitStreamEvent } from '@sonde/core';

import { formatClock, formatRemaining, formatTminus } from './html';
import { cursorGap, nextSeenCursor } from './live';
import { forgetPaneSize, parsePaneSizes, recordPaneSize } from './panes';
import { parseCockpitPath } from './paths';
import { createCockpitServer, type CockpitReader } from './server';

const token = 'a-long-local-operator-token';
const snapshot = {
	cursor: 2,
	asOf: '2026-08-30T00:00:00.000Z',
	funnel: { documents: 0, transactions: 0, qualifyingPurchases: 0, distinctOwnerCandidates: 0, liquidSignals: 0 },
	nextAction: {
		kind: 'decision-cutoff',
		sessionDate: '2026-09-01',
		deadline: '2026-09-01T09:20:00.000-04:00',
		calendarVersion: 'alpaca-m0',
		decisionWindowOpen: '2026-09-01T13:30:00.000Z',
		prerequisites: [
			{ name: 'calendar-refresh', ready: true, detail: 'ok' },
			{ name: 'sip-daily-bars', ready: true, detail: 'ok' },
		],
	},
	engine: { freshness: 'stale', lastBeatAt: '2026-08-30T00:00:00.000Z' },
	facts: [],
	health: [{ job: 'edgar-live', lastEventAt: '2026-08-30T00:00:00.000Z', freshness: 'quiet' }],
	tape: [
		{
			kind: 'signal',
			artifactId: '0199a1f0-0000-7000-8000-000000000034',
			recordedAt: '2026-08-30T00:00:00.000Z',
			summary: '0001702750 long',
			causes: [
				{
					factId: 'fact',
					reportingOwnerCik: '0001739310',
					reportingOwnerName: 'Owner',
					transactionCode: 'P',
					shares: '10',
					pricePerShare: '1',
				},
			],
		},
	],
} as unknown as CockpitSnapshot;

const reader = {
	snapshot: async () => snapshot,
	eventsAfter: async (cursor: number) =>
		(cursor === 1
			? [{ cursor: 2, kind: 'job-run-event', artifactId: 'run', recordedAt: '2026-08-30T00:00:00.000Z' }]
			: []) as unknown as CockpitStreamEvent[],
	candidate: async () => undefined,
	signal: async (id: string) =>
		id === '0199a1f0-0000-7000-8000-000000000034'
			? ({
					id,
					issuerCik: '0001702750',
					issuerName: 'Issuer',
					ticker: 'ISS',
					listingId: 'listing',
					direction: 'long',
					entryConvention: 'regular-session-open',
					decisionWindowOpen: '2026-08-31T13:30:00.000Z',
					horizonCloseAt: '2026-09-29T20:00:00.000Z',
					rationale: 'two owners in a liquid name',
					sourceIds: ['fact'],
					bootstrapPrior: { label: 'multi-insider-liquid', distinctOwnerCount: 2 },
					sources: [
						{
							factId: 'fact',
							reportingOwnerCik: '0001739310',
							reportingOwnerName: 'Owner',
							transactionCode: 'P',
							shares: '10',
							pricePerShare: '1',
							observedAt: '2026-08-30T00:00:00.000Z',
						},
					],
					inputRefs: [{ kind: 'eligibility-decision', id: 'elig', role: 'eligible-cutoff' }],
					recordedAt: '2026-08-30T00:00:00.000Z',
					observedAt: '2026-08-30T00:00:00.000Z',
				} as const)
			: undefined,
	eligibility: async () => undefined,
	packet: async () => undefined,
	document: async (id: string) =>
		id === 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
			? {
					sha256: id,
					mediaType: 'application/xml',
					byteSize: 12,
					recordedAt: '2026-08-30T00:00:00.000Z',
					facts: [{ factId: 'fact', summary: 'Issuer P 10 @ 1', href: '/facts/fact' }],
					preview: { text: '<ownershipDocument>hi</ownershipDocument>', truncated: false },
				}
			: undefined,
	fact: async (id: string) =>
		id === 'fact'
			? {
					id,
					documentSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
					accession: '0001702750-26-000001',
					issuerCik: '0001702750',
					issuerName: 'Issuer',
					reportingOwnerCik: '0001739310',
					reportingOwnerName: 'Owner',
					transactionCode: 'P',
					acquiredDisposed: 'A',
					shares: '10',
					pricePerShare: '1',
					transactionDate: '2026-08-29',
					observedAt: '2026-08-30T00:00:00.000Z',
					recordedAt: '2026-08-30T00:00:00.000Z',
				}
			: undefined,
	funnelStage: async () => ({ stage: 'documents' as const, count: 0, rows: [] }),
} as unknown as CockpitReader;

const app = createCockpitServer(reader, token);
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
		const body = await (await app.fetch(new Request('http://local/api/snapshot', { headers }))).json();
		expect((body as { funnel: { documents: number } }).funnel.documents).toBe(0);
		const controller = new AbortController();
		const stream = await app.fetch(
			new Request('http://local/api/events', { headers: { ...headers, 'last-event-id': '1' }, signal: controller.signal }),
		);
		const chunk = await stream.body!.getReader().read();
		controller.abort();
		const payload = new TextDecoder().decode(chunk.value);
		expect(payload).toContain('id: 2');
		expect(payload).toContain('data:');
		expect(payload).not.toContain('event: artifact');
		const page = await app.fetch(new Request('http://local/', { headers }));
		const html = await page.text();
		expect(html).toContain('quiet');
		expect(html).toContain('>Tape</h2>');
		expect(html).toContain('0001702750 long');
		expect(html).toContain('Owner');
		expect(html).toContain('10 @ 1');
		expect(html).toContain('/signals/0199a1f0-0000-7000-8000-000000000034');
		expect(html).toContain('/facts/fact');
		expect(html).toContain('Decision Cutoff');
		expect(html).toContain('not built in this milestone');
		expect(html).toContain('data-engine="stale"');
		expect(html).not.toContain('location.reload');
		expect(html).toContain('EventSource');
		expect(html).toContain('cursor=');
		expect(html).toContain('data-pane="tape"');
		expect(html).toContain('resize: both');
		expect(html).toContain('sonde-pane-sizes');
	});
	test('groups retained facts by issuer so a filing cluster is visible', async () => {
		const clustered = createCockpitServer(
			{
				...reader,
				snapshot: async () =>
					({
						...snapshot,
						funnel: { documents: 2, transactions: 2, qualifyingPurchases: 2, distinctOwnerCandidates: 0, liquidSignals: 0 },
						facts: [
							{
								id: 'f1',
								issuerCik: '0001702750',
								issuerName: 'Issuer',
								reportingOwnerName: 'Owner',
								transactionDate: '2026-08-29',
								transactionCode: 'P',
								shares: '10',
								pricePerShare: '1',
							},
							{
								id: 'f2',
								issuerCik: '0001702750',
								issuerName: 'Issuer',
								reportingOwnerName: 'Owner',
								transactionDate: '2026-08-29',
								transactionCode: 'P',
								shares: '20',
								pricePerShare: '2',
							},
						],
					}) as unknown as CockpitSnapshot,
			},
			token,
		);
		const session = await clustered.fetch(new Request('http://local/session', { method: 'POST', headers: { authorization: `Bearer ${token}` } }));
		const page = await clustered.fetch(new Request('http://local/', { headers: { cookie: session.headers.get('set-cookie')!.split(';')[0]! } }));
		const body = await page.text();
		expect(body).toContain('Issuer cluster 2');
		expect(body).toContain('10 @ 1');
		expect(body).toContain('20 @ 2');
	});
	test('Signal page shows rationale, labelled bootstrap prior, and causing filings', async () => {
		const headers = await authenticated();
		const page = await app.fetch(new Request('http://local/signals/0199a1f0-0000-7000-8000-000000000034', { headers }));
		const body = await page.text();
		expect(body).toContain('two owners in a liquid name');
		expect(body).toContain('multi-insider-liquid');
		expect(body).toContain('not event confidence');
		expect(body).toContain('Owner');
		expect(body).toContain('10 @ 1');
		expect(body).toContain('not built in this milestone');
		expect(body).toContain('/eligibility/elig');
	});
	test('Source Document page lists parsed facts and does not dump bytes', async () => {
		const headers = await authenticated();
		const page = await app.fetch(new Request('http://local/documents/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', { headers }));
		const body = await page.text();
		expect(body).toContain('Source Document');
		expect(body).toContain('application/xml');
		expect(body).toContain('/facts/fact');
		expect(body).toContain('&lt;ownershipDocument&gt;hi&lt;/ownershipDocument&gt;');
		expect(body).not.toContain('<ownershipDocument>');
		expect(body).not.toContain('<xml');
	});
	test('Source Fact page reaches the Source Document without dumping bytes', async () => {
		const headers = await authenticated();
		const page = await app.fetch(new Request('http://local/facts/fact', { headers }));
		const body = await page.text();
		expect(body).toContain('Source Fact');
		expect(body).toContain('Owner');
		expect(body).toContain('/documents/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
		expect(body).toContain('open retained bytes');
		expect(body).not.toContain('<xml');
	});
});

test('parses cockpit paths without treating later milestones as real routes', () => {
	expect(parseCockpitPath('/')).toEqual({ kind: 'home' });
	expect(parseCockpitPath('/funnel/liquid-signals')).toEqual({ kind: 'funnel', stage: 'liquid-signals' });
	expect(parseCockpitPath('/funnel/orders').kind).toBe('unknown');
	expect(parseCockpitPath('/documents/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toEqual({
		kind: 'documents',
		id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
	});
	expect(parseCockpitPath('/facts/fact')).toEqual({ kind: 'facts', id: 'fact' });
	expect(parseCockpitPath('/signals/0199a1f0-0000-7000-8000-000000000034')).toEqual({
		kind: 'signals',
		id: '0199a1f0-0000-7000-8000-000000000034',
	});
});

test('remaining time is due at or after the deadline', () => {
	expect(formatRemaining(0)).toBe('due');
	expect(formatRemaining(-1)).toBe('due');
	expect(formatRemaining(90 * 60_000)).toBe('1h 30m');
});

test('SSE cursor gaps are skipped ids, not the first event after connect', () => {
	expect(cursorGap(0, 12)).toBe(false);
	expect(cursorGap(2, 3)).toBe(false);
	expect(cursorGap(2, 4)).toBe(true);
	let seen = 311;
	for (const next of [312, 313, 314]) {
		expect(cursorGap(seen, next)).toBe(false);
		seen = nextSeenCursor(seen, next);
	}
	expect(cursorGap(seen, 316)).toBe(true);
});

test('t-minus uses a compact scheduler stamp', () => {
	expect(formatTminus(0)).toBe('due');
	expect(formatTminus(90 * 60_000)).toBe('T-01:30');
});

test('chrome clock is Eastern and compact', () => {
	expect(formatClock('2026-08-31T18:24:00.000Z')).toBe('ET Mon 31 Aug 14:24:00');
});

test('pane sizes persist as a plain map', () => {
	expect(parsePaneSizes(null)).toEqual({});
	expect(parsePaneSizes('nope')).toEqual({});
	expect(parsePaneSizes('{"tape":{"w":"400px","h":"200px"}}')).toEqual({ tape: { w: '400px', h: '200px' } });
	expect(recordPaneSize({}, 'facts', '320px', '180px')).toEqual({ facts: { w: '320px', h: '180px' } });
	expect(forgetPaneSize({ tape: { w: '1px', h: '1px' } }, 'tape')).toEqual({});
});

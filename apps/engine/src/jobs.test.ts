import { describe, expect, test } from 'bun:test';

import type { FetchResult, PoliteFetcher } from '@sonde/probes';

import { ingestEdgarPoll, ingestEdgarReconciliation, previousEasternDate, type EvidenceWriter } from './jobs';

const listing = await Bun.file(new URL('../../../packages/probes/src/edgar/__fixtures__/index.json', import.meta.url)).text();
const form = await Bun.file(new URL('../../../packages/probes/src/edgar/__fixtures__/form4-single-purchase.xml', import.meta.url)).text();
const master = await Bun.file(new URL('../../../packages/probes/src/edgar/__fixtures__/master.20260820.idx', import.meta.url)).text();
const submission = await Bun.file(new URL('../../../packages/probes/src/edgar/__fixtures__/0001739310-26-000004.txt', import.meta.url)).text();
const requestedAt = '2026-08-30T00:00:00.000Z';
const completedAt = '2026-08-30T00:00:01.000Z';
const ok = (body: string): Extract<FetchResult, { status: 'ok' }> => ({
	status: 'ok',
	body,
	bytes: new TextEncoder().encode(body),
	validators: {},
	httpStatus: 200,
	requestedAt,
	completedAt,
});
const singleEntryFeed = (directoryUrl: string) => `<?xml version="1.0"?><feed><entry>
<id>urn:tag:sec.gov,2008:accession-number=0001739310-26-000004</id>
<link href="${directoryUrl}0001739310-26-000004-index.htm"/>
<updated>2026-08-20T12:00:00.000Z</updated><category term="4"/>
</entry></feed>`;

const writerWith = (sequence: string[], store: Record<string, object> = {}): EvidenceWriter => ({
	persistFetch: async ({ resource, result }) => {
		sequence.push(`attempt:${result.status}:${resource}`);
		return { attemptId: crypto.randomUUID(), ...(result.status === 'ok' ? { documentSha256: 'a'.repeat(64) } : {}) };
	},
	commitParse: async ({ facts }) => {
		sequence.push('parse');
		sequence.push(`facts:${facts[0]?.transactionCode}`);
		return crypto.randomUUID();
	},
	loadCheckpoint: async (key) => store[key] as never,
	saveCheckpoint: async (key, value) => {
		store[key] = value;
	},
});

describe('EDGAR jobs', () => {
	test('persists feed, index, and XML exactly once before parsing the XML bytes', async () => {
		const sequence: string[] = [];
		const directoryUrl = 'https://www.sec.gov/Archives/edgar/data/1739310/000173931026000004/';
		const fetcher = {
			get: async (url: string) =>
				ok(
					url.includes('getcurrent')
						? singleEntryFeed(directoryUrl)
						: url.endsWith('index.json')
							? listing
							: form.replace('<transactionCode>P</transactionCode>', '<transactionCode>S</transactionCode>'),
				),
		} as unknown as PoliteFetcher;

		const result = await ingestEdgarPoll(fetcher, writerWith(sequence));

		const attempts = sequence.filter((entry) => entry.startsWith('attempt:'));
		expect(attempts).toHaveLength(3);
		expect(attempts.filter((entry) => entry.includes('getcurrent'))).toHaveLength(1);
		expect(attempts.filter((entry) => entry.endsWith('index.json'))).toHaveLength(1);
		expect(attempts.filter((entry) => entry.includes('.xml'))).toHaveLength(1);
		expect(sequence.indexOf('parse')).toBeGreaterThan(sequence.findIndex((entry) => entry.includes('.xml')));
		expect(sequence).toContain('facts:S');
		expect(result).toEqual({ documents: 1, facts: 1, gapDetected: false });
	});

	test('persists unchanged and failed feed requests without documents', async () => {
		const sequence: string[] = [];
		const unchanged: Extract<FetchResult, { status: 'unchanged' }> = {
			status: 'unchanged',
			httpStatus: 304,
			requestedAt,
			completedAt,
			validators: {},
		};
		const failed: Extract<FetchResult, { status: 'failed' }> = {
			status: 'failed',
			requestedAt,
			completedAt,
			failure: { code: 'network-error', detail: 'offline' },
		};
		await ingestEdgarPoll({ get: async () => unchanged } as unknown as PoliteFetcher, writerWith(sequence));
		await ingestEdgarPoll({ get: async () => failed } as unknown as PoliteFetcher, writerWith(sequence));

		expect(sequence.filter((entry) => entry.startsWith('attempt:unchanged:'))).toHaveLength(1);
		expect(sequence.filter((entry) => entry.startsWith('attempt:failed:'))).toHaveLength(1);
		expect(sequence).not.toContain('parse');
	});

	test('reconciles a daily master index through the same captured acquisition and parse flow', async () => {
		const sequence: string[] = [];
		const fetcher = {
			get: async (url: string) => ok(url.endsWith('.idx') ? master : url.endsWith('.txt') ? submission : url.endsWith('index.json') ? listing : form),
		} as unknown as PoliteFetcher;

		const result = await ingestEdgarReconciliation(fetcher, '2026-08-20', writerWith(sequence));

		expect(sequence.filter((entry) => entry.startsWith('attempt:'))).toHaveLength(4);
		expect(sequence.some((entry) => entry.includes('master.20260820.idx'))).toBe(true);
		expect(sequence).toContain('facts:P');
		expect(sequence.indexOf('parse')).toBeGreaterThan(sequence.findIndex((entry) => entry.includes('.xml')));
		expect(result).toEqual({ documents: 1, facts: 1 });
	});
	test('live poll remembers seen accessions so a restart does not refetch XML', async () => {
		const urls: string[] = [];
		const directoryUrl = 'https://www.sec.gov/Archives/edgar/data/1739310/000173931026000004/';
		const fetcher = {
			get: async (url: string) => {
				urls.push(url);
				return ok(url.includes('getcurrent') ? singleEntryFeed(directoryUrl) : url.endsWith('index.json') ? listing : form);
			},
		} as unknown as PoliteFetcher;
		const store: Record<string, object> = {};
		const writer = writerWith([], store);
		expect(await ingestEdgarPoll(fetcher, writer)).toMatchObject({ documents: 1 });
		urls.length = 0;
		expect(await ingestEdgarPoll(fetcher, writer)).toEqual({ documents: 0, facts: 0, gapDetected: false });
		expect(urls.filter((url) => url.includes('.xml'))).toHaveLength(0);
	});
});

test('previous Eastern date is the session before the current New York civil date', () => {
	expect(previousEasternDate(new Date('2026-08-21T08:00:00.000Z'))).toBe('2026-08-20');
});

import { describe, expect, test } from 'bun:test';

import type { PoliteFetcher } from '../fetch';
import { emptyState, pollOnce } from './probe';

const atom = await Bun.file(new URL('./__fixtures__/getcurrent.atom.xml', import.meta.url)).text();
const indexJson = await Bun.file(new URL('./__fixtures__/index.json', import.meta.url)).text();
const form4 = await Bun.file(new URL('./__fixtures__/form4-single-purchase.xml', import.meta.url)).text();
const ok = (body: string) => ({
	status: 'ok' as const,
	body,
	bytes: new TextEncoder().encode(body),
	validators: {},
	httpStatus: 200,
	completedAt: '2026-08-30T00:00:00.000Z',
});

describe('EDGAR probe', () => {
	test('acquires every listed Form 4 document without purchase filtering', async () => {
		const fetcher = {
			get: async (url: string) => ok(url.includes('getcurrent') ? atom : url.endsWith('index.json') ? indexJson : form4),
		} as unknown as PoliteFetcher;
		const result = await pollOnce(fetcher, emptyState());
		expect(result.documents.length).toBeGreaterThan(0);
	});
	test('does not fetch documents when the feed is unchanged', async () => {
		const fetcher = {
			get: async () => ({ status: 'unchanged' as const, httpStatus: 304 as const, completedAt: '2026-08-30T00:00:00.000Z', validators: {} }),
		} as unknown as PoliteFetcher;
		expect((await pollOnce(fetcher)).documents).toHaveLength(0);
	});
});

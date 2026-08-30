import { expect, test } from 'bun:test';

import type { FetchResult, PoliteFetcher } from '../fetch';
import { dailyMasterIndexUrl, parseDailyForm4, parseSecAcceptanceDatetime, reconcileDaily } from './reconcile';

const master = await Bun.file(new URL('./__fixtures__/master.20260820.idx', import.meta.url)).text();
const listing = await Bun.file(new URL('./__fixtures__/index.json', import.meta.url)).text();
const form = await Bun.file(new URL('./__fixtures__/form4-single-purchase.xml', import.meta.url)).text();
const submission = await Bun.file(new URL('./__fixtures__/0001739310-26-000004.txt', import.meta.url)).text();
const ok = (body: string): Extract<FetchResult, { status: 'ok' }> => ({
	status: 'ok',
	body,
	bytes: new TextEncoder().encode(body),
	validators: {},
	httpStatus: 200,
	requestedAt: '2026-08-20T00:00:00.000Z',
	completedAt: '2026-08-20T00:00:01.000Z',
});

test('selects Form 4 daily-index lines and derives SEC archive directories', () => {
	expect(parseDailyForm4(master)).toHaveLength(1);
	expect(dailyMasterIndexUrl('2026-08-20')).toContain('/2026/QTR3/master.20260820.idx');
	expect(parseSecAcceptanceDatetime(submission)).toBe('2026-08-20T13:15:35-04:00');
});

test('captures master, directory index, and Form 4 XML once for daily reconciliation', async () => {
	const captured: string[] = [];
	const fetcher = {
		get: async (url: string) => ok(url.endsWith('.idx') ? master : url.endsWith('.txt') ? submission : url.endsWith('index.json') ? listing : form),
	} as unknown as PoliteFetcher;

	const documents = await reconcileDaily(fetcher, '2026-08-20', async (resource) => {
		captured.push(resource);
	});

	expect(documents).toHaveLength(1);
	expect(captured).toHaveLength(4);
	expect(captured.filter((url) => url.endsWith('.idx'))).toHaveLength(1);
	expect(captured.filter((url) => url.endsWith('.txt'))).toHaveLength(1);
	expect(captured.filter((url) => url.endsWith('index.json'))).toHaveLength(1);
	expect(captured.filter((url) => url.endsWith('.xml'))).toHaveLength(1);
});

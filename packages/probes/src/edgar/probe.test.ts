import { describe, expect, test } from 'bun:test';

import { AssetId, ObservedAt } from '@sonde/core';

import type { PoliteFetcher } from '../fetch';
import { emptyState, pollOnce } from './probe';

const atom = await Bun.file(new URL('./__fixtures__/getcurrent.atom.xml', import.meta.url)).text();
const indexJson = await Bun.file(new URL('./__fixtures__/index.json', import.meta.url)).text();
const form4 = await Bun.file(new URL('./__fixtures__/form4-single-purchase.xml', import.meta.url)).text();

/** Serves the saved fixtures by URL shape, and records what was asked for. */
const stubFetcher = (overrides: Record<string, string> = {}) => {
	const calls: string[] = [];
	const fetcher = {
		get: async (url: string) => {
			calls.push(url);
			for (const [needle, body] of Object.entries(overrides)) {
				if (url.includes(needle)) return { status: 'ok' as const, body, validators: {} };
			}
			if (url.includes('getcurrent')) return { status: 'ok' as const, body: atom, validators: {} };
			if (url.endsWith('index.json')) return { status: 'ok' as const, body: indexJson, validators: {} };
			return { status: 'ok' as const, body: form4, validators: {} };
		},
	} as unknown as PoliteFetcher;
	return { fetcher, calls };
};

const at = () => new Date('2026-08-28T12:00:00Z');

describe('pollOnce', () => {
	test('emits an observation per filing carrying an open-market purchase', async () => {
		const { fetcher } = stubFetcher();
		const { observations } = await pollOnce(fetcher, emptyState(), at);

		expect(observations.length).toBeGreaterThan(0);
		const [o] = observations;
		expect(o?.probe).toBe('sec-edgar-form4');
		expect(o?.trustClass).toBe('official');
		expect(o?.assets).toEqual([AssetId.parse('equity:BY')]);
	});

	test('occurredAt is the EDGAR publish time, not the trade date', async () => {
		const { fetcher } = stubFetcher();
		const [o] = (await pollOnce(fetcher, emptyState(), at)).observations;

		// the fixture's transaction happened on 2026-08-19; disclosure is the event
		expect(o?.form4.transactions[0]?.date).toBe('2026-08-19');
		expect(o?.occurredAt.slice(0, 10)).not.toBe('2026-08-19');
		expect(o?.observedAt).toBe(ObservedAt.parse('2026-08-28T12:00:00.000Z'));
	});

	test('hashes the raw document so the trail back to the bytes cannot break', async () => {
		const { fetcher } = stubFetcher();
		const [o] = (await pollOnce(fetcher, emptyState(), at)).observations;
		expect(o?.rawDocumentSha256).toMatch(/^[0-9a-f]{64}$/);
	});

	test('gives two filings on one issuer and date the same cluster id', async () => {
		const { fetcher } = stubFetcher();
		const { observations } = await pollOnce(fetcher, emptyState(), at);
		const ids = new Set(observations.map((o) => o.eventClusterId));
		// every fixture filing resolves to the same issuer document, so one cluster
		expect(ids.size).toBe(1);
		expect([...ids][0]).toMatch(/^[0-9a-f]{64}$/);
	});

	test('does not re-emit filings already seen — the feed relists on every poll', async () => {
		const { fetcher } = stubFetcher();
		const first = await pollOnce(fetcher, emptyState(), at);
		const second = await pollOnce(fetcher, first.state, at);

		expect(first.observations.length).toBeGreaterThan(0);
		expect(second.observations).toHaveLength(0);
	});

	test('skips filings with no open-market purchase and counts them for health', async () => {
		const grant = form4.replace('<transactionCode>P</transactionCode>', '<transactionCode>A</transactionCode>');
		const { fetcher } = stubFetcher({ '.xml': grant });
		const { observations, skipped } = await pollOnce(fetcher, emptyState(), at);

		expect(observations).toHaveLength(0);
		expect(skipped).toBeGreaterThan(0);
	});

	test('does no document fetches at all when the feed is unchanged', async () => {
		const calls: string[] = [];
		const fetcher = {
			get: async (url: string) => {
				calls.push(url);
				return { status: 'unchanged' as const };
			},
		} as unknown as PoliteFetcher;

		const { observations } = await pollOnce(fetcher, emptyState(), at);
		expect(observations).toHaveLength(0);
		expect(calls).toHaveLength(1);
	});
});

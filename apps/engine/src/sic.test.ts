import { expect, test } from 'bun:test';

import type { FetchResult, PoliteFetcher } from '@sonde/probes';

import { ingestIssuerSic, type SicWriter } from './sic';

const apple = await Bun.file(new URL('../../../packages/probes/src/edgar/__fixtures__/submissions-apple.json', import.meta.url)).text();
const at = '2026-08-31T15:00:00.000Z';
const ok = (body: string): Extract<FetchResult, { status: 'ok' }> => ({
	status: 'ok',
	body,
	bytes: new TextEncoder().encode(body),
	validators: {},
	httpStatus: 200,
	requestedAt: at,
	completedAt: at,
});

test('classifies a missing issuer from submissions JSON and is a no-op when none are missing', async () => {
	const stored: { sic?: string; resources: string[] } = { resources: [] };
	const writer: SicWriter = {
		persistFetch: async ({ resource, result }) => {
			stored.resources.push(resource);
			return { attemptId: crypto.randomUUID(), ...(result.status === 'ok' ? { documentSha256: 'a'.repeat(64) } : {}) };
		},
		listIssuersMissingSic: async () => [{ id: '0199a1f0-0000-7000-8000-000000000005', cik: '0000320193' }],
		appendIssuerSic: async (classification) => {
			stored.sic = classification.sicMajorGroup;
		},
	};
	const fetcher = { get: async () => ok(apple) } as unknown as PoliteFetcher;
	expect(await ingestIssuerSic(fetcher, writer, () => new Date(at))).toEqual({ classified: 1, missing: 0 });
	expect(stored.sic).toBe('35');
	expect(stored.resources[0]).toContain('CIK0000320193.json');
	writer.listIssuersMissingSic = async () => [];
	expect(await ingestIssuerSic(fetcher, writer, () => new Date(at))).toEqual({ classified: 0, missing: 0 });
});

import { describe, expect, test } from 'bun:test';

import { Observation } from './observation';
import { CLOCK_SKEW_TOLERANCE_MS } from './primitives';

const at = (offsetMs: number): string => new Date(Date.parse('2026-08-27T10:00:00Z') + offsetMs).toISOString();

const base = {
	id: '0199a1f0-0000-7000-8000-000000000001',
	probe: 'gdelt',
	trustClass: 'editorial' as const,
	rawDocumentSha256: 'a'.repeat(64),
	sourceUrl: 'https://example.com/article',
	eventClusterId: '0199a1f0-0000-7000-8000-000000000002',
	outlets: ['reuters.com'],
	title: 'Something happened',
	assets: ['crypto:BTC'],
	observedAt: at(0),
	occurredAt: at(-60_000),
};

describe('Observation', () => {
	test('accepts an event observed after it occurred', () => {
		expect(Observation.safeParse(base).success).toBe(true);
	});

	test('tolerates small publisher clock skew', () => {
		const skewed = { ...base, occurredAt: at(CLOCK_SKEW_TOLERANCE_MS - 1_000) };
		expect(Observation.safeParse(skewed).success).toBe(true);
	});

	test('rejects an event that claims to have occurred well after we saw it', () => {
		const impossible = { ...base, occurredAt: at(CLOCK_SKEW_TOLERANCE_MS + 60_000) };
		const result = Observation.safeParse(impossible);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toEqual(['occurredAt']);
		}
	});

	test('requires at least one outlet so cluster size is always meaningful', () => {
		expect(Observation.safeParse({ ...base, outlets: [] }).success).toBe(false);
	});

	test('requires provenance back to an immutable raw payload', () => {
		const { rawDocumentSha256: _dropped, ...withoutHash } = base;
		expect(Observation.safeParse(withoutHash).success).toBe(false);
	});

	test('accepts adversarial sources — they are tagged, not excluded', () => {
		const social = { ...base, probe: 'bluesky', trustClass: 'adversarial' as const, outlets: ['bsky.app'] };
		expect(Observation.safeParse(social).success).toBe(true);
	});
});

import { describe, expect, test } from 'bun:test';

import { Signal } from './signal';

const base = {
	id: '0199a1f0-0000-7000-8000-000000000010',
	asset: 'crypto:BTC',
	direction: 'short' as const,
	confidence: 0.62,
	horizon: 'PT4H',
	rationale: 'Unlock schedule was accelerated by three weeks, adding sell pressure.',
	sourceIds: ['0199a1f0-0000-7000-8000-000000000001'],
	analyst: { tier: 'deep', model: 'claude-opus-5', promptVersion: 'v3' },
	createdAt: '2026-08-27T10:00:00Z',
};

describe('Signal', () => {
	test('accepts a well-formed signal', () => {
		expect(Signal.safeParse(base).success).toBe(true);
	});

	test('rejects a signal that cannot name its sources — ADR 0008', () => {
		const result = Signal.safeParse({ ...base, sourceIds: [] });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toEqual(['sourceIds']);
		}
	});

	test('rejects a rationale too short to be one', () => {
		expect(Signal.safeParse({ ...base, rationale: 'bearish' }).success).toBe(false);
	});

	test('requires an analyst version so the scoreboard can attribute it', () => {
		const { analyst: _dropped, ...withoutAnalyst } = base;
		expect(Signal.safeParse(withoutAnalyst).success).toBe(false);
	});

	test('treats flat as a real direction', () => {
		expect(Signal.safeParse({ ...base, direction: 'flat' }).success).toBe(true);
	});

	test('revises by superseding, never by editing', () => {
		const revision = { ...base, id: '0199a1f0-0000-7000-8000-000000000011', supersedes: base.id };
		expect(Signal.safeParse(revision).success).toBe(true);
	});
});

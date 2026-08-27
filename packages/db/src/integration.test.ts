import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import type { ObservedAt } from '@sonde/core';

import { createDatabase, type Database } from './client';
import { asAnalystSaw } from './point-in-time';
import { candles, observations, rawDocuments, signals } from './schema';

/**
 * Integration tests against a real Postgres. Skipped when DATABASE_URL is absent so a clone
 * without Docker still passes `bun test`.
 *
 *   docker compose up -d
 *   DATABASE_URL=postgres://sonde:sonde@localhost:5432/sonde bun test
 */
const url = process.env.DATABASE_URL;
const suite = url ? describe : describe.skip;

const iso = (offsetMs: number) => new Date(Date.parse('2026-08-27T10:00:00Z') + offsetMs);
const hash = (seed: string) => seed.repeat(64).slice(0, 64);

/**
 * Drizzle's `execute` returns a lazy thenable rather than a real Promise, so the `rejects`
 * matcher does not engage; it also wraps driver errors, putting the Postgres message on
 * `cause`. Both are worked around here rather than in the assertion, so a trigger silently
 * ceasing to fire — the regression this file exists to catch — fails loudly and readably.
 */
const messageChain = (error: unknown): string => {
	const parts: string[] = [];
	let current: unknown = error;
	while (current instanceof Error) {
		parts.push(current.message);
		current = current.cause;
	}
	return parts.join(' | ') || String(error);
};

const expectRejection = async (run: () => Promise<unknown>, pattern: RegExp) => {
	let message = '<no error thrown>';
	try {
		await run();
	} catch (error) {
		message = messageChain(error);
	}
	expect(message).toMatch(pattern);
};

suite('append-only enforcement', () => {
	let db: Database;

	beforeAll(async () => {
		db = createDatabase(url as string);
		await db.insert(rawDocuments).values({
			sha256: hash('a'),
			probe: 'test',
			byteSize: '12',
			content: 'hello world',
			fetchedAt: iso(0),
		});
	});

	afterAll(async () => {
		// Append-only tables refuse DELETE, so cleanup goes through TRUNCATE, which triggers
		// do not fire on. That asymmetry is intentional: wiping a table is a deliberate act.
		await db.execute('TRUNCATE signal_results, signals, observations, candles, raw_documents RESTART IDENTITY CASCADE');
	});

	test('rejects UPDATE on raw_documents', async () => {
		await expectRejection(() => db.execute(`UPDATE raw_documents SET content = 'tampered' WHERE sha256 = '${hash('a')}'`), /append-only/);
	});

	test('rejects DELETE on raw_documents', async () => {
		await expectRejection(() => db.execute(`DELETE FROM raw_documents WHERE sha256 = '${hash('a')}'`), /append-only/);
	});

	test('rejects UPDATE on signals', async () => {
		await db.insert(observations).values({
			id: '0199a1f0-0000-7000-8000-000000000001',
			probe: 'test',
			trustClass: 'editorial',
			rawDocumentSha256: hash('a'),
			eventClusterId: '0199a1f0-0000-7000-8000-0000000000c1',
			outlets: ['reuters.com'],
			assets: ['crypto:BTC'],
			observedAt: iso(0),
			occurredAt: iso(-60_000),
		});
		await db.insert(signals).values({
			id: '0199a1f0-0000-7000-8000-000000000010',
			asset: 'crypto:BTC',
			direction: 'short',
			confidence: '0.62',
			horizon: 'PT4H',
			rationale: 'Unlock schedule accelerated by three weeks, adding sell pressure.',
			sourceIds: ['0199a1f0-0000-7000-8000-000000000001'],
			analystTier: 'deep',
			analystModel: 'claude-opus-5',
			analystPromptVersion: 'v3',
			createdAt: iso(0),
		});

		await expectRejection(() => db.execute(`UPDATE signals SET confidence = '0.99'`), /append-only/);
	});
});

suite('point-in-time reads', () => {
	let db: Database;

	beforeAll(async () => {
		db = createDatabase(url as string);

		// A bar that CLOSED in 2019 but was only IMPORTED today. An analyst reasoning about
		// 2019 must not see it — filtering on occurred_at would wrongly return it.
		await db.insert(candles).values({
			asset: 'crypto:BTC',
			venue: 'kraken',
			interval: '1h',
			open: '3700',
			high: '3750',
			low: '3690',
			close: '3720',
			volume: '812.5',
			occurredAt: new Date('2019-01-15T00:00:00Z'),
			observedAt: iso(0),
			origin: 'backfill',
		});
	});

	afterAll(async () => {
		await db.execute('TRUNCATE candles');
	});

	test('hides rows that had not been observed yet, even when the bar had closed', async () => {
		const earlier = asAnalystSaw(db, iso(-60_000).toISOString() as ObservedAt);
		expect(await earlier.candles('crypto:BTC', '1h')).toHaveLength(0);
	});

	test('returns the row once observation time has passed', async () => {
		const later = asAnalystSaw(db, iso(60_000).toISOString() as ObservedAt);
		const rows = await later.candles('crypto:BTC', '1h');

		expect(rows).toHaveLength(1);
		expect(rows[0]?.close).toBe('3720');
	});
});

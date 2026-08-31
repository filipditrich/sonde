import { expect, test } from 'bun:test';

import { engineFreshnessOf, freshnessOf } from './cockpit-health';

const asOf = new Date('2026-08-30T00:20:00.000Z');

test('a live poll older than fifteen minutes is stale', () => {
	expect(freshnessOf({ job: 'edgar-live', lastEventAt: '2026-08-30T00:00:00.000Z', outcome: 'ok', meta: { documents: '3' }, asOf })).toBe('stale');
});

test('a recent zero-document poll is quiet, a recent producing poll is fresh', () => {
	expect(freshnessOf({ job: 'edgar-live', lastEventAt: '2026-08-30T00:16:00.000Z', outcome: 'ok', meta: { documents: '0' }, asOf })).toBe('quiet');
	expect(freshnessOf({ job: 'edgar-live', lastEventAt: '2026-08-30T00:16:00.000Z', outcome: 'ok', meta: { documents: '2' }, asOf })).toBe('fresh');
});

test('an engine heartbeat older than 45s is stale, not quiet', () => {
	expect(engineFreshnessOf(undefined, asOf)).toBe('unseen');
	expect(engineFreshnessOf('2026-08-30T00:19:50.000Z', asOf)).toBe('fresh');
	expect(engineFreshnessOf('2026-08-30T00:19:00.000Z', asOf)).toBe('stale');
});

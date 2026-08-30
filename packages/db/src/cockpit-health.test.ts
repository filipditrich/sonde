import { expect, test } from 'bun:test';

import { freshnessOf } from './cockpit-health';

const asOf = new Date('2026-08-30T00:20:00.000Z');

test('a live poll older than fifteen minutes is stale', () => {
	expect(freshnessOf({ job: 'edgar-live', lastEventAt: '2026-08-30T00:00:00.000Z', outcome: 'ok', meta: { documents: '3' }, asOf })).toBe('stale');
});

test('a recent zero-document poll is quiet, a recent producing poll is fresh', () => {
	expect(freshnessOf({ job: 'edgar-live', lastEventAt: '2026-08-30T00:16:00.000Z', outcome: 'ok', meta: { documents: '0' }, asOf })).toBe('quiet');
	expect(freshnessOf({ job: 'edgar-live', lastEventAt: '2026-08-30T00:16:00.000Z', outcome: 'ok', meta: { documents: '2' }, asOf })).toBe('fresh');
});

import { expect, test } from 'bun:test';

import type { CandidateSnapshot } from '@sonde/core';

import { closeDueCandidates, syncCandidateSnapshots, type StrategyWriter } from './strategy';

test('cutoff writes one Signal for two owners and is idempotent on a second pass', async () => {
	const stored: { snapshots: CandidateSnapshot[]; signals: number; keys: Set<string> } = { snapshots: [], signals: 0, keys: new Set() };
	const writer: StrategyWriter = {
		listStrategyFacts: async () => [],
		listMarketSessions: async () => [],
		listResolvedListings: async () => [],
		listSipBars: async () => [],
		appendCandidateSnapshot: async (snapshot) => {
			stored.snapshots.push(snapshot);
		},
		persistCutoff: async (result) => {
			stored.keys.add(`${result.eligibility.issuerCik}:${new Date(result.eligibility.decisionWindowOpen).toISOString()}`);
			if (result.signal) stored.signals += 1;
		},
		listLatestCandidateSnapshots: async () => stored.snapshots,
		eligibilityKeys: async () => stored.keys,
		hasDueCandidates: async () =>
			stored.snapshots.some((snapshot) => !stored.keys.has(`${snapshot.issuerCik}:${new Date(snapshot.decisionWindowOpen).toISOString()}`)),
	};
	expect(await syncCandidateSnapshots(writer, '2026-08-31T12:00:00.000Z')).toBe(0);
	expect(await closeDueCandidates(writer, new Date('2026-08-31T13:20:00.000Z'))).toEqual({ signals: 0, decisions: 0 });
	expect(stored.signals).toBe(0);
});

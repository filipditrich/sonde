import { expect, test } from 'bun:test';

import { CandidateSnapshot, STRATEGY_VERSION, candidateSnapshotIdFrom } from '@sonde/core';

import { closeDueCandidates, syncCandidateSnapshots, type StrategyWriter } from './strategy';

const factA = '0f6275f4-3b0a-58f3-9da8-b0973a025b76';
const factB = '1f6275f4-3b0a-58f3-9da8-b0973a025b77';
const open = '2026-08-31T13:30:00.000Z';
const cutoff = '2026-08-31T13:20:00.000Z';
const recorded = '2026-08-31T12:07:52.778Z';

const snapshotOf = (qualifyingFactIds: string[], owners: string[]) =>
	CandidateSnapshot.parse({
		id: candidateSnapshotIdFrom({ strategyVersion: STRATEGY_VERSION, issuerCik: '0001702750', decisionWindowOpen: open, qualifyingFactIds }),
		kind: 'candidate-snapshot',
		schemaVersion: 'm1',
		recordedAt: recorded,
		inputRefs: qualifyingFactIds.map((id) => ({ kind: 'form4-transaction-fact', id, role: 'qualifying-purchase' })),
		strategyVersion: STRATEGY_VERSION,
		issuerCik: '0001702750',
		decisionWindowOpen: open,
		cutoffAt: cutoff,
		qualifyingFactIds,
		reportingOwnerCiks: owners,
		observedAt: recorded,
	});

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

test('cutoff closes the richest same-window snapshot once', async () => {
	const poor = snapshotOf([factA], ['0000000001']);
	const rich = snapshotOf([factA, factB], ['0000000001', '0000000002']);
	const stored: { snapshots: CandidateSnapshot[]; closed?: string; keys: Set<string> } = { snapshots: [poor, rich], keys: new Set() };
	const writer: StrategyWriter = {
		listStrategyFacts: async () => [],
		listMarketSessions: async () => [],
		listResolvedListings: async () => [],
		listSipBars: async () => [],
		appendCandidateSnapshot: async () => undefined,
		persistCutoff: async (result) => {
			stored.keys.add(`${result.eligibility.issuerCik}:${new Date(result.eligibility.decisionWindowOpen).toISOString()}`);
			stored.closed = result.eligibility.candidateSnapshotId;
		},
		listLatestCandidateSnapshots: async () => stored.snapshots,
		eligibilityKeys: async () => stored.keys,
		hasDueCandidates: async () => true,
	};
	expect(await closeDueCandidates(writer, new Date('2026-08-31T13:20:00.000Z'))).toEqual({ signals: 0, decisions: 1 });
	expect(stored.closed).toBe(rich.id);
});

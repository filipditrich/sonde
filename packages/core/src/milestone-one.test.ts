import { expect, test } from 'bun:test';

import { CandidateSnapshot, Signal, STRATEGY_VERSION, candidateSnapshotIdFrom, signalIdFrom } from './milestone-one';

const at = '2026-08-31T13:20:00.000Z';
const open = '2026-08-31T13:30:00.000Z';
const fact = '0f6275f4-3b0a-58f3-9da8-b0973a025b76';

test('strategy artifact ids are UUID v5 over the candidate key', () => {
	const key = { strategyVersion: STRATEGY_VERSION, issuerCik: '0001702750', decisionWindowOpen: open };
	expect(String(signalIdFrom(key))).toBe(String(signalIdFrom(key)));
	expect(String(signalIdFrom(key))).toBe('4a2b5308-fa49-5c85-a7db-28fceb3349cf');
	expect(String(candidateSnapshotIdFrom({ ...key, qualifyingFactIds: [fact] }))).toBe(
		String(candidateSnapshotIdFrom({ ...key, qualifyingFactIds: [fact] })),
	);
});

test('Signal rejects a missing rationale or empty sourceIds', () => {
	const base = {
		id: signalIdFrom({ strategyVersion: STRATEGY_VERSION, issuerCik: '0001702750', decisionWindowOpen: open }),
		kind: 'signal',
		schemaVersion: 'm1',
		recordedAt: at,
		inputRefs: [{ kind: 'eligibility-decision', id: '0199a1f0-0000-7000-8000-000000000001', role: 'cutoff' }],
		strategyVersion: STRATEGY_VERSION,
		policyVersion: 'universe-v1-20bar',
		issuerCik: '0001702750',
		listingId: '0199a1f0-0000-7000-8000-000000000002',
		direction: 'long',
		entryConvention: 'regular-session-open',
		decisionWindowOpen: open,
		horizonCloseAt: '2026-09-29T20:00:00.000Z',
		bootstrapPrior: { label: 'multi-insider-liquid', distinctOwnerCount: 2 },
		observedAt: at,
	};
	expect(Signal.safeParse({ ...base, rationale: 'cluster', sourceIds: [fact] }).success).toBe(true);
	expect(Signal.safeParse({ ...base, rationale: '', sourceIds: [fact] }).success).toBe(false);
	expect(Signal.safeParse({ ...base, rationale: 'cluster', sourceIds: [] }).success).toBe(false);
});

test('candidate snapshot requires the strategy/issuer/window key and at least one owner', () => {
	expect(
		CandidateSnapshot.safeParse({
			id: candidateSnapshotIdFrom({
				strategyVersion: STRATEGY_VERSION,
				issuerCik: '0001702750',
				decisionWindowOpen: open,
				qualifyingFactIds: [fact],
			}),
			kind: 'candidate-snapshot',
			schemaVersion: 'm1',
			recordedAt: at,
			inputRefs: [{ kind: 'form4-transaction-fact', id: fact, role: 'qualifying-purchase' }],
			strategyVersion: STRATEGY_VERSION,
			issuerCik: '0001702750',
			decisionWindowOpen: open,
			cutoffAt: at,
			qualifyingFactIds: [fact],
			reportingOwnerCiks: ['0001739310'],
			observedAt: at,
		}).success,
	).toBe(true);
});

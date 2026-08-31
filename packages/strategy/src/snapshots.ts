import {
	CandidateSnapshot,
	STRATEGY_VERSION,
	candidateSnapshotIdFrom,
	type ArtifactId,
	type Cik,
	type MarketOpenAt,
	type ObservedAt,
	type RecordedAt,
} from '@sonde/core';
import type { MarketSessionCandidate } from '@sonde/probes';

import { distinctReportingOwners } from './owners';
import { isQualifyingPurchase } from './qualify';
import { assignDecisionWindow, type DecisionWindow } from './window';

export type StrategyFact = {
	readonly id: string;
	readonly issuerCik: string;
	readonly reportingOwnerCik: string;
	readonly transactionCode: string;
	readonly acquiredDisposed: string;
	readonly shares: string;
	readonly pricePerShare: string;
	readonly observedAt: string;
};

export const materializeCandidateSnapshot = (input: {
	facts: readonly StrategyFact[];
	window: DecisionWindow;
	issuerCik: string;
	recordedAt: string;
}): CandidateSnapshot => {
	const qualifyingFactIds = input.facts.map((fact) => fact.id);
	const owners = distinctReportingOwners(input.facts);
	const observedAt = input.facts.at(-1)?.observedAt ?? input.recordedAt;
	return CandidateSnapshot.parse({
		id: candidateSnapshotIdFrom({
			strategyVersion: STRATEGY_VERSION,
			issuerCik: input.issuerCik,
			decisionWindowOpen: input.window.decisionWindowOpen,
			qualifyingFactIds,
		}),
		kind: 'candidate-snapshot',
		schemaVersion: 'm1',
		recordedAt: input.recordedAt as RecordedAt,
		inputRefs: input.facts.map((fact) => ({ kind: 'form4-transaction-fact' as const, id: fact.id, role: 'qualifying-purchase' })),
		strategyVersion: STRATEGY_VERSION,
		issuerCik: input.issuerCik as Cik,
		decisionWindowOpen: input.window.decisionWindowOpen as MarketOpenAt,
		cutoffAt: input.window.cutoffAt,
		qualifyingFactIds,
		reportingOwnerCiks: owners,
		observedAt: observedAt as ObservedAt,
	});
};

/** Append a snapshot after every newly consumed qualifying fact; never mutate an earlier one. */
export const snapshotsFromFacts = (facts: readonly StrategyFact[], sessions: readonly MarketSessionCandidate[], recordedAt: string) => {
	const qualifying = facts
		.filter(isQualifyingPurchase)
		.toSorted((left, right) => left.observedAt.localeCompare(right.observedAt) || left.id.localeCompare(right.id));
	const groups = new Map<string, StrategyFact[]>();
	const snapshots: CandidateSnapshot[] = [];
	for (const fact of qualifying) {
		const window = assignDecisionWindow(fact.observedAt, sessions);
		if (!window) continue;
		const key = `${fact.issuerCik}:${window.decisionWindowOpen}`;
		const next = [...(groups.get(key) ?? []), fact];
		groups.set(key, next);
		snapshots.push(materializeCandidateSnapshot({ facts: next, window, issuerCik: fact.issuerCik, recordedAt }));
	}
	return snapshots;
};

export const snapshotKey = (snapshot: Pick<CandidateSnapshot, 'strategyVersion' | 'issuerCik' | 'decisionWindowOpen'>) =>
	`${snapshot.strategyVersion}:${snapshot.issuerCik}:${snapshot.decisionWindowOpen}`;

export const snapshotWindowKey = (snapshot: Pick<CandidateSnapshot, 'issuerCik' | 'decisionWindowOpen'>) =>
	`${snapshot.issuerCik}:${new Date(snapshot.decisionWindowOpen).toISOString()}`;

const isRicherSnapshot = (candidate: CandidateSnapshot, incumbent: CandidateSnapshot) => {
	if (candidate.qualifyingFactIds.length !== incumbent.qualifyingFactIds.length)
		return candidate.qualifyingFactIds.length > incumbent.qualifyingFactIds.length;
	return Date.parse(candidate.recordedAt) >= Date.parse(incumbent.recordedAt);
};

/** The cutoff candidate is the richest snapshot for each issuer and Decision Window. */
export const selectCutoffSnapshots = (snapshots: readonly CandidateSnapshot[]) => {
	const latest = new Map<string, CandidateSnapshot>();
	for (const snapshot of snapshots) {
		const key = snapshotWindowKey(snapshot);
		const prev = latest.get(key);
		if (!prev || isRicherSnapshot(snapshot, prev)) latest.set(key, snapshot);
	}
	return [...latest.values()];
};

export type ListedName = { readonly id: ArtifactId; readonly ticker: string; readonly issuerCik: string; readonly securityType: string };

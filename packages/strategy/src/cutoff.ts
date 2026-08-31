import {
	DecisionPacket,
	EligibilityDecision,
	LIQUIDITY_MEDIAN_FLOOR,
	STRATEGY_VERSION,
	Signal,
	UNIVERSE_POLICY_VERSION,
	UniverseSnapshot,
	decisionPacketIdFrom,
	eligibilityDecisionIdFrom,
	sipBarRefId,
	signalIdFrom,
	universeSnapshotIdFrom,
	ArtifactId,
	type CandidateSnapshot,
	type Cik,
	type Decimal,
	type MarketCloseAt,
	type MarketOpenAt,
	type ObservedAt,
	type RecordedAt,
} from '@sonde/core';
import { selectCompletedSipBars, type MarketSessionCandidate, type SipDailyBarCandidate } from '@sonde/probes';

import { evaluateEligibility } from './eligibility';
import { horizonCloseAt } from './horizon';
import { evaluateUniverseLiquidity } from './liquidity';
import { distinctReportingOwners } from './owners';
import type { ListedName, StrategyFact } from './snapshots';
import { isWindowDue } from './window';

export type CutoffListing = ListedName;

const barKeysFor = (listingId: string, bars: readonly { sessionDate: string }[]) => bars.map((bar) => sipBarRefId(listingId, bar.sessionDate));

export const materializeUniverseSnapshot = (input: {
	listingId: string;
	entrySessionDate: string;
	bars: readonly SipDailyBarCandidate[];
	recordedAt: string;
	asOf: Date;
	sessions: readonly MarketSessionCandidate[];
	fallbackRef: { kind: 'candidate-snapshot' | 'listing'; id: string };
}): UniverseSnapshot => {
	const selected = selectCompletedSipBars(input.bars, input.sessions, input.asOf);
	const liquidity = evaluateUniverseLiquidity(selected.bars);
	const keys = barKeysFor(input.listingId, selected.bars);
	const exclusionReasons = [...(selected.failure ? [selected.failure] : []), ...liquidity.exclusionReasons];
	const listingId = ArtifactId.safeParse(input.listingId).success ? (input.listingId as ArtifactId) : undefined;
	return UniverseSnapshot.parse({
		id: universeSnapshotIdFrom({
			policyVersion: UNIVERSE_POLICY_VERSION,
			listingId: input.listingId,
			entrySessionDate: input.entrySessionDate,
			barKeys: keys,
		}),
		kind: 'universe-snapshot',
		schemaVersion: 'm1',
		recordedAt: input.recordedAt as RecordedAt,
		inputRefs:
			selected.bars.length > 0
				? selected.bars.map((bar) => ({ kind: 'sip-daily-bar' as const, id: sipBarRefId(input.listingId, bar.sessionDate), role: 'liquidity-bar' }))
				: [{ kind: input.fallbackRef.kind, id: input.fallbackRef.id, role: 'liquidity-context' }],
		policyVersion: UNIVERSE_POLICY_VERSION,
		entrySessionDate: input.entrySessionDate,
		...(listingId ? { listingId } : {}),
		barKeys: keys,
		included: Boolean(selected.bars.length === 20 && liquidity.included),
		exclusionReasons,
		observedAt: input.recordedAt as ObservedAt,
		...(liquidity.medianDollarVolume ? { medianDollarVolume: liquidity.medianDollarVolume as Decimal } : {}),
	});
};

export const closeCandidate = (input: {
	snapshot: CandidateSnapshot;
	facts: readonly StrategyFact[];
	listing?: CutoffListing;
	sessions: readonly MarketSessionCandidate[];
	bars: readonly SipDailyBarCandidate[];
	alreadyDecided: boolean;
	now: Date;
	recordedAt: string;
}): { universe: UniverseSnapshot; eligibility: EligibilityDecision; signal?: Signal; packet: DecisionPacket } => {
	const asOf = new Date(input.snapshot.decisionWindowOpen);
	const universe = materializeUniverseSnapshot({
		listingId: input.listing?.id ?? input.snapshot.issuerCik,
		entrySessionDate: input.snapshot.cutoffAt.slice(0, 10),
		bars: input.bars,
		recordedAt: input.recordedAt,
		asOf,
		sessions: input.sessions,
		fallbackRef: input.listing ? { kind: 'listing', id: input.listing.id } : { kind: 'candidate-snapshot', id: input.snapshot.id },
	});
	const owners = distinctReportingOwners(input.facts);
	const eligibilityResult = evaluateEligibility({
		due: isWindowDue(input.snapshot.cutoffAt, input.now),
		alreadyDecided: input.alreadyDecided,
		listing: input.listing,
		universeIncluded: universe.included,
		universeReason: universe.exclusionReasons[0],
		ownerCount: owners.length,
		allFactsByCutoff: input.facts.every((fact) => Date.parse(fact.observedAt) <= Date.parse(input.snapshot.cutoffAt)),
	});
	const eligibility = EligibilityDecision.parse({
		id: eligibilityDecisionIdFrom({
			strategyVersion: input.snapshot.strategyVersion,
			issuerCik: input.snapshot.issuerCik,
			decisionWindowOpen: input.snapshot.decisionWindowOpen,
		}),
		kind: 'eligibility-decision',
		schemaVersion: 'm1',
		recordedAt: input.recordedAt as RecordedAt,
		inputRefs: [
			{ kind: 'candidate-snapshot' as const, id: input.snapshot.id, role: 'closed-candidate' },
			{ kind: 'universe-snapshot' as const, id: universe.id, role: 'universe' },
		],
		strategyVersion: input.snapshot.strategyVersion,
		issuerCik: input.snapshot.issuerCik,
		decisionWindowOpen: input.snapshot.decisionWindowOpen,
		eligible: eligibilityResult.eligible,
		failedChecks: [...eligibilityResult.failedChecks],
		candidateSnapshotId: input.snapshot.id,
		universeSnapshotId: universe.id,
		observedAt: input.recordedAt as ObservedAt,
	});
	const signal = emitSignal({
		snapshot: input.snapshot,
		listing: input.listing,
		eligibility,
		universe,
		owners,
		sessions: input.sessions,
		recordedAt: input.recordedAt,
	});
	const packet = DecisionPacket.parse({
		id: decisionPacketIdFrom({
			strategyVersion: input.snapshot.strategyVersion,
			issuerCik: input.snapshot.issuerCik,
			decisionWindowOpen: input.snapshot.decisionWindowOpen,
		}),
		kind: 'decision-packet',
		schemaVersion: 'm1',
		recordedAt: input.recordedAt as RecordedAt,
		inputRefs: [
			{ kind: 'eligibility-decision' as const, id: eligibility.id, role: 'eligibility' },
			{ kind: 'candidate-snapshot' as const, id: input.snapshot.id, role: 'candidate' },
			{ kind: 'universe-snapshot' as const, id: universe.id, role: 'universe' },
			...(input.listing ? [{ kind: 'listing' as const, id: input.listing.id, role: 'effective-listing' }] : []),
			...(signal ? [{ kind: 'signal' as const, id: signal.id, role: 'emitted-signal' }] : []),
		],
		strategyVersion: STRATEGY_VERSION,
		policyVersion: UNIVERSE_POLICY_VERSION,
		issuerCik: input.snapshot.issuerCik as Cik,
		decisionWindowOpen: input.snapshot.decisionWindowOpen as MarketOpenAt,
		calendarVersion: input.sessions[0]?.calendarVersion ?? 'unknown',
		eligibilityDecisionId: eligibility.id,
		observedAt: input.recordedAt as ObservedAt,
		...(signal ? { signalId: signal.id } : {}),
	});
	return { universe, eligibility, signal, packet };
};

const emitSignal = (input: {
	snapshot: CandidateSnapshot;
	listing?: CutoffListing;
	eligibility: EligibilityDecision;
	universe: UniverseSnapshot;
	owners: readonly string[];
	sessions: readonly MarketSessionCandidate[];
	recordedAt: string;
}): Signal | undefined => {
	const horizon = horizonCloseAt(input.sessions, input.universe.entrySessionDate);
	if (!input.eligibility.eligible || !input.listing || !horizon) return undefined;
	return Signal.parse({
		id: signalIdFrom({
			strategyVersion: input.snapshot.strategyVersion,
			issuerCik: input.snapshot.issuerCik,
			decisionWindowOpen: input.snapshot.decisionWindowOpen,
		}),
		kind: 'signal',
		schemaVersion: 'm1',
		recordedAt: input.recordedAt as RecordedAt,
		inputRefs: [{ kind: 'eligibility-decision' as const, id: input.eligibility.id, role: 'eligible-cutoff' }],
		strategyVersion: STRATEGY_VERSION,
		policyVersion: UNIVERSE_POLICY_VERSION,
		issuerCik: input.snapshot.issuerCik,
		listingId: input.listing.id,
		direction: 'long',
		entryConvention: 'regular-session-open',
		decisionWindowOpen: input.snapshot.decisionWindowOpen,
		horizonCloseAt: horizon as MarketCloseAt,
		rationale: `${STRATEGY_VERSION} long ${input.listing.ticker} at regular-session open ${input.snapshot.decisionWindowOpen}; ${input.owners.length} distinct reporting owners; median dollar volume ${input.universe.medianDollarVolume ?? 'unknown'} > ${LIQUIDITY_MEDIAN_FLOOR}`,
		sourceIds: [...input.snapshot.qualifyingFactIds, input.snapshot.id],
		bootstrapPrior: { label: 'multi-insider-liquid', distinctOwnerCount: input.owners.length },
		observedAt: input.recordedAt as ObservedAt,
	});
};

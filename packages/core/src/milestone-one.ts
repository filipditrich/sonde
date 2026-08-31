import * as z from 'zod';

import {
	ArtifactId,
	Cik,
	InputReference,
	MarketCloseAt,
	MarketOpenAt,
	ObservedAt,
	RecordedAt,
	SchemaVersion,
	artifactIdFrom,
} from './milestone-zero';
import { Decimal } from './primitives';

export const STRATEGY_VERSION = 'strategy-v1';
export const UNIVERSE_POLICY_VERSION = 'universe-v1-20bar';
export const LIQUIDITY_MEDIAN_FLOOR = '20000000';

const envelope = (kind: 'candidate-snapshot' | 'eligibility-decision' | 'signal' | 'decision-packet' | 'universe-snapshot') =>
	z.object({
		id: ArtifactId,
		kind: z.literal(kind),
		schemaVersion: SchemaVersion,
		recordedAt: RecordedAt,
		inputRefs: z.array(InputReference).min(1),
		supersedesId: ArtifactId.optional(),
	});

export const candidateSnapshotIdFrom = (input: {
	strategyVersion: string;
	issuerCik: string;
	decisionWindowOpen: string;
	qualifyingFactIds: readonly string[];
}) =>
	artifactIdFrom(`candidate-snapshot:${input.strategyVersion}:${input.issuerCik}:${input.decisionWindowOpen}:${input.qualifyingFactIds.join(',')}`);

export const eligibilityDecisionIdFrom = (input: { strategyVersion: string; issuerCik: string; decisionWindowOpen: string }) =>
	artifactIdFrom(`eligibility-decision:${input.strategyVersion}:${input.issuerCik}:${input.decisionWindowOpen}`);

export const signalIdFrom = (input: { strategyVersion: string; issuerCik: string; decisionWindowOpen: string }) =>
	artifactIdFrom(`signal:${input.strategyVersion}:${input.issuerCik}:${input.decisionWindowOpen}`);

export const decisionPacketIdFrom = (input: { strategyVersion: string; issuerCik: string; decisionWindowOpen: string }) =>
	artifactIdFrom(`decision-packet:${input.strategyVersion}:${input.issuerCik}:${input.decisionWindowOpen}`);

export const universeSnapshotIdFrom = (input: { policyVersion: string; listingId: string; entrySessionDate: string; barKeys: readonly string[] }) =>
	artifactIdFrom(`universe-snapshot:${input.policyVersion}:${input.listingId}:${input.entrySessionDate}:${input.barKeys.join(',')}`);

export const sipBarRefId = (listingId: string, sessionDate: string) => `${listingId}:${sessionDate}:sip:raw`;

export const FailedCheck = z.object({ check: z.string().min(1), reason: z.string().min(1) });
export type FailedCheck = z.infer<typeof FailedCheck>;

export const CandidateSnapshot = envelope('candidate-snapshot').extend({
	strategyVersion: z.string().min(1),
	issuerCik: Cik,
	decisionWindowOpen: MarketOpenAt,
	cutoffAt: z.iso.datetime({ offset: true }),
	qualifyingFactIds: z.array(ArtifactId).min(1),
	reportingOwnerCiks: z.array(Cik).min(1),
	observedAt: ObservedAt,
});
export type CandidateSnapshot = z.infer<typeof CandidateSnapshot>;

export const UniverseSnapshot = envelope('universe-snapshot').extend({
	policyVersion: z.string().min(1),
	listingId: ArtifactId.optional(),
	entrySessionDate: z.iso.date(),
	barKeys: z.array(z.string().min(1)).max(20),
	medianDollarVolume: Decimal.optional(),
	included: z.boolean(),
	exclusionReasons: z.array(z.string().min(1)),
	observedAt: ObservedAt,
});
export type UniverseSnapshot = z.infer<typeof UniverseSnapshot>;

export const EligibilityDecision = envelope('eligibility-decision').extend({
	strategyVersion: z.string().min(1),
	issuerCik: Cik,
	decisionWindowOpen: MarketOpenAt,
	eligible: z.boolean(),
	failedChecks: z.array(FailedCheck),
	candidateSnapshotId: ArtifactId,
	universeSnapshotId: ArtifactId.optional(),
	observedAt: ObservedAt,
});
export type EligibilityDecision = z.infer<typeof EligibilityDecision>;

export const Signal = envelope('signal').extend({
	strategyVersion: z.string().min(1),
	policyVersion: z.string().min(1),
	issuerCik: Cik,
	listingId: ArtifactId,
	direction: z.literal('long'),
	entryConvention: z.literal('regular-session-open'),
	decisionWindowOpen: MarketOpenAt,
	horizonCloseAt: MarketCloseAt,
	rationale: z.string().min(1),
	sourceIds: z.array(z.string().min(1)).min(1),
	bootstrapPrior: z.object({
		label: z.literal('multi-insider-liquid'),
		distinctOwnerCount: z.number().int().min(2),
	}),
	observedAt: ObservedAt,
});
export type Signal = z.infer<typeof Signal>;

export const DecisionPacket = envelope('decision-packet').extend({
	strategyVersion: z.string().min(1),
	policyVersion: z.string().min(1),
	issuerCik: Cik,
	decisionWindowOpen: MarketOpenAt,
	calendarVersion: z.string().min(1),
	eligibilityDecisionId: ArtifactId,
	signalId: ArtifactId.optional(),
	observedAt: ObservedAt,
});
export type DecisionPacket = z.infer<typeof DecisionPacket>;

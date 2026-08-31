import * as z from 'zod';

import { FailedCheck } from './milestone-one';
import { Cik, InputReference, MarketCloseAt, MarketOpenAt, ObservedAt, RecordedAt } from './milestone-zero';

export const CockpitFunnelStage = z.enum(['documents', 'transactions', 'qualifying-purchases', 'distinct-owner-candidates', 'liquid-signals']);
export type CockpitFunnelStage = z.infer<typeof CockpitFunnelStage>;

const factLine = z.object({
	factId: z.string().min(1),
	reportingOwnerCik: Cik,
	reportingOwnerName: z.string().min(1),
	transactionCode: z.string().min(1),
	shares: z.string().min(1),
	pricePerShare: z.string().min(1),
	observedAt: ObservedAt,
});

export const CockpitCandidateDetail = z.object({
	id: z.string().uuid(),
	issuerCik: Cik,
	issuerName: z.string().min(1),
	strategyVersion: z.string().min(1),
	decisionWindowOpen: MarketOpenAt,
	cutoffAt: z.iso.datetime({ offset: true }),
	reportingOwnerCiks: z.array(Cik).min(1),
	qualifyingFacts: z.array(factLine),
	inputRefs: z.array(InputReference),
	recordedAt: RecordedAt,
	eligibilityId: z.string().uuid().optional(),
	packetId: z.string().uuid().optional(),
	signalId: z.string().uuid().optional(),
});
export type CockpitCandidateDetail = z.infer<typeof CockpitCandidateDetail>;

export const CockpitSignalDetail = z.object({
	id: z.string().uuid(),
	issuerCik: Cik,
	issuerName: z.string().min(1),
	ticker: z.string().min(1).optional(),
	listingId: z.string().min(1),
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
	sources: z.array(factLine),
	inputRefs: z.array(InputReference),
	recordedAt: RecordedAt,
	observedAt: ObservedAt,
	eligibilityId: z.string().uuid().optional(),
	packetId: z.string().uuid().optional(),
	candidateSnapshotId: z.string().uuid().optional(),
});
export type CockpitSignalDetail = z.infer<typeof CockpitSignalDetail>;

export const CockpitEligibilityDetail = z.object({
	id: z.string().uuid(),
	issuerCik: Cik,
	issuerName: z.string().min(1),
	eligible: z.boolean(),
	failedChecks: z.array(FailedCheck),
	candidateSnapshotId: z.string().uuid(),
	universeSnapshotId: z.string().uuid().optional(),
	packetId: z.string().uuid().optional(),
	signalId: z.string().uuid().optional(),
	inputRefs: z.array(InputReference),
	recordedAt: RecordedAt,
	observedAt: ObservedAt,
	decisionWindowOpen: MarketOpenAt,
});
export type CockpitEligibilityDetail = z.infer<typeof CockpitEligibilityDetail>;

export const CockpitPacketDetail = z.object({
	id: z.string().uuid(),
	issuerCik: Cik,
	issuerName: z.string().min(1),
	strategyVersion: z.string().min(1),
	policyVersion: z.string().min(1),
	calendarVersion: z.string().min(1),
	decisionWindowOpen: MarketOpenAt,
	eligibilityDecisionId: z.string().uuid(),
	signalId: z.string().uuid().optional(),
	inputRefs: z.array(InputReference),
	recordedAt: RecordedAt,
	observedAt: ObservedAt,
});
export type CockpitPacketDetail = z.infer<typeof CockpitPacketDetail>;

export const CockpitFunnelPopulation = z.object({
	stage: CockpitFunnelStage,
	count: z.number().int().nonnegative(),
	rows: z.array(
		z.object({
			id: z.string().min(1),
			summary: z.string().min(1),
			href: z.string().min(1).optional(),
		}),
	),
});
export type CockpitFunnelPopulation = z.infer<typeof CockpitFunnelPopulation>;

export const CockpitDocumentDetail = z.object({
	sha256: z.string().regex(/^[0-9a-f]{64}$/),
	mediaType: z.string().min(1),
	byteSize: z.number().int().nonnegative(),
	recordedAt: RecordedAt,
	facts: z.array(
		z.object({
			factId: z.string().min(1),
			summary: z.string().min(1),
			href: z.string().min(1),
		}),
	),
});
export type CockpitDocumentDetail = z.infer<typeof CockpitDocumentDetail>;

export const CockpitFactDetail = z.object({
	id: z.string().min(1),
	documentSha256: z.string().min(1),
	accession: z.string().min(1),
	issuerCik: Cik,
	issuerName: z.string().min(1),
	issuerTicker: z.string().min(1).optional(),
	reportingOwnerCik: Cik,
	reportingOwnerName: z.string().min(1),
	transactionCode: z.string().min(1),
	acquiredDisposed: z.string().min(1),
	shares: z.string().min(1),
	pricePerShare: z.string().min(1),
	transactionDate: z.iso.date(),
	observedAt: ObservedAt,
	recordedAt: RecordedAt,
});
export type CockpitFactDetail = z.infer<typeof CockpitFactDetail>;

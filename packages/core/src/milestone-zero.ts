import * as z from 'zod';

import { Decimal, Sha256 } from './primitives';

export const ArtifactId = z.uuid().brand<'ArtifactId'>();
export type ArtifactId = z.infer<typeof ArtifactId>;
const Instant = z.iso.datetime({ offset: true });
export const ObservedAt = Instant.brand<'ObservedAt'>();
export type ObservedAt = z.infer<typeof ObservedAt>;
export const RecordedAt = Instant.brand<'RecordedAt'>();
export type RecordedAt = z.infer<typeof RecordedAt>;
export const RequestedAt = Instant.brand<'RequestedAt'>();
export type RequestedAt = z.infer<typeof RequestedAt>;
export const CompletedAt = Instant.brand<'CompletedAt'>();
export type CompletedAt = z.infer<typeof CompletedAt>;
export const SecAcceptedAt = Instant.brand<'SecAcceptedAt'>();
export type SecAcceptedAt = z.infer<typeof SecAcceptedAt>;
export const MarketOpenAt = Instant.brand<'MarketOpenAt'>();
export type MarketOpenAt = z.infer<typeof MarketOpenAt>;
export const MarketCloseAt = Instant.brand<'MarketCloseAt'>();
export type MarketCloseAt = z.infer<typeof MarketCloseAt>;
export const Cik = z
	.string()
	.regex(/^\d{10}$/, 'CIK must be zero-padded to ten digits')
	.brand<'Cik'>();
export type Cik = z.infer<typeof Cik>;
export const AccessionNumber = z
	.string()
	.regex(/^\d{10}-\d{2}-\d{6}$/)
	.brand<'AccessionNumber'>();
export type AccessionNumber = z.infer<typeof AccessionNumber>;
export const SchemaVersion = z.string().min(1).brand<'SchemaVersion'>();
export type SchemaVersion = z.infer<typeof SchemaVersion>;

export const ArtifactKind = z.enum([
	'acquisition-attempt',
	'source-document',
	'parse-run',
	'form4-transaction-fact',
	'issuer',
	'listing',
	'broker-asset',
	'market-session',
	'sip-daily-bar',
	'job-run-event',
]);
export type ArtifactKind = z.infer<typeof ArtifactKind>;

export const InputReference = z.object({
	kind: ArtifactKind,
	id: z.string().min(1),
	role: z.string().min(1),
});
export type InputReference = z.infer<typeof InputReference>;

export const KnowledgeClock = z.object({ observedAt: ObservedAt, recordedAt: RecordedAt });
export type KnowledgeClock = z.infer<typeof KnowledgeClock>;
export const SourceClock = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('sec-acceptance'), acceptedAt: SecAcceptedAt }),
	z.object({ kind: z.literal('transaction-date'), date: z.iso.date() }),
	z.object({ kind: z.literal('market-session'), sessionDate: z.iso.date() }),
]);
export type SourceClock = z.infer<typeof SourceClock>;

const envelope = (kind: ArtifactKind, sourceOrigin = false) =>
	z.object({
		id: ArtifactId,
		kind: z.literal(kind),
		schemaVersion: SchemaVersion,
		recordedAt: RecordedAt,
		inputRefs: sourceOrigin ? z.array(InputReference).length(0) : z.array(InputReference).min(1),
		supersedesId: ArtifactId.optional(),
	});

export const AcquisitionAttempt = envelope('acquisition-attempt', true).extend({
	source: z.string().min(1),
	sourcePolicyVersion: z.string().min(1),
	method: z.string().min(1),
	resource: z.url(),
	requestedAt: RequestedAt,
	completedAt: CompletedAt,
	observedAt: ObservedAt,
	httpStatus: z.number().int().min(0).optional(),
	etag: z.string().min(1).optional(),
	lastModified: z.string().min(1).optional(),
	byteSize: z.number().int().nonnegative().optional(),
	mediaType: z.string().min(1).optional(),
	documentSha256: Sha256.optional(),
	failure: z.object({ code: z.string().min(1), detail: z.string().min(1) }).optional(),
});
export type AcquisitionAttempt = z.infer<typeof AcquisitionAttempt>;

export const SourceDocument = envelope('source-document', true).extend({
	sha256: Sha256,
	byteSize: z.number().int().nonnegative(),
	mediaType: z.string().min(1),
	encoding: z.string().min(1).optional(),
	bytes: z.instanceof(Uint8Array),
	retentionClass: z.string().min(1),
});
export type SourceDocument = z.infer<typeof SourceDocument>;
export const ParseRun = envelope('parse-run')
	.extend({
		documentSha256: Sha256,
		parser: z.string().min(1),
		parserVersion: z.string().min(1),
		startedAt: RecordedAt,
		completedAt: RecordedAt,
		status: z.enum(['succeeded', 'partial', 'failed']),
		failure: z.object({ code: z.string().min(1), detail: z.string().min(1) }).optional(),
	})
	.refine((v) => (v.status !== 'succeeded') === Boolean(v.failure), 'parse failure status and detail must agree');
export type ParseRun = z.infer<typeof ParseRun>;

export const Form4TransactionFact = envelope('form4-transaction-fact').extend({
	accession: AccessionNumber,
	documentSha256: Sha256,
	issuerCik: Cik,
	reportingOwnerCik: Cik,
	reportingOwnerName: z.string().min(1),
	issuerName: z.string().min(1),
	issuerTicker: z.string().min(1).optional(),
	isDirector: z.boolean(),
	isOfficer: z.boolean(),
	isTenPercentOwner: z.boolean(),
	sourceClock: z.object({ kind: z.literal('sec-acceptance'), acceptedAt: SecAcceptedAt }),
	transactionDate: z.iso.date(),
	securityTitle: z.string().min(1),
	transactionCode: z.string().min(1),
	acquiredDisposed: z.string().min(1),
	ownership: z.string().min(1),
	shares: Decimal,
	pricePerShare: Decimal,
	footnoteRefs: z.array(z.string()),
	sourceLocator: z.string().min(1),
	observedAt: ObservedAt,
});
export type Form4TransactionFact = z.infer<typeof Form4TransactionFact>;

export const Issuer = envelope('issuer').extend({
	cik: Cik,
	legalName: z.string().min(1),
	effectiveFrom: z.iso.date(),
	effectiveTo: z.iso.date().optional(),
});
export type Issuer = z.infer<typeof Issuer>;
export const Listing = envelope('listing').extend({
	issuerId: ArtifactId,
	ticker: z.string().min(1),
	venue: z.string().min(1),
	securityType: z.string().min(1),
	effectiveFrom: z.iso.date(),
	effectiveTo: z.iso.date().optional(),
});
export type Listing = z.infer<typeof Listing>;
export const BrokerAsset = envelope('broker-asset').extend({
	listingId: ArtifactId,
	broker: z.string().min(1),
	brokerAssetId: z.string().min(1),
	symbol: z.string().min(1),
	tradable: z.boolean(),
	fractionable: z.boolean(),
	effectiveFrom: z.iso.date(),
	effectiveTo: z.iso.date().optional(),
});
export type BrokerAsset = z.infer<typeof BrokerAsset>;
const acquisitionLineage = (value: { inputRefs: InputReference[] }) => value.inputRefs.some((reference) => reference.kind === 'acquisition-attempt');

export const MarketSession = envelope('market-session')
	.extend({
		calendarVersion: z.string().min(1),
		sessionDate: z.iso.date(),
		opensAt: MarketOpenAt,
		closesAt: MarketCloseAt,
		earlyClose: z.boolean(),
		source: z.string().min(1),
		observedAt: ObservedAt,
	})
	.refine(acquisitionLineage, 'market sessions require direct acquisition-attempt lineage');
export type MarketSession = z.infer<typeof MarketSession>;
export const SipDailyBar = envelope('sip-daily-bar')
	.extend({
		listingId: ArtifactId,
		sessionDate: z.iso.date(),
		feed: z.literal('sip'),
		adjustment: z.string().min(1),
		open: Decimal,
		high: Decimal,
		low: Decimal,
		close: Decimal,
		volume: Decimal,
		vwap: Decimal.optional(),
		observedAt: ObservedAt,
	})
	.refine(acquisitionLineage, 'SIP bars require direct acquisition-attempt lineage');
export type SipDailyBar = z.infer<typeof SipDailyBar>;
export const JobRunEvent = envelope('job-run-event', true).extend({
	runId: ArtifactId,
	job: z.string().min(1),
	lane: z.enum(['ordinary', 'priority']),
	event: z.enum(['started', 'finished', 'failed', 'skipped-overlap']),
	at: RecordedAt,
	outcome: z.string().min(1).optional(),
	meta: z.record(z.string(), z.string()).default({}),
});
export type JobRunEvent = z.infer<typeof JobRunEvent>;

export const CockpitSnapshot = z.object({
	cursor: z.number().int().nonnegative(),
	asOf: RecordedAt,
	funnel: z.object({
		documents: z.number().int().nonnegative(),
		transactions: z.number().int().nonnegative(),
		qualifyingPurchases: z.number().int().nonnegative(),
	}),
	facts: z.array(Form4TransactionFact),
	health: z.array(z.object({ job: z.string(), lastEventAt: RecordedAt, outcome: z.string().optional() })),
});
export type CockpitSnapshot = z.infer<typeof CockpitSnapshot>;
export const CockpitStreamEvent = z.object({
	cursor: z.number().int().positive(),
	kind: ArtifactKind.or(z.literal('job-run-event')),
	artifactId: z.string().min(1),
	recordedAt: RecordedAt,
});
export type CockpitStreamEvent = z.infer<typeof CockpitStreamEvent>;

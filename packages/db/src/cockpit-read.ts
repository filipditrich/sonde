import { and, eq, inArray, sql } from 'drizzle-orm';

import {
	CockpitCandidateDetail,
	CockpitDocumentDetail,
	CockpitEligibilityDetail,
	CockpitFactDetail,
	CockpitFunnelPopulation,
	CockpitFunnelStage,
	CockpitPacketDetail,
	CockpitSignalDetail,
	FailedCheck,
	STRATEGY_VERSION,
} from '@sonde/core';

import type { Database } from './client';
import { documentPreview } from './document-preview';
import { readFunnelAsOf } from './milestone-zero';
import {
	candidateSnapshots,
	decisionPackets,
	eligibilityDecisions,
	form4TransactionFacts,
	issuers,
	listings,
	signals,
	sourceDocuments,
} from './schema';
import { readListingQuote } from './sip-quote';

const issuerNameOf = async (db: Database, cik: string) => {
	const [row] = await db.select({ legalName: issuers.legalName }).from(issuers).where(eq(issuers.cik, cik)).limit(1);
	return row?.legalName ?? cik;
};

const factLine = (fact: typeof form4TransactionFacts.$inferSelect) => ({
	factId: fact.id,
	reportingOwnerCik: fact.reportingOwnerCik,
	reportingOwnerName: fact.reportingOwnerName,
	transactionCode: fact.transactionCode,
	shares: fact.shares,
	pricePerShare: fact.pricePerShare,
	observedAt: fact.observedAt.toISOString(),
});

const factsByIds = async (db: Database, ids: readonly string[]) => {
	if (!ids.length) return [];
	const rows = await db
		.select()
		.from(form4TransactionFacts)
		.where(inArray(form4TransactionFacts.id, [...ids]));
	const byId = new Map(rows.map((row) => [row.id, row]));
	return ids.flatMap((id) => {
		const row = byId.get(id);
		return row ? [factLine(row)] : [];
	});
};

const relatedDecisions = async (db: Database, issuerCik: string, decisionWindowOpen: Date) => {
	const [eligibility] = await db
		.select({ id: eligibilityDecisions.id, candidateSnapshotId: eligibilityDecisions.candidateSnapshotId })
		.from(eligibilityDecisions)
		.where(
			and(
				eq(eligibilityDecisions.strategyVersion, STRATEGY_VERSION),
				eq(eligibilityDecisions.issuerCik, issuerCik),
				eq(eligibilityDecisions.decisionWindowOpen, decisionWindowOpen),
			),
		)
		.limit(1);
	const [packet] = await db
		.select({ id: decisionPackets.id, signalId: decisionPackets.signalId })
		.from(decisionPackets)
		.where(
			and(
				eq(decisionPackets.strategyVersion, STRATEGY_VERSION),
				eq(decisionPackets.issuerCik, issuerCik),
				eq(decisionPackets.decisionWindowOpen, decisionWindowOpen),
			),
		)
		.limit(1);
	return {
		...(eligibility?.id ? { eligibilityId: eligibility.id, candidateSnapshotId: eligibility.candidateSnapshotId } : {}),
		...(packet?.id ? { packetId: packet.id } : {}),
		...(packet?.signalId ? { signalId: packet.signalId } : {}),
	};
};

export const readCockpitCandidate = async (db: Database, id: string) => {
	const [row] = await db.select().from(candidateSnapshots).where(eq(candidateSnapshots.id, id)).limit(1);
	if (!row) return undefined;
	const related = await relatedDecisions(db, row.issuerCik, row.decisionWindowOpen);
	const quote = await readListingQuote(db, row.issuerCik);
	return CockpitCandidateDetail.parse({
		id: row.id,
		issuerCik: row.issuerCik,
		issuerName: await issuerNameOf(db, row.issuerCik),
		strategyVersion: row.strategyVersion,
		decisionWindowOpen: row.decisionWindowOpen.toISOString(),
		cutoffAt: row.cutoffAt.toISOString(),
		reportingOwnerCiks: row.reportingOwnerCiks,
		qualifyingFacts: await factsByIds(db, row.qualifyingFactIds),
		inputRefs: row.inputRefs,
		recordedAt: row.recordedAt.toISOString(),
		...related,
		...(quote ? { quote } : {}),
	});
};

export const readCockpitSignal = async (db: Database, id: string) => {
	const [row] = await db
		.select({ signal: signals, ticker: listings.ticker })
		.from(signals)
		.leftJoin(listings, eq(listings.id, signals.listingId))
		.where(eq(signals.id, id))
		.limit(1);
	if (!row) return undefined;
	const related = await relatedDecisions(db, row.signal.issuerCik, row.signal.decisionWindowOpen);
	const prior = row.signal.bootstrapPrior as { label: 'multi-insider-liquid'; distinctOwnerCount: number };
	return CockpitSignalDetail.parse({
		id: row.signal.id,
		issuerCik: row.signal.issuerCik,
		issuerName: await issuerNameOf(db, row.signal.issuerCik),
		...(row.ticker ? { ticker: row.ticker } : {}),
		listingId: row.signal.listingId,
		direction: 'long',
		entryConvention: 'regular-session-open',
		decisionWindowOpen: row.signal.decisionWindowOpen.toISOString(),
		horizonCloseAt: row.signal.horizonCloseAt.toISOString(),
		rationale: row.signal.rationale,
		sourceIds: row.signal.sourceIds,
		bootstrapPrior: prior,
		sources: await factsByIds(db, row.signal.sourceIds),
		inputRefs: row.signal.inputRefs,
		recordedAt: row.signal.recordedAt.toISOString(),
		observedAt: row.signal.observedAt.toISOString(),
		...related,
	});
};

export const readCockpitEligibility = async (db: Database, id: string) => {
	const [row] = await db
		.select({ decision: eligibilityDecisions, packetId: decisionPackets.id, signalId: decisionPackets.signalId })
		.from(eligibilityDecisions)
		.leftJoin(decisionPackets, eq(decisionPackets.eligibilityDecisionId, eligibilityDecisions.id))
		.where(eq(eligibilityDecisions.id, id))
		.limit(1);
	if (!row) return undefined;
	return CockpitEligibilityDetail.parse({
		id: row.decision.id,
		issuerCik: row.decision.issuerCik,
		issuerName: await issuerNameOf(db, row.decision.issuerCik),
		eligible: row.decision.eligible,
		failedChecks: Array.isArray(row.decision.failedChecks) ? row.decision.failedChecks.map((item) => FailedCheck.parse(item)) : [],
		candidateSnapshotId: row.decision.candidateSnapshotId,
		...(row.decision.universeSnapshotId ? { universeSnapshotId: row.decision.universeSnapshotId } : {}),
		...(row.packetId ? { packetId: row.packetId } : {}),
		...(row.signalId ? { signalId: row.signalId } : {}),
		inputRefs: row.decision.inputRefs,
		recordedAt: row.decision.recordedAt.toISOString(),
		observedAt: row.decision.observedAt.toISOString(),
		decisionWindowOpen: row.decision.decisionWindowOpen.toISOString(),
	});
};

export const readCockpitPacket = async (db: Database, id: string) => {
	const [row] = await db.select().from(decisionPackets).where(eq(decisionPackets.id, id)).limit(1);
	if (!row) return undefined;
	return CockpitPacketDetail.parse({
		id: row.id,
		issuerCik: row.issuerCik,
		issuerName: await issuerNameOf(db, row.issuerCik),
		strategyVersion: row.strategyVersion,
		policyVersion: row.policyVersion,
		calendarVersion: row.calendarVersion,
		decisionWindowOpen: row.decisionWindowOpen.toISOString(),
		eligibilityDecisionId: row.eligibilityDecisionId,
		...(row.signalId ? { signalId: row.signalId } : {}),
		inputRefs: row.inputRefs,
		recordedAt: row.recordedAt.toISOString(),
		observedAt: row.observedAt.toISOString(),
	});
};

const documentRows = (db: Database, instant: string) =>
	db.execute<{ id: string; summary: string }>(sql`
		SELECT sha256 AS id, left(sha256, 12) || ' · ' || media_type || ' · ' || byte_size::text || ' bytes' AS summary
		FROM m0_source_documents WHERE recorded_at <= ${instant}
		ORDER BY recorded_at DESC LIMIT 80
	`);

const factRows = (db: Database, instant: string) =>
	db.execute<{ id: string; summary: string }>(sql`
		SELECT id::text AS id, issuer_name || ' ' || transaction_code || ' ' || shares::text || ' @ ' || price_per_share AS summary
		FROM m0_form4_transaction_facts
		WHERE observed_at <= ${instant}
		ORDER BY observed_at DESC LIMIT 80
	`);

const qualifyingFactRows = (db: Database, instant: string) =>
	db.execute<{ id: string; summary: string }>(sql`
		SELECT id::text AS id, issuer_name || ' ' || transaction_code || ' ' || shares::text || ' @ ' || price_per_share AS summary
		FROM m0_form4_transaction_facts
		WHERE observed_at <= ${instant}
		  AND transaction_code = 'P' AND acquired_disposed = 'A' AND shares::numeric > 0 AND price_per_share::numeric > 0
		ORDER BY observed_at DESC LIMIT 80
	`);

const distinctOwnerRows = (db: Database, instant: string) =>
	db.execute<{ id: string; summary: string }>(sql`
		SELECT id, summary FROM (
			SELECT DISTINCT ON (issuer_cik, decision_window_open)
				id::text AS id,
				issuer_cik || ' ' || cardinality(reporting_owner_ciks) || ' owners' AS summary,
				cardinality(reporting_owner_ciks) AS owners
			FROM m1_candidate_snapshots
			WHERE recorded_at <= ${instant} AND strategy_version = ${STRATEGY_VERSION}
			ORDER BY issuer_cik, decision_window_open, cardinality(qualifying_fact_ids) DESC, recorded_at DESC
		) latest WHERE owners >= 2 LIMIT 80
	`);

const signalRows = (db: Database, instant: string) =>
	db.execute<{ id: string; summary: string }>(sql`
		SELECT id::text AS id, issuer_cik || ' long' AS summary
		FROM m1_signals WHERE recorded_at <= ${instant}
		ORDER BY recorded_at DESC LIMIT 80
	`);

const withHref = (stage: CockpitFunnelStage, id: string) => {
	if (stage === 'documents') return { href: `/documents/${id}` };
	if (stage === 'transactions' || stage === 'qualifying-purchases') return { href: `/facts/${id}` };
	if (stage === 'distinct-owner-candidates') return { href: `/candidates/${id}` };
	if (stage === 'liquid-signals') return { href: `/signals/${id}` };
	return {};
};

const stageCount = (funnel: Awaited<ReturnType<typeof readFunnelAsOf>>, stage: CockpitFunnelStage) => {
	if (stage === 'documents') return funnel.documents;
	if (stage === 'transactions') return funnel.transactions;
	if (stage === 'qualifying-purchases') return funnel.qualifyingPurchases;
	if (stage === 'distinct-owner-candidates') return funnel.distinctOwnerCandidates;
	return funnel.liquidSignals;
};

const loadStageRows = (db: Database, stage: CockpitFunnelStage, instant: string) => {
	if (stage === 'documents') return documentRows(db, instant);
	if (stage === 'transactions') return factRows(db, instant);
	if (stage === 'qualifying-purchases') return qualifyingFactRows(db, instant);
	if (stage === 'distinct-owner-candidates') return distinctOwnerRows(db, instant);
	return signalRows(db, instant);
};

export const readCockpitFunnelStage = async (db: Database, stage: CockpitFunnelStage, asOf = new Date()) => {
	const rows = await loadStageRows(db, stage, asOf.toISOString());
	return CockpitFunnelPopulation.parse({
		stage,
		count: stageCount(await readFunnelAsOf(db, asOf), stage),
		rows: [...rows].map((row) => ({ id: row.id, summary: row.summary, ...withHref(stage, row.id) })),
	});
};

export const readCockpitDocument = async (db: Database, sha256: string) => {
	const [row] = await db
		.select({
			sha256: sourceDocuments.sha256,
			mediaType: sourceDocuments.mediaType,
			byteSize: sourceDocuments.byteSize,
			recordedAt: sourceDocuments.recordedAt,
			bytes: sourceDocuments.bytes,
		})
		.from(sourceDocuments)
		.where(eq(sourceDocuments.sha256, sha256))
		.limit(1);
	if (!row) return undefined;
	const facts = await db
		.select({
			id: form4TransactionFacts.id,
			issuerName: form4TransactionFacts.issuerName,
			transactionCode: form4TransactionFacts.transactionCode,
			shares: form4TransactionFacts.shares,
			pricePerShare: form4TransactionFacts.pricePerShare,
		})
		.from(form4TransactionFacts)
		.where(eq(form4TransactionFacts.documentSha256, sha256));
	const preview = documentPreview(row.bytes, row.mediaType);
	return CockpitDocumentDetail.parse({
		sha256: row.sha256,
		mediaType: row.mediaType,
		byteSize: row.byteSize,
		recordedAt: row.recordedAt.toISOString(),
		facts: facts.map((fact) => ({
			factId: fact.id,
			summary: `${fact.issuerName} ${fact.transactionCode} ${fact.shares} @ ${fact.pricePerShare}`,
			href: `/facts/${fact.id}`,
		})),
		...(preview ? { preview } : {}),
	});
};

export const readCockpitFact = async (db: Database, id: string) => {
	const [row] = await db.select().from(form4TransactionFacts).where(eq(form4TransactionFacts.id, id)).limit(1);
	if (!row) return undefined;
	return CockpitFactDetail.parse({
		id: row.id,
		documentSha256: row.documentSha256,
		accession: row.accession,
		issuerCik: row.issuerCik,
		issuerName: row.issuerName,
		...(row.issuerTicker ? { issuerTicker: row.issuerTicker } : {}),
		reportingOwnerCik: row.reportingOwnerCik,
		reportingOwnerName: row.reportingOwnerName,
		transactionCode: row.transactionCode,
		acquiredDisposed: row.acquiredDisposed,
		shares: row.shares,
		pricePerShare: row.pricePerShare,
		transactionDate: row.transactionDate,
		observedAt: row.observedAt.toISOString(),
		recordedAt: row.recordedAt.toISOString(),
	});
};

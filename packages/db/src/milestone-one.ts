import { desc, eq, sql } from 'drizzle-orm';

import type { CandidateSnapshot, DecisionPacket, EligibilityDecision, Signal, UniverseSnapshot } from '@sonde/core';
import { STRATEGY_VERSION } from '@sonde/core';

import type { Database } from './client';
import {
	candidateSnapshots,
	decisionPackets,
	eligibilityDecisions,
	form4TransactionFacts,
	issuers,
	listings,
	signals,
	sipDailyBars,
	universeSnapshots,
} from './schema';

export const appendCandidateSnapshot = async (db: Database, snapshot: CandidateSnapshot) =>
	db
		.insert(candidateSnapshots)
		.values({
			id: snapshot.id,
			strategyVersion: snapshot.strategyVersion,
			issuerCik: snapshot.issuerCik,
			decisionWindowOpen: new Date(snapshot.decisionWindowOpen),
			cutoffAt: new Date(snapshot.cutoffAt),
			qualifyingFactIds: snapshot.qualifyingFactIds,
			reportingOwnerCiks: snapshot.reportingOwnerCiks,
			observedAt: new Date(snapshot.observedAt),
			recordedAt: new Date(snapshot.recordedAt),
			inputRefs: snapshot.inputRefs,
		})
		.onConflictDoNothing();

export const appendUniverseSnapshot = async (db: Database, snapshot: UniverseSnapshot) =>
	db
		.insert(universeSnapshots)
		.values({
			id: snapshot.id,
			policyVersion: snapshot.policyVersion,
			listingId: snapshot.listingId,
			entrySessionDate: snapshot.entrySessionDate,
			barKeys: snapshot.barKeys,
			medianDollarVolume: snapshot.medianDollarVolume,
			included: snapshot.included,
			exclusionReasons: [...snapshot.exclusionReasons],
			observedAt: new Date(snapshot.observedAt),
			recordedAt: new Date(snapshot.recordedAt),
			inputRefs: snapshot.inputRefs,
		})
		.onConflictDoNothing();

export const appendEligibilityDecision = async (db: Database, decision: EligibilityDecision) =>
	db
		.insert(eligibilityDecisions)
		.values({
			id: decision.id,
			strategyVersion: decision.strategyVersion,
			issuerCik: decision.issuerCik,
			decisionWindowOpen: new Date(decision.decisionWindowOpen),
			eligible: decision.eligible,
			failedChecks: decision.failedChecks,
			candidateSnapshotId: decision.candidateSnapshotId,
			universeSnapshotId: decision.universeSnapshotId,
			observedAt: new Date(decision.observedAt),
			recordedAt: new Date(decision.recordedAt),
			inputRefs: decision.inputRefs,
		})
		.onConflictDoNothing();

export const appendSignal = async (db: Database, signal: Signal) =>
	db
		.insert(signals)
		.values({
			id: signal.id,
			strategyVersion: signal.strategyVersion,
			policyVersion: signal.policyVersion,
			issuerCik: signal.issuerCik,
			listingId: signal.listingId,
			direction: signal.direction,
			entryConvention: signal.entryConvention,
			decisionWindowOpen: new Date(signal.decisionWindowOpen),
			horizonCloseAt: new Date(signal.horizonCloseAt),
			rationale: signal.rationale,
			sourceIds: signal.sourceIds,
			bootstrapPrior: signal.bootstrapPrior,
			observedAt: new Date(signal.observedAt),
			recordedAt: new Date(signal.recordedAt),
			inputRefs: signal.inputRefs,
		})
		.onConflictDoNothing();

export const appendDecisionPacket = async (db: Database, packet: DecisionPacket) =>
	db
		.insert(decisionPackets)
		.values({
			id: packet.id,
			strategyVersion: packet.strategyVersion,
			policyVersion: packet.policyVersion,
			issuerCik: packet.issuerCik,
			decisionWindowOpen: new Date(packet.decisionWindowOpen),
			calendarVersion: packet.calendarVersion,
			eligibilityDecisionId: packet.eligibilityDecisionId,
			signalId: packet.signalId,
			observedAt: new Date(packet.observedAt),
			recordedAt: new Date(packet.recordedAt),
			inputRefs: packet.inputRefs,
		})
		.onConflictDoNothing();

export const listStrategyFacts = async (db: Database) => {
	const rows = await db.select().from(form4TransactionFacts);
	return rows.map((row) => ({
		id: row.id,
		issuerCik: row.issuerCik,
		reportingOwnerCik: row.reportingOwnerCik,
		transactionCode: row.transactionCode,
		acquiredDisposed: row.acquiredDisposed,
		shares: row.shares,
		pricePerShare: row.pricePerShare,
		observedAt: row.observedAt.toISOString(),
		issuerTicker: row.issuerTicker ?? undefined,
	}));
};

export const listResolvedListings = (db: Database) =>
	db
		.select({
			id: listings.id,
			ticker: listings.ticker,
			issuerCik: issuers.cik,
			securityType: listings.securityType,
		})
		.from(listings)
		.innerJoin(issuers, eq(listings.issuerId, issuers.id));

export const listSipBarsForListing = (db: Database, listingId: string) => db.select().from(sipDailyBars).where(eq(sipDailyBars.listingId, listingId));

export const listLatestCandidateSnapshots = async (db: Database) => {
	const rows = await db
		.select()
		.from(candidateSnapshots)
		.where(eq(candidateSnapshots.strategyVersion, STRATEGY_VERSION))
		.orderBy(desc(candidateSnapshots.recordedAt));
	const latest = new Map<string, (typeof rows)[number]>();
	for (const row of rows) {
		const key = `${row.issuerCik}:${row.decisionWindowOpen.toISOString()}`;
		if (!latest.has(key)) latest.set(key, row);
	}
	return [...latest.values()];
};

export const listEligibilityKeys = async (db: Database) => {
	const rows = await db.select().from(eligibilityDecisions).where(eq(eligibilityDecisions.strategyVersion, STRATEGY_VERSION));
	return new Set(rows.map((row) => `${row.issuerCik}:${row.decisionWindowOpen.toISOString()}`));
};

export const hasDueCandidates = async (db: Database, now: Date) => {
	const [row] = await db.execute<{ due: boolean }>(sql`
		SELECT EXISTS (
			SELECT 1
			FROM m1_candidate_snapshots snapshot
			WHERE snapshot.strategy_version = ${STRATEGY_VERSION}
			  AND snapshot.cutoff_at <= ${now.toISOString()}
			  AND NOT EXISTS (
			  	SELECT 1 FROM m1_eligibility_decisions decision
			  	WHERE decision.strategy_version = snapshot.strategy_version
			  	  AND decision.issuer_cik = snapshot.issuer_cik
			  	  AND decision.decision_window_open = snapshot.decision_window_open
			  )
		) AS due
	`);
	return Boolean(row?.due);
};

export const readDecisionTape = async (db: Database, asOf: Date, limit = 40) => {
	const rows = await db.execute<{ kind: string; artifact_id: string; recorded_at: Date; summary: string }>(sql`
		SELECT kind, artifact_id, recorded_at, summary FROM (
			SELECT 'candidate-snapshot' AS kind, id::text AS artifact_id, recorded_at, issuer_cik || ' window ' || decision_window_open AS summary
			FROM m1_candidate_snapshots WHERE recorded_at <= ${asOf.toISOString()}
			UNION ALL
			SELECT 'eligibility-decision', id::text, recorded_at, issuer_cik || CASE WHEN eligible THEN ' eligible' ELSE ' ineligible' END
			FROM m1_eligibility_decisions WHERE recorded_at <= ${asOf.toISOString()}
			UNION ALL
			SELECT 'signal', id::text, recorded_at, issuer_cik || ' long'
			FROM m1_signals WHERE recorded_at <= ${asOf.toISOString()}
			UNION ALL
			SELECT 'decision-packet', id::text, recorded_at, issuer_cik || ' packet'
			FROM m1_decision_packets WHERE recorded_at <= ${asOf.toISOString()}
			UNION ALL
			SELECT 'universe-snapshot', id::text, recorded_at, entry_session_date || CASE WHEN included THEN ' liquid' ELSE ' illiquid' END
			FROM m1_universe_snapshots WHERE recorded_at <= ${asOf.toISOString()}
		) tape
		ORDER BY recorded_at DESC
		LIMIT ${limit}
	`);
	return rows.map((row) => ({
		kind: row.kind as 'candidate-snapshot' | 'eligibility-decision' | 'signal' | 'decision-packet' | 'universe-snapshot',
		artifactId: row.artifact_id,
		recordedAt: new Date(row.recorded_at).toISOString(),
		summary: row.summary,
	}));
};

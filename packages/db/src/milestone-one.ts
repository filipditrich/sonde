import { desc, eq, max, sql } from 'drizzle-orm';

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

export const latestSipSessionDate = async (db: Database) => {
	const [row] = await db.select({ sessionDate: max(sipDailyBars.sessionDate) }).from(sipDailyBars);
	return row?.sessionDate ?? undefined;
};

export const listLatestCandidateSnapshots = async (db: Database) => {
	const rows = await db
		.select()
		.from(candidateSnapshots)
		.where(eq(candidateSnapshots.strategyVersion, STRATEGY_VERSION))
		.orderBy(desc(sql<number>`cardinality(${candidateSnapshots.qualifyingFactIds})`), desc(candidateSnapshots.recordedAt));
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
		SELECT (
			EXISTS (
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
			)
			AND (
				SELECT outcome FROM m0_job_run_events
				WHERE job = 'calendar-refresh' AND event = 'finished'
				ORDER BY cursor DESC
				LIMIT 1
			) = 'ok'
			AND (
				SELECT outcome FROM m0_job_run_events
				WHERE job = 'sip-daily-bars' AND event = 'finished'
				ORDER BY cursor DESC
				LIMIT 1
			) = 'ok'
		) AS due
	`);
	return Boolean(row?.due);
};

export const readDecisionTape = async (db: Database, asOf: Date, limit = 80) => {
	const instant = asOf.toISOString();
	const rows = await db.execute<{ kind: string; artifact_id: string; recorded_at: Date; summary: string }>(sql`
		SELECT kind, artifact_id, recorded_at, summary FROM (
			SELECT 'candidate-snapshot' AS kind, snapshot.id::text AS artifact_id, snapshot.recorded_at,
				snapshot.issuer_cik || ' ' || cardinality(snapshot.reporting_owner_ciks) || ' owners' || COALESCE(' SIC ' || classified.sic_major_group, '') AS summary
			FROM m1_candidate_snapshots snapshot
			LEFT JOIN LATERAL (
				SELECT sic_major_group FROM m0_issuer_sic_classifications classified
				WHERE classified.issuer_cik = snapshot.issuer_cik AND classified.recorded_at <= ${instant}
				ORDER BY classified.recorded_at DESC LIMIT 1
			) classified ON true
			WHERE snapshot.recorded_at <= ${instant}
			UNION ALL
			SELECT 'eligibility-decision', id::text, recorded_at,
				issuer_cik || CASE
					WHEN eligible THEN ' eligible'
					ELSE ' ineligible (' || COALESCE((
						SELECT string_agg(elem->>'check', ', ') FROM jsonb_array_elements(failed_checks) elem
					), 'unspecified') || ')'
				END
			FROM m1_eligibility_decisions WHERE recorded_at <= ${instant}
			UNION ALL
			SELECT 'signal', id::text, recorded_at, issuer_cik || ' long'
			FROM m1_signals WHERE recorded_at <= ${instant}
			UNION ALL
			SELECT 'decision-packet', id::text, recorded_at, issuer_cik || ' packet'
			FROM m1_decision_packets WHERE recorded_at <= ${instant}
			UNION ALL
			SELECT 'universe-snapshot', id::text, recorded_at,
				entry_session_date || CASE WHEN included THEN ' liquid' ELSE ' illiquid' END || CASE
					WHEN cardinality(exclusion_reasons) > 0 THEN ' (' || array_to_string(exclusion_reasons, ', ') || ')'
					ELSE ''
				END
			FROM m1_universe_snapshots WHERE recorded_at <= ${instant}
		) tape
		ORDER BY recorded_at DESC, CASE kind
			WHEN 'signal' THEN 0
			WHEN 'eligibility-decision' THEN 1
			WHEN 'decision-packet' THEN 2
			WHEN 'universe-snapshot' THEN 3
			ELSE 4
		END
		LIMIT ${limit}
	`);
	const tape = rows.map((row) => ({
		kind: row.kind as 'candidate-snapshot' | 'eligibility-decision' | 'signal' | 'decision-packet' | 'universe-snapshot',
		artifactId: row.artifact_id,
		recordedAt: new Date(row.recorded_at).toISOString(),
		summary: row.summary,
	}));
	return attachTapeCauses(db, tape);
};

const attachTapeCauses = async (db: Database, tape: readonly { kind: string; artifactId: string; recordedAt: string; summary: string }[]) => {
	const ids = tape.flatMap((item) => (item.kind === 'candidate-snapshot' || item.kind === 'signal' ? [item.artifactId] : []));
	if (!ids.length) return tape.map((item) => ({ ...item, causes: [] }));
	const idList = sql.join(
		ids.map((id) => sql`${id}::uuid`),
		sql`, `,
	);
	const rows = await db.execute<{
		artifact_id: string;
		fact_id: string;
		reporting_owner_cik: string;
		reporting_owner_name: string;
		transaction_code: string;
		shares: string;
		price_per_share: string;
	}>(sql`
		SELECT snapshot.id::text AS artifact_id, fact.id::text AS fact_id, fact.reporting_owner_cik, fact.reporting_owner_name,
			fact.transaction_code, fact.shares::text, fact.price_per_share
		FROM m1_candidate_snapshots snapshot
		JOIN m0_form4_transaction_facts fact ON fact.id::text = ANY(snapshot.qualifying_fact_ids)
		WHERE snapshot.id IN (${idList})
		UNION ALL
		SELECT signal.id::text, fact.id::text, fact.reporting_owner_cik, fact.reporting_owner_name,
			fact.transaction_code, fact.shares::text, fact.price_per_share
		FROM m1_signals signal
		JOIN m0_form4_transaction_facts fact ON fact.id::text = ANY(signal.source_ids)
		WHERE signal.id IN (${idList})
	`);
	const byArtifact = new Map<string, (typeof rows)[number][]>();
	for (const row of rows) {
		const group = byArtifact.get(row.artifact_id) ?? [];
		group.push(row);
		byArtifact.set(row.artifact_id, group);
	}
	return tape.map((item) => ({
		...item,
		causes: (byArtifact.get(item.artifactId) ?? []).map((row) => ({
			factId: row.fact_id,
			reportingOwnerCik: row.reporting_owner_cik,
			reportingOwnerName: row.reporting_owner_name,
			transactionCode: row.transaction_code,
			shares: row.shares,
			pricePerShare: row.price_per_share,
		})),
	}));
};

import type { CandidateSnapshot } from '@sonde/core';
import type { MarketSessionCandidate, SipDailyBarCandidate } from '@sonde/probes';
import { closeCandidate, selectCutoffSnapshots, snapshotsFromFacts, snapshotWindowKey, type CutoffListing, type StrategyFact } from '@sonde/strategy';

export type StrategyWriter = {
	listStrategyFacts(): Promise<readonly StrategyFact[]>;
	listMarketSessions(): Promise<readonly MarketSessionCandidate[]>;
	listResolvedListings(): Promise<readonly CutoffListing[]>;
	listSipBars(listingId: string): Promise<readonly SipDailyBarCandidate[]>;
	appendCandidateSnapshot(snapshot: CandidateSnapshot): Promise<void>;
	persistCutoff(result: ReturnType<typeof closeCandidate>): Promise<void>;
	listLatestCandidateSnapshots(): Promise<readonly CandidateSnapshot[]>;
	eligibilityKeys(): Promise<Set<string>>;
	hasDueCandidates(now: Date): Promise<boolean>;
};

const listingFor = (listings: readonly CutoffListing[], issuerCik: string) => listings.find((listing) => listing.issuerCik === issuerCik);

export const syncCandidateSnapshots = async (writer: StrategyWriter, recordedAt: string) => {
	const [facts, sessions] = await Promise.all([writer.listStrategyFacts(), writer.listMarketSessions()]);
	const snapshots = snapshotsFromFacts(facts, sessions, recordedAt);
	for (const snapshot of snapshots) await writer.appendCandidateSnapshot(snapshot);
	return snapshots.length;
};

export const closeDueCandidates = async (writer: StrategyWriter, now: Date) => {
	const recordedAt = now.toISOString();
	await syncCandidateSnapshots(writer, recordedAt);
	const [snapshots, keys, facts, sessions, listings] = await Promise.all([
		writer.listLatestCandidateSnapshots(),
		writer.eligibilityKeys(),
		writer.listStrategyFacts(),
		writer.listMarketSessions(),
		writer.listResolvedListings(),
	]);
	let signals = 0;
	let decisions = 0;
	for (const snapshot of selectCutoffSnapshots(snapshots)) {
		const key = snapshotWindowKey(snapshot);
		if (keys.has(key) || Date.parse(snapshot.cutoffAt) > now.getTime()) continue;
		const listing = listingFor(listings, snapshot.issuerCik);
		const bars = listing ? await writer.listSipBars(listing.id) : [];
		const result = closeCandidate({ snapshot, facts, listing, sessions, bars, alreadyDecided: false, now, recordedAt });
		await writer.persistCutoff(result);
		decisions += 1;
		if (result.signal) signals += 1;
	}
	return { signals, decisions };
};

import { expect, test } from 'bun:test';

import { STRATEGY_VERSION, type CandidateSnapshot } from '@sonde/core';
import type { MarketSessionCandidate, SipDailyBarCandidate } from '@sonde/probes';

import { closeCandidate } from './cutoff';
import { evaluateEligibility } from './eligibility';
import { distinctReportingOwners } from './owners';
import { isQualifyingPurchase } from './qualify';
import { snapshotsFromFacts, type StrategyFact } from './snapshots';

const session = (date: string): MarketSessionCandidate => ({
	calendarVersion: 'alpaca-m0',
	sessionDate: date,
	opensAt: `${date}T13:30:00.000Z`,
	closesAt: `${date}T20:00:00.000Z`,
	earlyClose: false,
	source: 'alpaca',
	observedAt: '2026-08-31T00:00:00.000Z',
});

const priorWeekdays = [
	'2026-08-03',
	'2026-08-04',
	'2026-08-05',
	'2026-08-06',
	'2026-08-07',
	'2026-08-10',
	'2026-08-11',
	'2026-08-12',
	'2026-08-13',
	'2026-08-14',
	'2026-08-17',
	'2026-08-18',
	'2026-08-19',
	'2026-08-20',
	'2026-08-21',
	'2026-08-24',
	'2026-08-25',
	'2026-08-26',
	'2026-08-27',
	'2026-08-28',
];
const laterWeekdays = [
	'2026-08-31',
	'2026-09-01',
	'2026-09-02',
	'2026-09-03',
	'2026-09-04',
	'2026-09-08',
	'2026-09-09',
	'2026-09-10',
	'2026-09-11',
	'2026-09-14',
	'2026-09-15',
	'2026-09-16',
	'2026-09-17',
	'2026-09-18',
	'2026-09-21',
	'2026-09-22',
	'2026-09-23',
	'2026-09-24',
	'2026-09-25',
	'2026-09-28',
	'2026-09-29',
];
const sessions = [...priorWeekdays, ...laterWeekdays].map(session);

const fact = (id: string, owner: string, observedAt: string, extras: Partial<StrategyFact> = {}): StrategyFact => ({
	id,
	issuerCik: '0001702750',
	reportingOwnerCik: owner,
	transactionCode: 'P',
	acquiredDisposed: 'A',
	shares: '10',
	pricePerShare: '1',
	observedAt,
	...extras,
});

const liquidBars = (listingId: string): SipDailyBarCandidate[] =>
	priorWeekdays.map((sessionDate) => ({
		listingId: listingId as never,
		sessionDate,
		feed: 'sip' as const,
		adjustment: 'raw' as const,
		open: '1',
		high: '1',
		low: '1',
		close: '1',
		volume: '2000000',
		vwap: '20',
		observedAt: '2026-08-31T00:00:00.000Z',
	}));

test('one reporting-owner CIK counts once; person and institution both count', () => {
	expect(isQualifyingPurchase({ transactionCode: 'S', acquiredDisposed: 'D', shares: '10', pricePerShare: '1' })).toBe(false);
	expect(distinctReportingOwners([fact('a', '0000000001', '2026-08-31T12:00:00.000Z'), fact('b', '0000000001', '2026-08-31T12:01:00.000Z')])).toEqual(
		['0000000001'],
	);
	expect(
		distinctReportingOwners([fact('a', '0000000001', '2026-08-31T12:00:00.000Z'), fact('b', '0000000099', '2026-08-31T12:01:00.000Z')]),
	).toHaveLength(2);
});

test('two distinct owners are required to emit a Signal and unreadiness does not block it', () => {
	expect(
		evaluateEligibility({
			due: true,
			alreadyDecided: false,
			listing: { ticker: 'CAKE', securityType: 'common' },
			universeIncluded: true,
			ownerCount: 1,
			allFactsByCutoff: true,
		}).eligible,
	).toBe(false);
	expect(
		evaluateEligibility({
			due: true,
			alreadyDecided: false,
			listing: { ticker: 'CAKE', securityType: 'common' },
			universeIncluded: true,
			ownerCount: 2,
			allFactsByCutoff: true,
		}).eligible,
	).toBe(true);
});

test('duplicate cutoff execution yields exactly one Signal identity', () => {
	const facts = [
		fact('0199a1f0-0000-7000-8000-000000000011', '0000000001', '2026-08-31T12:00:00.000Z'),
		fact('0199a1f0-0000-7000-8000-000000000012', '0000000002', '2026-08-31T12:01:00.000Z'),
	];
	const snapshots = snapshotsFromFacts(facts, sessions, '2026-08-31T12:02:00.000Z');
	const latest = snapshots.at(-1) as CandidateSnapshot;
	const listing = { id: '0199a1f0-0000-7000-8000-000000000020' as never, ticker: 'CAKE', issuerCik: '0001702750', securityType: 'common' };
	const first = closeCandidate({
		snapshot: latest,
		facts,
		listing,
		sessions,
		bars: liquidBars(listing.id),
		alreadyDecided: false,
		now: new Date('2026-08-31T13:20:00.000Z'),
		recordedAt: '2026-08-31T13:20:00.000Z',
	});
	const second = closeCandidate({
		snapshot: latest,
		facts,
		listing,
		sessions,
		bars: liquidBars(listing.id),
		alreadyDecided: false,
		now: new Date('2026-08-31T13:20:00.000Z'),
		recordedAt: '2026-08-31T13:21:00.000Z',
	});
	expect(first.signal?.id).toBe(second.signal?.id);
	expect(first.signal?.strategyVersion).toBe(STRATEGY_VERSION);
	expect(first.signal?.sourceIds.length).toBeGreaterThan(0);
	expect(first.eligibility.id).toBe(second.eligibility.id);
});

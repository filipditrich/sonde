import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { sql } from 'drizzle-orm';
import { createHash } from 'node:crypto';

import { AcquisitionAttempt, Form4TransactionFact, ParseRun, parseRunIdFrom, type ObservedAt } from '@sonde/core';

import {
	asOfForm4Facts,
	commitParse,
	createDatabase,
	persistAcquisition,
	readCockpitEventsAfter,
	readCockpitSnapshot,
	readSourceDocument,
} from './index';
import { APPEND_ONLY_TABLES } from './schema';

/** Live `DATABASE_URL` is the operator ledger; bun auto-loads `.env` and these tests TRUNCATE. */
const url = process.env.SONDE_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
const at = '2026-08-30T00:00:00.000Z';
const later = '2026-08-30T00:01:00.000Z';
const sha = '47ffa3ea45a70b8a41c2c0825df323c00a8b7a01c1ea06083cc41dddcc001123';
const missingSha = `b${sha.slice(1)}`;
const ids = {
	attempt1: '0199a1f0-0000-7000-8000-000000000001',
	attempt2: '0199a1f0-0000-7000-8000-000000000002',
	parse: '0199a1f0-0000-7000-8000-000000000003',
	fact: '0199a1f0-0000-7000-8000-000000000004',
	issuer: '0199a1f0-0000-7000-8000-000000000005',
	listing: '0199a1f0-0000-7000-8000-000000000006',
	broker: '0199a1f0-0000-7000-8000-000000000007',
	session: '0199a1f0-0000-7000-8000-000000000008',
	job: '0199a1f0-0000-7000-8000-000000000009',
	candidate: '0199a1f0-0000-7000-8000-000000000031',
	universe: '0199a1f0-0000-7000-8000-000000000032',
	eligibility: '0199a1f0-0000-7000-8000-000000000033',
	signal: '0199a1f0-0000-7000-8000-000000000034',
	packet: '0199a1f0-0000-7000-8000-000000000035',
	sic: '0199a1f0-0000-7000-8000-000000000036',
};

const failure = async (run: () => PromiseLike<unknown>, pattern: RegExp) => {
	try {
		await run();
	} catch (error) {
		const parts: string[] = [];
		let current: unknown = error;
		while (current instanceof Error) {
			parts.push(current.message);
			current = current.cause;
		}
		expect(parts.join(' | ')).toMatch(pattern);
		return;
	}
	throw new Error(`expected database rejection matching ${pattern}`);
};

suite('M0 PostgreSQL evidence contract', () => {
	const db = createDatabase(url!);
	const truncate = () =>
		db.execute(
			sql`TRUNCATE m0_cockpit_events, m0_job_run_events, m1_decision_packets, m1_signals, m1_eligibility_decisions, m1_universe_snapshots, m1_candidate_snapshots, m0_form4_transaction_facts, m0_parse_runs, m0_acquisition_attempts, m0_source_documents, m0_sip_daily_bars, m0_broker_assets, m0_listings, m0_issuer_sic_classifications, m0_issuers, m0_market_sessions, m0_runtime_checkpoints RESTART IDENTITY CASCADE`,
		);
	beforeAll(async () => {
		await truncate();
		await db.execute(
			sql`INSERT INTO m0_source_documents(sha256,bytes,byte_size,media_type,retention_class,recorded_at) VALUES(${sha},decode('00ff01','hex'),3,'application/xml','immutable',${at})`,
		);
		await db.execute(
			sql`INSERT INTO m0_acquisition_attempts(id,source,source_policy_version,method,resource,requested_at,completed_at,observed_at,document_sha256,recorded_at) VALUES(${ids.attempt1},'sec','m0','GET','https://sec.gov/feed',${at},${at},${at},${sha},${at}),(${ids.attempt2},'sec','m0','GET','https://sec.gov/feed',${later},${later},${later},${sha},${later})`,
		);
		await db.execute(
			sql`INSERT INTO m0_parse_runs(id,document_sha256,parser,parser_version,status,failure,started_at,completed_at,recorded_at,input_refs) VALUES(${ids.parse},${sha},'form4','m0','partial','{"code":"bad-row","detail":"row[1]"}'::jsonb,${at},${at},${at},${`[{"kind":"source-document","id":"${sha}","role":"parsed-document"}]`})`,
		);
		await db.execute(
			sql`INSERT INTO m0_form4_transaction_facts(id,parse_run_id,document_sha256,accession,issuer_cik,issuer_name,reporting_owner_cik,reporting_owner_name,is_director,is_officer,is_ten_percent_owner,accepted_at,transaction_date,security_title,transaction_code,acquired_disposed,ownership,shares,price_per_share,footnote_refs,source_locator,observed_at,recorded_at,input_refs) VALUES(${ids.fact},${ids.parse},${sha},'0001739310-26-000004','0001702750','Issuer','0001739310','Owner',false,false,false,${at},'2026-08-20','Common','S','D','D','100.0000000000000001','38.30','{}','row[0]',${later},${at},${`[{"kind":"source-document","id":"${sha}","role":"parsed-document"}]`})`,
		);
		await db.execute(
			sql`INSERT INTO m0_issuers(id,cik,legal_name,effective_from,recorded_at) VALUES(${ids.issuer},'0001702750','Issuer','2026-01-01',${at})`,
		);
		await db.execute(
			sql`INSERT INTO m0_issuer_sic_classifications(id,issuer_id,issuer_cik,sic,sic_major_group,sic_description,observed_at,recorded_at,input_refs) VALUES(${ids.sic},${ids.issuer},'0001702750','2834','28','Pharmaceutical Preparations',${at},${at},${`[{"kind":"source-document","id":"${sha}","role":"sec-submissions"}]`})`,
		);
		await db.execute(
			sql`INSERT INTO m0_listings(id,issuer_id,ticker,venue,security_type,effective_from,recorded_at) VALUES(${ids.listing},${ids.issuer},'ISS','NYSE','common','2026-01-01',${at})`,
		);
		await db.execute(
			sql`INSERT INTO m0_broker_assets(id,listing_id,broker,broker_asset_id,symbol,tradable,fractionable,effective_from,recorded_at) VALUES(${ids.broker},${ids.listing},'alpaca','asset','ISS',true,false,'2026-01-01',${at})`,
		);
		await db.execute(
			sql`INSERT INTO m0_sip_daily_bars(acquisition_attempt_id,listing_id,session_date,feed,adjustment,open,high,low,close,volume,vwap,observed_at,recorded_at,input_refs) VALUES(${ids.attempt1},${ids.listing},'2026-08-29','sip','raw','1','2','1','1.5','100','1.4',${at},${at},${`[{"kind":"acquisition-attempt","id":"${ids.attempt1}","role":"alpaca-sip-response"}]`})`,
		);
		await db.execute(
			sql`INSERT INTO m0_market_sessions(id,acquisition_attempt_id,calendar_version,session_date,opens_at,closes_at,early_close,source,observed_at,recorded_at,input_refs) VALUES(${ids.session},${ids.attempt1},'alpaca-1','2026-08-29','2026-08-29T13:30:00Z','2026-08-29T20:00:00Z',false,'alpaca',${at},${at},${`[{"kind":"acquisition-attempt","id":"${ids.attempt1}","role":"alpaca-calendar-response"}]`})`,
		);
		await db.execute(
			sql`INSERT INTO m0_job_run_events(id,run_id,job,lane,event,at,meta,recorded_at) VALUES(${ids.job},${ids.job},'edgar-live','ordinary','finished',${at},'{}',${at})`,
		);
		await db.execute(sql`INSERT INTO m0_runtime_checkpoints(key,value,updated_at) VALUES('sec-feed','{}',${at})`);
		await db.execute(
			sql`INSERT INTO m1_candidate_snapshots(id,strategy_version,issuer_cik,decision_window_open,cutoff_at,qualifying_fact_ids,reporting_owner_ciks,observed_at,recorded_at,input_refs) VALUES(${ids.candidate},'strategy-v1','0001702750',${at},${at},ARRAY[${ids.fact}]::text[],ARRAY['0001739310']::text[],${at},${at},${`[{"kind":"form4-transaction-fact","id":"${ids.fact}","role":"qualifying-purchase"}]`})`,
		);
		await db.execute(
			sql`INSERT INTO m1_universe_snapshots(id,policy_version,listing_id,entry_session_date,bar_keys,included,exclusion_reasons,observed_at,recorded_at,input_refs) VALUES(${ids.universe},'universe-v1-20bar',${ids.listing},'2026-08-29',ARRAY[${`${ids.listing}:2026-08-29:sip:raw`}]::text[],false,ARRAY['fixture']::text[],${at},${at},${`[{"kind":"sip-daily-bar","id":"${ids.listing}:2026-08-29:sip:raw","role":"liquidity-bar"}]`})`,
		);
		await db.execute(
			sql`INSERT INTO m1_eligibility_decisions(id,strategy_version,issuer_cik,decision_window_open,eligible,failed_checks,candidate_snapshot_id,universe_snapshot_id,observed_at,recorded_at,input_refs) VALUES(${ids.eligibility},'strategy-v1','0001702750',${at},false,'[]'::jsonb,${ids.candidate},${ids.universe},${at},${at},${`[{"kind":"candidate-snapshot","id":"${ids.candidate}","role":"closed-candidate"}]`})`,
		);
		await db.execute(
			sql`INSERT INTO m1_signals(id,strategy_version,policy_version,issuer_cik,listing_id,direction,entry_convention,decision_window_open,horizon_close_at,rationale,source_ids,bootstrap_prior,observed_at,recorded_at,input_refs) VALUES(${ids.signal},'strategy-v1','universe-v1-20bar','0001702750',${ids.listing},'long','regular-session-open',${at},${at},'fixture',ARRAY[${ids.fact}]::text[],'{"label":"multi-insider-liquid","distinctOwnerCount":2}'::jsonb,${at},${at},${`[{"kind":"eligibility-decision","id":"${ids.eligibility}","role":"eligible-cutoff"}]`})`,
		);
		await db.execute(
			sql`INSERT INTO m1_decision_packets(id,strategy_version,policy_version,issuer_cik,decision_window_open,calendar_version,eligibility_decision_id,signal_id,observed_at,recorded_at,input_refs) VALUES(${ids.packet},'strategy-v1','universe-v1-20bar','0001702750',${at},'alpaca-m0',${ids.eligibility},${ids.signal},${at},${at},${`[{"kind":"eligibility-decision","id":"${ids.eligibility}","role":"eligibility"}]`})`,
		);
	});
	afterAll(truncate);
	test('keeps bytes, repeated attempts, partial parse, decimals, and point-in-time facts', async () => {
		const bytes = await db.execute<{ encoded: string }>(sql`SELECT encode(bytes,'hex') AS encoded FROM m0_source_documents`);
		const attempts = await db.execute<{ count: number }>(
			sql`SELECT count(*)::int AS count FROM m0_acquisition_attempts WHERE document_sha256=${sha}`,
		);
		expect(bytes[0]!.encoded).toBe('00ff01');
		expect(attempts[0]!.count).toBe(2);
		expect(await asOfForm4Facts(db, at as ObservedAt)).toHaveLength(0);
		expect(await asOfForm4Facts(db, later as ObservedAt)).toHaveLength(1);
		const fact = await db.execute<{ shares: string; price_per_share: string; status: string }>(
			sql`SELECT f.shares,f.price_per_share,p.status FROM m0_form4_transaction_facts f JOIN m0_parse_runs p ON p.id=f.parse_run_id`,
		);
		expect(fact[0]!.shares).toBe('100.0000000000000001');
		expect(fact[0]!.price_per_share).toBe('38.30');
		expect(fact[0]!.status).toBe('partial');
	});
	test('rejects UPDATE and DELETE for every evidence table but permits checkpoint updates', async () => {
		const targets: Record<(typeof APPEND_ONLY_TABLES)[number], string> = {
			m0_source_documents: `sha256='${sha}'`,
			m0_acquisition_attempts: `id='${ids.attempt1}'`,
			m0_parse_runs: `id='${ids.parse}'`,
			m0_form4_transaction_facts: `id='${ids.fact}'`,
			m0_issuers: `id='${ids.issuer}'`,
			m0_issuer_sic_classifications: `id='${ids.sic}'`,
			m0_listings: `id='${ids.listing}'`,
			m0_broker_assets: `id='${ids.broker}'`,
			m0_sip_daily_bars: `listing_id='${ids.listing}'`,
			m0_market_sessions: `id='${ids.session}'`,
			m0_job_run_events: `id='${ids.job}'`,
			m0_cockpit_events: 'cursor=1',
			m1_candidate_snapshots: `id='${ids.candidate}'`,
			m1_universe_snapshots: `id='${ids.universe}'`,
			m1_eligibility_decisions: `id='${ids.eligibility}'`,
			m1_signals: `id='${ids.signal}'`,
			m1_decision_packets: `id='${ids.packet}'`,
		};
		for (const table of APPEND_ONLY_TABLES) {
			await failure(() => db.execute(sql.raw(`UPDATE ${table} SET schema_version='x' WHERE ${targets[table]}`)), /append-only|restrict/i);
			await failure(() => db.execute(sql.raw(`DELETE FROM ${table} WHERE ${targets[table]}`)), /append-only|restrict/i);
		}
		await db.execute(sql`UPDATE m0_runtime_checkpoints SET value='{"etag":"x"}'::jsonb WHERE key='sec-feed'`);
	});
	test('rejects invalid foreign keys and checks', async () => {
		await failure(
			() =>
				db.execute(
					sql`INSERT INTO m0_parse_runs(id,document_sha256,parser,parser_version,status,started_at,completed_at,recorded_at,input_refs) VALUES('0199a1f0-0000-7000-8000-000000000010',${missingSha},'p','1','succeeded',${at},${at},${at},${`[{"kind":"source-document","id":"${sha}","role":"parsed-document"}]`})`,
				),
			/foreign key/i,
		);
		await failure(
			() =>
				db.execute(
					sql`INSERT INTO m0_form4_transaction_facts(id,parse_run_id,document_sha256,accession,issuer_cik,issuer_name,reporting_owner_cik,reporting_owner_name,is_director,is_officer,is_ten_percent_owner,accepted_at,transaction_date,security_title,transaction_code,acquired_disposed,ownership,shares,price_per_share,footnote_refs,source_locator,observed_at,recorded_at,input_refs) VALUES('0199a1f0-0000-7000-8000-000000000011','0199a1f0-0000-7000-8000-000000000010',${sha},'0001739310-26-000004','0001702750','I','0001739310','O',false,false,false,${at},'2026-08-20','C','S','D','D','1','1','{}','bad',${at},${at},${`[{"kind":"source-document","id":"${sha}","role":"parsed-document"}]`})`,
				),
			/foreign key/i,
		);
		await failure(
			() =>
				db.execute(
					sql`INSERT INTO m0_acquisition_attempts(id,source,source_policy_version,method,resource,requested_at,completed_at,observed_at,recorded_at) VALUES('0199a1f0-0000-7000-8000-000000000012','x','1','GET','https://x',${at},${at},${at},${at})`,
				),
			/check/i,
		);
		await failure(
			() =>
				db.execute(
					sql`INSERT INTO m0_sip_daily_bars(acquisition_attempt_id,listing_id,session_date,feed,adjustment,open,high,low,close,volume,observed_at,recorded_at,input_refs) VALUES(${ids.attempt1},${ids.listing},'2026-08-30','iex','raw','1','1','1','1','1',${at},${at},${`[{"kind":"acquisition-attempt","id":"${ids.attempt1}","role":"alpaca-sip-response"}]`})`,
				),
			/check/i,
		);
		await failure(
			() =>
				db.execute(
					sql`INSERT INTO m0_market_sessions(id,acquisition_attempt_id,calendar_version,session_date,opens_at,closes_at,early_close,source,observed_at,recorded_at,input_refs) VALUES('0199a1f0-0000-7000-8000-000000000013',${ids.attempt1},'x','2026-08-30','2026-08-30T20:00Z','2026-08-30T13:00Z',false,'x',${at},${at},${`[{"kind":"acquisition-attempt","id":"${ids.attempt1}","role":"alpaca-calendar-response"}]`})`,
				),
			/check/i,
		);
	});
	test('cockpit funnel counts match the as-of stored population', async () => {
		expect((await readCockpitSnapshot(db, new Date(at))).funnel).toEqual({
			documents: 1,
			transactions: 0,
			qualifyingPurchases: 0,
			distinctOwnerCandidates: 0,
			liquidSignals: 1,
		});
		const asOf = new Date(later);
		const snapshot = await readCockpitSnapshot(db, asOf);
		const [direct] = await db.execute<{
			documents: number;
			transactions: number;
			qualifying_purchases: number;
			distinct_owner_candidates: number;
			liquid_signals: number;
		}>(sql`
			SELECT
				(SELECT count(*)::int FROM m0_source_documents WHERE recorded_at <= ${later}) AS documents,
				(SELECT count(*)::int FROM m0_form4_transaction_facts WHERE observed_at <= ${later}) AS transactions,
				(SELECT count(*)::int FROM m0_form4_transaction_facts WHERE observed_at <= ${later} AND transaction_code = 'P' AND acquired_disposed = 'A' AND shares::numeric > 0 AND price_per_share::numeric > 0) AS qualifying_purchases,
				(SELECT count(*)::int FROM (
					SELECT DISTINCT ON (issuer_cik, decision_window_open) cardinality(reporting_owner_ciks) AS owners
					FROM m1_candidate_snapshots
					WHERE recorded_at <= ${later} AND strategy_version = 'strategy-v1'
					ORDER BY issuer_cik, decision_window_open, cardinality(qualifying_fact_ids) DESC, recorded_at DESC
				) latest WHERE owners >= 2) AS distinct_owner_candidates,
				(SELECT count(*)::int FROM m1_signals WHERE recorded_at <= ${later}) AS liquid_signals
		`);
		expect(snapshot.funnel).toEqual({
			documents: Number(direct?.documents ?? 0),
			transactions: Number(direct?.transactions ?? 0),
			qualifyingPurchases: Number(direct?.qualifying_purchases ?? 0),
			distinctOwnerCandidates: Number(direct?.distinct_owner_candidates ?? 0),
			liquidSignals: Number(direct?.liquid_signals ?? 0),
		});
	});
	test('has strictly ordered resumable cockpit events', async () => {
		const events = await readCockpitEventsAfter(db, 0);
		expect(events.length).toBeGreaterThan(1);
		for (const [index, event] of events.entries()) if (index) expect(event.cursor).toBeGreaterThan(events[index - 1]!.cursor);
		const resumed = await readCockpitEventsAfter(db, events[0]!.cursor);
		expect(resumed.every((event) => event.cursor > events[0]!.cursor)).toBe(true);
	});
	test('rejects source bytes that do not match their declared hash', async () => {
		const bytes = new Uint8Array([1, 2, 3]);
		await failure(
			() =>
				persistAcquisition(db, attemptFor('0199a1f0-0000-7000-8000-000000000021', sha, at), {
					bytes,
					mediaType: 'application/xml',
					retentionClass: 'immutable',
				}),
			/hash mismatch/i,
		);
	});
	test('commits a parse run with its facts or not at all', async () => {
		const bytes = new Uint8Array([9, 8, 7]);
		const documentSha256 = '06df4f7e1394f1c57cc6583fba4d8060a5a66f4f4771c14aeff6b9af8a28c9b3';
		await persistAcquisition(db, attemptFor('0199a1f0-0000-7000-8000-000000000022', documentSha256, later), {
			bytes,
			mediaType: 'application/xml',
			retentionClass: 'immutable',
		});
		expect((await readSourceDocument(db, documentSha256))?.sha256).toBe(documentSha256);
		const run = parseRunFor(documentSha256, later);
		const fact = factFor(documentSha256, later, '1');
		await failure(() => commitParse(db, run, [factFor(documentSha256, later, '-1')]), /check|shares/i);
		expect((await db.execute<{ count: number }>(sql`SELECT count(*)::int AS count FROM m0_parse_runs WHERE id=${run.id}`))[0]?.count).toBe(0);
		await commitParse(db, run, [fact]);
		await commitParse(db, run, [fact]);
		const counts = await db.execute<{ runs: number; facts: number }>(
			sql`SELECT (SELECT count(*)::int FROM m0_parse_runs WHERE document_sha256=${documentSha256}) AS runs, (SELECT count(*)::int FROM m0_form4_transaction_facts WHERE document_sha256=${documentSha256}) AS facts`,
		);
		expect(counts[0]).toEqual({ runs: 1, facts: 1 });
	});
	test('commitParse records an issuer and listing from a Form 4 trading symbol', async () => {
		const bytes = new Uint8Array([1, 2, 4]);
		const documentSha256 = createHash('sha256').update(bytes).digest('hex');
		await persistAcquisition(db, attemptFor('0199a1f0-0000-7000-8000-000000000025', documentSha256, later), {
			bytes,
			mediaType: 'application/xml',
			retentionClass: 'immutable',
		});
		const run = parseRunFor(documentSha256, later);
		await commitParse(db, run, [
			Form4TransactionFact.parse({
				...factFor(documentSha256, later, '2'),
				id: '0199a1f0-0000-7000-8000-000000000026',
				issuerCik: '0001111111',
				issuerName: 'Listed Co',
				issuerTicker: 'LIST',
				sourceLocator: 'nonDerivativeTransaction[listed]',
			}),
		]);
		const listing = await db.execute<{ ticker: string; cik: string }>(
			sql`SELECT listing.ticker, issuer.cik FROM m0_listings listing JOIN m0_issuers issuer ON issuer.id = listing.issuer_id WHERE listing.ticker = 'LIST'`,
		);
		expect(listing[0]).toEqual({ ticker: 'LIST', cik: '0001111111' });
	});
	test('sonde_web can read evidence and cannot insert it', async () => {
		await db.execute(sql`SET ROLE sonde_web`);
		try {
			const rows = await db.execute<{ count: number }>(sql`SELECT count(*)::int AS count FROM m0_source_documents`);
			expect(Number(rows[0]?.count)).toBeGreaterThan(0);
			await failure(
				() =>
					db.execute(
						sql`INSERT INTO m0_source_documents(sha256,bytes,byte_size,media_type,retention_class,recorded_at) VALUES(${missingSha},decode('00ff01','hex'),3,'application/xml','immutable',${at})`,
					),
				/permission denied/i,
			);
		} finally {
			await db.execute(sql`RESET ROLE`);
		}
	});
	test('rejects a derived artifact with a missing or wrong-kind input reference', async () => {
		await failure(
			() =>
				db.execute(
					sql`INSERT INTO m0_parse_runs(id,document_sha256,parser,parser_version,status,started_at,completed_at,recorded_at,input_refs) VALUES('0199a1f0-0000-7000-8000-000000000023',${sha},'form4','m0','succeeded',${at},${at},${at},${JSON.stringify([{ kind: 'listing', id: ids.listing, role: 'parsed-document' }])}::jsonb)`,
				),
			/input reference|wrong-kind|foreign key/i,
		);
	});
});

const attemptFor = (id: string, documentSha256: string, when: string) =>
	AcquisitionAttempt.parse({
		id,
		kind: 'acquisition-attempt',
		schemaVersion: 'm0',
		recordedAt: when,
		inputRefs: [],
		source: 'sec',
		sourcePolicyVersion: 'm0',
		method: 'GET',
		resource: 'https://sec.gov/fixture',
		requestedAt: when,
		completedAt: when,
		observedAt: when,
		httpStatus: 200,
		documentSha256,
		byteSize: 3,
		mediaType: 'application/xml',
	});

const parseRunFor = (documentSha256: string, when: string) =>
	ParseRun.parse({
		id: parseRunIdFrom(documentSha256, 'sec-form4', 'm0'),
		kind: 'parse-run',
		schemaVersion: 'm0',
		recordedAt: when,
		inputRefs: [{ kind: 'source-document', id: documentSha256, role: 'parsed-document' }],
		documentSha256,
		parser: 'sec-form4',
		parserVersion: 'm0',
		startedAt: when,
		completedAt: when,
		status: 'succeeded',
	});

const factFor = (documentSha256: string, when: string, shares: string) =>
	Form4TransactionFact.parse({
		id: '0199a1f0-0000-7000-8000-000000000024',
		kind: 'form4-transaction-fact',
		schemaVersion: 'm0',
		recordedAt: when,
		inputRefs: [{ kind: 'source-document', id: documentSha256, role: 'parsed-document' }],
		documentSha256,
		accession: '0001739310-26-000004',
		issuerCik: '0001702750',
		issuerName: 'Issuer',
		reportingOwnerCik: '0001739310',
		reportingOwnerName: 'Owner',
		isDirector: false,
		isOfficer: false,
		isTenPercentOwner: false,
		sourceClock: { kind: 'sec-acceptance', acceptedAt: when },
		transactionDate: '2026-08-20',
		securityTitle: 'Common',
		transactionCode: 'P',
		acquiredDisposed: 'A',
		ownership: 'D',
		shares,
		pricePerShare: '38.30',
		footnoteRefs: [],
		sourceLocator: 'nonDerivativeTransaction[0]',
		observedAt: when,
	});

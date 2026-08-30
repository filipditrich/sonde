import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { sql } from 'drizzle-orm';

import type { ObservedAt } from '@sonde/core';

import { asOfForm4Facts, createDatabase, readCockpitEventsAfter } from './index';
import { APPEND_ONLY_TABLES } from './schema';

const url = process.env.DATABASE_URL;
const suite = url ? describe : describe.skip;
const at = '2026-08-30T00:00:00.000Z';
const later = '2026-08-30T00:01:00.000Z';
const sha = 'a'.repeat(64);
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
			sql`TRUNCATE m0_cockpit_events, m0_job_run_events, m0_form4_transaction_facts, m0_parse_runs, m0_acquisition_attempts, m0_source_documents, m0_sip_daily_bars, m0_broker_assets, m0_listings, m0_issuers, m0_market_sessions, m0_runtime_checkpoints RESTART IDENTITY CASCADE`,
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
			sql`INSERT INTO m0_parse_runs(id,document_sha256,parser,parser_version,status,failure,started_at,completed_at,recorded_at) VALUES(${ids.parse},${sha},'form4','m0','partial','{"code":"bad-row","detail":"row[1]"}'::jsonb,${at},${at},${at})`,
		);
		await db.execute(
			sql`INSERT INTO m0_form4_transaction_facts(id,parse_run_id,document_sha256,accession,issuer_cik,issuer_name,reporting_owner_cik,reporting_owner_name,is_director,is_officer,is_ten_percent_owner,accepted_at,transaction_date,security_title,transaction_code,acquired_disposed,ownership,shares,price_per_share,footnote_refs,source_locator,observed_at,recorded_at) VALUES(${ids.fact},${ids.parse},${sha},'0001739310-26-000004','0001702750','Issuer','0001739310','Owner',false,false,false,${at},'2026-08-20','Common','S','D','D','100.0000000000000001','38.30','{}','row[0]',${later},${at})`,
		);
		await db.execute(
			sql`INSERT INTO m0_issuers(id,cik,legal_name,effective_from,recorded_at) VALUES(${ids.issuer},'0001702750','Issuer','2026-01-01',${at})`,
		);
		await db.execute(
			sql`INSERT INTO m0_listings(id,issuer_id,ticker,venue,security_type,effective_from,recorded_at) VALUES(${ids.listing},${ids.issuer},'ISS','NYSE','common','2026-01-01',${at})`,
		);
		await db.execute(
			sql`INSERT INTO m0_broker_assets(id,listing_id,broker,broker_asset_id,symbol,tradable,fractionable,effective_from,recorded_at) VALUES(${ids.broker},${ids.listing},'alpaca','asset','ISS',true,false,'2026-01-01',${at})`,
		);
		await db.execute(
			sql`INSERT INTO m0_sip_daily_bars(acquisition_attempt_id,listing_id,session_date,feed,adjustment,open,high,low,close,volume,vwap,observed_at,recorded_at) VALUES(${ids.attempt1},${ids.listing},'2026-08-29','sip','raw','1','2','1','1.5','100','1.4',${at},${at})`,
		);
		await db.execute(
			sql`INSERT INTO m0_market_sessions(id,acquisition_attempt_id,calendar_version,session_date,opens_at,closes_at,early_close,source,observed_at,recorded_at) VALUES(${ids.session},${ids.attempt1},'alpaca-1','2026-08-29','2026-08-29T13:30:00Z','2026-08-29T20:00:00Z',false,'alpaca',${at},${at})`,
		);
		await db.execute(
			sql`INSERT INTO m0_job_run_events(id,run_id,job,lane,event,at,meta,recorded_at) VALUES(${ids.job},${ids.job},'edgar-live','ordinary','finished',${at},'{}',${at})`,
		);
		await db.execute(sql`INSERT INTO m0_runtime_checkpoints(key,value,updated_at) VALUES('sec-feed','{}',${at})`);
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
			m0_listings: `id='${ids.listing}'`,
			m0_broker_assets: `id='${ids.broker}'`,
			m0_sip_daily_bars: `listing_id='${ids.listing}'`,
			m0_market_sessions: `id='${ids.session}'`,
			m0_job_run_events: `id='${ids.job}'`,
			m0_cockpit_events: 'cursor=1',
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
					sql`INSERT INTO m0_parse_runs(id,document_sha256,parser,parser_version,status,started_at,completed_at,recorded_at) VALUES('0199a1f0-0000-7000-8000-000000000010',${missingSha},'p','1','succeeded',${at},${at},${at})`,
				),
			/foreign key/i,
		);
		await failure(
			() =>
				db.execute(
					sql`INSERT INTO m0_form4_transaction_facts(id,parse_run_id,document_sha256,accession,issuer_cik,issuer_name,reporting_owner_cik,reporting_owner_name,is_director,is_officer,is_ten_percent_owner,accepted_at,transaction_date,security_title,transaction_code,acquired_disposed,ownership,shares,price_per_share,footnote_refs,source_locator,observed_at,recorded_at) VALUES('0199a1f0-0000-7000-8000-000000000011','0199a1f0-0000-7000-8000-000000000010',${sha},'0001739310-26-000004','0001702750','I','0001739310','O',false,false,false,${at},'2026-08-20','C','S','D','D','1','1','{}','bad',${at},${at})`,
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
					sql`INSERT INTO m0_sip_daily_bars(acquisition_attempt_id,listing_id,session_date,feed,adjustment,open,high,low,close,volume,observed_at,recorded_at) VALUES(${ids.attempt1},${ids.listing},'2026-08-30','iex','raw','1','1','1','1','1',${at},${at})`,
				),
			/check/i,
		);
		await failure(
			() =>
				db.execute(
					sql`INSERT INTO m0_market_sessions(id,acquisition_attempt_id,calendar_version,session_date,opens_at,closes_at,early_close,source,observed_at,recorded_at) VALUES('0199a1f0-0000-7000-8000-000000000013',${ids.attempt1},'x','2026-08-30','2026-08-30T20:00Z','2026-08-30T13:00Z',false,'x',${at},${at})`,
				),
			/check/i,
		);
	});
	test('has strictly ordered resumable cockpit events', async () => {
		const events = await readCockpitEventsAfter(db, 0);
		expect(events.length).toBeGreaterThan(1);
		for (const [index, event] of events.entries()) if (index) expect(event.cursor).toBeGreaterThan(events[index - 1]!.cursor);
		const resumed = await readCockpitEventsAfter(db, events[0]!.cursor);
		expect(resumed.every((event) => event.cursor > events[0]!.cursor)).toBe(true);
	});
});

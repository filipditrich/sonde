CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint
TRUNCATE m0_cockpit_events, m0_job_run_events, m0_form4_transaction_facts, m0_parse_runs, m0_sip_daily_bars, m0_market_sessions, m0_broker_assets, m0_listings, m0_issuers, m0_acquisition_attempts, m0_source_documents RESTART IDENTITY CASCADE;
--> statement-breakpoint
ALTER TABLE m0_source_documents ADD CONSTRAINT m0_source_documents_hash_matches CHECK (sha256 = encode(digest(bytes, 'sha256'), 'hex'));
--> statement-breakpoint
ALTER TABLE m0_parse_runs ADD COLUMN input_refs jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE m0_form4_transaction_facts ADD COLUMN input_refs jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE m0_market_sessions ADD COLUMN input_refs jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE m0_sip_daily_bars ADD COLUMN input_refs jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE m0_parse_runs ADD CONSTRAINT m0_parse_runs_input_refs_present CHECK (jsonb_typeof(input_refs) = 'array' AND jsonb_array_length(input_refs) >= 1);
--> statement-breakpoint
ALTER TABLE m0_form4_transaction_facts ADD CONSTRAINT m0_form4_input_refs_present CHECK (jsonb_typeof(input_refs) = 'array' AND jsonb_array_length(input_refs) >= 1);
--> statement-breakpoint
ALTER TABLE m0_market_sessions ADD CONSTRAINT m0_market_sessions_input_refs_present CHECK (jsonb_typeof(input_refs) = 'array' AND jsonb_array_length(input_refs) >= 1);
--> statement-breakpoint
ALTER TABLE m0_sip_daily_bars ADD CONSTRAINT m0_sip_bars_input_refs_present CHECK (jsonb_typeof(input_refs) = 'array' AND jsonb_array_length(input_refs) >= 1);
--> statement-breakpoint
ALTER TABLE m0_parse_runs ADD CONSTRAINT m0_parse_run_semantic_key UNIQUE (document_sha256, parser, parser_version);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION sonde_input_ref_exists(kind text, id text) RETURNS boolean AS $$
BEGIN
	RETURN CASE kind
		WHEN 'source-document' THEN EXISTS (SELECT 1 FROM m0_source_documents document WHERE document.sha256 = sonde_input_ref_exists.id)
		WHEN 'acquisition-attempt' THEN EXISTS (SELECT 1 FROM m0_acquisition_attempts attempt WHERE attempt.id::text = sonde_input_ref_exists.id)
		WHEN 'parse-run' THEN EXISTS (SELECT 1 FROM m0_parse_runs run WHERE run.id::text = sonde_input_ref_exists.id)
		WHEN 'form4-transaction-fact' THEN EXISTS (SELECT 1 FROM m0_form4_transaction_facts fact WHERE fact.id::text = sonde_input_ref_exists.id)
		WHEN 'issuer' THEN EXISTS (SELECT 1 FROM m0_issuers issuer WHERE issuer.id::text = sonde_input_ref_exists.id)
		WHEN 'listing' THEN EXISTS (SELECT 1 FROM m0_listings listing WHERE listing.id::text = sonde_input_ref_exists.id)
		WHEN 'broker-asset' THEN EXISTS (SELECT 1 FROM m0_broker_assets asset WHERE asset.id::text = sonde_input_ref_exists.id)
		WHEN 'market-session' THEN EXISTS (SELECT 1 FROM m0_market_sessions session WHERE session.id::text = sonde_input_ref_exists.id)
		WHEN 'job-run-event' THEN EXISTS (SELECT 1 FROM m0_job_run_events event WHERE event.id::text = sonde_input_ref_exists.id)
		ELSE FALSE
	END;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION sonde_expected_input_kind(table_name text) RETURNS text AS $$
BEGIN
	RETURN CASE table_name
		WHEN 'm0_parse_runs' THEN 'source-document'
		WHEN 'm0_form4_transaction_facts' THEN 'source-document'
		WHEN 'm0_market_sessions' THEN 'acquisition-attempt'
		WHEN 'm0_sip_daily_bars' THEN 'acquisition-attempt'
		ELSE NULL
	END;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION sonde_reject_bad_input_refs() RETURNS trigger AS $$
DECLARE
	ref jsonb;
	expected text;
BEGIN
	expected := sonde_expected_input_kind(TG_TABLE_NAME);
	FOR ref IN SELECT jsonb_array_elements(NEW.input_refs)
	LOOP
		IF COALESCE(ref->>'kind', '') = '' OR COALESCE(ref->>'id', '') = '' OR COALESCE(ref->>'role', '') = '' THEN
			RAISE EXCEPTION 'input reference missing kind, id, or role' USING ERRCODE = 'check_violation';
		END IF;
		IF expected IS NOT NULL AND ref->>'kind' <> expected THEN
			RAISE EXCEPTION 'wrong-kind input reference % for %', ref->>'kind', TG_TABLE_NAME USING ERRCODE = 'check_violation';
		END IF;
		IF NOT sonde_input_ref_exists(ref->>'kind', ref->>'id') THEN
			RAISE EXCEPTION 'missing input reference % %', ref->>'kind', ref->>'id' USING ERRCODE = 'foreign_key_violation';
		END IF;
	END LOOP;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER m0_parse_runs_input_refs BEFORE INSERT ON m0_parse_runs FOR EACH ROW EXECUTE FUNCTION sonde_reject_bad_input_refs();
--> statement-breakpoint
CREATE TRIGGER m0_form4_input_refs BEFORE INSERT ON m0_form4_transaction_facts FOR EACH ROW EXECUTE FUNCTION sonde_reject_bad_input_refs();
--> statement-breakpoint
CREATE TRIGGER m0_market_sessions_input_refs BEFORE INSERT ON m0_market_sessions FOR EACH ROW EXECUTE FUNCTION sonde_reject_bad_input_refs();
--> statement-breakpoint
CREATE TRIGGER m0_sip_bars_input_refs BEFORE INSERT ON m0_sip_daily_bars FOR EACH ROW EXECUTE FUNCTION sonde_reject_bad_input_refs();

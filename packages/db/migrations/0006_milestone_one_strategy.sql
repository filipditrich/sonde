CREATE TABLE m1_candidate_snapshots (
	id uuid PRIMARY KEY,
	schema_version text NOT NULL DEFAULT 'm1',
	strategy_version text NOT NULL,
	issuer_cik text NOT NULL CHECK(issuer_cik ~ '^[0-9]{10}$'),
	decision_window_open timestamptz NOT NULL,
	cutoff_at timestamptz NOT NULL,
	qualifying_fact_ids text[] NOT NULL CHECK(array_length(qualifying_fact_ids, 1) >= 1),
	reporting_owner_ciks text[] NOT NULL CHECK(array_length(reporting_owner_ciks, 1) >= 1),
	observed_at timestamptz NOT NULL,
	recorded_at timestamptz NOT NULL,
	input_refs jsonb NOT NULL,
	CHECK(jsonb_typeof(input_refs) = 'array' AND jsonb_array_length(input_refs) >= 1)
);
--> statement-breakpoint
CREATE TABLE m1_universe_snapshots (
	id uuid PRIMARY KEY,
	schema_version text NOT NULL DEFAULT 'm1',
	policy_version text NOT NULL,
	listing_id uuid REFERENCES m0_listings(id),
	entry_session_date text NOT NULL CHECK(entry_session_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
	bar_keys text[] NOT NULL,
	median_dollar_volume numeric,
	included boolean NOT NULL,
	exclusion_reasons text[] NOT NULL,
	observed_at timestamptz NOT NULL,
	recorded_at timestamptz NOT NULL,
	input_refs jsonb NOT NULL,
	CHECK(jsonb_typeof(input_refs) = 'array' AND jsonb_array_length(input_refs) >= 1)
);
--> statement-breakpoint
CREATE TABLE m1_eligibility_decisions (
	id uuid PRIMARY KEY,
	schema_version text NOT NULL DEFAULT 'm1',
	strategy_version text NOT NULL,
	issuer_cik text NOT NULL CHECK(issuer_cik ~ '^[0-9]{10}$'),
	decision_window_open timestamptz NOT NULL,
	eligible boolean NOT NULL,
	failed_checks jsonb NOT NULL,
	candidate_snapshot_id uuid NOT NULL REFERENCES m1_candidate_snapshots(id),
	universe_snapshot_id uuid REFERENCES m1_universe_snapshots(id),
	observed_at timestamptz NOT NULL,
	recorded_at timestamptz NOT NULL,
	input_refs jsonb NOT NULL,
	UNIQUE(strategy_version, issuer_cik, decision_window_open),
	CHECK(jsonb_typeof(input_refs) = 'array' AND jsonb_array_length(input_refs) >= 1)
);
--> statement-breakpoint
CREATE TABLE m1_signals (
	id uuid PRIMARY KEY,
	schema_version text NOT NULL DEFAULT 'm1',
	strategy_version text NOT NULL,
	policy_version text NOT NULL,
	issuer_cik text NOT NULL CHECK(issuer_cik ~ '^[0-9]{10}$'),
	listing_id uuid NOT NULL REFERENCES m0_listings(id),
	direction text NOT NULL CHECK(direction = 'long'),
	entry_convention text NOT NULL CHECK(entry_convention = 'regular-session-open'),
	decision_window_open timestamptz NOT NULL,
	horizon_close_at timestamptz NOT NULL,
	rationale text NOT NULL CHECK(char_length(rationale) >= 1),
	source_ids text[] NOT NULL CHECK(array_length(source_ids, 1) >= 1),
	bootstrap_prior jsonb NOT NULL,
	observed_at timestamptz NOT NULL,
	recorded_at timestamptz NOT NULL,
	input_refs jsonb NOT NULL,
	UNIQUE(strategy_version, issuer_cik, decision_window_open),
	CHECK(jsonb_typeof(input_refs) = 'array' AND jsonb_array_length(input_refs) >= 1)
);
--> statement-breakpoint
CREATE TABLE m1_decision_packets (
	id uuid PRIMARY KEY,
	schema_version text NOT NULL DEFAULT 'm1',
	strategy_version text NOT NULL,
	policy_version text NOT NULL,
	issuer_cik text NOT NULL CHECK(issuer_cik ~ '^[0-9]{10}$'),
	decision_window_open timestamptz NOT NULL,
	calendar_version text NOT NULL,
	eligibility_decision_id uuid NOT NULL REFERENCES m1_eligibility_decisions(id),
	signal_id uuid REFERENCES m1_signals(id),
	observed_at timestamptz NOT NULL,
	recorded_at timestamptz NOT NULL,
	input_refs jsonb NOT NULL,
	UNIQUE(strategy_version, issuer_cik, decision_window_open),
	CHECK(jsonb_typeof(input_refs) = 'array' AND jsonb_array_length(input_refs) >= 1)
);
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
		WHEN 'sip-daily-bar' THEN EXISTS (
			SELECT 1 FROM m0_sip_daily_bars bar
			WHERE bar.listing_id::text || ':' || bar.session_date || ':' || bar.feed || ':' || bar.adjustment = sonde_input_ref_exists.id
		)
		WHEN 'candidate-snapshot' THEN EXISTS (SELECT 1 FROM m1_candidate_snapshots snapshot WHERE snapshot.id::text = sonde_input_ref_exists.id)
		WHEN 'eligibility-decision' THEN EXISTS (SELECT 1 FROM m1_eligibility_decisions decision WHERE decision.id::text = sonde_input_ref_exists.id)
		WHEN 'signal' THEN EXISTS (SELECT 1 FROM m1_signals signal WHERE signal.id::text = sonde_input_ref_exists.id)
		WHEN 'decision-packet' THEN EXISTS (SELECT 1 FROM m1_decision_packets packet WHERE packet.id::text = sonde_input_ref_exists.id)
		WHEN 'universe-snapshot' THEN EXISTS (SELECT 1 FROM m1_universe_snapshots snapshot WHERE snapshot.id::text = sonde_input_ref_exists.id)
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
		WHEN 'm1_candidate_snapshots' THEN 'form4-transaction-fact'
		ELSE NULL
	END;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DO $$ DECLARE t text; BEGIN
	FOREACH t IN ARRAY ARRAY['m1_candidate_snapshots','m1_universe_snapshots','m1_eligibility_decisions','m1_signals','m1_decision_packets']
	LOOP
		EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION sonde_reject_m0_mutation()', t||'_append_only', t);
		EXECUTE format('CREATE TRIGGER %I BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION sonde_reject_bad_input_refs()', t||'_input_refs', t);
	END LOOP;
END $$;
--> statement-breakpoint
CREATE TRIGGER m1_candidate_cockpit AFTER INSERT ON m1_candidate_snapshots FOR EACH ROW EXECUTE FUNCTION sonde_append_cockpit_event('candidate-snapshot');
--> statement-breakpoint
CREATE TRIGGER m1_universe_cockpit AFTER INSERT ON m1_universe_snapshots FOR EACH ROW EXECUTE FUNCTION sonde_append_cockpit_event('universe-snapshot');
--> statement-breakpoint
CREATE TRIGGER m1_eligibility_cockpit AFTER INSERT ON m1_eligibility_decisions FOR EACH ROW EXECUTE FUNCTION sonde_append_cockpit_event('eligibility-decision');
--> statement-breakpoint
CREATE TRIGGER m1_signal_cockpit AFTER INSERT ON m1_signals FOR EACH ROW EXECUTE FUNCTION sonde_append_cockpit_event('signal');
--> statement-breakpoint
CREATE TRIGGER m1_packet_cockpit AFTER INSERT ON m1_decision_packets FOR EACH ROW EXECUTE FUNCTION sonde_append_cockpit_event('decision-packet');

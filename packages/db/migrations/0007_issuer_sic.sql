CREATE TABLE m0_issuer_sic_classifications (
	id uuid PRIMARY KEY,
	schema_version text NOT NULL DEFAULT 'm0',
	issuer_id uuid NOT NULL REFERENCES m0_issuers(id),
	issuer_cik text NOT NULL CHECK(issuer_cik ~ '^[0-9]{10}$'),
	sic text NOT NULL CHECK(sic ~ '^[0-9]{4}$'),
	sic_major_group text NOT NULL CHECK(sic_major_group ~ '^[0-9]{2}$' AND sic_major_group = left(sic, 2)),
	sic_description text NOT NULL CHECK(char_length(sic_description) >= 1),
	observed_at timestamptz NOT NULL,
	recorded_at timestamptz NOT NULL,
	input_refs jsonb NOT NULL,
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
		WHEN 'issuer-sic-classification' THEN EXISTS (SELECT 1 FROM m0_issuer_sic_classifications classified WHERE classified.id::text = sonde_input_ref_exists.id)
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
		WHEN 'm0_issuer_sic_classifications' THEN 'source-document'
		WHEN 'm1_candidate_snapshots' THEN 'form4-transaction-fact'
		ELSE NULL
	END;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER m0_issuer_sic_append_only BEFORE UPDATE OR DELETE ON m0_issuer_sic_classifications FOR EACH ROW EXECUTE FUNCTION sonde_reject_m0_mutation();
--> statement-breakpoint
CREATE TRIGGER m0_issuer_sic_input_refs BEFORE INSERT ON m0_issuer_sic_classifications FOR EACH ROW EXECUTE FUNCTION sonde_reject_bad_input_refs();

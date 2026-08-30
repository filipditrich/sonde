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

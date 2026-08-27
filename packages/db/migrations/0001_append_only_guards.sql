-- Append-only enforcement (ADR 0008).
--
-- Signals, their resolved outcomes, the observations behind them, and the raw payloads those
-- were derived from are the project's entire evidence base. Because LLM decisions cannot be
-- meaningfully backtested (ADR 0004), the forward record is the *only* thing Sonde can be
-- judged on — so it must not be editable, including by us, including by accident.
--
-- Enforced in the database rather than the application layer on purpose: a migration, a psql
-- session, or a future service all have to go through this.

CREATE OR REPLACE FUNCTION sonde_reject_mutation() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION
		'% is append-only: % rejected. Insert a superseding row instead. See docs/decisions/0008-append-only-signal-log.md',
		TG_TABLE_NAME, TG_OP
		USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER raw_documents_append_only
	BEFORE UPDATE OR DELETE ON raw_documents
	FOR EACH ROW EXECUTE FUNCTION sonde_reject_mutation();
--> statement-breakpoint

CREATE TRIGGER observations_append_only
	BEFORE UPDATE OR DELETE ON observations
	FOR EACH ROW EXECUTE FUNCTION sonde_reject_mutation();
--> statement-breakpoint

CREATE TRIGGER signals_append_only
	BEFORE UPDATE OR DELETE ON signals
	FOR EACH ROW EXECUTE FUNCTION sonde_reject_mutation();
--> statement-breakpoint

-- signal_results is written exactly once when a horizon elapses. An UPDATE here would mean
-- revising what happened after the fact, which is the single most corrosive thing that could
-- be done to the scoreboard.
CREATE TRIGGER signal_results_append_only
	BEFORE UPDATE OR DELETE ON signal_results
	FOR EACH ROW EXECUTE FUNCTION sonde_reject_mutation();

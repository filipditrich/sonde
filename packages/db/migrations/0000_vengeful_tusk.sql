CREATE TABLE "candles" (
	"asset" text NOT NULL,
	"venue" text NOT NULL,
	"interval" text NOT NULL,
	"open" numeric NOT NULL,
	"high" numeric NOT NULL,
	"low" numeric NOT NULL,
	"close" numeric NOT NULL,
	"volume" numeric NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"origin" text NOT NULL,
	CONSTRAINT "candles_asset_venue_interval_occurred_at_pk" PRIMARY KEY("asset","venue","interval","occurred_at")
);
--> statement-breakpoint
CREATE TABLE "observations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"probe" text NOT NULL,
	"trust_class" text NOT NULL,
	"raw_document_sha256" text NOT NULL,
	"source_url" text,
	"event_cluster_id" uuid NOT NULL,
	"outlets" text[] NOT NULL,
	"title" text,
	"body" text,
	"assets" text[] NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_documents" (
	"sha256" text PRIMARY KEY NOT NULL,
	"probe" text NOT NULL,
	"source_url" text,
	"content_type" text,
	"byte_size" numeric NOT NULL,
	"content" text NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signal_results" (
	"signal_id" uuid PRIMARY KEY NOT NULL,
	"price_at_signal" numeric NOT NULL,
	"price_at_horizon" numeric NOT NULL,
	"realized_return" numeric NOT NULL,
	"directionally_correct" boolean NOT NULL,
	"resolved_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"asset" text NOT NULL,
	"direction" text NOT NULL,
	"confidence" numeric NOT NULL,
	"horizon" text NOT NULL,
	"rationale" text NOT NULL,
	"source_ids" uuid[] NOT NULL,
	"analyst_tier" text NOT NULL,
	"analyst_model" text NOT NULL,
	"analyst_prompt_version" text NOT NULL,
	"supersedes" uuid,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_raw_document_sha256_raw_documents_sha256_fk" FOREIGN KEY ("raw_document_sha256") REFERENCES "public"."raw_documents"("sha256") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signal_results" ADD CONSTRAINT "signal_results_signal_id_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "candles_lookup_idx" ON "candles" USING btree ("asset","interval","occurred_at");--> statement-breakpoint
CREATE INDEX "observations_observed_at_idx" ON "observations" USING btree ("observed_at");--> statement-breakpoint
CREATE INDEX "observations_cluster_idx" ON "observations" USING btree ("event_cluster_id");--> statement-breakpoint
CREATE INDEX "observations_probe_idx" ON "observations" USING btree ("probe");--> statement-breakpoint
CREATE INDEX "raw_documents_fetched_at_idx" ON "raw_documents" USING btree ("fetched_at");--> statement-breakpoint
CREATE UNIQUE INDEX "signal_results_signal_id_key" ON "signal_results" USING btree ("signal_id");--> statement-breakpoint
CREATE INDEX "signals_created_at_idx" ON "signals" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "signals_asset_idx" ON "signals" USING btree ("asset");--> statement-breakpoint
CREATE INDEX "signals_analyst_idx" ON "signals" USING btree ("analyst_tier","analyst_model","analyst_prompt_version");
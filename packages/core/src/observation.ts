import * as z from 'zod';

import { AssetId, CLOCK_SKEW_TOLERANCE_MS, EventClusterId, ObservationId, ObservedAt, OccurredAt, Sha256 } from './primitives';

/**
 * How much authority a source carries, and — more importantly — whether its text was written
 * by someone who might know a trading agent is reading it.
 *
 * `adversarial` is not a slur on the platform. It is a handling instruction: this text is
 * delimited in prompts, never interpolated into instruction context, and segmented separately
 * on the scoreboard. See ADR 0011; the reason it is *safe* rather than merely careful is that
 * the reasoning plane has no venue access at all (ADR 0005).
 */
export const TrustClass = z.enum([
	/** first-party and authoritative — exchange announcements, SEC filings, FRED */
	'official',
	/** edited third-party reporting — news outlets, protocol blogs */
	'editorial',
	/** anyone may write this — social, forums, comments */
	'adversarial',
]);
export type TrustClass = z.infer<typeof TrustClass>;

/**
 * One normalized item from a probe.
 *
 * Probes fetch, normalize, deduplicate, and timestamp. They never interpret — an Observation
 * carries no opinion, only provenance. Interpretation is the analyst's job and produces a
 * Signal instead.
 */
export const Observation = z
	.object({
		id: ObservationId,

		/** which probe produced this, for health tracking and scoreboard attribution */
		probe: z.string().min(1),
		trustClass: TrustClass,

		/**
		 * Content hash of the immutable raw payload this was derived from. The trail from a
		 * trade back to the exact bytes an analyst read must never break, even if the original
		 * URL rots or is quietly edited — ADR 0008.
		 */
		rawDocumentSha256: Sha256,
		sourceUrl: z.url().optional(),

		/**
		 * Set even for a single-outlet event, so downstream code never special-cases the
		 * unclustered path. `outlets` is a feature, not bookkeeping: forty outlets carrying one
		 * story is a different signal from one outlet carrying it.
		 */
		eventClusterId: EventClusterId,
		outlets: z.array(z.string().min(1)).min(1),

		title: z.string().optional(),
		/** present only for Tier A sources that hand us content; Tier B is metadata-only (ADR 0011) */
		body: z.string().optional(),

		/** assets this is about — may be empty; relevance is the analyst's call, not the probe's */
		assets: z.array(AssetId),

		observedAt: ObservedAt,
		occurredAt: OccurredAt,
	})
	.refine(({ observedAt, occurredAt }) => Date.parse(occurredAt) - Date.parse(observedAt) <= CLOCK_SKEW_TOLERANCE_MS, {
		path: ['occurredAt'],
		error: 'occurredAt is meaningfully after observedAt — probe is likely reading the wrong field',
	});
export type Observation = z.infer<typeof Observation>;

import * as z from 'zod';

/**
 * Shared primitives. Everything downstream is built from these, so the constraints that
 * matter most to Sonde's correctness live here rather than being restated per schema.
 */

/* -------------------------------------------------------------------------------------- */
/* Time                                                                                     */
/* -------------------------------------------------------------------------------------- */

/**
 * The two timestamps are *separate branded types on purpose*.
 *
 * `occurredAt` is when the underlying event happened; `observedAt` is when Sonde saw it.
 * Point-in-time correctness depends on never confusing them, and a plain `Date` on both
 * fields means they get swapped exactly once, silently, and poison the scoreboard months
 * later. The brand makes that a compile error.
 *
 * Offsets are required — a naive datetime is ambiguous and market data is global.
 */
export const ObservedAt = z.iso.datetime({ offset: true }).brand<'ObservedAt'>();
export type ObservedAt = z.infer<typeof ObservedAt>;

export const OccurredAt = z.iso.datetime({ offset: true }).brand<'OccurredAt'>();
export type OccurredAt = z.infer<typeof OccurredAt>;

/**
 * Publisher clocks disagree with ours. A few minutes of drift is normal; an hour means the
 * probe is misreading a field. Tolerance is deliberately tight enough to catch the latter.
 */
export const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000;

/** ISO 8601 duration, used for signal horizons — `PT4H`, `P1D`, `PT30M`. */
const ISO_DURATION = /^P(?!$)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?$/;

export const Duration = z.string().regex(ISO_DURATION, 'must be an ISO 8601 duration, e.g. PT4H').brand<'Duration'>();
export type Duration = z.infer<typeof Duration>;

/* -------------------------------------------------------------------------------------- */
/* Numbers                                                                                  */
/* -------------------------------------------------------------------------------------- */

/**
 * Money and quantities are strings, never `number`.
 *
 * float64 cannot represent most decimal prices exactly, and crypto quantities routinely run
 * to eight or more places. Keeping these as branded strings means arithmetic has to go
 * through a decimal library rather than happening accidentally with `+`.
 */
const DECIMAL = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;

export const Decimal = z.string().regex(DECIMAL, 'must be a decimal string, e.g. "61204.55"').brand<'Decimal'>();
export type Decimal = z.infer<typeof Decimal>;

/** 0..1 inclusive. Calibration is tracked against realized outcomes, so the scale matters. */
export const Confidence = z.number().min(0).max(1).brand<'Confidence'>();
export type Confidence = z.infer<typeof Confidence>;

/* -------------------------------------------------------------------------------------- */
/* Identity                                                                                 */
/* -------------------------------------------------------------------------------------- */

export const Sha256 = z
	.string()
	.regex(/^[0-9a-f]{64}$/, 'must be a lowercase hex sha256')
	.brand<'Sha256'>();
export type Sha256 = z.infer<typeof Sha256>;

export const ObservationId = z.uuid().brand<'ObservationId'>();
export type ObservationId = z.infer<typeof ObservationId>;

export const SignalId = z.uuid().brand<'SignalId'>();
export type SignalId = z.infer<typeof SignalId>;

/**
 * Groups observations that are the same real-world event. One wire story syndicated to forty
 * outlets is one cluster, not forty signals and forty model calls — ADR 0011.
 */
export const EventClusterId = z.uuid().brand<'EventClusterId'>();
export type EventClusterId = z.infer<typeof EventClusterId>;

/* -------------------------------------------------------------------------------------- */
/* Assets                                                                                   */
/* -------------------------------------------------------------------------------------- */

/**
 * Asset class is part of the identifier because it decides executability.
 *
 * Sonde ingests and scores equity signals but only ever trades crypto (ADR 0012), so the
 * distinction has to survive all the way to the portfolio agent rather than living in a
 * lookup table someone forgets to consult.
 */
export const AssetClass = z.enum(['crypto', 'equity']);
export type AssetClass = z.infer<typeof AssetClass>;

export const AssetId = z
	.string()
	.regex(/^(crypto|equity):[A-Z0-9][A-Z0-9._-]*$/, 'must look like "crypto:BTC" or "equity:AAPL"')
	.brand<'AssetId'>();
export type AssetId = z.infer<typeof AssetId>;

/** Narrow an asset to its class without a lookup. */
export const assetClassOf = (asset: AssetId): AssetClass => (asset.startsWith('crypto:') ? 'crypto' : 'equity');

/** Only crypto reaches a venue — ADR 0012. */
export const isExecutable = (asset: AssetId): boolean => assetClassOf(asset) === 'crypto';

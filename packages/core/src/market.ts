import * as z from 'zod';

import { AssetId, Decimal, ObservedAt, OccurredAt } from './primitives';

/** Candle intervals Sonde stores. Matches what venues and bulk archives actually publish. */
export const Interval = z.enum(['1m', '5m', '15m', '1h', '4h', '1d']);
export type Interval = z.infer<typeof Interval>;

/**
 * One OHLCV bar.
 *
 * `occurredAt` is the bar's **open** time, which is the venue's own convention and the value
 * bulk archives key on. `observedAt` is when the row reached us, and the two differ a great
 * deal between the backfill path (importing 2019 data today) and the live path (a bar closing
 * seconds ago). Keeping both is what lets those two paths share one table without lying about
 * what was knowable when.
 */
export const Candle = z.object({
	asset: AssetId,
	venue: z.string().min(1),
	interval: Interval,

	open: Decimal,
	high: Decimal,
	low: Decimal,
	close: Decimal,
	volume: Decimal,

	/** bar open time, per the venue */
	occurredAt: OccurredAt,
	observedAt: ObservedAt,
});
export type Candle = z.infer<typeof Candle>;

/** Where a bar came from. Backfill and live are different code paths with different guarantees. */
export const CandleOrigin = z.enum(['backfill', 'live']);
export type CandleOrigin = z.infer<typeof CandleOrigin>;

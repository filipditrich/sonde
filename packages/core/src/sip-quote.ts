import * as z from 'zod';

export const CockpitSipBar = z.object({
	sessionDate: z.iso.date(),
	open: z.string().min(1),
	high: z.string().min(1),
	low: z.string().min(1),
	close: z.string().min(1),
	volume: z.string().min(1),
	vwap: z.string().min(1).optional(),
});
export type CockpitSipBar = z.infer<typeof CockpitSipBar>;

export const ChartRange = z.enum(['1d', '5d', '1m', '6m', 'ytd', '1y', '5y', 'max']);
export type ChartRange = z.infer<typeof ChartRange>;

export const CockpitListingQuote = z.object({
	ticker: z.string().min(1),
	venue: z.string().min(1),
	listingId: z.string().min(1),
	issuerCik: z.string().regex(/^\d{10}$/),
	issuerName: z.string().min(1),
	href: z.string().min(1).optional(),
	feed: z.literal('sip'),
	delay: z.literal('delayed-daily'),
	bars: z.array(CockpitSipBar),
});
export type CockpitListingQuote = z.infer<typeof CockpitListingQuote>;

const RANGE_BARS: Record<Exclude<ChartRange, 'ytd' | 'max' | '1d'>, number> = {
	'5d': 5,
	'1m': 21,
	'6m': 126,
	'1y': 252,
	'5y': 1260,
};

const frac = (value: string) => (value.split('.')[1] ?? '').length;

const toScaled = (value: string, scale: number) => {
	const sign = value.startsWith('-') ? -1n : 1n;
	const [integer = '0', fraction = ''] = value.replace('-', '').split('.');
	return sign * BigInt(`${integer}${fraction.padEnd(scale, '0')}`);
};

const fromScaled = (value: bigint, scale: number) => {
	const sign = value < 0n ? '-' : '';
	const digits = (value < 0n ? -value : value).toString().padStart(scale + 1, '0');
	const whole = digits.slice(0, -scale) || '0';
	const fraction = digits.slice(-scale).replace(/0+$/, '');
	return fraction ? `${sign}${whole}.${fraction}` : `${sign}${whole}`;
};

/** Exact decimal subtraction for quote display; never Number. */
export const subtractDecimals = (left: string, right: string) => {
	const scale = Math.max(frac(left), frac(right), 1);
	return fromScaled(toScaled(left, scale) - toScaled(right, scale), scale);
};

/** Compare decimal strings without Number. Negative when left < right. */
export const compareDecimals = (left: string, right: string) => {
	const scale = Math.max(frac(left), frac(right), 1);
	const delta = toScaled(left, scale) - toScaled(right, scale);
	return delta < 0n ? -1 : delta > 0n ? 1 : 0;
};

/** `(last - previous) / previous * 100` as a decimal string. */
export const percentChange = (last: string, previous: string) => {
	if (/^-?0+(?:\.0+)?$/.test(previous)) return undefined;
	const scale = Math.max(frac(last), frac(previous), 4);
	const delta = toScaled(last, scale) - toScaled(previous, scale);
	const base = toScaled(previous, scale);
	return fromScaled((delta * 10000n) / base, 2);
};

export const signedDecimal = (value: string) => (value.startsWith('-') || value === '0' ? value : `+${value}`);

export const sessionChange = (bars: readonly CockpitSipBar[]) => {
	const last = bars.at(-1);
	const previous = bars.at(-2);
	if (!last || !previous) return undefined;
	const change = subtractDecimals(last.close, previous.close);
	const pct = percentChange(last.close, previous.close);
	return { last, previous, change, pct, direction: change.startsWith('-') ? 'down' : change === '0' ? 'flat' : 'up' } as const;
};

/** Slice retained daily bars for a chart range. `1d` is the last session — no intraday. */
export const barsForRange = (bars: readonly CockpitSipBar[], range: ChartRange) => {
	if (range === 'max') return [...bars];
	if (range === '1d') return bars.slice(-1);
	if (range === 'ytd') {
		const last = bars.at(-1)?.sessionDate;
		if (!last) return [];
		const start = `${last.slice(0, 4)}-01-01`;
		return bars.filter((bar) => bar.sessionDate >= start);
	}
	return bars.slice(-RANGE_BARS[range]);
};

export const weekRange = (bars: readonly CockpitSipBar[]) => {
	const window = bars.slice(-252);
	const head = window[0];
	if (!head) return undefined;
	return {
		sessions: window.length,
		high: window.reduce((best, bar) => (compareDecimals(bar.high, best) > 0 ? bar.high : best), head.high),
		low: window.reduce((best, bar) => (compareDecimals(bar.low, best) < 0 ? bar.low : best), head.low),
	};
};

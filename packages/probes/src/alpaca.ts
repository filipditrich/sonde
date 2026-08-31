import {
	Decimal,
	MarketSession,
	SipDailyBar,
	type ArtifactId,
	type MarketCloseAt,
	type MarketOpenAt,
	type ObservedAt,
	type RecordedAt,
} from '@sonde/core';

import { fetchFailureCode, type FetchResult } from './fetch';

export type AlpacaFetch = (url: string, init: RequestInit) => Promise<Response>;
export type AlpacaCredentials = { readonly key: string; readonly secret: string };
export type LiquidityProjection = { readonly ready: boolean; readonly medianDollarVolume?: string; readonly reason?: string };
export type AlpacaCapture = { readonly resource: string; readonly result: FetchResult };
export type MarketSessionCandidate = {
	readonly calendarVersion: string;
	readonly sessionDate: string;
	readonly opensAt: string;
	readonly closesAt: string;
	readonly earlyClose: boolean;
	readonly source: 'alpaca';
	readonly observedAt: string;
};
export type SipDailyBarCandidate = {
	readonly listingId: ArtifactId;
	readonly sessionDate: string;
	readonly feed: 'sip';
	readonly adjustment: 'raw';
	readonly open: string;
	readonly high: string;
	readonly low: string;
	readonly close: string;
	readonly volume: string;
	readonly vwap?: string;
	readonly observedAt: string;
};

type WireBar = { t?: string; o?: string; h?: string; l?: string; c?: string; v?: string; vw?: string };
const ALPACA_DATA_URL = 'https://data.alpaca.markets';
const ALPACA_PAPER_URL = 'https://paper-api.alpaca.markets';

/** Civil date in America/New_York minus one day — completed sessions only, never same-day SIP. */
export const previousEasternDate = (now: Date): string => {
	const eastern = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
	const cursor = new Date(`${eastern}T12:00:00.000Z`);
	cursor.setUTCDate(cursor.getUTCDate() - 1);
	return cursor.toISOString().slice(0, 10);
};

/** Quotes only known numeric market fields before JSON.parse so values never enter Number. */
const parseLosslessBars = (body: string): { bars?: WireBar[] } =>
	JSON.parse(body.replace(/("(?:o|h|l|c|v|vw)"\s*:\s*)(-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?)(?=\s*[,}])/g, '$1"$2"')) as {
		bars?: WireBar[];
	};

const compareDecimal = (left: string, right: string): number => {
	const negativeLeft = left.startsWith('-');
	const negativeRight = right.startsWith('-');
	if (negativeLeft !== negativeRight) return negativeLeft ? -1 : 1;
	const [leftInteger = '0', leftFraction = ''] = left.replace('-', '').split('.');
	const [rightInteger = '0', rightFraction = ''] = right.replace('-', '').split('.');
	const width = Math.max(leftInteger.length, rightInteger.length);
	const scale = Math.max(leftFraction.length, rightFraction.length);
	const normalizedLeft = `${leftInteger.padStart(width, '0')}${leftFraction.padEnd(scale, '0')}`;
	const normalizedRight = `${rightInteger.padStart(width, '0')}${rightFraction.padEnd(scale, '0')}`;
	const comparison = normalizedLeft === normalizedRight ? 0 : normalizedLeft > normalizedRight ? 1 : -1;
	return negativeLeft ? -comparison : comparison;
};

/** Exact-decimal multiplication for finite decimal strings, avoiding Number at the market boundary. */
export const multiplyDecimals = (left: string, right: string): string => {
	const [li, lf = ''] = left.split('.');
	const [ri, rf = ''] = right.split('.');
	const scale = lf.length + rf.length;
	const a = BigInt(`${li}${lf}`);
	const b = BigInt(`${ri}${rf}`);
	const raw = (a * b).toString();
	if (scale === 0) return raw;
	const negative = raw.startsWith('-');
	const digits = negative ? raw.slice(1) : raw;
	const padded = digits.padStart(scale + 1, '0');
	return `${negative ? '-' : ''}${padded.slice(0, -scale)}.${padded.slice(-scale)}`.replace(/\.?(0+)$/, '') || '0';
};

const averageDecimals = (left: string, right: string): string => {
	const [li, lf = ''] = left.split('.');
	const [ri, rf = ''] = right.split('.');
	const scale = Math.max(lf.length, rf.length);
	const sum = BigInt(`${li}${lf.padEnd(scale, '0')}`) + BigInt(`${ri}${rf.padEnd(scale, '0')}`);
	const sign = sum < 0n ? '-' : '';
	const absolute = sum < 0n ? -sum : sum;
	const half = absolute / 2n;
	const odd = absolute % 2n !== 0n;
	const digits = half.toString().padStart(scale + 1, '0');
	const base = scale ? `${digits.slice(0, -scale)}.${digits.slice(-scale)}` : digits;
	return `${sign}${odd ? (scale ? `${base}5` : `${base}.5`) : base}`.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '') || '0';
};

/** M0's exact 20 completed-session liquidity value. Any non-SIP/missing-VWAP bar is not ready. */
export const completedTwentyBarLiquidity = (bars: readonly Pick<SipDailyBarCandidate, 'feed' | 'vwap' | 'volume'>[]): LiquidityProjection => {
	if (bars.length !== 20 || bars.some((bar) => bar.feed !== 'sip' || !bar.vwap))
		return { ready: false, reason: 'twenty completed SIP bars with VWAP are required' };
	const dollars = bars.map((bar) => multiplyDecimals(bar.vwap!, bar.volume)).sort(compareDecimal);
	return { ready: true, medianDollarVolume: averageDecimals(dollars[9]!, dollars[10]!) };
};

export const ALPACA_MIN_INTERVAL_MS = 200;
let lastAlpacaRequestAt = 0;

const paceAlpaca = async () => {
	const wait = lastAlpacaRequestAt + ALPACA_MIN_INTERVAL_MS - Date.now();
	if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
	lastAlpacaRequestAt = Date.now();
};

const headers = (credentials: AlpacaCredentials) => ({ 'APCA-API-KEY-ID': credentials.key, 'APCA-API-SECRET-KEY': credentials.secret });
const requestAlpaca = async (resource: string, credentials: AlpacaCredentials, fetchImpl: AlpacaFetch, now: () => Date): Promise<AlpacaCapture> => {
	await paceAlpaca();
	const requestedAt = now().toISOString();
	try {
		const response = await fetchImpl(resource, { headers: headers(credentials) });
		const completedAt = now().toISOString();
		if (!response.ok)
			return {
				resource,
				result: {
					status: 'failed',
					httpStatus: response.status,
					requestedAt,
					completedAt,
					failure: { code: 'alpaca-http', detail: `Alpaca returned ${response.status}` },
				},
			};
		const bytes = new Uint8Array(await response.arrayBuffer());
		return {
			resource,
			result: {
				status: 'ok',
				body: new TextDecoder().decode(bytes),
				bytes,
				httpStatus: response.status,
				requestedAt,
				completedAt,
				validators: { etag: response.headers.get('etag') ?? undefined, lastModified: response.headers.get('last-modified') ?? undefined },
				mediaType: response.headers.get('content-type')?.split(';')[0] ?? 'application/json',
			},
		};
	} catch (error) {
		return {
			resource,
			result: {
				status: 'failed',
				requestedAt,
				completedAt: now().toISOString(),
				failure: { code: 'alpaca-network', detail: error instanceof Error ? error.message : String(error) },
			},
		};
	}
};

const decimal = (value: string | undefined): string | undefined => Decimal.safeParse(value ?? '').data;
const time = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const easternOffset = (date: string): string | undefined => {
	const [year, month, day] = date.split('-').map(Number);
	const zone = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'longOffset' })
		.formatToParts(new Date(Date.UTC(year!, month! - 1, day!, 12)))
		.find((part) => part.type === 'timeZoneName')?.value;
	return zone?.replace('GMT', '');
};

export const fetchSipDailyBars = async (input: {
	readonly listingId: ArtifactId;
	readonly symbol: string;
	readonly credentials: AlpacaCredentials;
	readonly fetchImpl?: AlpacaFetch;
	readonly now?: () => Date;
}): Promise<{ readonly capture: AlpacaCapture; readonly bars: readonly SipDailyBarCandidate[]; readonly failure?: string }> => {
	const url = new URL(`${ALPACA_DATA_URL}/v2/stocks/${encodeURIComponent(input.symbol)}/bars`);
	url.searchParams.set('timeframe', '1Day');
	url.searchParams.set('feed', 'sip');
	url.searchParams.set('adjustment', 'raw');
	url.searchParams.set('limit', '1000');
	const now = input.now ?? (() => new Date());
	const instant = now().getTime();
	const day = 86_400_000;
	url.searchParams.set('start', new Date(instant - 400 * day).toISOString().slice(0, 10));
	/** paper SIP 403s same-day bars; ask only through the last completed Eastern date */
	url.searchParams.set('end', previousEasternDate(now()));
	const capture = await requestAlpaca(url.toString(), input.credentials, input.fetchImpl ?? globalThis.fetch, now);
	if (capture.result.status !== 'ok') return { capture, bars: [], failure: fetchFailureCode(capture.result) ?? 'alpaca-unknown' };
	let payload: { bars?: WireBar[] };
	try {
		payload = parseLosslessBars(capture.result.body);
	} catch {
		return { capture, bars: [], failure: 'alpaca-sip-invalid-json' };
	}
	const observedAt = capture.result.completedAt;
	const bars = (payload.bars ?? []).flatMap((bar): SipDailyBarCandidate[] => {
		const sessionDate = bar.t?.slice(0, 10);
		const [open, high, low, close, volume, vwap] = [bar.o, bar.h, bar.l, bar.c, bar.v, bar.vw].map(decimal);
		if (!sessionDate || !open || !high || !low || !close || !volume || [open, high, low, close, volume, vwap].some((value) => value?.startsWith('-')))
			return [];
		return [
			{
				listingId: input.listingId,
				sessionDate,
				feed: 'sip',
				adjustment: 'raw',
				open,
				high,
				low,
				close,
				volume,
				...(vwap ? { vwap } : {}),
				observedAt,
			},
		];
	});
	return bars.length === (payload.bars?.length ?? 0) ? { capture, bars } : { capture, bars, failure: 'alpaca-sip-invalid-bars' };
};

/** Keep the newest captured calendar version so a fixture or stale version cannot invent sessions. */
export const activeCalendarSessions = <T extends { calendarVersion: string; observedAt: string }>(sessions: readonly T[]): T[] => {
	const latest = sessions.reduce<T | undefined>((current, session) => {
		if (!current) return session;
		return session.observedAt >= current.observedAt ? session : current;
	}, undefined);
	return latest ? sessions.filter((session) => session.calendarVersion === latest.calendarVersion) : [];
};

/** Returns the latest exactly-twenty completed sessions, rejecting gaps and the still-open session. */
export const selectCompletedSipBars = (
	bars: readonly SipDailyBarCandidate[],
	sessions: readonly MarketSessionCandidate[],
	now: Date,
): { bars: readonly SipDailyBarCandidate[]; failure?: string } => {
	const completed = activeCalendarSessions(sessions)
		.filter((session) => new Date(session.closesAt) <= now)
		.sort((left, right) => left.sessionDate.localeCompare(right.sessionDate));
	if (completed.length < 20) return { bars: [], failure: 'alpaca-sip-fewer-than-twenty-completed-sessions' };
	const expected = completed.slice(-20).map((session) => session.sessionDate);
	const byDate = new Map(bars.map((bar) => [bar.sessionDate, bar]));
	const selected = expected.map((date) => byDate.get(date));
	if (selected.some((bar) => !bar)) return { bars: [], failure: 'alpaca-sip-gapped-completed-sessions' };
	return { bars: selected as SipDailyBarCandidate[] };
};

export const materializeSipDailyBars = (bars: readonly SipDailyBarCandidate[], acquisitionAttemptId: ArtifactId): SipDailyBar[] =>
	bars.map((bar) =>
		SipDailyBar.parse({
			id: crypto.randomUUID(),
			kind: 'sip-daily-bar',
			schemaVersion: 'm0',
			recordedAt: bar.observedAt as RecordedAt,
			inputRefs: [{ kind: 'acquisition-attempt', id: acquisitionAttemptId, role: 'alpaca-sip-response' }],
			...bar,
		}),
	);

export const fetchAlpacaCalendar = async (input: {
	credentials: AlpacaCredentials;
	fetchImpl?: AlpacaFetch;
	now?: () => Date;
	calendarVersion: string;
}): Promise<{ capture: AlpacaCapture; sessions: readonly MarketSessionCandidate[]; failure?: string }> => {
	const now = input.now ?? (() => new Date());
	const instant = now().getTime();
	const day = 86_400_000;
	const calendar = new URL(`${ALPACA_PAPER_URL}/v2/calendar`);
	calendar.searchParams.set('start', new Date(instant - 400 * day).toISOString().slice(0, 10));
	calendar.searchParams.set('end', new Date(instant + 180 * day).toISOString().slice(0, 10));
	const capture = await requestAlpaca(calendar.toString(), input.credentials, input.fetchImpl ?? globalThis.fetch, now);
	if (capture.result.status !== 'ok') return { capture, sessions: [], failure: fetchFailureCode(capture.result) ?? 'alpaca-unknown' };
	let rows: Array<{ date?: string; open?: string; close?: string }>;
	try {
		rows = JSON.parse(capture.result.body) as Array<{ date?: string; open?: string; close?: string }>;
	} catch {
		return { capture, sessions: [], failure: 'alpaca-calendar-invalid-json' };
	}
	const observedAt = capture.result.completedAt;
	const sessions = rows.flatMap((row): MarketSessionCandidate[] => {
		const offset = row.date ? easternOffset(row.date) : undefined;
		if (!row.date || !row.open || !row.close || !time.test(row.open) || !time.test(row.close) || !offset || row.open >= row.close) return [];
		return [
			{
				calendarVersion: input.calendarVersion,
				sessionDate: row.date,
				opensAt: `${row.date}T${row.open}:00${offset}`,
				closesAt: `${row.date}T${row.close}:00${offset}`,
				earlyClose: row.close !== '16:00',
				source: 'alpaca',
				observedAt,
			},
		];
	});
	return sessions.length === rows.length ? { capture, sessions } : { capture, sessions, failure: 'alpaca-calendar-invalid-row' };
};

export const materializeMarketSessions = (sessions: readonly MarketSessionCandidate[], acquisitionAttemptId: ArtifactId): MarketSession[] =>
	sessions.map((session) =>
		MarketSession.parse({
			id: crypto.randomUUID(),
			kind: 'market-session',
			schemaVersion: 'm0',
			recordedAt: session.observedAt as RecordedAt,
			inputRefs: [{ kind: 'acquisition-attempt', id: acquisitionAttemptId, role: 'alpaca-calendar-response' }],
			...session,
			opensAt: session.opensAt as MarketOpenAt,
			closesAt: session.closesAt as MarketCloseAt,
			observedAt: session.observedAt as ObservedAt,
		}),
	);

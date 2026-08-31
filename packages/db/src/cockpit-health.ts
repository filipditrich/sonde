export const ORDINARY_JOBS = ['edgar-live', 'edgar-reconcile', 'calendar-refresh', 'sip-daily-bars', 'sic-refresh', 'decision-cutoff'] as const;
export type JobFreshness = 'fresh' | 'quiet' | 'stale' | 'unseen';
export type EngineFreshness = 'fresh' | 'stale' | 'unseen';

export const ENGINE_HEARTBEAT_KEY = 'engine-heartbeat';
export const ENGINE_STALE_MS = 45_000;

/** A missing or old heartbeat means the engine process is gone, not that collectors are quiet. */
export const engineFreshnessOf = (lastBeatAt: string | undefined, asOf: Date): EngineFreshness => {
	if (!lastBeatAt) return 'unseen';
	const age = asOf.getTime() - Date.parse(lastBeatAt);
	if (!Number.isFinite(age) || age > ENGINE_STALE_MS) return 'stale';
	return 'fresh';
};

const LIVE_STALE_MS = 15 * 60_000;
const DAILY_STALE_MS = 36 * 60 * 60_000;
const staleAfterMs = (job: string) => (job === 'edgar-live' ? LIVE_STALE_MS : DAILY_STALE_MS);

const emptyCount = (meta: Record<string, string> | undefined) => meta?.documents === '0' || meta?.sessions === '0' || meta?.bars === '0';

/** Quiet is a recent successful empty poll; stale is a collector we have not heard from in time. */
export const freshnessOf = (input: {
	job: string;
	lastEventAt: string;
	event?: string;
	outcome?: string;
	meta?: Record<string, string>;
	asOf: Date;
}): JobFreshness => {
	const age = input.asOf.getTime() - Date.parse(input.lastEventAt);
	if (!Number.isFinite(age) || age > staleAfterMs(input.job)) return 'stale';
	if (input.outcome === 'ok' && emptyCount(input.meta)) return 'quiet';
	return 'fresh';
};

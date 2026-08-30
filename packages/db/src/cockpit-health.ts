export const ORDINARY_JOBS = ['edgar-live', 'edgar-reconcile', 'calendar-refresh', 'sip-daily-bars'] as const;
export type JobFreshness = 'fresh' | 'quiet' | 'stale' | 'unseen';

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

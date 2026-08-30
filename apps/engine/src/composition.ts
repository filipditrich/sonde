import type { Job } from './scheduler';
import { Scheduler } from './scheduler';

export type EngineJobs = { edgarLive: Job; edgarReconcile: Job; calendarRefresh: Job; sipDailyBars: Job };
export type EngineRuntime = { stop(): void };

/** Registers ordinary M0 jobs only; priority remains isolated for future market actions. */
export const startEngine = (
	scheduler: Scheduler,
	jobs: EngineJobs,
	timers: { setInterval: typeof setInterval; clearInterval: typeof clearInterval } = globalThis,
): EngineRuntime => {
	const invoke = (job: Job) => {
		void scheduler.run(job);
	};
	invoke(jobs.edgarLive);
	invoke(jobs.edgarReconcile);
	invoke(jobs.calendarRefresh);
	invoke(jobs.sipDailyBars);
	const handles = [
		timers.setInterval(() => invoke(jobs.edgarLive), 5 * 60_000),
		timers.setInterval(() => invoke(jobs.edgarReconcile), 24 * 60 * 60_000),
		timers.setInterval(() => invoke(jobs.calendarRefresh), 24 * 60 * 60_000),
		timers.setInterval(() => invoke(jobs.sipDailyBars), 24 * 60 * 60_000),
	];
	return { stop: () => handles.forEach((handle) => timers.clearInterval(handle)) };
};

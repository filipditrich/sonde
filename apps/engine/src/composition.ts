import type { Job } from './scheduler';
import { Scheduler } from './scheduler';

export type PriorityJob = Job & { due(): Promise<boolean> };
export type EngineJobs = {
	edgarLive: Job;
	edgarReconcile: Job;
	calendarRefresh: Job;
	sipDailyBars: Job;
	sicRefresh: Job;
	decisionCutoff: PriorityJob;
};
export type EngineRuntime = { stop(): void };

const PRIORITY_POLL_MS = 1_000;
export const ENGINE_HEARTBEAT_MS = 15_000;

/** Ordinary collectors on intervals; priority cutoff is polled and never queued behind EDGAR. */
export const startEngine = (
	scheduler: Scheduler,
	jobs: EngineJobs,
	timers: { setInterval: typeof setInterval; clearInterval: typeof clearInterval } = globalThis,
	beat?: () => void,
): EngineRuntime => {
	const invoke = (job: Job) => {
		void scheduler.run(job);
	};
	const invokePriority = () => {
		void jobs.decisionCutoff.due().then((ready) => {
			if (ready) invoke(jobs.decisionCutoff);
		});
	};
	const invokeIfDue = (job: Job) => {
		if (!job.due) return;
		void job.due().then((ready) => {
			if (ready) invoke(job);
		});
	};
	invoke(jobs.edgarLive);
	invoke(jobs.edgarReconcile);
	void scheduler.run(jobs.calendarRefresh).then(() => scheduler.run(jobs.sipDailyBars));
	invoke(jobs.sicRefresh);
	invokePriority();
	const handles = [
		timers.setInterval(() => invoke(jobs.edgarLive), 5 * 60_000),
		timers.setInterval(() => invoke(jobs.edgarReconcile), 24 * 60 * 60_000),
		timers.setInterval(() => invoke(jobs.calendarRefresh), 24 * 60 * 60_000),
		timers.setInterval(() => invoke(jobs.sipDailyBars), 24 * 60 * 60_000),
		timers.setInterval(() => invokeIfDue(jobs.sipDailyBars), 30_000),
		timers.setInterval(() => invoke(jobs.sicRefresh), 24 * 60 * 60_000),
		timers.setInterval(() => invokeIfDue(jobs.sicRefresh), 30_000),
		timers.setInterval(invokePriority, PRIORITY_POLL_MS),
	];
	if (beat) {
		beat();
		handles.push(timers.setInterval(beat, ENGINE_HEARTBEAT_MS));
	}
	return { stop: () => handles.forEach((handle) => timers.clearInterval(handle)) };
};

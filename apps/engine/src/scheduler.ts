import { JobRunEvent } from '@sonde/core';

export type Lane = 'ordinary' | 'priority';
export type Job = {
	readonly name: string;
	readonly lane: Lane;
	readonly run: () => Promise<{ readonly outcome: string; readonly meta?: Record<string, string> }>;
	readonly due?: () => Promise<boolean>;
};
export type JobEventSink = { append(event: JobRunEvent): Promise<void> };

export class Scheduler {
	readonly #running = new Set<string>();
	constructor(
		private readonly sink: JobEventSink,
		private readonly now: () => string = () => new Date().toISOString(),
	) {}
	async run(job: Job): Promise<void> {
		if (this.#running.has(job.name)) return this.#append({ job, runId: crypto.randomUUID(), event: 'skipped-overlap', outcome: 'overlap' });
		this.#running.add(job.name);
		const runId = crypto.randomUUID();
		await this.#append({ job, runId, event: 'started' });
		try {
			const result = await job.run();
			await this.#append({ job, runId, event: 'finished', outcome: result.outcome, meta: result.meta });
		} catch (error) {
			await this.#append({ job, runId, event: 'failed', meta: { error: error instanceof Error ? error.message : String(error) } });
		} finally {
			this.#running.delete(job.name);
		}
	}
	async #append({
		job,
		runId,
		event,
		outcome,
		meta = {},
	}: {
		job: Job;
		runId: string;
		event: JobRunEvent['event'];
		outcome?: string;
		meta?: Record<string, string>;
	}): Promise<void> {
		const at = this.now();
		await this.sink.append(
			JobRunEvent.parse({
				id: crypto.randomUUID(),
				kind: 'job-run-event',
				schemaVersion: 'm0',
				recordedAt: at,
				inputRefs: [],
				runId,
				job: job.name,
				lane: job.lane,
				event,
				at,
				...(outcome ? { outcome } : {}),
				meta,
			}),
		);
	}
}

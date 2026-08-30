import { appendJobRunEvent, createDatabase } from '@sonde/db';
import { PoliteFetcher, secProfile } from '@sonde/probes';

import { startEngine } from './composition';
import { ingestEdgarPoll } from './jobs';
import { createEvidenceWriter } from './repository';
import { Scheduler } from './scheduler';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required to run the engine');
const contact = process.env.SONDE_CONTACT_EMAIL;
const db = createDatabase(url);
const scheduler = new Scheduler({
	append: async (event) => {
		await appendJobRunEvent(db, event);
	},
});
const writer = createEvidenceWriter(db);
const fetcher = new PoliteFetcher(secProfile(contact));
const unconfigured = (name: string) => ({
	name,
	lane: 'ordinary' as const,
	run: async () => {
		throw new Error(`${name} adapter requires explicit runtime configuration`);
	},
});
startEngine(scheduler, {
	edgarLive: {
		name: 'edgar-live',
		lane: 'ordinary',
		run: async () => ({
			outcome: 'ok',
			meta: await ingestEdgarPoll(fetcher, writer).then((result) => ({ documents: String(result.documents), facts: String(result.facts) })),
		}),
	},
	edgarReconcile: {
		name: 'edgar-reconcile',
		lane: 'ordinary',
		run: async () => ({
			outcome: 'reconcile-live-feed',
			meta: await ingestEdgarPoll(fetcher, writer).then((result) => ({ documents: String(result.documents) })),
		}),
	},
	calendarRefresh: unconfigured('calendar-refresh'),
	sipDailyBars: unconfigured('sip-daily-bars'),
});

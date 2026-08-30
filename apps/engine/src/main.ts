import { appendJobRunEvent, createDatabase } from '@sonde/db';
import { PoliteFetcher, secProfile } from '@sonde/probes';

import { startEngine } from './composition';
import { createOrdinaryJobs } from './jobs';
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
startEngine(scheduler, createOrdinaryJobs({ fetcher, writer }));

import { ENGINE_HEARTBEAT_KEY, appendJobRunEvent, createDatabase } from '@sonde/db';
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
const key = process.env.ALPACA_API_KEY_ID;
const secret = process.env.ALPACA_API_SECRET_KEY;
const alpaca = key && secret ? { credentials: { key, secret } } : undefined;
startEngine(scheduler, createOrdinaryJobs({ fetcher, writer, ...(alpaca ? { alpaca } : {}) }), globalThis, () => {
	void writer.saveCheckpoint(ENGINE_HEARTBEAT_KEY, { at: new Date().toISOString() });
});
console.log(`engine ordinary lane started${alpaca ? ' with Alpaca paper calendar and SIP' : ' without Alpaca credentials'}`);

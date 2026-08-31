import { createDatabase, readCockpitEventsAfter, readCockpitSnapshot } from '@sonde/db';

import { createCockpitServer } from './server';

const token = process.env.SONDE_OPERATOR_TOKEN;
const url = process.env.DATABASE_URL;
if (!token || !url) throw new Error('SONDE_OPERATOR_TOKEN and DATABASE_URL are required; web binds loopback only');
const db = createDatabase(url);
const port = Number(process.env.PORT ?? 3000);
Bun.serve({
	hostname: '127.0.0.1',
	port,
	fetch: createCockpitServer({ snapshot: () => readCockpitSnapshot(db), eventsAfter: (cursor) => readCockpitEventsAfter(db, cursor) }, token).fetch,
});
console.log(`cockpit listening on http://127.0.0.1:${port}/login`);

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

export type Database = ReturnType<typeof createDatabase>;

/**
 * `max: 1` is not a placeholder. The engine is a single long-lived process and the dashboard
 * is read-mostly; a larger pool buys nothing here and makes connection exhaustion during a
 * backfill loop harder to spot. Raise it when something actually contends.
 */
export const createDatabase = (connectionString: string, { max = 1 }: { max?: number } = {}) => {
	const sql = postgres(connectionString, { max });
	return drizzle(sql, { schema });
};

export { schema };

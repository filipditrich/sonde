import { AcquisitionAttempt } from '@sonde/core';
import {
	appendForm4Facts,
	appendMarketSession,
	appendParseRun,
	appendSipDailyBar,
	persistAcquisition,
	readRuntimeCheckpoint,
	saveRuntimeCheckpoint,
	type Database,
} from '@sonde/db';
import { type FetchResult, edgar } from '@sonde/probes';

import type { EvidenceWriter } from './jobs';

export type EngineRepository = EvidenceWriter & {
	appendMarketSessions(acquisitionAttemptId: string, sessions: readonly import('@sonde/core').MarketSession[]): Promise<void>;
	appendSipDailyBars(acquisitionAttemptId: string, bars: readonly import('@sonde/core').SipDailyBar[]): Promise<void>;
	loadCheckpoint<T>(key: string): Promise<T | undefined>;
	saveCheckpoint(key: string, value: object): Promise<void>;
};

export const createEvidenceWriter = (db: Database): EngineRepository => ({
	persistFetch: async ({ source, resource, result }: { source: string; resource: string; result: FetchResult }) => {
		const documentSha256 = result.status === 'ok' ? await edgar.documentHash(result.bytes) : undefined;
		const attempt = AcquisitionAttempt.parse({
			id: crypto.randomUUID(),
			kind: 'acquisition-attempt',
			schemaVersion: 'm0',
			recordedAt: result.completedAt,
			inputRefs: [],
			source,
			sourcePolicyVersion: 'm0',
			method: 'GET',
			resource,
			requestedAt: result.requestedAt,
			completedAt: result.completedAt,
			observedAt: result.completedAt,
			httpStatus: result.httpStatus,
			documentSha256,
			...(result.status === 'ok' ? { byteSize: result.bytes.byteLength, mediaType: result.mediaType ?? 'application/octet-stream' } : {}),
			...(result.status === 'failed' ? { failure: result.failure } : {}),
		});
		await persistAcquisition(
			db,
			attempt,
			result.status === 'ok'
				? { bytes: result.bytes, mediaType: result.mediaType ?? 'application/octet-stream', retentionClass: 'immutable' }
				: undefined,
		);
		return { attemptId: attempt.id, ...(documentSha256 ? { documentSha256 } : {}) };
	},
	appendParse: async (input) => {
		const id = crypto.randomUUID();
		await appendParseRun(db, {
			id,
			documentSha256: input.documentSha256,
			parser: 'sec-form4',
			parserVersion: 'm0',
			startedAt: new Date(input.recordedAt),
			completedAt: new Date(input.recordedAt),
			status: input.status,
			failure: input.failure,
			recordedAt: new Date(input.recordedAt),
		});
		return id;
	},
	appendFacts: (parseRunId, facts) => appendForm4Facts(db, parseRunId, facts),
	appendMarketSessions: async (acquisitionAttemptId, sessions) => {
		for (const session of sessions) await appendMarketSession(db, session, acquisitionAttemptId);
	},
	appendSipDailyBars: async (acquisitionAttemptId, bars) => {
		for (const bar of bars) await appendSipDailyBar(db, bar, acquisitionAttemptId);
	},
	loadCheckpoint: <T>(key: string) => readRuntimeCheckpoint<T>(db, key),
	saveCheckpoint: async (key, value) => {
		await saveRuntimeCheckpoint(db, key, value);
	},
});

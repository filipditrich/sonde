import { AcquisitionAttempt, ParseRun, parseRunIdFrom } from '@sonde/core';
import {
	appendMarketSession,
	appendSipDailyBar,
	commitParse,
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
	commitParse: async (input) => {
		const run = ParseRun.parse({
			id: parseRunIdFrom(input.documentSha256, edgar.FORM4_PARSER, edgar.FORM4_PARSER_VERSION),
			kind: 'parse-run',
			schemaVersion: 'm0',
			recordedAt: input.recordedAt,
			inputRefs: [{ kind: 'source-document', id: input.documentSha256, role: 'parsed-document' }],
			documentSha256: input.documentSha256,
			parser: edgar.FORM4_PARSER,
			parserVersion: edgar.FORM4_PARSER_VERSION,
			startedAt: input.recordedAt,
			completedAt: input.recordedAt,
			status: input.status,
			...(input.failure ? { failure: input.failure } : {}),
		});
		await commitParse(db, run, input.facts);
		return run.id;
	},
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

import { IssuerSicClassification, issuerSicClassificationIdFrom, type ArtifactId, type Cik, type ObservedAt, type RecordedAt } from '@sonde/core';
import { edgar, type FetchResult, type PoliteFetcher } from '@sonde/probes';

import type { Job } from './scheduler';

export type SicWriter = {
	persistFetch(input: { source: string; resource: string; result: FetchResult }): Promise<{ attemptId: string; documentSha256?: string }>;
	listIssuersMissingSic(): Promise<readonly { id: string; cik: string }[]>;
	appendIssuerSic(classification: IssuerSicClassification): Promise<void>;
};

const classifyOne = async (fetcher: PoliteFetcher, writer: SicWriter, issuer: { id: string; cik: string }, recordedAt: string) => {
	const resource = edgar.submissionsUrl(issuer.cik);
	const result = await fetcher.get(resource);
	const { documentSha256 } = await writer.persistFetch({ source: 'sec-edgar', resource, result });
	if (result.status !== 'ok' || !documentSha256) return { failure: result.status === 'failed' ? result.failure.code : result.status };
	const parsed = edgar.parseSubmissionsSic(result.body);
	if ('failure' in parsed) return { failure: parsed.failure };
	await writer.appendIssuerSic(
		IssuerSicClassification.parse({
			id: issuerSicClassificationIdFrom(issuer.cik, parsed.sic, documentSha256),
			kind: 'issuer-sic-classification',
			schemaVersion: 'm0',
			recordedAt: recordedAt as RecordedAt,
			inputRefs: [{ kind: 'source-document', id: documentSha256, role: 'sec-submissions' }],
			issuerId: issuer.id as ArtifactId,
			issuerCik: issuer.cik as Cik,
			sic: parsed.sic,
			sicMajorGroup: parsed.sicMajorGroup,
			sicDescription: parsed.sicDescription,
			observedAt: result.completedAt as ObservedAt,
		}),
	);
	return { classified: 1 };
};

export const ingestIssuerSic = async (fetcher: PoliteFetcher, writer: SicWriter, now: () => Date) => {
	const issuers = await writer.listIssuersMissingSic();
	if (!issuers.length) return { classified: 0, missing: 0 };
	const recordedAt = now().toISOString();
	let classified = 0;
	let failure: string | undefined;
	for (const issuer of issuers) {
		const result = await classifyOne(fetcher, writer, issuer, recordedAt);
		if ('failure' in result) {
			failure ??= result.failure;
			continue;
		}
		classified += 1;
	}
	return { classified, missing: issuers.length - classified, ...(failure ? { failure } : {}) };
};

export const createSicJob = (fetcher: PoliteFetcher, writer: SicWriter, now: () => Date): Job => ({
	name: 'sic-refresh',
	lane: 'ordinary',
	due: async () => (await writer.listIssuersMissingSic()).length > 0,
	run: async () => {
		const result = await ingestIssuerSic(fetcher, writer, now);
		return {
			outcome: result.missing ? 'not-ready' : 'ok',
			meta: {
				classified: String(result.classified),
				missing: String(result.missing),
				...(result.failure ? { failure: result.failure } : {}),
			},
		};
	},
});

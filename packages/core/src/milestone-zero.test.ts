import { expect, test } from 'bun:test';

import { AcquisitionAttempt, artifactIdFrom, Decimal, Form4TransactionFact, ParseRun, parseRunIdFrom, SourceDocument } from './index';

const at = '2026-08-30T00:00:00.000Z';
const sha = 'a'.repeat(64);
test('source artifacts reject direct input lineage', () => {
	expect(
		SourceDocument.safeParse({
			id: sha,
			kind: 'source-document',
			schemaVersion: 'm0',
			recordedAt: at,
			inputRefs: [{ kind: 'source-document', id: 'x', role: 'bad' }],
			sha256: sha,
			byteSize: 1,
			mediaType: 'text/plain',
			bytes: new Uint8Array([1]),
			retentionClass: 'immutable',
		}).success,
	).toBe(false);
});
test('source document identity is its content hash', () => {
	expect(
		SourceDocument.safeParse({
			id: crypto.randomUUID(),
			kind: 'source-document',
			schemaVersion: 'm0',
			recordedAt: at,
			inputRefs: [],
			sha256: sha,
			byteSize: 1,
			mediaType: 'text/plain',
			bytes: new Uint8Array([1]),
			retentionClass: 'immutable',
		}).success,
	).toBe(false);
	expect(
		String(
			SourceDocument.parse({
				id: sha,
				kind: 'source-document',
				schemaVersion: 'm0',
				recordedAt: at,
				inputRefs: [],
				sha256: sha,
				byteSize: 1,
				mediaType: 'text/plain',
				bytes: new Uint8Array([1]),
				retentionClass: 'immutable',
			}).id,
		),
	).toBe(sha);
});
test('derived artifact ids are UUID v5 over their semantic keys', () => {
	expect(String(parseRunIdFrom(sha, 'sec-form4', 'm0'))).toBe('4b4836e4-f839-5b24-a753-8634576144c8');
	expect(String(artifactIdFrom(`form4-transaction-fact:m0:${sha}:nonDerivativeTransaction[0]`))).toBe('0f6275f4-3b0a-58f3-9da8-b0973a025b76');
});
test('derived artifacts require typed direct lineage', () => {
	expect(
		ParseRun.safeParse({
			id: crypto.randomUUID(),
			kind: 'parse-run',
			schemaVersion: 'm0',
			recordedAt: at,
			inputRefs: [],
			documentSha256: 'a'.repeat(64),
			parser: 'form4',
			parserVersion: '1',
			startedAt: at,
			completedAt: at,
			status: 'succeeded',
		}).success,
	).toBe(false);
	expect(Form4TransactionFact.safeParse({}).success).toBe(false);
});
test('knowledge clocks and decimals keep semantic brands', () => {
	expect(String(Decimal.parse('38.30'))).toBe('38.30');
	expect(
		AcquisitionAttempt.safeParse({
			id: crypto.randomUUID(),
			kind: 'acquisition-attempt',
			schemaVersion: 'm0',
			recordedAt: at,
			inputRefs: [],
			source: 'sec',
			sourcePolicyVersion: '1',
			method: 'GET',
			resource: 'https://sec.gov/a',
			requestedAt: at,
			completedAt: at,
			observedAt: at,
		}).success,
	).toBe(true);
});

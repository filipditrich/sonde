import { expect, test } from 'bun:test';

import { AcquisitionAttempt, Decimal, Form4TransactionFact, ParseRun, SourceDocument } from './index';

const at = '2026-08-30T00:00:00.000Z';
test('source artifacts reject direct input lineage', () => {
	expect(
		SourceDocument.safeParse({
			id: crypto.randomUUID(),
			kind: 'source-document',
			schemaVersion: 'm0',
			recordedAt: at,
			inputRefs: [{ kind: 'source-document', id: 'x', role: 'bad' }],
			sha256: 'a'.repeat(64),
			byteSize: 1,
			mediaType: 'text/plain',
			bytes: new Uint8Array([1]),
			retentionClass: 'immutable',
		}).success,
	).toBe(false);
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

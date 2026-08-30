import { describe, expect, test } from 'bun:test';

import { parseForm4Facts } from './form4';

const fixture = await Bun.file(new URL('./__fixtures__/form4-single-purchase.xml', import.meta.url)).text();
const context = {
	accession: '0001739310-26-000004' as never,
	documentSha256: 'a'.repeat(64) as never,
	acceptedAt: '2026-08-20T12:00:00.000Z' as never,
	observedAt: '2026-08-21T12:00:00.000Z' as never,
	recordedAt: '2026-08-21T12:00:00.000Z' as never,
};

describe('Form 4 parsing', () => {
	test('retains a non-P non-derivative transaction and decimal text', () => {
		const result = parseForm4Facts(fixture.replace('<transactionCode>P</transactionCode>', '<transactionCode>S</transactionCode>'), context);
		expect(result.facts[0]?.transactionCode).toBe('S');
		expect(String(result.facts[0]?.pricePerShare)).toBe('38.30');
		expect(String(result.facts[0]?.issuerCik)).toBe('0001702750');
		expect(String(result.facts[0]?.reportingOwnerCik)).toBe('0001739310');
	});
	test('reports malformed values instead of silently dropping the document', () => {
		const result = parseForm4Facts(fixture.replace('<value>100</value>', '<value>not-a-decimal</value>'), context);
		expect(result.facts).toHaveLength(0);
		expect(result.failures[0]?.code).toBe('invalid-decimal');
	});
});

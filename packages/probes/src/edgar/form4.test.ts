import { describe, expect, test } from 'bun:test';

import { openMarketPurchases, parseForm4 } from './form4';

const xml = await Bun.file(new URL('./__fixtures__/form4-single-purchase.xml', import.meta.url)).text();

describe('parseForm4', () => {
	const form = parseForm4(xml);

	test('reads issuer identity from a real filing', () => {
		expect(form.issuerTradingSymbol).toBe('BY');
		expect(form.issuerName).toBe('BYLINE BANCORP, INC.');
		expect(form.issuerCik).toBe('0001702750');
	});

	test('reads the reporting owner, who files under a different CIK than the issuer', () => {
		expect(form.reportingOwnerName).toBe('KISTNER WILLIAM G');
		expect(form.reportingOwnerCik).toBe('0001739310');
		expect(form.reportingOwnerCik).not.toBe(form.issuerCik);
	});

	test('reads the relationship flags', () => {
		expect(form.isDirector).toBe(true);
		expect(form.isOfficer).toBe(false);
	});

	test('unwraps the <value> nesting Form 4 uses for scalars', () => {
		const [t] = form.transactions;
		expect(t?.code).toBe('P');
		expect(t?.shares).toBe(100);
		expect(t?.pricePerShare).toBe(38.3);
		expect(t?.acquiredDisposed).toBe('A');
		expect(t?.date).toBe('2026-08-19');
	});

	test('survives a filing with no non-derivative table', () => {
		expect(parseForm4('<ownershipDocument></ownershipDocument>').transactions).toEqual([]);
	});
});

describe('openMarketPurchases', () => {
	const base = parseForm4(xml);
	const withTransactions = (transactions: (typeof base)['transactions']) => ({ ...base, transactions });

	test('keeps a genuine code-P acquisition', () => {
		expect(openMarketPurchases(base)).toHaveLength(1);
	});

	test('rejects compensation codes — the bulk of Form 4 traffic', () => {
		for (const code of ['A', 'M', 'F', 'G']) {
			const form = withTransactions([{ date: '2026-08-19', code, shares: 100, pricePerShare: 38.3, acquiredDisposed: 'A' }]);
			expect(openMarketPurchases(form)).toHaveLength(0);
		}
	});

	test('rejects disposals even when coded P', () => {
		const form = withTransactions([{ date: '2026-08-19', code: 'P', shares: 100, pricePerShare: 38.3, acquiredDisposed: 'D' }]);
		expect(openMarketPurchases(form)).toHaveLength(0);
	});

	test('rejects a zero price — a data artifact, not a purchase', () => {
		const form = withTransactions([{ date: '2026-08-19', code: 'P', shares: 100, pricePerShare: 0, acquiredDisposed: 'A' }]);
		expect(openMarketPurchases(form)).toHaveLength(0);
	});
});

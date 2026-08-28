import { XMLParser } from 'fast-xml-parser';

/**
 * SEC transaction codes. Only `P` matters to Sonde — see the filing study: code-`P` clusters
 * carry the measured edge, and `A`/`M`/`F` traffic is compensation machinery rather than
 * conviction. The rest are parsed and stored, never treated as evidence.
 */
export type TransactionCode = 'P' | 'S' | 'A' | 'M' | 'F' | 'G' | 'D' | 'C' | 'X' | (string & {});

export type NonDerivativeTransaction = {
	readonly date: string;
	readonly code: TransactionCode;
	readonly shares: number;
	readonly pricePerShare: number;
	/** `A` acquired, `D` disposed */
	readonly acquiredDisposed: 'A' | 'D' | (string & {});
};

/**
 * Note on who counts as an insider.
 *
 * Section 16 reporting persons are officers, directors, **and any holder of 10% or more** — so
 * asset managers appear in this feed alongside executives, and a live poll routinely shows the
 * same institution filing on several issuers at once. The filing study measured all code-`P`
 * acquisitions regardless of owner type, so this matches the sample the edge was measured on.
 * Splitting executives from institutions is a hypothesis for the scoreboard, not a filter to
 * apply here.
 */
export type Form4 = {
	readonly issuerCik: string;
	readonly issuerName: string;
	readonly issuerTradingSymbol: string;
	readonly reportingOwnerCik: string;
	readonly reportingOwnerName: string;
	readonly isDirector: boolean;
	readonly isOfficer: boolean;
	readonly officerTitle?: string;
	readonly transactions: readonly NonDerivativeTransaction[];
};

const parser = new XMLParser({ ignoreAttributes: true, parseTagValue: false });

/**
 * Form 4 wraps most scalars as `<field><value>x</value></field>`, but not all of them.
 *
 * Anything that is not a string or number becomes an empty string rather than being coerced.
 * A nested element stringified with `String()` yields `"[object Object]"`, which would sail
 * through as a plausible-looking issuer name or transaction code.
 */
const scalar = (node: unknown): string => {
	if (typeof node === 'string') return node;
	if (typeof node === 'number') return String(node);
	if (node !== null && typeof node === 'object' && 'value' in node) {
		return scalar((node as { value: unknown }).value);
	}
	return '';
};

const flag = (node: unknown): boolean => {
	const v = scalar(node).trim().toLowerCase();
	return v === '1' || v === 'true';
};

const asArray = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

type Raw = Record<string, unknown>;

const readTransaction = (t: Raw): NonDerivativeTransaction => {
	const amounts = (t['transactionAmounts'] ?? {}) as Raw;
	const coding = (t['transactionCoding'] ?? {}) as Raw;
	return {
		date: scalar(t['transactionDate']),
		code: scalar(coding['transactionCode']),
		shares: Number(scalar(amounts['transactionShares'])) || 0,
		pricePerShare: Number(scalar(amounts['transactionPricePerShare'])) || 0,
		acquiredDisposed: scalar(amounts['transactionAcquiredDisposedCode']),
	};
};

/** Pure over the document body. Network and parsing stay separable so this is fixture-testable. */
export const parseForm4 = (xml: string): Form4 => {
	const doc = (parser.parse(xml) as { ownershipDocument?: Raw }).ownershipDocument ?? {};
	const issuer = (doc['issuer'] ?? {}) as Raw;
	const owner = (doc['reportingOwner'] ?? {}) as Raw;
	const ownerId = (owner['reportingOwnerId'] ?? {}) as Raw;
	const rel = (owner['reportingOwnerRelationship'] ?? {}) as Raw;
	const table = (doc['nonDerivativeTable'] ?? {}) as Raw;

	const officerTitle = scalar(rel['officerTitle']).trim();
	return {
		issuerCik: scalar(issuer['issuerCik']),
		issuerName: scalar(issuer['issuerName']),
		issuerTradingSymbol: scalar(issuer['issuerTradingSymbol']).trim().toUpperCase(),
		reportingOwnerCik: scalar(ownerId['rptOwnerCik']),
		reportingOwnerName: scalar(ownerId['rptOwnerName']),
		isDirector: flag(rel['isDirector']),
		isOfficer: flag(rel['isOfficer']),
		...(officerTitle ? { officerTitle } : {}),
		transactions: asArray<Raw>(table['nonDerivativeTransaction'] as never).map(readTransaction),
	};
};

/**
 * Open-market purchases only: code `P`, acquired, real shares at a real price.
 *
 * The price check is not defensive padding. A code-`P` row at price zero is a data-entry
 * artifact, and treating it as a purchase would put a nonsense event into the signal.
 */
export const openMarketPurchases = (form: Form4): readonly NonDerivativeTransaction[] =>
	form.transactions.filter((t) => t.code === 'P' && t.acquiredDisposed === 'A' && t.shares > 0 && t.pricePerShare > 0);

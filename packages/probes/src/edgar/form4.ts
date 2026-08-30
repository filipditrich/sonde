import { XMLParser } from 'fast-xml-parser';

import {
	artifactIdFrom,
	Cik,
	Decimal,
	Form4TransactionFact,
	type AccessionNumber,
	type ObservedAt,
	type RecordedAt,
	type SecAcceptedAt,
	type Sha256,
} from '@sonde/core';

export const FORM4_PARSER = 'sec-form4';
export const FORM4_PARSER_VERSION = 'm0';

type Raw = Record<string, unknown>;
const parser = new XMLParser({ ignoreAttributes: true, parseTagValue: false });
const asArray = <T>(value: T | T[] | undefined): T[] => (value === undefined ? [] : Array.isArray(value) ? value : [value]);
const scalar = (value: unknown): string => {
	if (typeof value === 'string') return value.trim();
	if (typeof value === 'number') return String(value);
	if (value && typeof value === 'object' && 'value' in value) return scalar((value as Raw).value);
	return '';
};
const flag = (value: unknown): boolean => ['1', 'true'].includes(scalar(value).toLowerCase());
const asDecimal = (value: unknown): string | undefined => Decimal.safeParse(scalar(value)).data;
const asCik = (value: unknown): string | undefined => Cik.safeParse(scalar(value).padStart(10, '0')).data;

export type Form4ParseFailure = {
	readonly locator: string;
	readonly code: 'missing-required-field' | 'invalid-decimal' | 'invalid-cik';
	readonly detail: string;
};
export type ParsedForm4 = { readonly facts: readonly Form4TransactionFact[]; readonly failures: readonly Form4ParseFailure[] };

type FormHeader = { issuer: Raw; ownerId: Raw; relationship: Raw; issuerCik?: string; ownerCik?: string; issuerName: string; ownerName: string };
const failureFor = (header: FormHeader, transaction: Raw, locator: string): Form4ParseFailure | undefined => {
	const amounts = (transaction.transactionAmounts ?? {}) as Raw;
	const coding = (transaction.transactionCoding ?? {}) as Raw;
	const ownership = (transaction.ownershipNature ?? {}) as Raw;
	if (!header.issuerCik || !header.ownerCik) return { locator, code: 'invalid-cik', detail: 'issuer or reporting-owner CIK is missing or invalid' };
	if (!asDecimal(amounts.transactionShares) || !asDecimal(amounts.transactionPricePerShare))
		return { locator, code: 'invalid-decimal', detail: 'transaction shares or price per share is missing or invalid' };
	if (
		![
			header.issuerName,
			header.ownerName,
			scalar(transaction.transactionDate),
			scalar(coding.transactionCode),
			scalar(amounts.transactionAcquiredDisposedCode),
			scalar(ownership.directOrIndirectOwnership),
		].every(Boolean)
	)
		return { locator, code: 'missing-required-field', detail: 'a required Form 4 transaction field is missing' };
};
const factFrom = (header: FormHeader, transaction: Raw, locator: string, context: Parameters<typeof parseForm4Facts>[1]): Form4TransactionFact => {
	const amounts = (transaction.transactionAmounts ?? {}) as Raw;
	const coding = (transaction.transactionCoding ?? {}) as Raw;
	const ownership = (transaction.ownershipNature ?? {}) as Raw;
	return Form4TransactionFact.parse({
		id: artifactIdFrom(`form4-transaction-fact:${FORM4_PARSER_VERSION}:${context.documentSha256}:${locator}`),
		kind: 'form4-transaction-fact',
		schemaVersion: 'm0',
		recordedAt: context.recordedAt,
		inputRefs: [{ kind: 'source-document', id: context.documentSha256, role: 'parsed-document' }],
		accession: context.accession,
		documentSha256: context.documentSha256,
		issuerCik: header.issuerCik,
		reportingOwnerCik: header.ownerCik,
		reportingOwnerName: header.ownerName,
		issuerName: header.issuerName,
		issuerTicker: scalar(header.issuer.issuerTradingSymbol).toUpperCase() || undefined,
		isDirector: flag(header.relationship.isDirector),
		isOfficer: flag(header.relationship.isOfficer),
		isTenPercentOwner: flag(header.relationship.isTenPercentOwner),
		sourceClock: { kind: 'sec-acceptance', acceptedAt: context.acceptedAt },
		transactionDate: scalar(transaction.transactionDate),
		securityTitle: scalar(transaction.securityTitle),
		transactionCode: scalar(coding.transactionCode),
		acquiredDisposed: scalar(amounts.transactionAcquiredDisposedCode),
		ownership: scalar(ownership.directOrIndirectOwnership),
		shares: asDecimal(amounts.transactionShares),
		pricePerShare: asDecimal(amounts.transactionPricePerShare),
		footnoteRefs: [],
		sourceLocator: locator,
		observedAt: context.observedAt,
	});
};

/** Parse all non-derivative transaction rows. Filtering on code P belongs to a later projection. */
export const parseForm4Facts = (
	xml: string,
	context: {
		readonly accession: AccessionNumber;
		readonly documentSha256: Sha256;
		readonly acceptedAt: SecAcceptedAt;
		readonly observedAt: ObservedAt;
		readonly recordedAt: RecordedAt;
	},
): ParsedForm4 => {
	const doc = ((parser.parse(xml) as { ownershipDocument?: Raw }).ownershipDocument ?? {}) as Raw;
	const issuer = (doc.issuer ?? {}) as Raw;
	const owner = (doc.reportingOwner ?? {}) as Raw;
	const ownerId = (owner.reportingOwnerId ?? {}) as Raw;
	const relationship = (owner.reportingOwnerRelationship ?? {}) as Raw;
	const table = (doc.nonDerivativeTable ?? {}) as Raw;
	const header: FormHeader = {
		issuer,
		ownerId,
		relationship,
		issuerCik: asCik(issuer.issuerCik),
		ownerCik: asCik(ownerId.rptOwnerCik),
		issuerName: scalar(issuer.issuerName),
		ownerName: scalar(ownerId.rptOwnerName),
	};
	const facts: Form4TransactionFact[] = [];
	const failures: Form4ParseFailure[] = [];
	for (const [index, transaction] of asArray<Raw>(table.nonDerivativeTransaction as Raw[] | Raw | undefined).entries()) {
		const locator = `nonDerivativeTransaction[${index}]`;
		const failure = failureFor(header, transaction, locator);
		if (failure) failures.push(failure);
		else facts.push(factFrom(header, transaction, locator, context));
	}
	return { facts, failures };
};

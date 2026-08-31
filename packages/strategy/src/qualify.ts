import { compareDecimal } from './decimal';

export type PurchaseFields = {
	readonly transactionCode: string;
	readonly acquiredDisposed: string;
	readonly shares: string;
	readonly pricePerShare: string;
};

export const isQualifyingPurchase = (fact: PurchaseFields) =>
	fact.transactionCode === 'P' &&
	fact.acquiredDisposed === 'A' &&
	compareDecimal(fact.shares, '0') > 0 &&
	compareDecimal(fact.pricePerShare, '0') > 0;

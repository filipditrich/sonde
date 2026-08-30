import * as z from 'zod';

/** Financial values cross boundaries as canonical decimal text, never binary floats. */
export const Decimal = z
	.string()
	.regex(/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/, 'must be a decimal string')
	.brand<'Decimal'>();
export type Decimal = z.infer<typeof Decimal>;
export const Sha256 = z
	.string()
	.regex(/^[0-9a-f]{64}$/, 'must be lowercase SHA-256 hex')
	.brand<'Sha256'>();
export type Sha256 = z.infer<typeof Sha256>;

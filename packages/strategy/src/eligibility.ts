import type { FailedCheck } from '@sonde/core';

export type EligibilityInput = {
	readonly due: boolean;
	readonly alreadyDecided: boolean;
	readonly listing?: { readonly ticker: string; readonly securityType: string };
	readonly universeIncluded: boolean;
	readonly universeReason?: string;
	readonly ownerCount: number;
	readonly allFactsByCutoff: boolean;
};

export type EligibilityResult = { readonly eligible: boolean; readonly failedChecks: readonly FailedCheck[] };

const check = (name: string, ok: boolean, reason: string): FailedCheck | undefined => (ok ? undefined : { check: name, reason });

/** Source completeness and broker unreadiness are not eligibility — they belong to M3 readiness. */
export const evaluateEligibility = (input: EligibilityInput): EligibilityResult => {
	const failedChecks = [
		check('window-due', input.due, 'decision window is not due'),
		check('no-final-decision', !input.alreadyDecided, 'final decision already exists'),
		check('issuer-listing-resolve', Boolean(input.listing), 'issuer or listing did not resolve'),
		check(
			'us-listed-common',
			Boolean(input.listing && /^[A-Z]{1,5}$/.test(input.listing.ticker) && input.listing.securityType === 'common'),
			'security is not US-listed common equity',
		),
		check('universe-liquidity', input.universeIncluded, input.universeReason ?? 'listing is not in the universe snapshot'),
		check('two-distinct-owners', input.ownerCount >= 2, 'fewer than two distinct reporting-owner CIKs'),
		check('facts-observed-by-cutoff', input.allFactsByCutoff, 'a qualifying fact was observed after the cutoff'),
	].filter((item): item is FailedCheck => Boolean(item));
	return { eligible: failedChecks.length === 0, failedChecks };
};

/**
 * Per-source identity and pacing.
 *
 * The politeness layer in ADR 0011 was originally about rate limiting. Source research found
 * that is only half of it: SEC returns 403 to any client that does not *declare a contact*,
 * regardless of how slowly it asks. Identity and pacing therefore travel together, per source,
 * rather than as one global config.
 */
export type SourceProfile = {
	/** stable id, recorded on every observation for health tracking and attribution */
	readonly name: string;
	readonly userAgent: string;
	/** minimum gap between requests to this source, in ms */
	readonly minIntervalMs: number;
	/** send `If-None-Match` / `If-Modified-Since` when we have them */
	readonly conditional: boolean;
};

export class MissingContactError extends Error {
	constructor() {
		super(
			'SONDE_CONTACT_EMAIL is not set. SEC rejects undeclared clients with 403 regardless of ' +
				'request rate — see docs/research/source-viability.md.',
		);
		this.name = 'MissingContactError';
	}
}

/**
 * SEC publishes a 10 req/s ceiling. 150ms leaves headroom: being throttled by a free official
 * source is a worse outcome than being slow, and nothing here is latency-critical at the
 * horizons Sonde trades.
 */
export const secProfile = (contactEmail: string | undefined): SourceProfile => {
	if (!contactEmail) throw new MissingContactError();
	return {
		name: 'sec-edgar',
		userAgent: `Sonde Research ${contactEmail}`,
		minIntervalMs: 150,
		conditional: true,
	};
};

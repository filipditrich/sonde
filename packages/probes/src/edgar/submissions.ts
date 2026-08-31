/** SEC submissions JSON for one CIK — the official free SIC source. */
export const submissionsUrl = (cik: string) => `https://data.sec.gov/submissions/CIK${cik}.json`;

export type ParsedSubmissionsSic = { readonly sic: string; readonly sicMajorGroup: string; readonly sicDescription: string };

const padSic = (raw: unknown) => {
	const digits = (typeof raw === 'number' || typeof raw === 'string' ? String(raw) : '').replace(/\D/g, '');
	if (digits.length < 2 || digits.length > 4) return undefined;
	return digits.padStart(4, '0');
};

/** Extract the 4-digit SIC and its major group; missing or malformed SIC is a typed failure. */
export const parseSubmissionsSic = (body: string): ParsedSubmissionsSic | { failure: string } => {
	let payload: { sic?: unknown; sicDescription?: unknown };
	try {
		payload = JSON.parse(body) as { sic?: unknown; sicDescription?: unknown };
	} catch {
		return { failure: 'submissions-not-json' };
	}
	const sic = padSic(payload.sic);
	const sicDescription = typeof payload.sicDescription === 'string' ? payload.sicDescription.trim() : '';
	if (!sic) return { failure: 'sic-missing' };
	if (!sicDescription) return { failure: 'sic-description-missing' };
	return { sic, sicMajorGroup: sic.slice(0, 2), sicDescription };
};

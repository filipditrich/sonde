/** One reporting-owner CIK counts once; person and institution both count. */
export const distinctReportingOwners = (facts: readonly { reportingOwnerCik: string }[]) =>
	[...new Set(facts.map((fact) => fact.reportingOwnerCik))].toSorted();

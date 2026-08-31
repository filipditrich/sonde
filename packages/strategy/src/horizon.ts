export const horizonCloseAt = (sessions: readonly { sessionDate: string; closesAt: string }[], entrySessionDate: string) => {
	const ordered = [...sessions].toSorted((left, right) => left.sessionDate.localeCompare(right.sessionDate));
	const entry = ordered.findIndex((session) => session.sessionDate === entrySessionDate);
	if (entry < 0) return undefined;
	return ordered[entry + 20]?.closesAt;
};

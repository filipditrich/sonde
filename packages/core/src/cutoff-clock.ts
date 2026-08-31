/** 09:20 America/New_York on a captured regular session — Strategy V1's Decision Cutoff. */

const easternOffset = (date: string): string => {
	const [year, month, day] = date.split('-').map(Number);
	const zone = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'longOffset' })
		.formatToParts(new Date(Date.UTC(year!, month! - 1, day!, 12)))
		.find((part) => part.type === 'timeZoneName')?.value;
	return zone?.replace('GMT', '') ?? '+00:00';
};

/** 09:20:00.000 ET on the session's civil date — inclusive of the cutoff instant. */
export const decisionCutoffAt = (sessionDate: string) => `${sessionDate}T09:20:00.000${easternOffset(sessionDate)}`;

export type CutoffSession = {
	readonly sessionDate: string;
	readonly calendarVersion: string;
	readonly opensAt: string;
};

export type UpcomingCutoff = {
	readonly sessionDate: string;
	readonly calendarVersion: string;
	readonly decisionWindowOpen: string;
	readonly deadline: string;
};

/** Earliest captured session whose Decision Cutoff is still at or after `asOfMs`. */
export const upcomingCutoff = (sessions: readonly CutoffSession[], asOfMs: number): UpcomingCutoff | undefined => {
	const due = sessions
		.filter((session) => Date.parse(decisionCutoffAt(session.sessionDate)) >= asOfMs)
		.toSorted((left, right) => left.sessionDate.localeCompare(right.sessionDate))[0];
	if (!due) return undefined;
	return {
		sessionDate: due.sessionDate,
		calendarVersion: due.calendarVersion,
		decisionWindowOpen: due.opensAt,
		deadline: decisionCutoffAt(due.sessionDate),
	};
};

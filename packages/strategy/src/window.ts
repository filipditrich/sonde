import { activeCalendarSessions, type MarketSessionCandidate } from '@sonde/probes';

const easternOffset = (date: string): string => {
	const [year, month, day] = date.split('-').map(Number);
	const zone = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'longOffset' })
		.formatToParts(new Date(Date.UTC(year!, month! - 1, day!, 12)))
		.find((part) => part.type === 'timeZoneName')?.value;
	return zone?.replace('GMT', '') ?? '+00:00';
};

/** 09:20:00.000 ET on the session's civil date — inclusive of the cutoff instant. */
export const decisionCutoffAt = (sessionDate: string) => `${sessionDate}T09:20:00.000${easternOffset(sessionDate)}`;

export type DecisionWindow = {
	readonly sessionDate: string;
	readonly decisionWindowOpen: string;
	readonly cutoffAt: string;
	readonly calendarVersion: string;
};

/** Facts at the cutoff stay in this session; facts after it take the next captured regular open. */
export const assignDecisionWindow = (observedAt: string, sessions: readonly MarketSessionCandidate[]): DecisionWindow | undefined => {
	const ordered = activeCalendarSessions(sessions).toSorted((left, right) => left.sessionDate.localeCompare(right.sessionDate));
	const due = ordered.find((session) => Date.parse(observedAt) <= Date.parse(decisionCutoffAt(session.sessionDate)));
	if (!due) return undefined;
	return {
		sessionDate: due.sessionDate,
		decisionWindowOpen: due.opensAt,
		cutoffAt: decisionCutoffAt(due.sessionDate),
		calendarVersion: due.calendarVersion,
	};
};

export const isWindowDue = (cutoffAt: string, now: Date) => Date.parse(cutoffAt) <= now.getTime();

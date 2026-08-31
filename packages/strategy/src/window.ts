import { decisionCutoffAt } from '@sonde/core';
import { activeCalendarSessions, type MarketSessionCandidate } from '@sonde/probes';

export { decisionCutoffAt };

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

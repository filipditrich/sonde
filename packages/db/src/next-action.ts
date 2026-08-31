import type { CockpitNextAction, UpcomingCutoff } from '@sonde/core';

const prerequisite = (name: 'calendar-refresh' | 'sip-daily-bars', outcome: string | undefined) => ({
	name,
	ready: outcome === 'ok',
	detail: outcome ?? 'unseen',
});

export const cockpitNextAction = (cutoff: UpcomingCutoff | undefined, jobs: { calendar?: string; sip?: string }): CockpitNextAction => {
	if (!cutoff) return { kind: 'unavailable', reason: 'no captured regular session with a Decision Cutoff at or after this snapshot' };
	return {
		kind: 'decision-cutoff',
		sessionDate: cutoff.sessionDate,
		deadline: cutoff.deadline,
		calendarVersion: cutoff.calendarVersion,
		decisionWindowOpen: cutoff.decisionWindowOpen,
		prerequisites: [prerequisite('calendar-refresh', jobs.calendar), prerequisite('sip-daily-bars', jobs.sip)],
	};
};

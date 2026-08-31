import type { CockpitFunnelStage } from '@sonde/core';

export type CockpitPath =
	| { kind: 'home' }
	| { kind: 'snapshot' }
	| { kind: 'events' }
	| { kind: 'view' }
	| { kind: 'funnel'; stage: CockpitFunnelStage }
	| { kind: 'candidates' | 'signals' | 'eligibility' | 'packets' | 'facts'; id: string }
	| { kind: 'documents'; id: string }
	| { kind: 'unknown' };

const FUNNEL = new Set<CockpitFunnelStage>(['documents', 'transactions', 'qualifying-purchases', 'distinct-owner-candidates', 'liquid-signals']);

export const parseCockpitPath = (pathname: string): CockpitPath => {
	if (pathname === '/') return { kind: 'home' };
	if (pathname === '/api/snapshot') return { kind: 'snapshot' };
	if (pathname === '/api/events') return { kind: 'events' };
	if (pathname === '/api/view') return { kind: 'view' };
	const funnel = pathname.match(/^\/funnel\/([^/]+)$/);
	if (funnel && FUNNEL.has(funnel[1] as CockpitFunnelStage)) return { kind: 'funnel', stage: funnel[1] as CockpitFunnelStage };
	const document = pathname.match(/^\/documents\/([0-9a-f]{64})$/);
	if (document) return { kind: 'documents', id: document[1]! };
	const detail = pathname.match(/^\/(candidates|signals|eligibility|packets|facts)\/([^/]+)$/);
	if (detail) return { kind: detail[1] as 'candidates' | 'signals' | 'eligibility' | 'packets' | 'facts', id: detail[2]! };
	return { kind: 'unknown' };
};

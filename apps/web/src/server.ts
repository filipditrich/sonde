import { timingSafeEqual } from 'node:crypto';

import type {
	CockpitCandidateDetail,
	CockpitDocumentDetail,
	CockpitEligibilityDetail,
	CockpitFactDetail,
	CockpitFunnelPopulation,
	CockpitFunnelStage,
	CockpitPacketDetail,
	CockpitSignalDetail,
	CockpitSnapshot,
	CockpitStreamEvent,
} from '@sonde/core';

import { parseCockpitPath } from './paths';
import { homePage, loginPage, page, viewFragment } from './view';
import { candidatePage, documentPage, eligibilityPage, factPage, funnelPage, packetPage, signalPage } from './view-detail';

export type CockpitReader = {
	snapshot(): Promise<CockpitSnapshot>;
	eventsAfter(cursor: number): Promise<CockpitStreamEvent[]>;
	candidate(id: string): Promise<CockpitCandidateDetail | undefined>;
	signal(id: string): Promise<CockpitSignalDetail | undefined>;
	eligibility(id: string): Promise<CockpitEligibilityDetail | undefined>;
	packet(id: string): Promise<CockpitPacketDetail | undefined>;
	document(id: string): Promise<CockpitDocumentDetail | undefined>;
	fact(id: string): Promise<CockpitFactDetail | undefined>;
	funnelStage(stage: CockpitFunnelStage): Promise<CockpitFunnelPopulation | undefined>;
};

const sessionCookie = 'sonde_operator_session';
const encoder = new TextEncoder();
const parseCookies = (header: string | null): Record<string, string> =>
	Object.fromEntries(
		(header ?? '').split(';').flatMap((part) => {
			const [key, value] = part.trim().split('=');
			return key && value ? [[key, value]] : [];
		}),
	);
const hash = async (value: string) => Buffer.from(await crypto.subtle.digest('SHA-256', encoder.encode(value))).toString('hex');
const equalHash = (left: string, right: string) => timingSafeEqual(Buffer.from(left), Buffer.from(right));
const html = (body: string) => new Response(body, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
const notFound = () => new Response('not found', { status: 404 });

const streamEvents = (request: Request, url: URL, reader: CockpitReader): Response => {
	let cursor = Number(request.headers.get('last-event-id') ?? url.searchParams.get('cursor') ?? 0) || 0;
	const stream = new ReadableStream({
		start(controller) {
			const publish = async () => {
				for (const event of await reader.eventsAfter(cursor)) {
					cursor = event.cursor;
					controller.enqueue(encoder.encode(`id: ${event.cursor}\ndata: ${JSON.stringify(event)}\n\n`));
				}
			};
			void publish();
			const timer = setInterval(() => void publish(), 1000);
			request.signal.addEventListener('abort', () => {
				clearInterval(timer);
				controller.close();
			});
		},
	});
	return new Response(stream, {
		headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
	});
};

const detailPage = async (reader: CockpitReader, kind: 'candidates' | 'signals' | 'eligibility' | 'packets', id: string) => {
	if (kind === 'candidates') {
		const detail = await reader.candidate(id);
		return detail ? html(page(candidatePage(detail))) : notFound();
	}
	if (kind === 'signals') {
		const detail = await reader.signal(id);
		return detail ? html(page(signalPage(detail))) : notFound();
	}
	if (kind === 'eligibility') {
		const detail = await reader.eligibility(id);
		return detail ? html(page(eligibilityPage(detail))) : notFound();
	}
	const detail = await reader.packet(id);
	return detail ? html(page(packetPage(detail))) : notFound();
};

const read = async (request: Request, url: URL, reader: CockpitReader): Promise<Response> => {
	const path = parseCockpitPath(url.pathname);
	if (path.kind === 'snapshot') return Response.json(await reader.snapshot());
	if (path.kind === 'events') return streamEvents(request, url, reader);
	if (path.kind === 'view') return html(viewFragment(await reader.snapshot()));
	if (path.kind === 'home') return html(homePage(await reader.snapshot()));
	if (path.kind === 'funnel') {
		const population = await reader.funnelStage(path.stage);
		return population ? html(page(funnelPage(population))) : notFound();
	}
	if (path.kind === 'documents') {
		const detail = await reader.document(path.id);
		return detail ? html(page(documentPage(detail))) : notFound();
	}
	if (path.kind === 'facts') {
		const detail = await reader.fact(path.id);
		return detail ? html(page(factPage(detail))) : notFound();
	}
	if (path.kind === 'unknown') return notFound();
	return detailPage(reader, path.kind, path.id);
};

export const createCockpitServer = (reader: CockpitReader, token: string) => {
	if (token.length < 16) throw new Error('SONDE_OPERATOR_TOKEN must be at least 16 characters');
	const tokenHash = hash(token);
	const sessions = new Set<string>();
	const authorized = async (request: Request) => {
		const value = parseCookies(request.headers.get('cookie'))[sessionCookie];
		return Boolean(value && sessions.has(await hash(value)));
	};
	const issueSession = async () => {
		const value = crypto.randomUUID();
		sessions.add(await hash(value));
		return value;
	};
	return {
		fetch: async (request: Request): Promise<Response> => {
			const url = new URL(request.url);
			if (url.pathname === '/login' && request.method === 'GET') return html(loginPage);
			if (url.pathname === '/session' && request.method === 'POST') {
				const supplied = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? (await request.formData()).get('token');
				if (typeof supplied !== 'string' || !equalHash(await hash(supplied), await tokenHash)) return new Response('unauthorized', { status: 401 });
				const session = await issueSession();
				return new Response(null, {
					status: 303,
					headers: { Location: '/', 'Set-Cookie': `${sessionCookie}=${session}; HttpOnly; SameSite=Strict; Path=/` },
				});
			}
			if (request.method !== 'GET') return notFound();
			if (!(await authorized(request))) return new Response('unauthorized', { status: 401 });
			return read(request, url, reader);
		},
	};
};

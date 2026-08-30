import { timingSafeEqual } from 'node:crypto';

import type { CockpitSnapshot, CockpitStreamEvent } from '@sonde/core';

export type CockpitReader = { snapshot(): Promise<CockpitSnapshot>; eventsAfter(cursor: number): Promise<CockpitStreamEvent[]> };
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
const escapeHtml = (value: string) =>
	value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
const html = (snapshot: CockpitSnapshot) =>
	`<main><h1>Sonde M0 cockpit</h1><section><h2>State and freshness</h2><p>as of ${snapshot.asOf}; cursor ${snapshot.cursor}</p></section><section><h2>Candidate funnel</h2><p>documents ${snapshot.funnel.documents}; transactions ${snapshot.funnel.transactions}; qualifying purchases ${snapshot.funnel.qualifyingPurchases}</p></section><section><h2>Recent Source Facts</h2><ul>${snapshot.facts.map((fact) => `<li>${escapeHtml(fact.issuerName)}: ${escapeHtml(fact.transactionCode)} ${fact.shares} @ ${fact.pricePerShare}</li>`).join('') || '<li>No retained facts</li>'}</ul></section><section><h2>Source and market-data health</h2><ul>${snapshot.health.map((health) => `<li>${escapeHtml(health.job)}: ${escapeHtml(health.outcome ?? 'running')} at ${health.lastEventAt}</li>`).join('') || '<li>No job events retained</li>'}</ul></section><section>Later milestones: not built</section><script>const refresh=()=>fetch('/api/snapshot').then(r=>r.json()).then(()=>location.reload());const e=new EventSource('/api/events');e.onmessage=refresh;e.onerror=refresh;</script></main>`;
const login =
	'<form method="post" action="/session"><label>Operator token <input name="token" type="password" autofocus></label><button>Open cockpit</button></form>';
const streamEvents = (request: Request, url: URL, reader: CockpitReader): Response => {
	let cursor = Number(request.headers.get('last-event-id') ?? url.searchParams.get('cursor') ?? 0) || 0;
	const stream = new ReadableStream({
		start(controller) {
			const publish = async () => {
				for (const event of await reader.eventsAfter(cursor)) {
					cursor = event.cursor;
					controller.enqueue(encoder.encode(`id: ${event.cursor}\nevent: artifact\ndata: ${JSON.stringify(event)}\n\n`));
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
	return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
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
	const read = async (request: Request, url: URL): Promise<Response> => {
		if (!(await authorized(request))) return new Response('unauthorized', { status: 401 });
		if (url.pathname === '/api/snapshot') return Response.json(await reader.snapshot());
		if (url.pathname === '/api/events') return streamEvents(request, url, reader);
		if (url.pathname === '/') return new Response(html(await reader.snapshot()), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
		return new Response('not found', { status: 404 });
	};
	return {
		fetch: async (request: Request): Promise<Response> => {
			const url = new URL(request.url);
			if (url.pathname === '/login' && request.method === 'GET')
				return new Response(login, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
			if (url.pathname === '/session' && request.method === 'POST') {
				const supplied = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? (await request.formData()).get('token');
				if (typeof supplied !== 'string' || !equalHash(await hash(supplied), await tokenHash)) return new Response('unauthorized', { status: 401 });
				const session = await issueSession();
				return new Response(null, {
					status: 303,
					headers: { Location: '/', 'Set-Cookie': `${sessionCookie}=${session}; HttpOnly; SameSite=Strict; Path=/` },
				});
			}
			if (request.method !== 'GET') return new Response('not found', { status: 404 });
			return read(request, url);
		},
	};
};

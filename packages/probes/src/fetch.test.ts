import { expect, test } from 'bun:test';

import { PoliteFetcher } from './fetch';

const profile = { name: 'test', userAgent: 'test@example.com', minIntervalMs: 0, conditional: true };
test('captures successful, unchanged, and failed requests exactly once', async () => {
	const captures: string[] = [];
	const fetcher = new PoliteFetcher(profile, {
		fetch: (async (url) => {
			const target = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
			return target.includes('ok')
				? new Response('bytes', { status: 200, headers: { 'content-type': 'application/xml', etag: 'e' } })
				: target.includes('unchanged')
					? new Response(null, { status: 304 })
					: new Response('no', { status: 500 });
		}) as typeof fetch,
		capture: (capture) => {
			captures.push(`${capture.resource}:${capture.result.status}`);
		},
	});
	const ok = await fetcher.get('https://test/ok');
	const unchanged = await fetcher.get('https://test/unchanged');
	const failed = await fetcher.get('https://test/fail');
	expect(ok.status === 'ok' && [...ok.bytes]).toEqual([...new TextEncoder().encode('bytes')]);
	expect(unchanged.status).toBe('unchanged');
	expect(failed.status).toBe('failed');
	expect(captures).toEqual(['https://test/ok:ok', 'https://test/unchanged:unchanged', 'https://test/fail:failed']);
});

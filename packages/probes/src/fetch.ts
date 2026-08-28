import type { SourceProfile } from './source-profile';

/** What a conditional request needs to remember between polls. */
export type CacheValidators = { etag?: string; lastModified?: string };

export type FetchResult =
	| { readonly status: 'ok'; readonly body: string; readonly validators: CacheValidators }
	/** the source said nothing changed — the common case when polling a feed */
	| { readonly status: 'unchanged' };

export type Clock = () => number;
export type Sleep = (ms: number) => Promise<void>;

/**
 * A polite fetcher, one instance per source.
 *
 * Serialises requests and spaces them by the profile's interval. Deliberately not a general
 * HTTP client: it exists so that every request to a source carries that source's identity and
 * pacing without each probe having to remember.
 */
export class PoliteFetcher {
	#nextAllowedAt = 0;
	#chain: Promise<unknown> = Promise.resolve();

	constructor(
		private readonly profile: SourceProfile,
		private readonly deps: { fetch?: typeof globalThis.fetch; now?: Clock; sleep?: Sleep } = {},
	) {}

	async get(url: string, validators: CacheValidators = {}): Promise<FetchResult> {
		// Chain rather than parallelise: the interval is a promise to the source, not a hint.
		const run = this.#chain.then(() => this.#request(url, validators));
		this.#chain = run.catch(() => undefined);
		return run;
	}

	async #request(url: string, validators: CacheValidators): Promise<FetchResult> {
		const now = this.deps.now ?? Date.now;
		const sleep = this.deps.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
		const doFetch = this.deps.fetch ?? globalThis.fetch;

		const wait = this.#nextAllowedAt - now();
		if (wait > 0) await sleep(wait);
		this.#nextAllowedAt = now() + this.profile.minIntervalMs;

		const headers: Record<string, string> = { 'User-Agent': this.profile.userAgent };
		if (this.profile.conditional) {
			if (validators.etag) headers['If-None-Match'] = validators.etag;
			if (validators.lastModified) headers['If-Modified-Since'] = validators.lastModified;
		}

		const res = await doFetch(url, { headers });
		if (res.status === 304) return { status: 'unchanged' };
		if (!res.ok) throw new FetchError(this.profile.name, url, res.status);

		return {
			status: 'ok',
			body: await res.text(),
			validators: {
				etag: res.headers.get('etag') ?? undefined,
				lastModified: res.headers.get('last-modified') ?? undefined,
			},
		};
	}
}

export class FetchError extends Error {
	constructor(
		readonly source: string,
		readonly url: string,
		readonly status: number,
	) {
		super(`${source} returned ${status} for ${url}`);
		this.name = 'FetchError';
	}
}

import type { SourceProfile } from './source-profile';

/** What a conditional request needs to remember between polls. */
export type CacheValidators = { etag?: string; lastModified?: string };

export type FetchResult =
	| {
			readonly status: 'ok';
			readonly body: string;
			readonly bytes: Uint8Array;
			readonly validators: CacheValidators;
			readonly httpStatus: number;
			readonly requestedAt: string;
			readonly completedAt: string;
			readonly mediaType?: string;
	  }
	/** the source said nothing changed — the common case when polling a feed */
	| {
			readonly status: 'unchanged';
			readonly httpStatus: 304;
			readonly requestedAt: string;
			readonly completedAt: string;
			readonly validators: CacheValidators;
	  }
	| {
			readonly status: 'failed';
			readonly httpStatus?: number;
			readonly requestedAt: string;
			readonly completedAt: string;
			readonly failure: { readonly code: string; readonly detail: string };
	  };

/** failed attempts carry a code; 304 is recorded as not-modified rather than success */
export const fetchFailureCode = (result: FetchResult): string | undefined => {
	if (result.status === 'failed') return result.failure.code;
	if (result.status === 'unchanged') return 'not-modified';
	return undefined;
};

export type Clock = () => number;
export type Sleep = (ms: number) => Promise<void>;
export type FetchCapture = { resource: string; requestedAt: string; result: FetchResult };

const requestHeaders = (profile: SourceProfile, validators: CacheValidators): Record<string, string> => {
	const headers: Record<string, string> = { 'User-Agent': profile.userAgent };
	if (!profile.conditional) return headers;
	if (validators.etag) headers['If-None-Match'] = validators.etag;
	if (validators.lastModified) headers['If-Modified-Since'] = validators.lastModified;
	return headers;
};

const responseResult = async (profile: SourceProfile, response: Response, requestedAt: string, completedAt: string): Promise<FetchResult> => {
	const validators = { etag: response.headers.get('etag') ?? undefined, lastModified: response.headers.get('last-modified') ?? undefined };
	if (response.status === 304) return { status: 'unchanged', httpStatus: 304, requestedAt, completedAt, validators };
	if (!response.ok)
		return {
			status: 'failed',
			requestedAt,
			httpStatus: response.status,
			completedAt,
			failure: { code: 'http-error', detail: `${profile.name} returned ${response.status}` },
		};
	const bytes = new Uint8Array(await response.arrayBuffer());
	return {
		status: 'ok',
		body: new TextDecoder().decode(bytes),
		bytes,
		httpStatus: response.status,
		requestedAt,
		completedAt,
		validators,
		mediaType: response.headers.get('content-type')?.split(';')[0] ?? undefined,
	};
};

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
		private readonly deps: {
			fetch?: typeof globalThis.fetch;
			now?: Clock;
			sleep?: Sleep;
			capture?: (capture: FetchCapture) => void | Promise<void>;
		} = {},
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

		const requestedAt = new Date(now()).toISOString();
		const wait = this.#nextAllowedAt - now();
		if (wait > 0) await sleep(wait);
		this.#nextAllowedAt = now() + this.profile.minIntervalMs;

		let res: Response;
		try {
			res = await doFetch(url, { headers: requestHeaders(this.profile, validators) });
		} catch (error) {
			const result: FetchResult = {
				status: 'failed',
				requestedAt,
				completedAt: new Date(now()).toISOString(),
				failure: { code: 'network-error', detail: error instanceof Error ? error.message : String(error) },
			};
			await this.deps.capture?.({ resource: url, requestedAt, result });
			return result;
		}
		const result = await responseResult(this.profile, res, requestedAt, new Date(now()).toISOString());
		await this.deps.capture?.({ resource: url, requestedAt, result });
		return result;
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

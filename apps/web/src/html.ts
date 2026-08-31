export const escapeHtml = (value: string) =>
	value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

export const formatEastern = (iso: string) =>
	new Intl.DateTimeFormat('en-US', {
		timeZone: 'America/New_York',
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		timeZoneName: 'short',
	}).format(new Date(iso));

export const formatRemaining = (ms: number) => {
	if (ms <= 0) return 'due';
	const hours = Math.floor(ms / 3_600_000);
	const minutes = Math.floor((ms % 3_600_000) / 60_000);
	if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
	if (hours > 0) return `${hours}h ${minutes}m`;
	return `${Math.max(minutes, 1)}m`;
};

const two = (value: number) => String(value).padStart(2, '0');

/** Compact T-minus used on the home scheduler. */
export const formatTminus = (ms: number) => {
	if (ms <= 0) return 'due';
	const hours = Math.floor(ms / 3_600_000);
	const minutes = Math.floor((ms % 3_600_000) / 60_000);
	if (hours >= 24) return `T-${Math.floor(hours / 24)}d ${two(hours % 24)}:${two(minutes)}`;
	return `T-${two(hours)}:${two(minutes)}`;
};

export const formatAge = (iso: string, now = Date.now()) => {
	const age = Math.max(0, now - Date.parse(iso));
	if (age < 60_000) return `${Math.floor(age / 1000)}s ago`;
	if (age < 3_600_000) return `${Math.floor(age / 60_000)}m ago`;
	return `${Math.floor(age / 3_600_000)}h ago`;
};

/** Compact Eastern wall clock for the chrome, not a market-session claim. */
export const formatClock = (iso: string) => {
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone: 'America/New_York',
		weekday: 'short',
		day: '2-digit',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
	}).formatToParts(new Date(iso));
	const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
	return `ET ${get('weekday')} ${get('day')} ${get('month')} ${get('hour')}:${get('minute')}:${get('second')}`;
};

/** Ledger stamp in US/Eastern, compact enough for a terminal row. */
export const formatTapeStamp = (iso: string) => {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: 'America/New_York',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	}).formatToParts(new Date(iso));
	const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
	return `${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
};

export const asciiBar = (ratio: number, width = 16) => {
	const filled = Math.round(Math.max(0, Math.min(1, ratio)) * width);
	return `${'█'.repeat(filled)}${'░'.repeat(width - filled)}`;
};

/** Fraction of a 24h window already elapsed toward a Decision Cutoff. */
export const cutoffProgress = (deadline: string, now = Date.now()) => {
	const remaining = Date.parse(deadline) - now;
	return 1 - Math.max(0, Math.min(1, remaining / (24 * 60 * 60 * 1000)));
};

export const healthBar = (freshness: 'fresh' | 'quiet' | 'stale' | 'unseen') => {
	if (freshness === 'fresh') return '████████';
	if (freshness === 'quiet') return '████░░░░';
	if (freshness === 'stale') return '██░░░░░░';
	return '░░░░░░░░';
};

export const codeClass = (code: string) => {
	if (code === 'P') return 'ok';
	if (code === 'S' || code === 'D') return 'bad';
	return '';
};

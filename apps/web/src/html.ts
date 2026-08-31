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

export const formatAge = (iso: string, now = Date.now()) => {
	const age = Math.max(0, now - Date.parse(iso));
	if (age < 60_000) return `${Math.floor(age / 1000)}s ago`;
	if (age < 3_600_000) return `${Math.floor(age / 60_000)}m ago`;
	return `${Math.floor(age / 3_600_000)}h ago`;
};

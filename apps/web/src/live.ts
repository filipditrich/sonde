/** Browser script: patch the home <main> from REST; remaining time is local. */
export const liveScript = `
(() => {
	const home = () => document.querySelector('main[data-home]');
	const sse = document.getElementById('sse-status');
	const setSse = (state) => { if (sse) { sse.dataset.state = state; sse.textContent = 'SSE ' + state; } };
	const remaining = () => {
		const node = document.querySelector('[data-deadline]');
		if (!node || !node.dataset.deadline) return;
		const ms = Date.parse(node.dataset.deadline) - Date.now();
		if (ms <= 0) { node.textContent = 'due'; return; }
		const hours = Math.floor(ms / 3600000);
		const minutes = Math.floor((ms % 3600000) / 60000);
		node.textContent = hours >= 24 ? Math.floor(hours / 24) + 'd ' + (hours % 24) + 'h' : hours > 0 ? hours + 'h ' + minutes + 'm' : Math.max(minutes, 1) + 'm';
	};
	const paint = async () => {
		if (!home()) return;
		const response = await fetch('/api/view');
		if (!response.ok) return;
		const html = await response.text();
		const current = home();
		if (current) current.outerHTML = html;
		remaining();
	};
	const source = new EventSource('/api/events');
	source.onopen = () => { setSse('connected'); };
	source.onmessage = () => { setSse('connected'); void paint(); };
	source.onerror = () => { setSse('disconnected'); };
	setInterval(remaining, 1000);
	remaining();
})();
`.trim();

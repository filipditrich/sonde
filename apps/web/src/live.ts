import { PANE_STORAGE_KEY } from './panes';

export const cursorGap = (previous: number, next: number) => previous > 0 && next > previous + 1;

/** Advance the in-memory SSE cursor so a burst is not mistaken for a skip. */
export const nextSeenCursor = (previous: number, next: number) => (next > previous ? next : previous);

/** Browser script: patch home from REST; resume SSE; flag skipped cursors. */
export const liveScript = `
(() => {
	const home = () => document.querySelector('main[data-home]');
	const sse = document.getElementById('sse-status');
	const setSse = (state) => { if (sse) { sse.dataset.state = state; sse.textContent = 'SSE ' + state; } };
	const pad = (n) => String(n).padStart(2, '0');
	const clock = () => {
		const node = document.querySelector('[data-clock]');
		if (!node) return;
		const parts = new Intl.DateTimeFormat('en-GB', {
			timeZone: 'America/New_York',
			weekday: 'short',
			day: '2-digit',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false,
		}).formatToParts(new Date());
		const get = (type) => (parts.find((part) => part.type === type) || {}).value || '';
		const weekday = get('weekday');
		const hour = Number(get('hour')) % 24;
		const minute = Number(get('minute'));
		let phase = 'rth';
		if (weekday === 'Sat' || weekday === 'Sun') phase = 'closed';
		else if (hour * 60 + minute < 9 * 60 + 30) phase = 'pre';
		else if (hour * 60 + minute >= 16 * 60) phase = 'after';
		const rail = document.querySelector('[data-phase]');
		if (rail) {
			rail.dataset.phase = phase;
			rail.className = 'phase ' + phase;
			rail.textContent = 'session ' + phase;
		}
		node.innerHTML = 'ET ' + get('weekday') + ' ' + get('day') + ' ' + get('month') + ' ' + get('hour') + ':' + get('minute') + ':' + get('second') + '<span class="caret">█</span>';
	};
	const remaining = () => {
		const node = document.querySelector('[data-deadline]');
		if (!node || !node.dataset.deadline) return;
		const ms = Date.parse(node.dataset.deadline) - Date.now();
		if (ms <= 0) { node.textContent = 'due'; node.classList.add('due'); return; }
		node.classList.remove('due');
		const hours = Math.floor(ms / 3600000);
		const minutes = Math.floor((ms % 3600000) / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		node.textContent = hours >= 24
			? 'T-' + Math.floor(hours / 24) + 'd ' + pad(hours % 24) + ':' + pad(minutes) + ':' + pad(seconds)
			: 'T-' + pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
	};
	const paneKey = '${PANE_STORAGE_KEY}';
	const readPanes = () => {
		try { return JSON.parse(localStorage.getItem(paneKey) || '{}'); } catch (error) { return {}; }
	};
	const applyPanes = () => {
		const sizes = readPanes();
		document.querySelectorAll('[data-pane]').forEach((el) => {
			const size = sizes[el.dataset.pane];
			if (!size) return;
			if (size.w) el.style.width = size.w;
			if (size.h) el.style.height = size.h;
		});
	};
	const bindPanes = () => {
		document.querySelectorAll('[data-pane]').forEach((el) => {
			if (el.dataset.bound) return;
			el.dataset.bound = '1';
			el.addEventListener('mouseup', () => {
				const sizes = readPanes();
				sizes[el.dataset.pane] = { w: el.offsetWidth + 'px', h: el.offsetHeight + 'px' };
				localStorage.setItem(paneKey, JSON.stringify(sizes));
			});
			const title = el.querySelector('.head');
			if (!title) return;
			title.addEventListener('dblclick', () => {
				el.style.width = '';
				el.style.height = '';
				const sizes = readPanes();
				delete sizes[el.dataset.pane];
				localStorage.setItem(paneKey, JSON.stringify(sizes));
			});
		});
	};
	const paint = async () => {
		if (!home()) return;
		const prior = lastCursor;
		const response = await fetch('/api/view');
		if (!response.ok) return;
		const html = await response.text();
		const current = home();
		if (current) current.outerHTML = html;
		const painted = Number((home() && home().dataset.cursor) || 0);
		if (painted > lastCursor) lastCursor = painted;
		applyPanes();
		bindPanes();
		remaining();
		clock();
		if (painted > prior) {
			const row = document.querySelector('.ledger li');
			if (row) row.classList.add('fresh-row');
		}
	};
	let paintTimer = 0;
	const paintSoon = () => {
		clearTimeout(paintTimer);
		paintTimer = setTimeout(() => void paint(), 150);
	};
	let lastCursor = Number((home() && home().dataset.cursor) || 0);
	const source = new EventSource('/api/events?cursor=' + lastCursor);
	source.onopen = () => { if (sse && sse.dataset.state !== 'gap') setSse('connected'); };
	source.onmessage = (event) => {
		try {
			const next = Number(JSON.parse(event.data).cursor);
			if (lastCursor > 0 && next > lastCursor + 1) setSse('gap');
			else if (sse && sse.dataset.state !== 'gap') setSse('connected');
			if (next > lastCursor) lastCursor = next;
		} catch (error) {
			setSse('connected');
		}
		paintSoon();
	};
	source.onerror = () => { if (source.readyState === 2 && sse && sse.dataset.state !== 'gap') setSse('disconnected'); };
	applyPanes();
	bindPanes();
	setInterval(() => { remaining(); clock(); }, 1000);
	remaining();
	clock();
})();
`.trim();

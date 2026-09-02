import { barsForRange, type ChartRange, type CockpitSipBar } from '@sonde/core';

/** Pixel mapping only — never used as a quote or decision input. */
const toPx = (value: string) => Number(value);

const minMax = (values: readonly number[]) => {
	const head = values[0];
	if (head === undefined) return undefined;
	return values.reduce((acc, value) => ({ min: Math.min(acc.min, value), max: Math.max(acc.max, value) }), { min: head, max: head });
};

const pointsOf = (values: readonly number[], width: number, height: number, pad = 1) => {
	const range = minMax(values);
	if (!range) return '';
	const span = range.max - range.min || 1;
	const last = Math.max(values.length - 1, 1);
	return values
		.map((value, index) => {
			const x = (index / last) * width;
			const y = height - pad - ((value - range.min) / span) * (height - pad * 2);
			return `${x.toFixed(2)},${y.toFixed(2)}`;
		})
		.join(' ');
};

export const sparklineSvg = (closes: readonly string[], width = 64, height = 18) => {
	const values = closes.map(toPx);
	if (values.length < 2 || values.some((value) => !Number.isFinite(value))) return '';
	return `<svg class="spark" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true"><polyline fill="none" stroke="currentColor" points="${pointsOf(values, width, height)}"/></svg>`;
};

type Scale = { min: number; span: number; height: number; pad: number };

const yAt = (value: number, scale: Scale) => scale.height - scale.pad - ((value - scale.min) / scale.span) * (scale.height - scale.pad * 2);

const missingBars = '<p class="not-built">no SIP bars retained</p>';

const plotDomain = (window: readonly CockpitSipBar[], previousClose?: string) => {
	const closes = window.map((bar) => toPx(bar.close));
	if (closes.some((value) => !Number.isFinite(value))) return undefined;
	const prev = previousClose !== undefined ? toPx(previousClose) : undefined;
	const extras = prev !== undefined && Number.isFinite(prev) ? [prev] : [];
	const rangeY = minMax([...closes, ...window.map((bar) => toPx(bar.high)), ...window.map((bar) => toPx(bar.low)), ...extras]);
	if (!rangeY) return undefined;
	return { closes, prev, previousClose, rangeY, span: rangeY.max - rangeY.min || 1 };
};

const plotMarks = (
	window: readonly CockpitSipBar[],
	domain: NonNullable<ReturnType<typeof plotDomain>>,
	frame: { width: number; height: number; pad: number },
) => {
	const scale = { min: domain.rangeY.min, span: domain.span, height: frame.height, pad: frame.pad };
	const prevY = domain.prev !== undefined && Number.isFinite(domain.prev) ? yAt(domain.prev, scale) : undefined;
	const prevLine =
		prevY !== undefined
			? `<line class="ref" x1="0" x2="${frame.width}" y1="${prevY.toFixed(2)}" y2="${prevY.toFixed(2)}" /><text class="ref-label" x="8" y="${(prevY - 6).toFixed(2)}">previous close ${domain.previousClose}</text>`
			: '';
	const line =
		window.length === 1
			? `<circle class="now" cx="${frame.width / 2}" cy="${yAt(domain.closes[0]!, scale).toFixed(2)}" r="4" />`
			: `<polyline class="plot" fill="none" points="${pointsOf(domain.closes, frame.width, frame.height, frame.pad)}" />`;
	return `${prevLine}${line}`;
};

export const sipChartSvg = (bars: readonly CockpitSipBar[], range: ChartRange, previousClose?: string) => {
	const window = barsForRange(bars, range);
	const last = window.at(-1);
	if (!last) return missingBars;
	const domain = plotDomain(window, previousClose);
	if (!domain) return '<p class="not-built">SIP bars are not plottable</p>';
	const frame = { width: 640, height: 220, pad: 16 };
	const start = window[0]?.sessionDate ?? '';
	return `<svg class="sip-plot" viewBox="0 0 ${frame.width} ${frame.height}" role="img" aria-label="SIP delayed daily closes ${start} to ${last.sessionDate}">${plotMarks(window, domain, frame)}<text class="axis" x="8" y="${frame.height - 4}">${start}</text><text class="axis" x="${frame.width - 8}" y="${frame.height - 4}" text-anchor="end">${last.sessionDate}</text></svg>`;
};

export const RANGE_BUTTONS: { id: ChartRange; label: string }[] = [
	{ id: '1d', label: '1D' },
	{ id: '5d', label: '5D' },
	{ id: '1m', label: '1M' },
	{ id: '6m', label: '6M' },
	{ id: 'ytd', label: 'YTD' },
	{ id: '1y', label: '1Y' },
	{ id: '5y', label: '5Y' },
	{ id: 'max', label: 'Max' },
];

/** Browser range toggles and delayed-bar poll. No-op without [data-sip-chart]. */
export const chartScript = `
(() => {
	const root = document.querySelector('[data-sip-chart]');
	if (!root) return;
	const payload = () => {
		const node = document.getElementById('sip-bars');
		try { return node ? JSON.parse(node.textContent || '[]') : []; } catch (error) { return []; }
	};
	const RANGE = { '5d': 5, '1m': 21, '6m': 126, '1y': 252, '5y': 1260 };
	const barsForRange = (bars, range) => {
		if (range === 'max') return bars.slice();
		if (range === '1d') return bars.slice(-1);
		if (range === 'ytd') {
			const last = bars.length ? bars[bars.length - 1].sessionDate : '';
			if (!last) return [];
			const start = last.slice(0, 4) + '-01-01';
			return bars.filter((bar) => bar.sessionDate >= start);
		}
		return bars.slice(-(RANGE[range] || bars.length));
	};
	const toPx = (value) => Number(value);
	const minMax = (values) => {
		if (!values.length) return null;
		return values.reduce((acc, value) => ({ min: Math.min(acc.min, value), max: Math.max(acc.max, value) }), { min: values[0], max: values[0] });
	};
	const pointsOf = (values, width, height, pad) => {
		const range = minMax(values);
		if (!range) return '';
		const span = range.max - range.min || 1;
		const last = Math.max(values.length - 1, 1);
		return values.map((value, index) => {
			const x = (index / last) * width;
			const y = height - pad - ((value - range.min) / span) * (height - pad * 2);
			return x.toFixed(2) + ',' + y.toFixed(2);
		}).join(' ');
	};
	const yAt = (value, min, span, height, pad) => height - pad - ((value - min) / span) * (height - pad * 2);
	const draw = (bars, range, previousClose) => {
		const window = barsForRange(bars, range);
		const last = window[window.length - 1];
		if (!last) { root.innerHTML = '<p class="not-built">no SIP bars retained</p>'; return; }
		const width = 640, height = 220, pad = 16;
		const closes = window.map((bar) => toPx(bar.close));
		const highs = window.map((bar) => toPx(bar.high));
		const lows = window.map((bar) => toPx(bar.low));
		const prev = previousClose !== undefined ? toPx(previousClose) : undefined;
		const domain = closes.concat(highs, lows, prev !== undefined && Number.isFinite(prev) ? [prev] : []);
		const rangeY = minMax(domain);
		if (!rangeY) { root.innerHTML = '<p class="not-built">no SIP bars retained</p>'; return; }
		const span = rangeY.max - rangeY.min || 1;
		const prevY = prev !== undefined && Number.isFinite(prev) ? yAt(prev, rangeY.min, span, height, pad).toFixed(2) : '';
		const prevLine = prevY ? '<line class="ref" x1="0" x2="' + width + '" y1="' + prevY + '" y2="' + prevY + '" /><text class="ref-label" x="8" y="' + (Number(prevY) - 6).toFixed(2) + '">previous close ' + previousClose + '</text>' : '';
		const line = window.length === 1
			? '<circle class="now" cx="' + (width / 2) + '" cy="' + yAt(closes[0], rangeY.min, span, height, pad).toFixed(2) + '" r="4" />'
			: '<polyline class="plot" fill="none" points="' + pointsOf(closes, width, height, pad) + '" />';
		const start = window[0] && window[0].sessionDate || '';
		root.innerHTML = '<svg class="sip-plot" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="SIP delayed daily closes">' + prevLine + line + '<text class="axis" x="8" y="' + (height - 4) + '">' + start + '</text><text class="axis" x="' + (width - 8) + '" y="' + (height - 4) + '" text-anchor="end">' + last.sessionDate + '</text></svg>';
	};
	const previousCloseOf = (bars) => bars.length > 1 ? bars[bars.length - 2].close : undefined;
	const paint = (bars) => draw(bars, root.dataset.range || '1d', previousCloseOf(bars));
	document.querySelectorAll('[data-chart-range]').forEach((button) => {
		button.addEventListener('click', () => {
			root.dataset.range = button.getAttribute('data-chart-range') || '1d';
			document.querySelectorAll('[data-chart-range]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
			paint(payload());
		});
	});
	const id = root.dataset.candidateId;
	if (id) setInterval(async () => {
		try {
			const response = await fetch('/api/candidates/' + id);
			if (!response.ok) return;
			const detail = await response.json();
			const bars = (detail.quote && detail.quote.bars) || [];
			const node = document.getElementById('sip-bars');
			if (node) node.textContent = JSON.stringify(bars);
			paint(bars);
		} catch (error) { /* keep last retained bars */ }
	}, 30000);
})();
`.trim();

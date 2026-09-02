import type { CockpitNextAction, CockpitSnapshot } from '@sonde/core';

import { asciiBar, codeClass, cutoffProgress, escapeHtml, formatAge, formatEastern, formatTapeStamp, formatTminus, healthBar, tapeTag } from './html';

const tapeHref = (kind: CockpitSnapshot['tape'][number]['kind'], id: string) => {
	if (kind === 'candidate-snapshot') return `/candidates/${id}`;
	if (kind === 'signal') return `/signals/${id}`;
	if (kind === 'eligibility-decision') return `/eligibility/${id}`;
	if (kind === 'decision-packet') return `/packets/${id}`;
	return undefined;
};

const mast = (snapshot: CockpitSnapshot) => {
	const engine = snapshot.engine ?? { freshness: 'unseen' as const };
	const next = snapshot.nextAction.kind === 'decision-cutoff' ? `CUTOFF ${snapshot.nextAction.sessionDate}` : 'NO CUTOFF';
	const beat = engine.lastBeatAt ? formatAge(engine.lastBeatAt) : 'none';
	return `<dl class="mast"><div><dt>Runtime</dt><dd>Sonde · paper</dd></div><div><dt>Engine</dt><dd data-engine="${escapeHtml(engine.freshness)}"><span class="pip"></span>${escapeHtml(engine.freshness)} · ${escapeHtml(beat)}</dd></div><div><dt>Market clock</dt><dd>${escapeHtml(formatEastern(snapshot.asOf))}</dd></div><div><dt>Next</dt><dd>${escapeHtml(next)}</dd></div><div><dt>Snapshot</dt><dd>${escapeHtml(formatAge(snapshot.asOf))} · cursor ${snapshot.cursor}</dd></div><div><dt>Alerts</dt><dd class="not-built">not built</dd></div></dl>`;
};

const ticker = (facts: CockpitSnapshot['facts']) => {
	const names = [...new Set(facts.map((fact) => fact.issuerName))];
	if (!names.length) return '';
	const line = names.map((name) => escapeHtml(name)).join('   ·   ');
	return `<div class="ticker"><span>${line}   ·   ${line}</span></div>`;
};

const head = (title: string, meta?: string) =>
	`<div class="head"><h2>${escapeHtml(title)}</h2>${meta ? `<span>${escapeHtml(meta)}</span>` : ''}</div>`;

const dotted = (left: string, right: string, extra = '') =>
	`<li class="${extra}"><span>${left}</span><span class="lead"></span><span>${right}</span></li>`;

const pane = (spec: { id: string; klass?: string; title: string; meta?: string }, body: string) =>
	`<section class="pane ${spec.klass ?? ''}" data-pane="${escapeHtml(spec.id)}">${head(spec.title, spec.meta)}<div class="pane-body">${body}</div></section>`;

const nextActionSection = (action: CockpitNextAction) => {
	if (action.kind === 'unavailable') return pane({ id: 'next', title: 'Next action' }, `<p class="not-built">${escapeHtml(action.reason)}</p>`);
	const remaining = formatTminus(Date.parse(action.deadline) - Date.now());
	const prereqs = action.prerequisites
		.map((item) => dotted(escapeHtml(item.name), escapeHtml(item.detail), item.ready ? 'ready' : 'blocked'))
		.join('');
	const bar = asciiBar(cutoffProgress(action.deadline));
	return pane(
		{ id: 'next', title: 'Next action', meta: action.sessionDate },
		`<p class="tminus" data-deadline="${escapeHtml(action.deadline)}">${escapeHtml(remaining)}</p><p>Decision Cutoff ${escapeHtml(action.sessionDate)}</p><p class="bar">${escapeHtml(bar)}</p><p>calendar ${escapeHtml(action.calendarVersion)}</p><ul class="jobs">${prereqs}</ul>`,
	);
};

const funnelItems = (snapshot: CockpitSnapshot) => {
	const { funnel } = snapshot;
	const stages = [
		['documents', 'documents', funnel.documents],
		['transactions', 'transactions', funnel.transactions],
		['qualifying-purchases', 'qualifying P', funnel.qualifyingPurchases],
		['distinct-owner-candidates', '2+ owners', funnel.distinctOwnerCandidates],
		['liquid-signals', 'signals', funnel.liquidSignals],
	] as const;
	const peak = Math.max(funnel.documents, funnel.transactions, funnel.qualifyingPurchases, funnel.distinctOwnerCandidates, funnel.liquidSignals, 1);
	const rows = stages
		.map(
			([stage, label, count]) =>
				`<li><a href="/funnel/${stage}">${escapeHtml(label)}</a><span class="lead"></span><span class="bar">${escapeHtml(asciiBar(count / peak, 10))}</span><span class="amt">${count}</span></li>`,
		)
		.join('');
	return `<p class="hero">${funnel.documents}</p><p class="hero-label">documents</p><ol class="funnel">${rows}${dotted('proposals', '—', 'not-built')}${dotted('orders', '—', 'not-built')}${dotted('fills', '—', 'not-built')}</ol>`;
};

const factRows = (facts: CockpitSnapshot['facts']) => {
	if (!facts.length) return '<tr><td colspan="5">no retained facts</td></tr>';
	const groups = new Map<string, CockpitSnapshot['facts']>();
	for (const fact of facts) {
		const group = groups.get(fact.issuerCik) ?? [];
		groups.set(fact.issuerCik, [...group, fact]);
	}
	return [...groups.values()]
		.map((group) => {
			const head = group[0];
			if (!head) return '';
			const heading = `<tr class="cluster"><td colspan="5">${escapeHtml(head.issuerName)} cluster ${group.length}</td></tr>`;
			const rows = group
				.map((fact) => {
					const tone = codeClass(fact.transactionCode);
					return `<tr><td>${escapeHtml(fact.transactionDate)}</td><td>${escapeHtml(fact.issuerName)}</td><td><a href="/facts/${escapeHtml(fact.id)}">${escapeHtml(fact.reportingOwnerName)}</a></td><td class="amt">${escapeHtml(fact.shares)} @ ${escapeHtml(fact.pricePerShare)}</td><td class="${tone}">${escapeHtml(fact.transactionCode)}</td></tr>`;
				})
				.join('');
			return heading + rows;
		})
		.join('');
};

const healthRows = (health: CockpitSnapshot['health']) =>
	health
		.map((item) => {
			const barClass = item.freshness === 'stale' ? 'bar bad' : 'bar';
			return `<tr class="${escapeHtml(item.freshness)}"><td>${escapeHtml(item.job)}</td><td class="${barClass}">${healthBar(item.freshness)}</td><td>${escapeHtml(item.freshness)}</td></tr>`;
		})
		.join('');

const tapeItems = (tape: CockpitSnapshot['tape'] = []) => {
	if (!tape.length) return '<li>no decisions yet</li>';
	return tape
		.map((item) => {
			const href = tapeHref(item.kind, item.artifactId);
			const tag = tapeTag(item.kind);
			const title = href
				? `<a href="${escapeHtml(href)}"><span class="tag ${escapeHtml(tag.toLowerCase())}">${escapeHtml(tag)}</span> ${escapeHtml(item.summary)}</a>`
				: `<span class="tag ${escapeHtml(tag.toLowerCase())}">${escapeHtml(tag)}</span> ${escapeHtml(item.summary)}`;
			const causes = (item.causes ?? [])
				.map((cause) => {
					const tone = codeClass(cause.transactionCode);
					return `<li><a href="/facts/${escapeHtml(cause.factId)}">${escapeHtml(cause.reportingOwnerName)} <span class="${tone}">${escapeHtml(cause.transactionCode)}</span> ${escapeHtml(cause.shares)} @ ${escapeHtml(cause.pricePerShare)}</a></li>`;
				})
				.join('');
			return `<li><span class="when">${escapeHtml(formatTapeStamp(item.recordedAt))}</span><details><summary>${title}</summary>${causes ? `<ul>${causes}</ul>` : '<p>no causing filings</p>'}</details></li>`;
		})
		.join('');
};

const footer = (snapshot: CockpitSnapshot) => {
	const action = snapshot.nextAction;
	const bar = action.kind === 'decision-cutoff' ? asciiBar(cutoffProgress(action.deadline)) : '░░░░░░░░░░░░░░░░';
	const label = action.kind === 'decision-cutoff' ? `NEXT CUTOFF ${action.sessionDate}` : 'NO CAPTURED CUTOFF';
	return `<footer class="chrome footer"><span>paper · live tape · drag pane · dblclick title to reset</span><span>${escapeHtml(label)} <span class="bar">${escapeHtml(bar)}</span></span></footer>`;
};

const healthMeta = (health: CockpitSnapshot['health']) => {
	const fresh = health.filter((item) => item.freshness === 'fresh').length;
	return `${fresh}/${health.length} fresh`;
};

export const homeMain = (snapshot: CockpitSnapshot) =>
	`<main data-home data-cursor="${snapshot.cursor}">${mast(snapshot)}${ticker(snapshot.facts)}<div class="board">${pane({ id: 'urgent', klass: 'not-built pane-sm', title: 'Urgent' }, '<p>not built in this milestone</p>')}${nextActionSection(snapshot.nextAction)}${pane({ id: 'health', title: 'Health', meta: healthMeta(snapshot.health) }, `<table class="sheet"><thead><tr><th>job</th><th>load</th><th>state</th></tr></thead><tbody>${healthRows(snapshot.health)}</tbody></table>`)}${pane({ id: 'funnel', title: 'Funnel', meta: String(snapshot.funnel.documents) }, funnelItems(snapshot))}${pane({ id: 'tape', klass: 'pane-tall', title: 'Tape', meta: String(snapshot.tape?.length ?? 0) }, `<ul class="ledger">${tapeItems(snapshot.tape)}</ul>`)}${pane({ id: 'facts', klass: 'pane-tall', title: 'Facts', meta: String(snapshot.facts.length) }, `<table class="sheet"><thead><tr><th>date</th><th>issuer</th><th>owner</th><th>amt</th><th>cls</th></tr></thead><tbody>${factRows(snapshot.facts)}</tbody></table>`)}${pane({ id: 'positions', klass: 'not-built pane-sm', title: 'Positions' }, '<p>not built in this milestone</p>')}${pane({ id: 'scorecards', klass: 'not-built pane-wide', title: 'Scorecards' }, '<p>not built in this milestone</p>')}</div>${footer(snapshot)}</main>`;

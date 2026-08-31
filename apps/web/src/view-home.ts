import type { CockpitNextAction, CockpitSnapshot } from '@sonde/core';

import { escapeHtml, formatAge, formatEastern, formatRemaining } from './html';

const tapeHref = (kind: CockpitSnapshot['tape'][number]['kind'], id: string) => {
	if (kind === 'candidate-snapshot') return `/candidates/${id}`;
	if (kind === 'signal') return `/signals/${id}`;
	if (kind === 'eligibility-decision') return `/eligibility/${id}`;
	if (kind === 'decision-packet') return `/packets/${id}`;
	return undefined;
};

const rail = (snapshot: CockpitSnapshot) => {
	const next = snapshot.nextAction.kind === 'decision-cutoff' ? `Decision Cutoff ${snapshot.nextAction.sessionDate}` : 'no captured cutoff';
	return `<dl class="rail"><div><dt>Operating state</dt><dd class="not-built">not built in this milestone</dd></div><div><dt>Data Readiness</dt><dd class="not-built">not built in this milestone</dd></div><div><dt>Market clock</dt><dd>${escapeHtml(formatEastern(snapshot.asOf))}</dd></div><div><dt>Next action</dt><dd>${escapeHtml(next)}</dd></div><div><dt>Snapshot</dt><dd data-as-of="${escapeHtml(snapshot.asOf)}">${escapeHtml(formatAge(snapshot.asOf))} · cursor ${snapshot.cursor}</dd></div><div><dt>Alerts</dt><dd class="not-built">not built in this milestone</dd></div></dl>`;
};

const nextActionSection = (action: CockpitNextAction) => {
	if (action.kind === 'unavailable') return `<section><h2>Next scheduled action</h2><p class="not-built">${escapeHtml(action.reason)}</p></section>`;
	const remaining = formatRemaining(Date.parse(action.deadline) - Date.now());
	const prereqs = action.prerequisites
		.map((item) => `<li class="${item.ready ? 'ready' : 'blocked'}">${escapeHtml(item.name)}: ${escapeHtml(item.detail)}</li>`)
		.join('');
	return `<section><h2>Next scheduled action</h2><p>Decision Cutoff ${escapeHtml(action.sessionDate)} · <span data-deadline="${escapeHtml(action.deadline)}">${escapeHtml(remaining)}</span></p><p>calendar ${escapeHtml(action.calendarVersion)} · window open ${escapeHtml(formatEastern(action.decisionWindowOpen))}</p><ul>${prereqs}</ul></section>`;
};

const funnelItems = (snapshot: CockpitSnapshot) => {
	const { funnel } = snapshot;
	const stages = [
		['documents', 'Form 4 documents', funnel.documents],
		['transactions', 'typed transactions', funnel.transactions],
		['qualifying-purchases', 'qualifying purchases', funnel.qualifyingPurchases],
		['distinct-owner-candidates', 'distinct-owner candidates', funnel.distinctOwnerCandidates],
		['liquid-signals', 'liquid eligible Signals', funnel.liquidSignals],
	] as const;
	const rows = stages.map(([stage, label, count]) => `<li><a href="/funnel/${stage}">${escapeHtml(label)}</a><span>${count}</span></li>`).join('');
	return `<ol class="funnel">${rows}<li class="not-built"><span>proposals</span><span>not built in this milestone</span></li><li class="not-built"><span>orders</span><span>not built in this milestone</span></li><li class="not-built"><span>fills</span><span>not built in this milestone</span></li></ol>`;
};

const factItems = (facts: CockpitSnapshot['facts']) => {
	if (!facts.length) return '<li>No retained facts</li>';
	const groups = new Map<string, CockpitSnapshot['facts']>();
	for (const fact of facts) {
		const group = groups.get(fact.issuerCik) ?? [];
		groups.set(fact.issuerCik, [...group, fact]);
	}
	return [...groups.values()]
		.map((group) => {
			const head = group[0];
			if (!head) return '';
			const rows = group.map((fact) => `${escapeHtml(fact.transactionCode)} ${fact.shares} @ ${fact.pricePerShare}`).join('; ');
			return `<li>${escapeHtml(head.issuerName)} cluster ${group.length}: ${rows}</li>`;
		})
		.join('');
};

const healthItems = (health: CockpitSnapshot['health']) =>
	health
		.map(
			(item) =>
				`<li>${escapeHtml(item.job)}: ${escapeHtml(item.freshness)}${item.freshness === 'unseen' ? '' : ` (${escapeHtml(item.outcome ?? item.job)}) at ${item.lastEventAt}`}</li>`,
		)
		.join('');

const tapeItems = (tape: CockpitSnapshot['tape'] = []) => {
	if (!tape.length) return '<li>No decisions yet</li>';
	return tape
		.map((item) => {
			const href = tapeHref(item.kind, item.artifactId);
			const title = href
				? `<a href="${escapeHtml(href)}">${escapeHtml(item.kind)} ${escapeHtml(item.summary)}</a>`
				: `${escapeHtml(item.kind)} ${escapeHtml(item.summary)}`;
			const causes = (item.causes ?? [])
				.map(
					(cause) =>
						`<li>${escapeHtml(cause.reportingOwnerName)} ${escapeHtml(cause.transactionCode)} ${escapeHtml(cause.shares)} @ ${escapeHtml(cause.pricePerShare)}</li>`,
				)
				.join('');
			return `<li><details><summary>${title} at ${item.recordedAt}</summary>${causes ? `<ul>${causes}</ul>` : '<p>No causing filings on this row</p>'}</details></li>`;
		})
		.join('');
};

export const homeMain = (snapshot: CockpitSnapshot) =>
	`<main data-home><h1>Sonde cockpit</h1>${rail(snapshot)}<div class="grid"><section class="not-built"><h2>Urgent attention</h2><p>not built in this milestone</p></section>${nextActionSection(snapshot.nextAction)}<section><h2>Candidate funnel</h2>${funnelItems(snapshot)}</section><section><h2>Decision tape</h2><ul>${tapeItems(snapshot.tape)}</ul></section><section class="span-2 not-built"><h2>Positions and exposure</h2><p>not built in this milestone</p></section><section class="span-2 not-built"><h2>Scorecard summaries</h2><p>not built in this milestone</p></section><section><h2>Recent Source Facts</h2><ul>${factItems(snapshot.facts)}</ul></section><section><h2>Source and market-data health</h2><ul>${healthItems(snapshot.health)}</ul></section></div></main>`;

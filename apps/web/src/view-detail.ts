import type {
	CockpitCandidateDetail,
	CockpitDocumentDetail,
	CockpitEligibilityDetail,
	CockpitFactDetail,
	CockpitFunnelPopulation,
	CockpitPacketDetail,
	CockpitSignalDetail,
	InputReference,
} from '@sonde/core';

import { codeClass, escapeHtml, formatEastern } from './html';

const STUDY_PRIOR = { winRate: '58.3%', median: '+1.83%' } as const;

const refs = (inputRefs: readonly InputReference[]) =>
	`<table class="sheet"><thead><tr><th>kind</th><th>id</th><th>role</th></tr></thead><tbody>${inputRefs
		.map((ref) => `<tr><td>${escapeHtml(ref.kind)}</td><td>${escapeHtml(ref.id)}</td><td>${escapeHtml(ref.role)}</td></tr>`)
		.join('')}</tbody></table>`;

const factList = (rows: CockpitCandidateDetail['qualifyingFacts']) => {
	if (!rows.length) return '<p>No causing filings on this row</p>';
	return `<table class="sheet"><thead><tr><th>owner</th><th>amt</th><th>cls</th></tr></thead><tbody>${rows
		.map((row) => {
			const tone = codeClass(row.transactionCode);
			return `<tr><td><a href="/facts/${escapeHtml(row.factId)}">${escapeHtml(row.reportingOwnerName)}</a></td><td class="amt">${escapeHtml(row.shares)} @ ${escapeHtml(row.pricePerShare)}</td><td class="${tone}">${escapeHtml(row.transactionCode)}</td></tr>`;
		})
		.join('')}</tbody></table>`;
};

const link = (href: string | undefined, label: string) => (href ? `<p><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></p>` : '');

export const candidatePage = (detail: CockpitCandidateDetail) =>
	`<main class="detail"><h1>Candidate</h1><p>${escapeHtml(detail.issuerName)} ${escapeHtml(detail.issuerCik)}</p><p>${detail.reportingOwnerCiks.length} reporting owners · window ${escapeHtml(formatEastern(detail.decisionWindowOpen))}</p><h2>Owners</h2><ul>${detail.reportingOwnerCiks.map((cik) => `<li>${escapeHtml(cik)}</li>`).join('')}</ul><h2>Qualifying purchases</h2>${factList(detail.qualifyingFacts)}${link(detail.eligibilityId ? `/eligibility/${detail.eligibilityId}` : undefined, 'Eligibility Decision')}${link(detail.packetId ? `/packets/${detail.packetId}` : undefined, 'Decision Packet')}${link(detail.signalId ? `/signals/${detail.signalId}` : undefined, 'Signal')}<h2>Input references</h2>${refs(detail.inputRefs)}</main>`;

export const signalPage = (detail: CockpitSignalDetail) =>
	`<main class="detail"><h1>Signal</h1><p>${escapeHtml(detail.issuerName)} ${escapeHtml(detail.issuerCik)}${detail.ticker ? ` ${escapeHtml(detail.ticker)}` : ''} long</p><p>entry ${escapeHtml(detail.entryConvention)} ${escapeHtml(formatEastern(detail.decisionWindowOpen))} · horizon close ${escapeHtml(formatEastern(detail.horizonCloseAt))}</p><h2>Rationale</h2><p>${escapeHtml(detail.rationale)}</p><h2>Bootstrap prior</h2><p>${escapeHtml(detail.bootstrapPrior.label)} · ${detail.bootstrapPrior.distinctOwnerCount} owners · labelled study cohort ${STUDY_PRIOR.winRate} win rate, median ${STUDY_PRIOR.median}; not event confidence</p><h2>Causing filings</h2>${factList(detail.sources)}${link(detail.candidateSnapshotId ? `/candidates/${detail.candidateSnapshotId}` : undefined, 'Candidate Snapshot')}${link(detail.eligibilityId ? `/eligibility/${detail.eligibilityId}` : undefined, 'Eligibility Decision')}${link(detail.packetId ? `/packets/${detail.packetId}` : undefined, 'Decision Packet')}<h2>Input references</h2>${refs(detail.inputRefs)}<h2>Signal Outcome</h2><p class="not-built">not built in this milestone</p></main>`;

export const eligibilityPage = (detail: CockpitEligibilityDetail) => {
	const checks = detail.failedChecks.length
		? `<ul>${detail.failedChecks.map((check) => `<li>${escapeHtml(check.check)}: ${escapeHtml(check.reason)}</li>`).join('')}</ul>`
		: '<p>No failed checks</p>';
	return `<main class="detail"><h1>Eligibility Decision</h1><p>${escapeHtml(detail.issuerName)} ${escapeHtml(detail.issuerCik)} · ${detail.eligible ? 'eligible' : 'ineligible'}</p><h2>Failed checks</h2>${checks}${link(`/candidates/${detail.candidateSnapshotId}`, 'Candidate Snapshot')}${link(detail.packetId ? `/packets/${detail.packetId}` : undefined, 'Decision Packet')}${link(detail.signalId ? `/signals/${detail.signalId}` : undefined, 'Signal')}<h2>Input references</h2>${refs(detail.inputRefs)}</main>`;
};

export const packetPage = (detail: CockpitPacketDetail) =>
	`<main class="detail"><h1>Decision Packet</h1><p>${escapeHtml(detail.issuerName)} ${escapeHtml(detail.issuerCik)}</p><p>${escapeHtml(detail.strategyVersion)} · ${escapeHtml(detail.policyVersion)} · calendar ${escapeHtml(detail.calendarVersion)}</p><p>window ${escapeHtml(formatEastern(detail.decisionWindowOpen))}</p>${link(`/eligibility/${detail.eligibilityDecisionId}`, 'Eligibility Decision')}${link(detail.signalId ? `/signals/${detail.signalId}` : undefined, 'Signal')}<h2>Input references</h2>${refs(detail.inputRefs)}</main>`;

export const funnelPage = (population: CockpitFunnelPopulation) => {
	const rows = population.rows.length
		? population.rows
				.map((row) => {
					const body = row.href ? `<a href="${escapeHtml(row.href)}">${escapeHtml(row.summary)}</a>` : escapeHtml(row.summary);
					return `<tr><td>${body}</td></tr>`;
				})
				.join('')
		: '<tr><td>No rows in this population</td></tr>';
	return `<main class="detail"><h1>Funnel · ${escapeHtml(population.stage)}</h1><p>${population.count} in stored population${population.rows.length < population.count ? ` · showing ${population.rows.length}` : ''}</p><table class="sheet"><tbody>${rows}</tbody></table></main>`;
};

export const documentPage = (detail: CockpitDocumentDetail) => {
	const facts = detail.facts.length
		? `<table class="sheet"><thead><tr><th>fact</th></tr></thead><tbody>${detail.facts
				.map((fact) => `<tr><td><a href="${escapeHtml(fact.href)}">${escapeHtml(fact.summary)}</a></td></tr>`)
				.join('')}</tbody></table>`
		: '<p>No parsed Source Facts</p>';
	return `<main class="detail"><h1>Source Document</h1><dl class="kv"><dt>sha256</dt><dd>${escapeHtml(detail.sha256)}</dd><dt>media</dt><dd>${escapeHtml(detail.mediaType)}</dd><dt>bytes</dt><dd>${detail.byteSize}</dd><dt>recorded</dt><dd>${escapeHtml(formatEastern(detail.recordedAt))}</dd></dl><h2>Parsed facts</h2>${facts}</main>`;
};

export const factPage = (detail: CockpitFactDetail) =>
	`<main class="detail"><h1>Source Fact</h1><dl class="kv"><dt>issuer</dt><dd>${escapeHtml(detail.issuerName)} ${escapeHtml(detail.issuerCik)}${detail.issuerTicker ? ` ${escapeHtml(detail.issuerTicker)}` : ''}</dd><dt>owner</dt><dd>${escapeHtml(detail.reportingOwnerName)} ${escapeHtml(detail.reportingOwnerCik)}</dd><dt>txn</dt><dd><span class="${codeClass(detail.transactionCode)}">${escapeHtml(detail.transactionCode)}</span> ${escapeHtml(detail.acquiredDisposed)} ${escapeHtml(detail.shares)} @ ${escapeHtml(detail.pricePerShare)}</dd><dt>date</dt><dd>${escapeHtml(detail.transactionDate)}</dd><dt>accession</dt><dd>${escapeHtml(detail.accession)}</dd></dl>${link(`/documents/${detail.documentSha256}`, 'Source Document')}</main>`;

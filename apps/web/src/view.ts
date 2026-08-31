import type { CockpitSnapshot } from '@sonde/core';

import { escapeHtml, formatClock } from './html';
import { liveScript } from './live';
import { cockpitStyles } from './styles';
import { homeMain } from './view-home';

const chrome = (live: boolean) =>
	`<header class="chrome"><span class="brand">Sonde runtime<span>paper instrument</span></span><span class="slash">/////</span><span data-clock>${escapeHtml(formatClock(new Date().toISOString()))}</span><span>mode paper</span>${live ? '<span id="sse-status" data-state="connecting">SSE connecting</span>' : '<span>read</span>'}</header>`;

export const page = (body: string, live = false, navHome = !live) =>
	`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sonde cockpit</title><style>${cockpitStyles}</style></head><body>${chrome(live)}${navHome ? '<a class="back" href="/">Home</a>' : ''}${body}${live ? `<script>${liveScript}</script>` : ''}</body></html>`;

export const homePage = (snapshot: CockpitSnapshot) => page(homeMain(snapshot), true);

export const viewFragment = (snapshot: CockpitSnapshot) => homeMain(snapshot);

export const loginPage = page(
	'<main class="detail"><h1>Sonde</h1><form method="post" action="/session"><label>Operator token <input name="token" type="password" autofocus></label><button>Open cockpit</button></form></main>',
	false,
	false,
);

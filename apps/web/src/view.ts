import type { CockpitSnapshot } from '@sonde/core';

import { liveScript } from './live';
import { cockpitStyles } from './styles';
import { homeMain } from './view-home';

export const page = (body: string, live = false) =>
	`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sonde cockpit</title><style>${cockpitStyles}</style></head><body><div id="sse-status" data-state="connecting">SSE connecting</div>${live ? '' : '<a class="back" href="/">Home</a>'}${body}${live ? `<script>${liveScript}</script>` : ''}</body></html>`;

export const homePage = (snapshot: CockpitSnapshot) => page(homeMain(snapshot), true);

export const viewFragment = (snapshot: CockpitSnapshot) => homeMain(snapshot);

export const loginPage = page(
	'<main><h1>Sonde cockpit</h1><form method="post" action="/session"><label>Operator token <input name="token" type="password" autofocus></label><button>Open cockpit</button></form></main>',
);

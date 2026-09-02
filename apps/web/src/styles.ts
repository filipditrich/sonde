export const cockpitStyles = `
:root {
	color-scheme: dark;
	--bg: #010101;
	--fg: #d7ffe0;
	--muted: #5a6b5e;
	--line: #143018;
	--ok: #39ff14;
	--bad: #ff3b30;
	--cyan: #6ee7f5;
	--amber: #f5c542;
}
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body {
	display: flex; flex-direction: column;
	font: 11px/1.3 ui-monospace, 'SF Mono', 'IBM Plex Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
	background:
		linear-gradient(rgba(57,255,20,0.03), rgba(57,255,20,0.03)),
		repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.35) 2px, rgba(0,0,0,0.35) 3px),
		#000;
	color: var(--fg);
	letter-spacing: 0.03em;
}
main[data-home] { flex: 1; display: flex; flex-direction: column; min-height: 0; }
a { color: var(--cyan); text-decoration: none; }
a:hover { text-decoration: underline; color: var(--ok); }
h1, h2 {
	font-size: 11px; font-weight: 650; letter-spacing: 0.16em; text-transform: uppercase; margin: 0;
	color: var(--cyan);
}
h1::before, h2::before { content: '// '; color: var(--ok); }
.head { display: flex; justify-content: space-between; align-items: baseline; gap: 0.8rem; margin: 0 0 0.5rem; background: transparent; flex-shrink: 0; }
.head span { color: var(--muted); letter-spacing: 0.12em; text-transform: uppercase; font-size: 9px; }
.lead { flex: 1; border-bottom: 1px dotted #1f3d22; min-width: 0.8rem; margin: 0 0.35rem; height: 0.7em; }
p, ul, ol { margin: 0; }
ul, ol { padding-left: 1rem; }
.chrome {
	display: flex; flex-wrap: wrap; gap: 0.35rem 1.1rem; align-items: center;
	padding: 0.35rem 0.7rem; border-bottom: 1px solid var(--line); color: var(--muted);
	text-transform: uppercase; letter-spacing: 0.12em; font-size: 10px; background: #000;
	box-shadow: 0 1px 0 #39ff1422;
}
.chrome.footer {
	border-top: 1px solid var(--line); border-bottom: 0; justify-content: space-between;
	position: sticky; bottom: 0;
}
header.chrome { position: sticky; top: 0; z-index: 2; flex-shrink: 0; }
.brand { color: var(--ok); letter-spacing: 0.22em; font-weight: 700; text-shadow: 0 0 10px #39ff1466; }
.brand span { display: block; color: var(--muted); font-weight: 400; letter-spacing: 0.12em; font-size: 9px; text-shadow: none; }
.slash { color: var(--bad); letter-spacing: 0.18em; font-weight: 700; }
[data-clock] { color: var(--fg); margin-left: auto; font-variant-numeric: tabular-nums; }
.caret { color: var(--ok); margin-left: 0.15rem; animation: blink 1.05s step-end infinite; }
.phase { letter-spacing: 0.14em; }
.phase.pre { color: var(--cyan); }
.phase.rth { color: var(--ok); text-shadow: 0 0 8px #39ff1455; }
.phase.after { color: var(--amber); }
.phase.closed { color: var(--bad); }
#sse-status[data-state="connecting"] { color: var(--amber); }
#sse-status[data-state="connected"] { color: var(--ok); text-shadow: 0 0 8px #39ff1455; }
#sse-status[data-state="connected"]::before { content: ''; display: inline-block; width: 0.45rem; height: 0.45rem; margin-right: 0.35rem; border-radius: 50%; background: var(--ok); box-shadow: 0 0 8px var(--ok); animation: pulse 1.4s ease-out infinite; }
#sse-status[data-state="disconnected"], #sse-status[data-state="gap"] { color: var(--bad); text-shadow: 0 0 8px #ff3b3055; }
.ticker {
	display: flex; align-items: stretch; overflow: hidden; border-bottom: 1px solid var(--line); background: #020802;
	color: var(--ok); font-size: 10px; letter-spacing: 0.08em; white-space: nowrap; line-height: 1.8;
}
.ticker-meta {
	flex: 0 0 auto; z-index: 1; display: flex; flex-direction: column; justify-content: center;
	padding: 0.15rem 0.7rem; border-right: 1px solid var(--line); background: #020802;
	color: var(--muted); letter-spacing: 0.12em; text-transform: uppercase; font-size: 9px; line-height: 1.25;
}
.ticker-viewport { flex: 1 1 auto; min-width: 0; overflow: hidden; }
.ticker-track {
	display: flex; width: max-content; flex-shrink: 0; align-items: center; gap: 1.4rem;
	padding: 0.2rem 0.9rem; animation: tick 48s linear infinite;
}
.quote, .quote a {
	display: inline-flex; flex: 0 0 auto; align-items: center; gap: 0.45rem;
	color: inherit; text-decoration: none; white-space: nowrap;
}
.quote a:hover { text-decoration: none; color: var(--ok); }
.quote .sym { letter-spacing: 0.14em; font-weight: 700; }
.quote .last { font-variant-numeric: tabular-nums; color: var(--fg); }
.chg.up { color: var(--ok); }
.chg.down { color: var(--bad); }
.chg.flat { color: var(--muted); }
.spark { flex: 0 0 auto; display: block; }
.hero-unit { font-size: 0.42em; color: var(--muted); letter-spacing: 0.12em; vertical-align: super; }
.quote-meta { color: var(--muted); letter-spacing: 0.12em; text-transform: uppercase; }
.ranges { display: flex; flex-wrap: wrap; gap: 0.15rem; margin: 0.35rem 0 0.45rem; }
.ranges button {
	font: inherit; padding: 0.15rem 0.4rem; background: transparent; color: var(--muted);
	border: 0; border-bottom: 1px solid transparent; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer;
}
.ranges button[aria-pressed="true"] { color: var(--cyan); border-bottom-color: var(--cyan); }
.sip-plot { width: 100%; max-width: 52rem; height: 220px; border: 1px solid var(--line); background: #020802; }
.sip-plot .plot { stroke: var(--ok); stroke-width: 2; }
.sip-plot .now { fill: var(--ok); }
.sip-plot .ref { stroke: var(--muted); stroke-dasharray: 4 3; }
.sip-plot .ref-label, .sip-plot .axis { fill: var(--muted); font-size: 11px; font-family: inherit; }
.stats { max-width: 36rem; }
.mast {
	display: flex; flex-wrap: wrap; gap: 0.55rem 1.35rem;
	padding: 0.45rem 0.7rem 0.4rem; border-bottom: 1px solid var(--line); background: #000;
}
.mast dt { color: var(--muted); font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; }
.mast dd { margin: 0.08rem 0 0; }
.pip {
	display: inline-block; width: 0.45rem; height: 0.45rem; margin-right: 0.35rem;
	border-radius: 50%; background: currentColor; box-shadow: 0 0 7px currentColor; vertical-align: 0.05rem;
}
.board {
	flex: 1; display: flex; flex-wrap: wrap; align-content: flex-start;
	overflow: auto; min-height: 0;
}
.pane {
	display: flex; flex-direction: column;
	width: 33.33%; height: 28vh; min-width: 14rem; min-height: 8rem;
	padding: 0.45rem 0.6rem 0.85rem; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line);
	resize: both; overflow: hidden; background: rgba(0,8,0,0.55);
	box-shadow: inset 0 0 0 1px #0c1c0e;
}
.pane-tall { height: 38vh; }
.pane-sm { height: 16vh; }
.pane-wide { width: 66.66%; height: 14vh; }
.pane-body { flex: 1; min-height: 0; overflow: auto; }
.pane::-webkit-resizer { background: #143018; box-shadow: inset 0 0 0 1px #39ff1444; }
.not-built { color: var(--muted); }
.hero { font-size: 2.35rem; font-weight: 700; letter-spacing: 0.04em; line-height: 0.95; color: var(--ok); text-shadow: 0 0 18px #39ff1433; }
.hero-label { color: var(--muted); text-transform: uppercase; letter-spacing: 0.12em; font-size: 10px; margin: 0.2rem 0 0.55rem; }
.funnel, .jobs { list-style: none; padding: 0; }
.funnel li, .jobs li { display: flex; align-items: baseline; gap: 0; padding: 0.08rem 0; }
.funnel a { color: var(--fg); }
.funnel .amt { color: var(--fg); font-variant-numeric: tabular-nums; min-width: 2.4rem; text-align: right; }
.ledger { list-style: none; padding: 0; }
.ledger li { display: flex; gap: 0.55rem; align-items: baseline; padding: 0.1rem 0.2rem; border-left: 2px solid transparent; }
.ledger li.fresh-row { animation: flash 1.2s ease-out; border-left-color: var(--ok); }
.ledger details { flex: 1; min-width: 0; }
.ledger .when { color: var(--muted); flex: 0 0 auto; font-variant-numeric: tabular-nums; }
.tag {
	display: inline-block; min-width: 2.4rem; padding: 0 0.2rem; margin-right: 0.2rem;
	border: 1px solid currentColor; letter-spacing: 0.08em; font-size: 9px;
}
.tag.sig { color: var(--ok); }
.tag.elg { color: var(--amber); }
.tag.cnd { color: var(--cyan); }
.tag.pkt { color: var(--fg); }
.tag.unv { color: var(--muted); }
details > summary { cursor: pointer; list-style: none; }
details > summary::-webkit-details-marker { display: none; }
.ready, .fresh, .ok, [data-engine="fresh"] { color: var(--ok); }
.blocked, .stale, .bad, [data-engine="stale"] { color: var(--bad); }
.quiet, .unseen { color: var(--cyan); }
.bar { color: var(--ok); letter-spacing: -0.06em; }
.bar.bad { color: var(--bad); }
.tminus { font-size: 28px; font-weight: 700; letter-spacing: 0.04em; font-variant-numeric: tabular-nums; color: var(--ok); text-shadow: 0 0 16px #39ff1444; }
.tminus.due { color: var(--bad); text-shadow: 0 0 16px #ff3b3055; animation: blink 1s step-end infinite; }
.sheet { width: max-content; min-width: 100%; border-collapse: collapse; }
.sheet th {
	color: var(--cyan); font-weight: 650; text-align: left; letter-spacing: 0.1em;
	text-transform: uppercase; font-size: 9px; padding: 0.1rem 0.45rem 0.2rem 0;
	position: sticky; top: 0; background: #000;
}
.sheet td { padding: 0.12rem 0.45rem 0.12rem 0; border-bottom: 1px solid #0d1a10; vertical-align: top; }
.sheet td.amt { text-align: right; font-variant-numeric: tabular-nums; }
.sheet tr.cluster td {
	color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; font-size: 9px;
	border-bottom: 1px solid var(--line); padding-top: 0.4rem;
}
.sheet tbody tr:hover td { background: #07140a; }
.back { display: inline-block; margin: 0.45rem 0.7rem 0; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; }
.detail { padding: 0.7rem 0.75rem 1.4rem; max-width: 72rem; }
.detail p, .detail ul { margin-bottom: 0.45rem; }
.kv { display: grid; grid-template-columns: 9rem minmax(0, 1fr); gap: 0.22rem 1rem; margin: 0 0 0.8rem; }
.kv dt { color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; font-size: 10px; padding-top: 0.12rem; }
.kv dd { margin: 0; overflow-wrap: anywhere; }
.payload {
	margin: 0; padding: 0.55rem 0.6rem; max-height: 70vh; overflow: auto;
	white-space: pre-wrap; overflow-wrap: anywhere; background: #050505;
	border: 1px solid var(--line); color: var(--fg);
}
@keyframes blink { 50% { opacity: 0; } }
@keyframes pulse { 0% { opacity: 1; } 70% { opacity: 0.25; } 100% { opacity: 1; } }
@keyframes tick { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes flash { from { background: #143018; } to { background: transparent; } }
@media (max-width: 1100px) {
	.pane { width: 50%; }
	.pane-wide { width: 100%; }
}
@media (max-width: 800px) {
	.pane, .pane-wide { width: 100%; }
	.ticker-track { animation-duration: 28s; }
}
@media (prefers-reduced-motion: reduce) {
	.caret, .ticker-track, #sse-status[data-state="connected"]::before, .fresh-row, .tminus.due { animation: none; }
}
form { padding: 2rem 0.75rem; max-width: 28rem; }
label { display: grid; gap: 0.4rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
input, button {
	font: inherit; padding: 0.45rem 0.55rem; background: #050505; color: var(--fg);
	border: 1px solid var(--line); border-radius: 0;
}
button { text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; color: var(--ok); border-color: var(--ok); }
`.trim();

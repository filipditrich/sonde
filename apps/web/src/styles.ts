export const cockpitStyles = `
:root {
	color-scheme: dark;
	--bg: #000;
	--fg: #f2f2f2;
	--muted: #6f6f6f;
	--line: #1c1c1c;
	--ok: #39ff14;
	--bad: #ff3b30;
	--cyan: #6ee7f5;
}
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body {
	display: flex; flex-direction: column;
	font: 11px/1.3 ui-monospace, 'SF Mono', 'IBM Plex Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
	background: var(--bg);
	color: var(--fg);
	letter-spacing: 0.02em;
}
main[data-home] { flex: 1; display: flex; flex-direction: column; min-height: 0; }
a { color: var(--cyan); text-decoration: none; }
a:hover { text-decoration: underline; }
h1, h2 {
	font-size: 11px; font-weight: 650; letter-spacing: 0.14em; text-transform: uppercase; margin: 0;
	color: var(--muted);
}
h1::before, h2::before { content: '// '; color: var(--cyan); }
.head { display: flex; justify-content: space-between; align-items: baseline; gap: 0.8rem; margin: 0 0 0.5rem; background: #000; flex-shrink: 0; }
.head span { color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; font-size: 9px; }
.lead { flex: 1; border-bottom: 1px dotted #2a2a2a; min-width: 0.8rem; margin: 0 0.35rem; height: 0.7em; }
p, ul, ol { margin: 0; }
ul, ol { padding-left: 1rem; }
.chrome {
	display: flex; flex-wrap: wrap; gap: 0.35rem 1.1rem; align-items: center;
	padding: 0.4rem 0.7rem; border-bottom: 1px solid var(--line); color: var(--muted);
	text-transform: uppercase; letter-spacing: 0.1em; font-size: 10px; background: #000;
}
.chrome.footer {
	border-top: 1px solid var(--line); border-bottom: 0; justify-content: space-between;
	position: sticky; bottom: 0;
}
header.chrome { position: sticky; top: 0; z-index: 2; flex-shrink: 0; }
.brand { color: var(--fg); letter-spacing: 0.16em; font-weight: 650; }
.brand span { display: block; color: var(--muted); font-weight: 400; letter-spacing: 0.12em; font-size: 9px; }
.slash { color: var(--bad); letter-spacing: 0.18em; font-weight: 700; }
[data-clock] { color: var(--fg); margin-left: auto; font-variant-numeric: tabular-nums; }
#sse-status[data-state="connected"] { color: var(--ok); text-shadow: 0 0 8px #39ff1455; }
#sse-status[data-state="disconnected"], #sse-status[data-state="gap"] { color: var(--bad); text-shadow: 0 0 8px #ff3b3055; }
.mast {
	display: flex; flex-wrap: wrap; gap: 0.55rem 1.35rem;
	padding: 0.45rem 0.7rem 0.4rem; border-bottom: 1px solid var(--line);
}
.mast dt { color: var(--muted); font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; }
.mast dd { margin: 0.08rem 0 0; }
.board {
	flex: 1; display: flex; flex-wrap: wrap; align-content: flex-start;
	overflow: auto; min-height: 0;
}
.pane {
	display: flex; flex-direction: column;
	width: 33.33%; height: 28vh; min-width: 14rem; min-height: 8rem;
	padding: 0.45rem 0.6rem 0.85rem; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line);
	resize: both; overflow: hidden;
}
.pane-tall { height: 38vh; }
.pane-sm { height: 16vh; }
.pane-wide { width: 66.66%; height: 14vh; }
.pane-body { flex: 1; min-height: 0; overflow: auto; }
.pane::-webkit-resizer { background: #222; box-shadow: inset 0 0 0 1px #444; }
.not-built { color: var(--muted); }
.hero { font-size: 2.35rem; font-weight: 700; letter-spacing: 0.04em; line-height: 0.95; }
.hero-label { color: var(--muted); text-transform: uppercase; letter-spacing: 0.12em; font-size: 10px; margin: 0.2rem 0 0.55rem; }
.funnel, .jobs { list-style: none; padding: 0; }
.funnel li, .jobs li { display: flex; align-items: baseline; gap: 0; padding: 0.08rem 0; }
.funnel a { color: var(--fg); }
.ledger { list-style: none; padding: 0; }
.ledger li { display: flex; gap: 0.55rem; align-items: baseline; padding: 0.08rem 0; }
.ledger details { flex: 1; min-width: 0; }
.ledger .when { color: var(--muted); flex: 0 0 auto; }
details > summary { cursor: pointer; list-style: none; }
details > summary::-webkit-details-marker { display: none; }
.ready, .fresh, .ok, [data-engine="fresh"] { color: var(--ok); }
.blocked, .stale, .bad, [data-engine="stale"] { color: var(--bad); }
.quiet, .unseen { color: var(--cyan); }
.bar { color: var(--ok); letter-spacing: -0.06em; }
.bar.bad { color: var(--bad); }
.tminus { font-size: 28px; font-weight: 700; letter-spacing: 0.02em; font-variant-numeric: tabular-nums; }
.sheet { width: max-content; min-width: 100%; border-collapse: collapse; }
.sheet th {
	color: var(--cyan); font-weight: 650; text-align: left; letter-spacing: 0.1em;
	text-transform: uppercase; font-size: 9px; padding: 0.1rem 0.45rem 0.2rem 0;
	position: sticky; top: 0; background: #000;
}
.sheet td { padding: 0.12rem 0.45rem 0.12rem 0; border-bottom: 1px solid #141414; vertical-align: top; }
.sheet td.amt { text-align: right; font-variant-numeric: tabular-nums; }
.sheet tr.cluster td {
	color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; font-size: 9px;
	border-bottom: 1px solid var(--line); padding-top: 0.4rem;
}
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
@media (max-width: 1100px) {
	.pane { width: 50%; }
	.pane-wide { width: 100%; }
}
@media (max-width: 800px) {
	.pane, .pane-wide { width: 100%; }
}
form { padding: 2rem 0.75rem; max-width: 28rem; }
label { display: grid; gap: 0.4rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
input, button {
	font: inherit; padding: 0.45rem 0.55rem; background: #050505; color: var(--fg);
	border: 1px solid var(--line); border-radius: 0;
}
button { text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; }
`.trim();

export const cockpitStyles = `
:root { color-scheme: dark; --bg:#12141a; --panel:#1a1d26; --fg:#e8eaef; --muted:#8b90a0; --line:#2a2e3a; --accent:#c4b5a0; --ok:#7dcea0; --bad:#e07070; }
* { box-sizing: border-box; }
body { margin: 0; font: 15px/1.45 ui-sans-serif, system-ui, sans-serif; background: var(--bg); color: var(--fg); }
a { color: var(--accent); }
h1 { font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 650; margin: 0 0 0.4rem; }
h2 { font-size: 0.75rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); font-weight: 650; margin: 0 0 0.6rem; }
p, ul, ol { margin: 0; }
ul, ol { padding-left: 1.1rem; }
#sse-status { padding: 0.35rem 1rem; font-size: 0.8rem; border-bottom: 1px solid var(--line); color: var(--muted); }
#sse-status[data-state="connected"] { color: var(--ok); }
#sse-status[data-state="disconnected"] { color: var(--bad); }
.rail { display: flex; flex-wrap: wrap; gap: 0.85rem 1.4rem; padding: 0.85rem 1rem; border-bottom: 1px solid var(--line); background: var(--panel); }
.rail dt { color: var(--muted); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; }
.rail dd { margin: 0.1rem 0 0; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 1rem; }
.span-2 { grid-column: 1 / -1; }
section { background: var(--panel); border: 1px solid var(--line); padding: 0.9rem 1rem; }
.not-built { color: var(--muted); }
.funnel { list-style: none; padding: 0; }
.funnel li { display: flex; justify-content: space-between; gap: 1rem; padding: 0.25rem 0; border-bottom: 1px solid var(--line); }
.funnel li:last-child { border-bottom: 0; }
.ready { color: var(--ok); }
.blocked { color: var(--bad); }
.back { display: inline-block; margin: 0.8rem 1rem 0; color: var(--muted); }
details { margin: 0.35rem 0; }
@media (max-width: 900px) { .grid { grid-template-columns: 1fr; } .span-2 { grid-column: auto; } }
form { padding: 2rem 1rem; max-width: 24rem; }
label { display: grid; gap: 0.4rem; }
input, button { font: inherit; padding: 0.45rem 0.6rem; }
`.trim();

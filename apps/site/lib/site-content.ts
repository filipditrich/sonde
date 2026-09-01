export const siteUrl = 'https://sonde.ditrich.me';

export const navItems = [
	['Why Sonde', '#why-sonde'],
	['Evidence Spine', '#evidence-spine'],
	['Safety', '#safety'],
	['Roadmap', '#roadmap'],
] as const;

export const spineSteps = [
	['01', 'Acquisition', 'A source request becomes an append-only attempt and immutable document.', 'Now'],
	['02', 'Source Facts', 'Parsers retain typed facts, their source clocks, and direct document lineage.', 'Now'],
	['03', 'Candidate Snapshot', 'Each evidence or policy transition forms a snapshot instead of overwriting history.', 'Planned'],
	['04', 'Signal / Decision Packet', 'A prospective claim freezes typed inputs and rationale at the decision cutoff.', 'Planned'],
	['05', 'Planning / Risk', 'Readiness, planning, and a deterministic gate explain proposals and declines.', 'Planned'],
	['06', 'Alpaca paper order', 'The paper venue records intent, fills, reconciliation, and exceptions.', 'Planned'],
	['07', 'Outcome', 'Signal, execution, and realism outcomes remain distinct and write-once.', 'Planned'],
] as const;

export const scorecards = [
	['Signal', 'The prospective market claim: next-session open to horizon close, including untraded signals.', 'Milestone 2'],
	['Execution', 'What the paper broker actually filled, held, and reported — never substituted for the signal.', 'Milestone 4'],
	['Realism', 'A versioned estimate for paper omissions, kept separate from broker and signal truth.', 'Milestone 5'],
	['Analyst outcomes', 'A later pinned analyst is forward-scored in sealed epochs, not backtested.', 'Milestone 6'],
] as const;

export const roadmap = [
	['0', 'Pipe', 'EDGAR and delayed SIP evidence, stored and visibly traced.', 'In progress'],
	['1–2', 'Signal + Scorekeeping', 'Deterministic signals and their point-in-time outcomes.', 'Planned'],
	['3–5', 'Gate + Hands + Watch', 'Readiness, risk, paper execution, replay, and scorecards.', 'Planned'],
	['6–7', 'Corroboration + Iterate', 'A separately measured analyst and evidence-led promotion.', 'Planned'],
] as const;

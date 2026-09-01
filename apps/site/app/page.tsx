import { SiteNav } from '../components/site-nav';
import { SondeMark } from '../components/sonde-mark';
import { SyntheticProductSurface } from '../components/synthetic-product-surface';
import { roadmap, scorecards, spineSteps } from '../lib/site-content';

const githubUrl = 'https://github.com/filipditrich/sonde';

export default function Home() {
	return (
		<>
			<a className="skip-link" href="#content">
				Skip to content
			</a>
			<SiteNav />
			<main id="top">
				<Hero />
				<StatusRail />
				<WhySonde />
				<EvidenceSpine />
				<Measurement />
				<Safety />
				<Roadmap />
				<ProductProof />
				<Closing />
			</main>
			<Footer />
		</>
	);
}

function Hero() {
	return (
		<section className="hero" id="content">
			<div className="hero-haze" aria-hidden="true" />
			<div className="section-shell hero-copy">
				<p className="eyebrow entrance">Personal system / public evidence</p>
				<h1 className="hero-title entrance-delay">
					Know what it saw.<span>Watch what it does.</span>
				</h1>
				<p className="hero-summary entrance-delay-2">
					Sonde is being built to turn point-in-time public information into an evidence trail first. Deterministic market claims and paper-only
					execution are planned next, with every action and non-action designed to stay explainable.
				</p>
				<div className="hero-actions entrance-delay-3">
					<a className="button button-primary" href={githubUrl} rel="noreferrer" target="_blank">
						View on GitHub <span aria-hidden="true">↗</span>
					</a>
					<a
						className="button button-quiet"
						href="https://github.com/filipditrich/sonde/blob/main/docs/architecture.md"
						rel="noreferrer"
						target="_blank"
					>
						Read the architecture <span aria-hidden="true">↗</span>
					</a>
				</div>
				<div className="hero-badges entrance-delay-3">
					<span>
						<i className="dot green" /> PAPER ONLY
					</span>
					<span>
						<i className="dot cyan" /> MILESTONE 0
					</span>
				</div>
			</div>
			<ProductStage />
		</section>
	);
}

function ProductStage() {
	return (
		<div className="section-shell product-stage">
			<div className="orbit orbit-one" aria-hidden="true" />
			<div className="orbit orbit-two" aria-hidden="true" />
			<div className="instrument-card instrument-left float-slow" aria-hidden="true">
				<p>Evidence pulse</p>
				<strong>FORM 4 / 14:32</strong>
				<span>Document sealed</span>
				<div className="pulse-line">
					<b />
					<b />
					<b />
					<b />
					<b />
				</div>
			</div>
			<div className="instrument-card instrument-right float-reverse" aria-hidden="true">
				<p>Gate state</p>
				<strong>DETERMINISTIC</strong>
				<span>Awaiting milestone</span>
				<div className="meter">
					<i />
					<i />
					<i />
					<i />
				</div>
			</div>
			<div className="product-frame">
				<SyntheticProductSurface />
			</div>
		</div>
	);
}

function StatusRail() {
	return (
		<section className="status-rail" aria-label="Sonde's fixed operating boundaries">
			<div>
				<span>01</span>
				<strong>Paper only</strong>
				<p>Simulated funds, always.</p>
			</div>
			<div>
				<span>02</span>
				<strong>US common equities</strong>
				<p>One narrow initial scope.</p>
			</div>
			<div>
				<span>03</span>
				<strong>Append-only evidence</strong>
				<p>History is never overwritten.</p>
			</div>
			<div>
				<span>04</span>
				<strong>Deterministic gate</strong>
				<p>Risk cannot reach a model.</p>
			</div>
		</section>
	);
}

function WhySonde() {
	return (
		<section className="story-section why-section" id="why-sonde">
			<div className="section-shell split-story">
				<div className="section-label">
					<span>01</span> Why Sonde
				</div>
				<div>
					<p className="kicker">An instrument, not an oracle.</p>
					<h2>Market systems are easier to trust when their uncertainty stays visible.</h2>
					<p className="body-copy">
						A sonde enters an environment, samples it, and telemeters readings home. Sonde is starting with that evidence pipe; later milestones plan
						to carry the same trace through claims, risk, paper execution, and outcomes.
					</p>
					<div className="principle-list">
						<p>
							<b>Legibility</b>
							<span>Decisions retain direct input references and a rationale.</span>
						</p>
						<p>
							<b>Non-actions</b>
							<span>A decline is evidence too — not an omitted error state.</span>
						</p>
						<p>
							<b>Provenance</b>
							<span>Document bytes, facts, snapshots, and decisions have a durable lineage.</span>
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}

function EvidenceSpine() {
	return (
		<section className="spine-section" id="evidence-spine">
			<div className="section-shell">
				<div className="spine-heading">
					<div className="section-label">
						<span>02</span> Evidence spine
					</div>
					<div>
						<p className="kicker">The system’s memory is its product.</p>
						<h2>Every step has an address. Every later decision can point back.</h2>
					</div>
				</div>
				<div className="spine-layout">
					<aside className="spine-aside">
						<span>Scroll the trace</span>
						<SondeMark className="large-mark" />
					</aside>
					<ol className="spine-list">
						{spineSteps.map(([number, title, description, status]) => (
							<li key={number}>
								<div className="step-number">{number}</div>
								<div>
									<h3>{title}</h3>
									<p>{description}</p>
								</div>
								<span className={status === 'Now' ? 'status-now' : 'status-plan'}>{status}</span>
							</li>
						))}
					</ol>
				</div>
			</div>
		</section>
	);
}

function Measurement() {
	return (
		<section className="story-section measure-section">
			<div className="section-shell">
				<div className="section-label">
					<span>03</span> Honest measurement
				</div>
				<div className="measure-heading">
					<p className="kicker">Separate truths, deliberately.</p>
					<h2>One chart cannot tell this story without hiding the important parts.</h2>
				</div>
				<div className="score-grid">
					{scorecards.map(([title, description, milestone]) => (
						<article key={title}>
							<span>{milestone}</span>
							<h3>{title}</h3>
							<p>{description}</p>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}

function Safety() {
	return (
		<section className="safety-section" id="safety">
			<div className="section-shell safety-grid">
				<div>
					<div className="section-label">
						<span>04</span> Safety by construction
					</div>
					<h2>There is no hidden “trust me” layer.</h2>
				</div>
				<div className="safety-cards">
					<article>
						<span>01</span>
						<h3>Deterministic planning and risk</h3>
						<p>The gate is side-effect free and cannot import the analyst runtime, a venue, or network clients.</p>
					</article>
					<article>
						<span>02</span>
						<h3>Paper venue only</h3>
						<p>Alpaca is a future paper venue. Moving to real capital requires a new architectural decision.</p>
					</article>
					<article>
						<span>03</span>
						<h3>Immutable evidence</h3>
						<p>Attempts, documents, facts, snapshots, decisions, orders, and outcomes are append-only or immutable.</p>
					</article>
					<article>
						<span>04</span>
						<h3>Hostile documents are data</h3>
						<p>Public source text is treated as attacker-writable data, never as instruction for the system.</p>
					</article>
					<article>
						<span>05</span>
						<h3>Private cockpit</h3>
						<p>The operations cockpit is authenticated and loopback-only. This public site exposes no live state or controls.</p>
					</article>
				</div>
			</div>
		</section>
	);
}

function Roadmap() {
	return (
		<section className="roadmap-section" id="roadmap">
			<div className="section-shell">
				<div className="roadmap-intro">
					<div className="section-label">
						<span>05</span> Roadmap
					</div>
					<p className="kicker">Current work is intentionally small.</p>
					<h2>Milestone 0 makes the pipe visible before the system is allowed to decide.</h2>
				</div>
				<div className="roadmap-list">
					{roadmap.map(([number, title, description, status]) => (
						<article key={number}>
							<span className="roadmap-number">{number}</span>
							<div>
								<h3>{title}</h3>
								<p>{description}</p>
							</div>
							<b className={status === 'In progress' ? 'status-now' : 'status-plan'}>{status}</b>
						</article>
					))}
				</div>
				<a className="text-link" href="https://github.com/filipditrich/sonde/blob/main/docs/roadmap.md" rel="noreferrer" target="_blank">
					Read the observable exit criteria <span aria-hidden="true">↗</span>
				</a>
			</div>
		</section>
	);
}

function ProductProof() {
	return (
		<section className="proof-section">
			<div className="proof-caption section-shell">
				<span>Redacted product proof / temporary product shot</span>
				<p>Not a public dashboard. A close-up of the surface this system is being built to make worth watching.</p>
			</div>
			<div className="proof-image">
				<img
					alt="Privacy-safe redacted Sonde product screenshot labelled Synthetic Preview and No Live Data."
					decoding="async"
					height="904"
					loading="lazy"
					src="/cockpit-proof-redacted.png"
					width="1739"
				/>
			</div>
		</section>
	);
}

function Closing() {
	return (
		<section className="closing-section">
			<div className="section-shell">
				<SondeMark className="closing-mark" />
				<p className="kicker">A public record of a private system.</p>
				<h2>Follow the evidence.</h2>
				<p>Read the decisions, inspect the architecture, and watch this small system become accountable to its own history.</p>
				<a className="button button-primary" href={githubUrl} rel="noreferrer" target="_blank">
					View Sonde on GitHub <span aria-hidden="true">↗</span>
				</a>
			</div>
		</section>
	);
}

function Footer() {
	return (
		<footer className="site-footer">
			<div className="section-shell footer-grid">
				<div>
					<SondeMark className="footer-mark" />
					<p>Point-in-time evidence foundations in progress. Deterministic paper trading is planned. A system worth watching.</p>
				</div>
				<div>
					<a href={githubUrl}>Repository ↗</a>
					<a href="https://github.com/filipditrich/sonde/blob/main/docs/architecture.md">Architecture ↗</a>
					<a href="https://github.com/filipditrich/sonde/blob/main/docs/roadmap.md">Roadmap ↗</a>
					<a href="https://github.com/filipditrich/sonde/tree/main/docs/decisions">Decisions ↗</a>
				</div>
				<div>
					<a href="https://github.com/filipditrich/sonde/blob/main/LICENSE">MIT License ↗</a>
					<a href="https://ditrich.me">By Filip Ditrich ↗</a>
					<p className="disclaimer">Paper only. Not financial or investment advice. No performance claim is made or implied.</p>
				</div>
			</div>
		</footer>
	);
}

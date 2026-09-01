type SyntheticProductSurfaceProps = {
	variant?: 'hero' | 'proof';
};

export function SyntheticProductSurface({ variant = 'hero' }: SyntheticProductSurfaceProps) {
	return (
		<div
			aria-label="Synthetic preview of a redacted Sonde interface. It contains no live or historical operational data."
			className={`synthetic-surface synthetic-surface-${variant}`}
			role="img"
		>
			<div className="synthetic-topbar">
				<span>
					<i /> SYNTHETIC PREVIEW
				</span>
				<span>NO LIVE DATA</span>
			</div>
			<div className="synthetic-body">
				<aside className="synthetic-rail">
					<span className="synthetic-logo">S</span>
					<span />
					<span />
					<span />
					<span />
				</aside>
				<div className="synthetic-workspace">
					<div className="synthetic-title">
						<div>
							<span>SPECIMEN / REDACTED</span>
							<strong>Evidence trace</strong>
						</div>
						<b>Paper only</b>
					</div>
					<div className="synthetic-flow">
						<span>Acquire</span>
						<i />
						<span>Parse</span>
						<i />
						<span>Trace</span>
						<i />
						<span>Hold</span>
					</div>
					<div className="synthetic-cards">
						<article>
							<span>Document state</span>
							<strong>sealed / sample</strong>
							<div className="synthetic-bars">
								<i />
								<i />
								<i />
								<i />
							</div>
						</article>
						<article>
							<span>Decision state</span>
							<strong>not evaluated</strong>
							<div className="synthetic-lines">
								<i />
								<i />
								<i />
							</div>
						</article>
						<article>
							<span>Venue state</span>
							<strong>paper / withheld</strong>
							<div className="synthetic-orbit">
								<i />
							</div>
						</article>
					</div>
					<div className="synthetic-ledger">
						<span>APPEND-ONLY SPECIMEN</span>
						<i />
						<i />
						<i />
						<i />
						<i />
						<i />
					</div>
				</div>
			</div>
		</div>
	);
}

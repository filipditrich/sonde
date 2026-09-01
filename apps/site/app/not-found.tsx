import Link from 'next/link';

export default function NotFound() {
	return (
		<main className="not-found">
			<p className="eyebrow">404 / Signal lost</p>
			<h1>This reading is not in the ledger.</h1>
			<Link className="button button-primary" href="/">
				Return to Sonde
			</Link>
		</main>
	);
}

type SondeMarkProps = {
	className?: string;
};

export function SondeMark({ className }: SondeMarkProps) {
	return (
		<svg aria-hidden="true" className={className} fill="none" viewBox="0 0 88 88" xmlns="http://www.w3.org/2000/svg">
			<path d="M44 8v47" stroke="currentColor" strokeLinecap="round" strokeWidth="4" />
			<path d="m34 16 10-9 10 9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
			<path d="M20 58c7-7 15-10 24-10s17 3 24 10" stroke="currentColor" strokeLinecap="round" strokeWidth="4" />
			<path d="M14 68c9-6 19-9 30-9s21 3 30 9" stroke="currentColor" strokeLinecap="round" strokeWidth="4" />
			<path d="M9 79c11-5 23-7 35-7s24 2 35 7" stroke="currentColor" strokeLinecap="round" strokeWidth="4" />
			<circle cx="44" cy="54" fill="currentColor" r="7" />
			<path d="M54 24h17M61 17l10 7-10 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
			<circle cx="76" cy="24" fill="currentColor" r="3" />
		</svg>
	);
}

export function SondeWordmark() {
	return (
		<span className="wordmark">
			<SondeMark className="wordmark-mark" />
			<span>sonde</span>
		</span>
	);
}

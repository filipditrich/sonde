import { IBM_Plex_Mono, Instrument_Sans } from 'next/font/google';

import { siteUrl } from '../lib/site-content';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

const sans = Instrument_Sans({
	display: 'swap',
	subsets: ['latin'],
	variable: '--font-sans',
});

const mono = IBM_Plex_Mono({
	display: 'swap',
	subsets: ['latin'],
	variable: '--font-mono',
	weight: ['400', '700'],
});

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: {
		default: 'Sonde — a paper-trading evidence system in progress',
		template: '%s · Sonde',
	},
	description: 'A personal, paper-only market evidence system being built to make evidence, planned decisions, and non-actions legible.',
	applicationName: 'Sonde',
	keywords: ['paper trading', 'market evidence', 'append-only ledger', 'Sonde'],
	alternates: { canonical: '/' },
	openGraph: {
		type: 'website',
		url: '/',
		title: 'Sonde — a system worth watching',
		description: 'Point-in-time evidence foundations in progress; deterministic signals and paper execution remain on the roadmap.',
		siteName: 'Sonde',
		images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Sonde — know what it saw, watch what it does.' }],
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Sonde — a system worth watching',
		description: 'Point-in-time evidence foundations in progress. Deterministic signals and paper execution are planned. Paper only.',
		images: ['/og.png'],
	},
	robots: { index: true, follow: true },
};

export const viewport: Viewport = { colorScheme: 'dark', themeColor: '#090c0e' };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html className={`${sans.variable} ${mono.variable}`} lang="en">
			<body>{children}</body>
		</html>
	);
}

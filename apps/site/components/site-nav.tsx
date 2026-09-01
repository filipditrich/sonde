'use client';

import { useEffect, useRef, useState } from 'react';

import { navItems } from '../lib/site-content';
import { SondeWordmark } from './sonde-mark';

const MENU_ID = 'site-mobile-menu';

export function closesMenuForKey(key: string) {
	return key === 'Escape';
}

export const wrapMenuTab = (shiftKey: boolean, active: EventTarget | null, items: readonly HTMLElement[]) => {
	const first = items[0];
	const last = items[items.length - 1];
	if (!first || !last) return undefined;
	if (shiftKey && active === first) return last;
	if (!shiftKey && active === last) return first;
	return undefined;
};

export function SiteNav() {
	const [open, setOpen] = useState(false);
	const toggleRef = useRef<HTMLButtonElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (closesMenuForKey(event.key)) {
				event.preventDefault();
				setOpen(false);
				toggleRef.current?.focus();
				return;
			}
			if (event.key !== 'Tab') return;
			const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('a') ?? [])];
			const wrap = wrapMenuTab(event.shiftKey, event.target, items);
			if (!wrap) return;
			event.preventDefault();
			wrap.focus();
		};
		document.addEventListener('keydown', onKeyDown);
		menuRef.current?.querySelector<HTMLElement>('a')?.focus();
		return () => document.removeEventListener('keydown', onKeyDown);
	}, [open]);

	return (
		<header className="site-header">
			<nav aria-label="Primary navigation" className="nav-shell">
				<a className="brand-link" href="#top" onClick={() => setOpen(false)}>
					<SondeWordmark />
				</a>
				<div className="nav-links">
					{navItems.map(([label, href]) => (
						<a href={href} key={href}>
							{label}
						</a>
					))}
				</div>
				<a className="nav-github" href="https://github.com/filipditrich/sonde" rel="noreferrer" target="_blank">
					GitHub <span aria-hidden="true">↗</span>
				</a>
				<button
					aria-controls={MENU_ID}
					aria-expanded={open}
					aria-label="Toggle navigation"
					className="menu-toggle"
					onClick={() => setOpen((value) => !value)}
					ref={toggleRef}
					type="button"
				>
					<span />
					<span />
				</button>
				<div aria-hidden={!open} className={`mobile-menu${open ? ' is-open' : ''}`} id={MENU_ID} ref={menuRef}>
					{navItems.map(([label, href]) => (
						<a href={href} key={href} onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>
							{label}
						</a>
					))}
					<a href="https://github.com/filipditrich/sonde" rel="noreferrer" tabIndex={open ? 0 : -1} target="_blank">
						GitHub ↗
					</a>
				</div>
			</nav>
		</header>
	);
}

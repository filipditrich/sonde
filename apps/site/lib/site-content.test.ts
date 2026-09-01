import { expect, test } from 'bun:test';

import { navItems, siteUrl, spineSteps } from './site-content';

test('the public navigation stays anchored to the public story', () => {
	expect(navItems.map(([, href]) => href)).toEqual(['#why-sonde', '#evidence-spine', '#safety', '#roadmap']);
});

test('the evidence spine distinguishes current work from plans', () => {
	expect(spineSteps.slice(0, 2).every(([, , , status]) => status === 'Now')).toBe(true);
	expect(spineSteps.slice(2).every(([, , , status]) => status === 'Planned')).toBe(true);
	expect(siteUrl).toBe('https://sonde.ditrich.me');
});

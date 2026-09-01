import { expect, test } from 'bun:test';

import { closesMenuForKey, wrapMenuTab } from './site-nav';

test('only Escape dismisses an open navigation menu', () => {
	expect(closesMenuForKey('Escape')).toBe(true);
	expect(closesMenuForKey('Enter')).toBe(false);
	expect(closesMenuForKey('Tab')).toBe(false);
});

test('tab wraps between the first and last menu items', () => {
	const first = { id: 'first' } as HTMLElement;
	const last = { id: 'last' } as HTMLElement;
	expect(wrapMenuTab(false, last, [first, last])).toBe(first);
	expect(wrapMenuTab(true, first, [first, last])).toBe(last);
	expect(wrapMenuTab(false, first, [first, last])).toBeUndefined();
});

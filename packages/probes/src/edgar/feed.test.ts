import { describe, expect, test } from 'bun:test';

import { CURRENT_FEED_URL, findForm4Document, parseCurrentFeed } from './feed';

const atom = await Bun.file(new URL('./__fixtures__/getcurrent.atom.xml', import.meta.url)).text();
const indexJson = await Bun.file(new URL('./__fixtures__/index.json', import.meta.url)).text();

describe('parseCurrentFeed', () => {
	const refs = parseCurrentFeed(atom);

	test('reads every entry in a live feed capture', () => {
		expect(refs.length).toBeGreaterThan(0);
	});

	test('extracts dashed accession numbers', () => {
		for (const r of refs) expect(r.accession).toMatch(/^\d{10}-\d{2}-\d{6}$/);
	});

	test('returns only Form 4 — this is what owner=only buys us', () => {
		for (const r of refs) expect(r.formType).toBe('4');
	});

	test('derives a document directory, not the index page', () => {
		for (const r of refs) {
			expect(r.directoryUrl).toMatch(/\/Archives\/edgar\/data\/\d+\/\d+\/$/);
			expect(r.directoryUrl).not.toContain('-index.htm');
		}
	});

	test('normalises the publish time to ISO 8601 with an offset', () => {
		for (const r of refs) expect(r.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
	});

	test('survives a feed with no entries', () => {
		expect(parseCurrentFeed('<feed xmlns="http://www.w3.org/2005/Atom"></feed>')).toEqual([]);
	});
});

describe('CURRENT_FEED_URL', () => {
	test('keeps owner=only — without it EDGAR leaks other form types', () => {
		expect(CURRENT_FEED_URL).toContain('owner=only');
		expect(CURRENT_FEED_URL).toContain('type=4');
	});
});

describe('findForm4Document', () => {
	test('picks the raw XML from a real directory listing', () => {
		expect(findForm4Document(indexJson)).toBe('form4-08202026_050831.xml');
	});

	test('skips the xsl rendering of the same document', () => {
		const listing = JSON.stringify({
			directory: { item: [{ name: 'xslF345X06/form4.xml' }, { name: 'form4.xml' }] },
		});
		expect(findForm4Document(listing)).toBe('form4.xml');
	});

	test('returns undefined when there is no xml at all', () => {
		expect(findForm4Document(JSON.stringify({ directory: { item: [{ name: 'a.txt' }] } }))).toBeUndefined();
	});
});

import { expect, test } from 'bun:test';

import { DOCUMENT_PREVIEW_CHARS, documentPreview } from './document-preview';

test('xml and json become text; binary stays closed', () => {
	expect(documentPreview(new TextEncoder().encode('<ownershipDocument/>'), 'text/xml')).toEqual({
		text: '<ownershipDocument/>',
		truncated: false,
	});
	expect(documentPreview(new TextEncoder().encode('{"ok":true}'), 'application/json')?.text).toBe('{"ok":true}');
	expect(documentPreview(new Uint8Array([0, 1, 2]), 'application/octet-stream')).toBeUndefined();
});

test('long filings are truncated at the preview cap', () => {
	const text = 'x'.repeat(DOCUMENT_PREVIEW_CHARS + 20);
	expect(documentPreview(new TextEncoder().encode(text), 'application/xml')).toEqual({
		text: 'x'.repeat(DOCUMENT_PREVIEW_CHARS),
		truncated: true,
	});
});

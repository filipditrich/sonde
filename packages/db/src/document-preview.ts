const TEXT_MEDIA = /^(text\/|application\/(xml|json|atom\+xml))/i;
export const DOCUMENT_PREVIEW_CHARS = 32_000;

/** UTF-8 text for the cockpit; binary media stays closed. */
export const documentPreview = (bytes: Uint8Array, mediaType: string) => {
	if (!TEXT_MEDIA.test(mediaType)) return undefined;
	const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
	if (!text) return undefined;
	if (text.length <= DOCUMENT_PREVIEW_CHARS) return { text, truncated: false };
	return { text: text.slice(0, DOCUMENT_PREVIEW_CHARS), truncated: true };
};

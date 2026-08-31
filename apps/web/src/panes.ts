export const PANE_STORAGE_KEY = 'sonde-pane-sizes';

export type PaneSizes = Record<string, { w: string; h: string }>;

const sizeOf = (value: unknown): PaneSizes[string] | undefined => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	if (!('w' in value) || !('h' in value) || typeof value.w !== 'string' || typeof value.h !== 'string') return undefined;
	return { w: value.w, h: value.h };
};

/** Accept only { id: { w, h } } maps from localStorage. */
export const parsePaneSizes = (raw: string | null): PaneSizes => {
	if (!raw) return {};
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
		const sizes: PaneSizes = {};
		for (const [id, value] of Object.entries(parsed)) {
			const size = sizeOf(value);
			if (size) sizes[id] = size;
		}
		return sizes;
	} catch {
		return {};
	}
};

export const recordPaneSize = (sizes: PaneSizes, id: string, width: string, height: string): PaneSizes => ({
	...sizes,
	[id]: { w: width, h: height },
});

export const forgetPaneSize = (sizes: PaneSizes, id: string): PaneSizes => {
	const next = { ...sizes };
	delete next[id];
	return next;
};

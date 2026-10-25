import type { RouteId } from '$app/types';

export interface EffectEntry {
	route: RouteId;
	title: string;
	summary: string;
	techniques: string[];
}

/** Every playground page. Add new effects here to list them on the index. */
export const effects: EffectEntry[] = [
	{
		route: '/noise',
		title: 'Noise',
		summary:
			'Grain and texture from a single SVG filter primitive, optionally animated as film grain.',
		techniques: ['feTurbulence', 'feColorMatrix', 'feComponentTransfer', 'mix-blend-mode']
	},
	{
		route: '/glass',
		title: 'Frosted glass',
		summary: 'Blurred, warped backdrop with grain and a thin, directionally lit rim.',
		techniques: ['backdrop-filter', 'feDisplacementMap', 'feTurbulence', 'mask-composite']
	}
];

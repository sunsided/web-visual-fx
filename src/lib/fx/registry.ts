import type { Component } from 'svelte';
import type { RouteId } from '$app/types';
import AuroraPreview from './aurora/AuroraPreview.svelte';
import ChromaticPreview from './chromatic/ChromaticPreview.svelte';
import CrtPreview from './crt/CrtPreview.svelte';
import DuotonePreview from './duotone/DuotonePreview.svelte';
import GlassPreview from './glass/GlassPreview.svelte';
import GooeyPreview from './gooey/GooeyPreview.svelte';
import HalftonePreview from './halftone/HalftonePreview.svelte';
import HoloPreview from './holo/HoloPreview.svelte';
import LightingPreview from './lighting/LightingPreview.svelte';
import LiquidGlassPreview from './liquid-glass/LiquidGlassPreview.svelte';
import NoisePreview from './noise/NoisePreview.svelte';
import SpotlightPreview from './spotlight/SpotlightPreview.svelte';
import SquirclePreview from './squircle/SquirclePreview.svelte';

export interface EffectEntry {
	route: RouteId;
	title: string;
	summary: string;
	techniques: string[];
	/** Small, decorative live thumbnail of the effect. */
	preview: Component;
}

/** Every playground page. Add new effects here to list them on the index. */
export const effects: EffectEntry[] = [
	{
		route: '/noise',
		title: 'Noise',
		summary:
			'Grain and texture from a single SVG filter primitive, optionally animated as film grain.',
		techniques: ['feTurbulence', 'feColorMatrix', 'feComponentTransfer', 'mix-blend-mode'],
		preview: NoisePreview
	},
	{
		route: '/glass',
		title: 'Frosted glass',
		summary: 'Blurred, warped backdrop with grain and a thin, directionally lit rim.',
		techniques: ['backdrop-filter', 'feDisplacementMap', 'feTurbulence', 'mask-composite'],
		preview: GlassPreview
	},
	{
		route: '/liquid-glass',
		title: 'Liquid glass',
		summary:
			'A refractive lens: the backdrop bends along a curved bezel computed from a signed distance field, with a specular rim.',
		techniques: ['backdrop-filter', 'feImage', 'feDisplacementMap', 'feSpecularLighting'],
		preview: LiquidGlassPreview
	},
	{
		route: '/chromatic',
		title: 'Chromatic aberration',
		summary:
			'RGB split on any content: channels isolated, offset and screened back together, optionally radial like a lens.',
		techniques: ['feColorMatrix', 'feOffset', 'feBlend', 'feDisplacementMap'],
		preview: ChromaticPreview
	},
	{
		route: '/gooey',
		title: 'Gooey',
		summary:
			'Shapes that melt into each other like metaballs, from a blur and an alpha threshold, plus a gooey menu.',
		techniques: ['feGaussianBlur', 'feColorMatrix', 'feComposite', 'filter: url()'],
		preview: GooeyPreview
	},
	{
		route: '/lighting',
		title: 'Lighting',
		summary: 'Embossed plaster and raised letters lit by a light that follows the pointer.',
		techniques: ['feDiffuseLighting', 'feSpecularLighting', 'fePointLight', 'feTurbulence'],
		preview: LightingPreview
	},
	{
		route: '/duotone',
		title: 'Duotone',
		summary:
			'Gradient maps for any HTML: luminance mapped through two or three color stops by an SVG filter.',
		techniques: [
			'feColorMatrix',
			'feComponentTransfer',
			'feComposite',
			'color-interpolation-filters'
		],
		preview: DuotonePreview
	},
	{
		route: '/halftone',
		title: 'Halftone',
		summary:
			'Print-style dots from CSS gradients and a contrast() threshold, or posterize with ordered Bayer dither.',
		techniques: ['radial-gradient', 'filter: contrast()', 'feTile', 'feComponentTransfer'],
		preview: HalftonePreview
	},
	{
		route: '/crt',
		title: 'CRT',
		summary:
			'Scanlines, phosphor mask, barrel distortion and bloom over real, readable text, with a photosensitivity-safe flicker.',
		techniques: ['repeating gradients', 'mix-blend-mode', 'feDisplacementMap', 'feGaussianBlur'],
		preview: CrtPreview
	},
	{
		route: '/holo',
		title: 'Holographic foil',
		summary:
			'Trading-card foil that tilts in 3D towards the pointer, with a sliding rainbow, embossed relief and glare.',
		techniques: ['mix-blend-mode', 'background-blend-mode', 'perspective', 'custom properties'],
		preview: HoloPreview
	},
	{
		route: '/spotlight',
		title: 'Spotlight cards',
		summary: 'One pointer-following glow lighting up a grid of cards, strongest in their borders.',
		techniques: ['radial-gradient', 'mask-composite', 'custom properties', 'ResizeObserver'],
		preview: SpotlightPreview
	},
	{
		route: '/aurora',
		title: 'Aurora',
		summary:
			'Drifting mesh gradient: layered radial-gradients moved by animated, registered custom properties.',
		techniques: ['@property', 'radial-gradient', 'cos() / sin()', 'filter: blur()'],
		preview: AuroraPreview
	},
	{
		route: '/squircle',
		title: 'Squircles',
		summary:
			'Superellipse corners that morph, plus a Material 3 Expressive style connected button group.',
		techniques: ['corner-shape', 'superellipse()', 'linear() easing', 'clip-path: path()'],
		preview: SquirclePreview
	}
];

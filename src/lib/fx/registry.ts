import type { Component } from 'svelte';
import type { RouteId } from '$app/types';
import AuroraPreview from './aurora/AuroraPreview.svelte';
import BorderBeamPreview from './border-beam/BorderBeamPreview.svelte';
import CausticsPreview from './caustics/CausticsPreview.svelte';
import ChromaticPreview from './chromatic/ChromaticPreview.svelte';
import CrtPreview from './crt/CrtPreview.svelte';
import DissolvePreview from './dissolve/DissolvePreview.svelte';
import DuotonePreview from './duotone/DuotonePreview.svelte';
import EdgesPreview from './edges/EdgesPreview.svelte';
import GlassPreview from './glass/GlassPreview.svelte';
import GlitchPreview from './glitch/GlitchPreview.svelte';
import GooeyPreview from './gooey/GooeyPreview.svelte';
import GradientTextPreview from './gradient-text/GradientTextPreview.svelte';
import HalftonePreview from './halftone/HalftonePreview.svelte';
import HoloPreview from './holo/HoloPreview.svelte';
import InkBleedPreview from './ink-bleed/InkBleedPreview.svelte';
import KaleidoscopePreview from './kaleidoscope/KaleidoscopePreview.svelte';
import LightingPreview from './lighting/LightingPreview.svelte';
import LiquidGlassPreview from './liquid-glass/LiquidGlassPreview.svelte';
import LongShadowPreview from './long-shadow/LongShadowPreview.svelte';
import MagnifierPreview from './magnifier/MagnifierPreview.svelte';
import NeonPreview from './neon/NeonPreview.svelte';
import NoisePreview from './noise/NoisePreview.svelte';
import OutlinePreview from './outline/OutlinePreview.svelte';
import PaintPatternPreview from './paint-worklet/PaintPatternPreview.svelte';
import PixelatePreview from './pixelate/PixelatePreview.svelte';
import PosterizePreview from './posterize/PosterizePreview.svelte';
import RipplePreview from './ripple/RipplePreview.svelte';
import ScrollRevealPreview from './scroll-reveal/ScrollRevealPreview.svelte';
import ShimmerPreview from './shimmer/ShimmerPreview.svelte';
import SplitTextPreview from './split-text/SplitTextPreview.svelte';
import SpotlightPreview from './spotlight/SpotlightPreview.svelte';
import SquirclePreview from './squircle/SquirclePreview.svelte';
import ViewTransitionPreview from './view-transition/ViewTransitionPreview.svelte';
import WaterSimPreview from './water-sim/WaterSimPreview.svelte';

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
	},
	{
		route: '/outline',
		title: 'Sticker outline',
		summary:
			'A die-cut sticker edge that follows the alpha of images, icons and text, with an optional keyline ring and drop shadow.',
		techniques: ['feMorphology', 'feFlood', 'feComposite', 'feMerge'],
		preview: OutlinePreview
	},
	{
		route: '/edges',
		title: 'Edges and sketch',
		summary:
			'Sobel and Laplacian edge detection, pencil sketch and emboss on any content, from convolution kernels.',
		techniques: ['feConvolveMatrix', 'feComponentTransfer', 'feTurbulence', 'feBlend'],
		preview: EdgesPreview
	},
	{
		route: '/posterize',
		title: 'Posterize',
		summary:
			'Flat color bands per channel, like a screen print, with optional ink lines along the edges for a cel-shaded look.',
		techniques: ['feComponentTransfer discrete', 'feConvolveMatrix', 'feColorMatrix', 'feMerge'],
		preview: PosterizePreview
	},
	{
		route: '/pixelate',
		title: 'Pixelate',
		summary:
			'Mosaic any content with a pure SVG sample-and-hold filter, with optional tiles and grout, and a censor-style reveal.',
		techniques: ['feFlood', 'feTile', 'feComposite', 'feMorphology'],
		preview: PixelatePreview
	},
	{
		route: '/glitch',
		title: 'Glitch',
		summary:
			'Slices of any content jump sideways and the RGB channels tear apart, in short, photosensitivity-safe bursts.',
		techniques: ['feImage', 'feDisplacementMap', 'feColorMatrix', 'feOffset', 'feBlend'],
		preview: GlitchPreview
	},
	{
		route: '/magnifier',
		title: 'Magnifier',
		summary:
			'A keyboard-operable loupe or fisheye that follows the pointer and zooms live HTML with a generated radial displacement map.',
		techniques: ['feImage', 'feDisplacementMap', 'feMerge', 'backdrop-filter'],
		preview: MagnifierPreview
	},
	{
		route: '/ripple',
		title: 'Water ripple',
		summary:
			'Content or the backdrop wobbles as if seen through water or hot air: noise slid across a small repeating tile drives a displacement map.',
		techniques: ['feTurbulence', 'feTile', 'feOffset', 'feDisplacementMap', 'backdrop-filter'],
		preview: RipplePreview
	},
	{
		route: '/caustics',
		title: 'Caustics',
		summary:
			'A dancing net of light, like sun on a pool floor: turbulence ridges bent by moving noise, lit and screened over any content.',
		techniques: [
			'feTurbulence',
			'feComponentTransfer',
			'feSpecularLighting',
			'feDisplacementMap',
			'feBlend'
		],
		preview: CausticsPreview
	},
	{
		route: '/ink-bleed',
		title: 'Ink bleed',
		summary:
			'Ink and watercolor edges for shapes and live text: fiber-displaced, feathered outlines, pooled pigment rims and granulation on lit paper.',
		techniques: [
			'feTurbulence',
			'feDisplacementMap',
			'feGaussianBlur',
			'feColorMatrix',
			'feDiffuseLighting'
		],
		preview: InkBleedPreview
	},
	{
		route: '/dissolve',
		title: 'Dissolve',
		summary:
			'Burn-away transition: a noise threshold eats the element from one side, with a scorched rim and a glowing ember edge.',
		techniques: ['feTurbulence', 'feComponentTransfer', 'feColorMatrix', 'feComposite', 'feImage'],
		preview: DissolvePreview
	},
	{
		route: '/kaleidoscope',
		title: 'Kaleidoscope',
		summary:
			'Mirrored wedge copies of an image, cut with clip-path and turned into place with CSS trig, slowly spinning and following the pointer.',
		techniques: ['clip-path', 'tan()', 'rotate', '@keyframes'],
		preview: KaleidoscopePreview
	},
	{
		route: '/neon',
		title: 'Neon',
		summary:
			'A neon sign from real text: stacked glow layers, a photosensitivity-safe flicker, power-on and dead letters.',
		techniques: ['text-shadow', 'filter: drop-shadow()', '@property', 'color-mix()'],
		preview: NeonPreview
	},
	{
		route: '/gradient-text',
		title: 'Gradient text',
		summary:
			'Gradient-filled and outlined type that stays selectable, with a turning gradient and a solid fallback.',
		techniques: ['background-clip: text', '-webkit-text-stroke', 'paint-order', '@property'],
		preview: GradientTextPreview
	},
	{
		route: '/long-shadow',
		title: 'Long shadow',
		summary:
			'Long shadows and extruded 3D letters from a generated list of hard-edged text-shadow copies.',
		techniques: ['text-shadow', 'color-mix()', 'generated CSS'],
		preview: LongShadowPreview
	},
	{
		route: '/border-beam',
		title: 'Border beam',
		summary:
			'An arc of light running around a border: a conic gradient turned by a registered angle and masked to the border ring.',
		techniques: ['@property', 'conic-gradient', 'mask-composite', 'filter: blur()'],
		preview: BorderBeamPreview
	},
	{
		route: '/shimmer',
		title: 'Shimmer',
		summary:
			'A band of light sweeping across buttons, text or skeleton loaders: a sliding layer, clipped text or an animated mask.',
		techniques: ['translate', 'background-clip: text', 'mask-image', '@property'],
		preview: ShimmerPreview
	},
	{
		route: '/split-text',
		title: 'Split text',
		summary:
			'Letters, words or list items that arrive one after another, staggered by their own sibling index, with the text kept whole for screen readers.',
		techniques: ['sibling-index()', 'sibling-count()', '@starting-style', 'linear() easing'],
		preview: SplitTextPreview
	},
	{
		route: '/scroll-reveal',
		title: 'Scroll reveal',
		summary:
			'Elements fade, scale, clip or un-blur into view and parallax layers drift as you scroll, driven by scroll and view timelines with no JavaScript on scroll.',
		techniques: [
			'animation-timeline: view()',
			'animation-range',
			'view-timeline',
			'timeline-scope'
		],
		preview: ScrollRevealPreview
	},
	{
		route: '/view-transition',
		title: 'View transitions',
		summary:
			'A theme switch revealed by a circle growing from the click, and list items that morph between layouts and into a detail view.',
		techniques: [
			'startViewTransition',
			'view-transition-name',
			'view-transition-class',
			'clip-path'
		],
		preview: ViewTransitionPreview
	},
	{
		route: '/paint-worklet',
		title: 'Paint Worklet (experimental)',
		summary:
			'Generative dots, squiggles and blobs painted by a CSS Paint Worklet from registered custom properties, with a gradient twin outside Chromium.',
		techniques: ['paint()', 'CSS.paintWorklet', 'CSS.registerProperty', 'mask-composite'],
		preview: PaintPatternPreview
	},
	{
		route: '/water-sim',
		title: 'Water simulation (experimental)',
		summary:
			'Drop stones into a GPU wave simulation that refracts the image behind it. Raw WebGL2 with a still-image fallback.',
		techniques: ['WebGL2', 'ping-pong framebuffers', 'GLSL', 'EXT_color_buffer_float'],
		preview: WaterSimPreview
	}
];

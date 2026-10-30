import { defaultsOf, defineSchema, type Values } from '../../params/schema.js';

/*
 * Scroll-driven reveals: CSS animations whose progress is the scroll position instead of time
 * (`animation-timeline: view()` / `scroll()`). Everything here is pure: the components turn these
 * values into custom properties, and the playground turns them into copy-pasteable CSS.
 */

export const REVEAL_PRESETS = ['slide', 'flip', 'scale', 'clip', 'blur'] as const;
export type RevealPreset = (typeof REVEAL_PRESETS)[number];

/** Edge a slide, flip or clip comes in from. `center`: no direction (a plain fade, or a clip from the middle). */
export const REVEAL_EDGES = ['right', 'left', 'bottom', 'top', 'center'] as const;
export type RevealEdge = (typeof REVEAL_EDGES)[number];

/**
 * How much of the scroll drives the reveal: while the element enters (`entry`), until its middle
 * reaches the middle of the scrollport (`center`), in on entry and out again on exit (`visible`),
 * or the `range` with its start and end below (`custom`).
 */
export const REVEAL_SPANS = ['center', 'entry', 'visible', 'custom'] as const;
export type RevealSpan = (typeof REVEAL_SPANS)[number];

/** Named timeline ranges of a view timeline (see the explainer for what each one covers). */
export const VIEW_RANGES = ['entry', 'cover', 'contain', 'entry-crossing'] as const;
export type ViewRange = (typeof VIEW_RANGES)[number];

export const REVEAL_EASINGS = ['linear', 'ease-out', 'ease-in-out'] as const;

export const scrollRevealSchema = defineSchema({
	preset: {
		kind: 'select',
		label: 'Preset',
		default: 'slide',
		options: REVEAL_PRESETS,
		group: 'Reveal',
		description:
			'What the hidden state looks like: shifted and transparent, turned away in 3D, shrunk, clipped away, or blurred.'
	},
	edge: {
		kind: 'select',
		label: 'From',
		default: 'right',
		options: REVEAL_EDGES,
		group: 'Reveal',
		description:
			'Edge a slide, flip or clip comes in from. Sideways slides need overflow-x: hidden on the scroller, or they widen it.'
	},
	distance: {
		kind: 'range',
		label: 'Distance',
		default: 160,
		min: 0,
		max: 480,
		step: 8,
		unit: 'px',
		group: 'Reveal',
		description: 'How far from its place a slide starts. 0 is a plain fade.'
	},
	angle: {
		kind: 'range',
		label: 'Flip angle',
		default: 70,
		min: 0,
		max: 90,
		step: 1,
		unit: '°',
		group: 'Reveal',
		description: 'How far a flip starts turned away, around the axis along its edge.'
	},
	startScale: {
		kind: 'range',
		label: 'Start scale',
		default: 0.85,
		min: 0.3,
		max: 1,
		step: 0.01,
		group: 'Reveal',
		description: 'Size of a scale element when it starts to enter.'
	},
	blurRadius: {
		kind: 'range',
		label: 'Blur',
		default: 12,
		min: 0,
		max: 40,
		step: 1,
		unit: 'px',
		group: 'Reveal',
		description: 'Starting blur of the blur preset. Animating a filter costs more than opacity.'
	},
	span: {
		kind: 'select',
		label: 'Span',
		default: 'center',
		options: REVEAL_SPANS,
		group: 'Timing',
		description:
			'center: revealed by the time it reaches the middle. entry: while it enters. visible: in on entry, out on exit. custom: the range below.'
	},
	range: {
		kind: 'select',
		label: 'Range',
		default: 'entry',
		options: VIEW_RANGES,
		group: 'Timing',
		description:
			'custom span only: which part of the trip through the scrollport drives the animation. Only entry and entry-crossing are guaranteed to finish for the last element of a scroller.'
	},
	rangeStart: {
		kind: 'range',
		label: 'Range start',
		default: 0,
		min: 0,
		max: 100,
		step: 1,
		unit: '%',
		group: 'Timing',
		description: 'custom span only: where in the range the reveal starts.'
	},
	rangeEnd: {
		kind: 'range',
		label: 'Range end',
		default: 100,
		min: 0,
		max: 100,
		step: 1,
		unit: '%',
		group: 'Timing',
		description: 'custom span only: where in the range the element is fully revealed.'
	},
	easing: {
		kind: 'select',
		label: 'Easing',
		default: 'ease-out',
		options: REVEAL_EASINGS,
		group: 'Timing',
		description: 'Maps scroll progress to animation progress.'
	},
	exit: {
		kind: 'toggle',
		label: 'Hide on exit',
		default: false,
		group: 'Timing',
		description:
			'Play the reveal backwards while the element leaves through the top (exit range). Always on for the visible span.'
	}
});

export type ScrollRevealOptions = Values<typeof scrollRevealSchema>;
export const scrollRevealDefaults: ScrollRevealOptions = defaultsOf(scrollRevealSchema);

export const parallaxSchema = defineSchema({
	strength: {
		kind: 'range',
		label: 'Strength',
		default: 480,
		min: 0,
		max: 1200,
		step: 20,
		unit: 'px',
		group: 'Parallax',
		description:
			'How far a layer of depth 1 travels in each direction while the scene crosses the scrollport. That trip is the scene plus the scrollport high, so it takes a few hundred px to be seen.'
	},
	range: {
		kind: 'select',
		label: 'Range',
		default: 'cover',
		options: ['cover', 'contain'],
		group: 'Parallax',
		description: 'cover: from first to last visible pixel. contain: only while fully visible.'
	}
});

export type ParallaxOptions = Values<typeof parallaxSchema>;
export const parallaxDefaults: ParallaxOptions = defaultsOf(parallaxSchema);

export const scrollProgressSchema = defineSchema({
	color: { kind: 'color', label: 'Color', default: '#a78bfa', group: 'Progress bar' },
	thickness: {
		kind: 'range',
		label: 'Thickness',
		default: 4,
		min: 1,
		max: 16,
		step: 1,
		unit: 'px',
		group: 'Progress bar'
	}
});

export type ScrollProgressOptions = Values<typeof scrollProgressSchema>;
export const scrollProgressDefaults: ScrollProgressOptions = defaultsOf(scrollProgressSchema);

/** One keyframe of a reveal. Properties a preset doesn't use stay at their identity value. */
export interface RevealFrame {
	opacity: string;
	translate: string;
	scale: string;
	filter: string;
	clipPath: string;
	transform: string;
}

const VISIBLE: RevealFrame = {
	opacity: '1',
	translate: 'none',
	scale: 'none',
	filter: 'none',
	clipPath: 'none',
	transform: 'none'
};

/** Offset of a slide `distance` px away towards `edge`, as a `translate` value. */
export function slideTranslate(edge: RevealEdge, distance: number): string {
	if (!distance) return 'none';
	switch (edge) {
		case 'right':
			return `${distance}px 0`;
		case 'left':
			return `${-distance}px 0`;
		case 'bottom':
			return `0 ${distance}px`;
		case 'top':
			return `0 ${-distance}px`;
		case 'center':
			return 'none';
	}
}

/**
 * Start of a flip: turned `angle` degrees away around the axis along `edge`, so the side facing
 * that edge leans back first. `perspective()` comes first so the turn is seen in 3D; the same
 * function in the end keyframe (at 0°) keeps the two interpolable.
 */
export function flipTransform(edge: RevealEdge, angle: number): string {
	if (!angle) return 'none';
	switch (edge) {
		case 'right':
			return `perspective(800px) rotateY(${-angle}deg)`;
		case 'left':
			return `perspective(800px) rotateY(${angle}deg)`;
		case 'bottom':
			return `perspective(800px) rotateX(${angle}deg)`;
		case 'top':
			return `perspective(800px) rotateX(${-angle}deg)`;
		case 'center':
			return 'none';
	}
}

/** `animation-range` for a span; `custom` uses the given range, start and end. */
export function spanRange(
	o: Pick<ScrollRevealOptions, 'span' | 'range' | 'rangeStart' | 'rangeEnd'>
): string {
	switch (o.span) {
		case 'center':
			// From the first pixel showing until the middle of the element is in the middle.
			return 'entry 0% cover 50%';
		case 'entry':
		case 'visible':
			return 'entry 0% entry 100%';
		case 'custom':
			return animationRange(o.range, o.rangeStart, o.rangeEnd);
	}
}

/** Range of the reversed hide animation for a span, or `undefined` when it doesn't hide again. */
export function spanExitRange(
	o: Pick<ScrollRevealOptions, 'span' | 'exit' | 'rangeStart' | 'rangeEnd'>
): string | undefined {
	if (o.span === 'visible') return 'exit 0% exit 100%';
	if (!o.exit) return undefined;
	if (o.span === 'center') return 'cover 50% exit 100%';
	if (o.span === 'entry') return 'exit 0% exit 100%';
	return exitRange(o.rangeStart, o.rangeEnd);
}

/** `inset()` that hides everything but the given edge; animating it to `inset(0)` wipes the box in. */
export function clipInset(edge: RevealEdge): string {
	switch (edge) {
		case 'bottom':
			return 'inset(100% 0 0 0)';
		case 'top':
			return 'inset(0 0 100% 0)';
		case 'left':
			return 'inset(0 100% 0 0)';
		case 'right':
			return 'inset(0 0 0 100%)';
		case 'center':
			return 'inset(50% 50% 50% 50%)';
	}
}

/**
 * Start (`from`) and end (`to`) keyframes of a reveal. The end is the element's resting state, so
 * wherever the animation doesn't run (no support, reduced motion) the content simply shows.
 * `clip-path` is the exception: `inset()` can't interpolate with `none`, so a clip reveal ends on
 * `inset(0)`, which clips nothing but overflow outside the border box (shadows, outlines).
 */
export function revealFrames(
	o: Pick<
		ScrollRevealOptions,
		'preset' | 'edge' | 'distance' | 'angle' | 'startScale' | 'blurRadius'
	>
): { from: RevealFrame; to: RevealFrame } {
	switch (o.preset) {
		case 'slide':
			return {
				from: { ...VISIBLE, opacity: '0', translate: slideTranslate(o.edge, o.distance) },
				to: VISIBLE
			};
		case 'flip': {
			const turned = flipTransform(o.edge, o.angle);
			return {
				from: { ...VISIBLE, opacity: '0', transform: turned },
				to: { ...VISIBLE, transform: turned.replace(/-?\d+deg/, '0deg') }
			};
		}
		case 'scale':
			return { from: { ...VISIBLE, opacity: '0', scale: String(o.startScale) }, to: VISIBLE };
		case 'clip':
			return {
				from: { ...VISIBLE, clipPath: clipInset(o.edge) },
				to: { ...VISIBLE, clipPath: 'inset(0)' }
			};
		case 'blur':
			return {
				from: {
					...VISIBLE,
					opacity: '0',
					filter: o.blurRadius ? `blur(${o.blurRadius}px)` : 'none'
				},
				to: VISIBLE
			};
	}
}

/** `animation-range` value, e.g. `entry 0% entry 100%`. A start past the end is swapped. */
export function animationRange(range: string, start: number, end: number): string {
	const [a, b] = start <= end ? [start, end] : [end, start];
	return `${range} ${a}% ${range} ${b}%`;
}

/**
 * Range of the mirrored "hide again" animation: the same stretch of the exit range, measured from
 * the other side. With `entry 10% entry 90%` the element is fully visible until `exit 10%` and
 * gone at `exit 90%`.
 */
export function exitRange(start: number, end: number): string {
	const [a, b] = start <= end ? [start, end] : [end, start];
	return `exit ${100 - b}% exit ${100 - a}%`;
}

/**
 * Travel of a parallax layer: `depth` 0 scrolls with the page, positive depths are further away
 * (they lag behind the scroll), negative ones are in front (they overtake it). The layer moves from
 * `-shift` to `+shift` while the scene crosses the scrollport; `bleed` is how much it has to be
 * oversized so no edge shows.
 */
export function parallaxShift(depth: number, strength: number): { shift: number; bleed: number } {
	const shift = depth * strength;
	return { shift, bleed: Math.abs(shift) };
}

const CSS_PROPS: Record<keyof RevealFrame, string> = {
	opacity: 'opacity',
	translate: 'translate',
	scale: 'scale',
	filter: 'filter',
	clipPath: 'clip-path',
	transform: 'transform'
};

/** The declarations of a keyframe that differ from the resting state, as CSS lines. */
function frameLines(frame: RevealFrame, indent: string): string[] {
	return (Object.keys(CSS_PROPS) as (keyof RevealFrame)[])
		.filter((k) => frame[k] !== VISIBLE[k])
		.map((k) => `${indent}${CSS_PROPS[k]}: ${frame[k]};`);
}

/** Vanilla CSS for a reveal with these settings (what `ScrollReveal` does, minus the variables). */
export function revealCss(o: ScrollRevealOptions, selector = '.reveal'): string {
	const { from, to } = revealFrames(o);
	const toLines = frameLines(to, '    ');
	const range = spanRange(o);
	const exit = spanExitRange(o);
	const animation = exit
		? [
				`    animation: reveal ${o.easing} both, reveal ${o.easing} reverse forwards;`,
				`    animation-timeline: view(), view();`,
				`    animation-range: ${range}, ${exit};`
			]
		: [
				`    animation: reveal ${o.easing} both;`,
				`    /* after the shorthand, which resets it */`,
				`    animation-timeline: view();`,
				`    animation-range: ${range};`
			];
	return [
		`@keyframes reveal {`,
		`  from {`,
		...frameLines(from, '    '),
		`  }`,
		...(toLines.length ? [`  to {`, ...toLines, `  }`] : []),
		`}`,
		``,
		`/* without support or with reduced motion, nothing hides */`,
		`@supports (animation-timeline: view()) {`,
		`  @media (prefers-reduced-motion: no-preference) {`,
		`    ${selector} {`,
		...animation.map((l) => `  ${l}`),
		`    }`,
		`  }`,
		`}`
	].join('\n');
}

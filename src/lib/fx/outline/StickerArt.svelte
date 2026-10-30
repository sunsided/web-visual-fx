<!--
@component
Decorative, self-drawn SVG artwork on a transparent background, for showing off alpha-based
effects such as the sticker outline. `rocket`: a rocket with a flame and a few loose stars (the
outline merges shapes that are close together). `icons`: a row of flat icons.
-->
<script lang="ts" module>
	export const stickerArts = ['rocket', 'icons'] as const;
	export type StickerArtKind = (typeof stickerArts)[number];
</script>

<script lang="ts">
	interface Props {
		kind?: StickerArtKind;
		class?: string;
	}

	let { kind = 'rocket', class: className }: Props = $props();

	const star = (cx: number, cy: number, r: number) => {
		const points = Array.from({ length: 10 }, (_, i) => {
			const a = (i * Math.PI) / 5 - Math.PI / 2;
			const rr = i % 2 ? r * 0.45 : r;
			return `${+(cx + rr * Math.cos(a)).toFixed(1)},${+(cy + rr * Math.sin(a)).toFixed(1)}`;
		});
		return points.join(' ');
	};

	const stars = [
		[70, 92, 26, '#ffd23f'],
		[330, 70, 18, '#ff8fb8'],
		[340, 300, 22, '#7fe3d4'],
		[58, 300, 14, '#ffd23f']
	] as const;
</script>

{#if kind === 'rocket'}
	<svg class={['sticker-art', className]} viewBox="0 0 400 400" aria-hidden="true">
		<!-- flame -->
		<path d="M168 300 Q200 400 232 300 Q200 330 168 300 Z" fill="#ff7a29" />
		<path d="M184 300 Q200 362 216 300 Q200 318 184 300 Z" fill="#ffd23f" />
		<!-- fins -->
		<path d="M150 230 L104 300 L156 290 Z" fill="#e2364f" />
		<path d="M250 230 L296 300 L244 290 Z" fill="#e2364f" />
		<!-- body -->
		<path d="M200 40 C270 100 268 230 246 300 H154 C132 230 130 100 200 40 Z" fill="#dcd6ff" />
		<path d="M200 40 C226 62 242 92 251 126 H149 C158 92 174 62 200 40 Z" fill="#e2364f" />
		<rect x="154" y="286" width="92" height="18" rx="6" fill="#6c63a8" />
		<!-- window -->
		<circle cx="200" cy="180" r="34" fill="#6c63a8" />
		<circle cx="200" cy="180" r="24" fill="#7fe3d4" />
		<path d="M186 170 a18 18 0 0 1 16 -12" stroke="#f4f1fb" stroke-width="6" fill="none" />
		<!-- loose stars -->
		{#each stars as [cx, cy, r, fill] (`${cx},${cy}`)}
			<polygon points={star(cx, cy, r)} {fill} stroke-linejoin="round" />
		{/each}
	</svg>
{:else}
	<svg class={['sticker-art', className]} viewBox="0 0 680 200" aria-hidden="true">
		<!-- heart -->
		<path
			d="M100 170 C40 125 20 95 30 65 C40 35 85 30 100 62 C115 30 160 35 170 65 C180 95 160 125 100 170 Z"
			fill="#e2364f"
		/>
		<!-- bolt -->
		<path d="M290 20 L230 115 H280 L262 185 L340 80 H288 L310 20 Z" fill="#ffd23f" />
		<!-- cloud -->
		<path
			d="M380 150 a34 34 0 0 1 6 -67 a46 46 0 0 1 88 -12 a38 38 0 0 1 52 44 a28 28 0 0 1 -6 35 Z"
			fill="#7fe3d4"
		/>
		<!-- moon -->
		<path d="M650 40 a62 62 0 1 0 0 120 a50 50 0 1 1 0 -120 Z" fill="#c3b8ff" />
	</svg>
{/if}

<style>
	.sticker-art {
		display: block;
		inline-size: 100%;
		block-size: 100%;
		overflow: visible;
	}
</style>

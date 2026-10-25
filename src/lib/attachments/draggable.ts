import type { Attachment } from 'svelte/attachments';

export interface Position {
	x: number;
	y: number;
}

interface DraggableOptions {
	/**
	 * Offset in px, owned by the caller (typically `$state`). The attachment only writes it;
	 * apply it yourself, e.g. `style:translate="{pos.x}px {pos.y}px"`. That way other controls
	 * (a "center" button, click-to-move) can move the element too.
	 */
	position: Position;
	/** Called when a pointer drag or a burst of key presses ends. */
	onmoveend?: (via: 'pointer' | 'keyboard') => void;
	/** Px per arrow key press; Shift multiplies by 5. */
	step?: number;
}

const INTERACTIVE = 'input, select, button, a, textarea, [contenteditable]';
const HANDLE = '[data-drag-handle]';

/**
 * Lets the user move an element by dragging it.
 *
 * - Pointer: drag anywhere on the element except other interactive controls. An element
 *   marked `data-drag-handle` (usually a button) can always start a drag.
 * - Keyboard: arrow keys move the element while its `data-drag-handle` has focus.
 *
 * Dragging alone doesn't satisfy WCAG 2.5.7; pair it with a single-pointer alternative.
 */
export function draggable({
	position,
	onmoveend,
	step = 10
}: DraggableOptions): Attachment<HTMLElement> {
	return (node) => {
		let start: { px: number; py: number; x: number; y: number } | undefined;
		let keyTimer: ReturnType<typeof setTimeout> | undefined;

		node.style.touchAction = 'none';

		function down(e: PointerEvent) {
			if (e.button !== 0) return;
			const target = e.target as Element;
			if (!target.closest(HANDLE) && target.closest(INTERACTIVE)) return;
			start = { px: e.clientX, py: e.clientY, x: position.x, y: position.y };
			node.setPointerCapture(e.pointerId);
			node.style.cursor = 'grabbing';
		}

		function move(e: PointerEvent) {
			if (!start) return;
			position.x = start.x + e.clientX - start.px;
			position.y = start.y + e.clientY - start.py;
		}

		function up(e: PointerEvent) {
			if (!start) return;
			const moved = position.x !== start.x || position.y !== start.y;
			start = undefined;
			node.releasePointerCapture(e.pointerId);
			node.style.cursor = '';
			if (moved) onmoveend?.('pointer');
		}

		function key(e: KeyboardEvent) {
			if (!(e.target as Element).closest(HANDLE)) return;
			const s = e.shiftKey ? step * 5 : step;
			const delta: Record<string, [number, number]> = {
				ArrowLeft: [-s, 0],
				ArrowRight: [s, 0],
				ArrowUp: [0, -s],
				ArrowDown: [0, s]
			};
			const d = delta[e.key];
			if (!d) return;
			e.preventDefault();
			position.x += d[0];
			position.y += d[1];
			clearTimeout(keyTimer);
			keyTimer = setTimeout(() => onmoveend?.('keyboard'), 500);
		}

		node.addEventListener('pointerdown', down);
		node.addEventListener('pointermove', move);
		node.addEventListener('pointerup', up);
		node.addEventListener('pointercancel', up);
		node.addEventListener('keydown', key);

		return () => {
			clearTimeout(keyTimer);
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerup', up);
			node.removeEventListener('pointercancel', up);
			node.removeEventListener('keydown', key);
		};
	};
}

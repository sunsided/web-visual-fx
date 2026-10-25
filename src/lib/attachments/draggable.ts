import type { Attachment } from 'svelte/attachments';

interface DraggableOptions {
	/** Initial offset in px. */
	x?: number;
	y?: number;
	/** Only start dragging when the pointer goes down on an element matching this selector. */
	handle?: string;
}

/**
 * Lets the user move an element with the pointer by updating its `translate`.
 * Keyboard users can move it with the arrow keys while it is focused (Shift = 10x).
 */
export function draggable({
	x = 0,
	y = 0,
	handle
}: DraggableOptions = {}): Attachment<HTMLElement> {
	return (node) => {
		let start: { px: number; py: number; x: number; y: number } | undefined;

		const apply = () => (node.style.translate = `${x}px ${y}px`);
		apply();
		node.style.touchAction = 'none';

		function down(e: PointerEvent) {
			if (e.button !== 0) return;
			if (handle && !(e.target as Element).closest(handle)) return;
			if ((e.target as Element).closest('input, select, button, a, textarea')) return;
			start = { px: e.clientX, py: e.clientY, x, y };
			node.setPointerCapture(e.pointerId);
			node.style.cursor = 'grabbing';
		}

		function move(e: PointerEvent) {
			if (!start) return;
			x = start.x + e.clientX - start.px;
			y = start.y + e.clientY - start.py;
			apply();
		}

		function up(e: PointerEvent) {
			if (!start) return;
			start = undefined;
			node.releasePointerCapture(e.pointerId);
			node.style.cursor = '';
		}

		function key(e: KeyboardEvent) {
			if (e.target !== node) return;
			const step = e.shiftKey ? 10 : 1;
			const delta: Record<string, [number, number]> = {
				ArrowLeft: [-step, 0],
				ArrowRight: [step, 0],
				ArrowUp: [0, -step],
				ArrowDown: [0, step]
			};
			const d = delta[e.key];
			if (!d) return;
			e.preventDefault();
			x += d[0];
			y += d[1];
			apply();
		}

		node.addEventListener('pointerdown', down);
		node.addEventListener('pointermove', move);
		node.addEventListener('pointerup', up);
		node.addEventListener('pointercancel', up);
		node.addEventListener('keydown', key);

		return () => {
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerup', up);
			node.removeEventListener('pointercancel', up);
			node.removeEventListener('keydown', key);
		};
	};
}

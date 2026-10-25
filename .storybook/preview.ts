import type { Preview } from '@storybook/sveltekit';
import '../src/lib/tokens/index.css';

const preview: Preview = {
	globalTypes: {
		theme: {
			description: 'Color scheme',
			toolbar: {
				title: 'Theme',
				icon: 'contrast',
				items: [
					{ value: 'system', title: 'System' },
					{ value: 'light', title: 'Light' },
					{ value: 'dark', title: 'Dark' }
				],
				dynamicTitle: true
			}
		}
	},
	initialGlobals: { theme: 'system' },
	decorators: [
		(story, { globals }) => {
			const root = document.documentElement;
			if (globals.theme === 'system') delete root.dataset.theme;
			else root.dataset.theme = globals.theme;
			return story();
		}
	],
	parameters: {
		controls: { expanded: true, sort: 'none' },
		a11y: { test: 'todo' }
	}
};

export default preview;

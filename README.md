# Visual FX

Try it out: https://sunsided.github.io/web-visual-fx/

---

A playground for modern visual effects on the web, built as tokenized, fully configurable
Svelte components. Two faces, one codebase:

- **Playground site** (SvelteKit, prerendered): one full-screen page per effect, with a
  control panel for every parameter and a generated code snippet.
- **Component library** (Storybook): every atom, molecule, organism and effect with
  controls and docs, published under `/storybook/` next to the site.

Effects so far:

| Effect               | Techniques                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| Noise                | `feTurbulence`, `feColorMatrix`, `feComponentTransfer`, `mix-blend-mode`                          |
| Frosted glass        | `backdrop-filter`, `feTurbulence` → `feDisplacementMap`, masked gradient rim                      |
| Liquid glass         | SDF-generated map via `feImage` → `feDisplacementMap`, `feSpecularLighting`                       |
| Chromatic aberration | `feColorMatrix` channel split, `feOffset`, `feBlend`, radial `feDisplacementMap`                  |
| Gooey                | `feGaussianBlur` → `feColorMatrix` alpha threshold, `feComposite`                                 |
| Lighting             | `feDiffuseLighting`, `feSpecularLighting`, `fePointLight`, `feTurbulence` bump map                |
| Duotone              | `feColorMatrix` luminance, `feComponentTransfer` table, `feComposite` mix                         |
| Halftone             | CSS dot gradients + `contrast()` threshold; `feImage`/`feTile` Bayer dither + discrete transfer   |
| CRT                  | gradient scanlines and mask, `feDisplacementMap` barrel with a generated map, blur + screen bloom |
| Holographic foil     | `perspective` tilt, pointer custom properties, `mix-blend-mode`, `background-blend-mode`          |
| Spotlight cards      | pointer-tracked `radial-gradient`, `mask-composite: exclude`, `ResizeObserver`                    |
| Aurora               | `@property`-registered colors/angles, `cos()`/`sin()`, layered `radial-gradient`                  |
| Squircles            | `corner-shape` / `superellipse()`, `linear()` spring easing, `clip-path: path()` fallback         |

> Backdrop displacement uses `backdrop-filter: url(#filter)`, which only renders in Chromium-based
> browsers. Firefox drops the whole backdrop filter (blur included) when the chain contains
> `url()`; Safari is untested. `GlassPanel` therefore leaves `url()` out outside Chromium unless
> `forceDisplace` is set, so other browsers get blur + tint + grain + rim.

## Using the package

The effects are published as `@sunsided/web-visual-fx` on GitHub Packages, in three flavors:

| Entry                              | What                                                         | For                                |
| ---------------------------------- | ------------------------------------------------------------ | ---------------------------------- |
| `@sunsided/web-visual-fx/svelte`   | Svelte 5 components, shipped as source                       | Svelte and SvelteKit apps          |
| `@sunsided/web-visual-fx/elements` | Custom elements (`<vfx-glass>` …), prebuilt                  | React 19, Vue, Angular, plain HTML |
| `@sunsided/web-visual-fx`          | Schemas, defaults and pure helpers, one namespace per effect | Anything                           |

GitHub Packages needs a token to install, even for public packages. Create a personal
access token (classic) with `read:packages`, then add to your project's `.npmrc`:

```ini
@sunsided:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```sh
npm install @sunsided/web-visual-fx
```

Svelte is an optional peer dependency: only the `/svelte` entry needs it. The elements bundle
their own copy of the Svelte runtime.

### Svelte

```svelte
<script>
	import '@sunsided/web-visual-fx/tokens.css';
	import { GlassPanel, HoloCard } from '@sunsided/web-visual-fx/svelte';
</script>

<GlassPanel blur={20} tintOpacity={0.4}>Frosted</GlassPanel>

<HoloCard label="My card">
	{#snippet art()}<img src="/art.png" alt="" />{/snippet}
	<p>Card text</p>
</HoloCard>
```

`tokens.css` holds the design tokens and the two utilities the components rely on
(`.visually-hidden`, and pausing animations inside `[data-motion="paused"]`); it contains no
document reset.

### Custom elements (React, plain HTML, …)

```js
import '@sunsided/web-visual-fx/elements'; // registers all elements
// or only what you use: import '@sunsided/web-visual-fx/elements/glass';
```

```html
<vfx-glass blur-radius="20" tint-opacity="0.4">Frosted</vfx-glass>

<vfx-holo label="My card">
	<img slot="art" src="/art.png" alt="" />
	<p>Card text</p>
</vfx-holo>
```

- **Self-contained:** each element carries its tokens in its shadow root; no global CSS
  needed. `color-scheme` (and so light/dark) is inherited from the page; `data-theme` on the
  element forces one.
- **Props:** properties use the camelCase prop names (`el.tintOpacity = 0.4`), attributes the
  kebab-case form (`tint-opacity`). Two props are renamed because `HTMLElement` already has
  them: `blur` → `blurRadius` and `animate` → `animated`.
- **Content:** children go into the default slot; HoloCard's art into `slot="art"`.
- **Events:** `<vfx-gooey-menu>` fires `itemselect` (the item) and `openchange`,
  `<vfx-squircle-group>` fires `selectedchange`; the new value is in `event.detail`, and the
  `open` / `selected` properties stay in sync.
- **Motion:** CSS-animated elements (`vfx-gooey`, `vfx-crt`, `vfx-aurora`) take a `paused`
  property, since a page-level `data-motion` can't reach into a shadow root.
- **Not available as an element:** spotlight cards (the grid measures its cards with
  `querySelectorAll`, which doesn't see slotted children); use the Svelte components.

React 19 passes props to custom elements as properties and `on<event>` props as listeners. For
JSX types, reference the declarations once:

```tsx
import '@sunsided/web-visual-fx/elements';
import type {} from '@sunsided/web-visual-fx/elements/react';

<vfx-gooey-menu
	items={[{ label: 'Share', icon: '↗' }]}
	onitemselect={(e) => console.log(e.detail.label)}
/>;
```

React 18 sets attributes instead of properties, so array props (`items`, `selected`) need a
`ref`.

### Core

```ts
import { crt, glass, supportsCornerShape } from '@sunsided/web-visual-fx';

glass.glassDefaults.blur; // 14
crt.maxFlickerChange(0.03); // worst-case luminance change of the CRT flicker
```

## Getting started

Requires Node.js 24 (see `.node-version`) and [Task](https://taskfile.dev).

```sh
corepack enable
task install
task dev        # playground on http://localhost:5173
task storybook  # component library on http://localhost:6006
```

`task` lists everything; `task ci` runs the full pipeline locally (format, lint, types,
workflow linting with actionlint + zizmor, tests, build, package). `task package` builds the
npm package into `dist/` and checks it with publint.

## Structure

```
src/lib/
  tokens/        primitives.css → semantic.css → utilities.css = tokens.css (shipped); base.css (site reset)
  params/        parameter schemas: one definition drives defaults, controls, Storybook argTypes, code snippets
  components/
    atoms/       Slider, Switch, Select, ColorInput, Button
    molecules/   Field, ParamControl, ControlGroup, CodeSnippet, StageHeader
    organisms/   ParamControls, ControlPanel, Scene
    templates/   PlaygroundLayout
  fx/
    noise/       noise.ts (schema), NoiseFilter (SVG <filter>), NoiseLayer
    glass/       glass.ts (schema), DisplacementFilter (SVG <filter>), GlassPanel
    …/           one folder per effect: schema + specs, filter/component(s), Preview, stories
  fx/registry.ts every effect listed on the index
  index.ts       package entry: schemas and helpers
  svelte.ts      package entry: Svelte components
src/elements/
  config.ts      which components become custom elements, with extra props, slots, events
  generate.ts    renders the wrappers in generated/ and the .d.ts files (yarn elements:generate)
  shadow.ts      tokens and utilities adopted into every element's shadow root
src/routes/      index + one page per effect
```

## Customizing

Every effect parameter is a prop with a sensible default (ranges and defaults live in the
effect's schema, e.g. `fx/glass/glass.ts`). Styling goes through three token layers:

1. **Primitives** such as `--gray-*`, `--accent-*`, `--space-*`. Re-skin everything with
   `--accent-hue` / `--gray-hue`.
2. **Semantic roles** such as `--color-surface` and `--color-accent`, with light/dark via
   `light-dark()`. Force a scheme with `data-theme="light" | "dark"` on any element.
3. **Component tokens** that fall back to semantic ones, e.g.
   `<Slider --slider-fill="hotpink" />`.

## Adding an effect

1. Create `src/lib/fx/<name>/<name>.ts` with a `defineSchema({...})` and its defaults.
2. Build the effect from small pieces (an SVG filter atom, a surface component).
3. Add `<Name>.stories.svelte` using `toArgTypes(schema)`.
4. Add `src/routes/<name>/+page.svelte` using `ParamState`, `ParamControls` and `PlaygroundLayout`.
5. Register it in `src/lib/fx/registry.ts`.
6. Export the component from `src/lib/svelte.ts` and the module from `src/lib/index.ts`.
7. To ship it as a custom element, add it to `src/elements/config.ts` and run
   `task elements:generate` (a spec fails while the generated wrappers are out of date).

## Deployment

`.github/workflows/pages.yml` runs on every push to `main`. It first runs the full CI
workflow (`ci.yml`, called as a reusable workflow) and only continues if that passes: it
builds the site with `BASE_PATH` taken from `actions/configure-pages`, builds Storybook into
`build/storybook`, and deploys to GitHub Pages. Pull requests run CI only.

In the repository settings, set **Pages → Source** to **GitHub Actions**.

## Releases

Bump `version` in `package.json`, then push a matching semver tag:

```sh
git tag v1.1.0 && git push origin v1.1.0
```

`.github/workflows/release.yml` runs CI, checks that the tag matches `package.json`, builds
the site and Storybook into `web-visual-fx-<tag>.tar.gz` (relative paths, so it works from any
directory), and creates the release with GitHub-generated notes and the archive attached. It
also builds the npm package and publishes it to GitHub Packages. Tags with a suffix such as
`v1.2.0-rc.1` become prereleases and are published under the `next` dist-tag.

## License

Licensed under any of the [European Union Public Licence 1.2](LICENSE-EUPL),
the [MIT License](LICENSE-MIT), or the [Apache License 2.0](LICENSE-APACHE),
at your option (`EUPL-1.2 OR MIT OR Apache-2.0`).

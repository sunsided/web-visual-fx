# Visual FX

A playground for modern visual effects on the web, built as tokenized, fully configurable
Svelte components. Two faces, one codebase:

- **Playground site** (SvelteKit, prerendered): one full-screen page per effect, with a
  control panel for every parameter and a generated code snippet.
- **Component library** (Storybook): every atom, molecule, organism and effect with
  controls and docs, published under `/storybook/` next to the site.

Effects so far:

| Effect        | Techniques                                                                   |
| ------------- | ---------------------------------------------------------------------------- |
| Noise         | `feTurbulence`, `feColorMatrix`, `feComponentTransfer`, `mix-blend-mode`     |
| Frosted glass | `backdrop-filter`, `feTurbulence` → `feDisplacementMap`, masked gradient rim |

> Backdrop displacement uses `backdrop-filter: url(#filter)`, which only renders in Chromium-based
> browsers. Firefox drops the whole backdrop filter (blur included) when the chain contains
> `url()`; Safari is untested. `GlassPanel` therefore leaves `url()` out outside Chromium unless
> `forceDisplace` is set, so other browsers get blur + tint + grain + rim.

## Getting started

Requires Node.js 24 (see `.node-version`) and [Task](https://taskfile.dev).

```sh
corepack enable
task install
task dev        # playground on http://localhost:5173
task storybook  # component library on http://localhost:6006
```

`task` lists everything; `task ci` runs the full pipeline locally (format, lint, types,
workflow linting with actionlint + zizmor, tests, build).

## Structure

```
src/lib/
  tokens/        primitives.css → semantic.css → base.css (design tokens)
  params/        parameter schemas: one definition drives defaults, controls, Storybook argTypes, code snippets
  components/
    atoms/       Slider, Switch, Select, ColorInput, Button
    molecules/   Field, ParamControl, ControlGroup, CodeSnippet, StageHeader
    organisms/   ParamControls, ControlPanel, Scene
    templates/   PlaygroundLayout
  fx/
    noise/       noise.ts (schema), NoiseFilter (SVG <filter>), NoiseLayer
    glass/       glass.ts (schema), DisplacementFilter (SVG <filter>), GlassPanel
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

## Deployment

`.github/workflows/pages.yml` runs on every push to `main`. It first runs the full CI
workflow (`ci.yml`, called as a reusable workflow) and only continues if that passes: it
builds the site with `BASE_PATH` taken from `actions/configure-pages`, builds Storybook into
`build/storybook`, and deploys to GitHub Pages. Pull requests run CI only.

In the repository settings, set **Pages → Source** to **GitHub Actions**.

## Releases

Push a semver tag to publish a GitHub release:

```sh
git tag v0.1.0 && git push origin v0.1.0
```

`.github/workflows/release.yml` runs CI, builds the site and Storybook into
`web-visual-fx-<tag>.tar.gz` (relative paths, so it works from any directory), and creates
the release with GitHub-generated notes and the archive attached. Tags with a suffix such
as `v0.2.0-rc.1` become prereleases.

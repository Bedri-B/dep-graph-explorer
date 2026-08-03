# DepGraphExplorer

A client-only web app: paste the contents of a `package.json`, get an
interactive **D3.js force-directed graph** of its direct dependencies —
one node per entry across `dependencies`, `devDependencies`, and
`peerDependencies`, color-coded by type, with drag/pan/zoom and a
name-search that dims everything else. Nothing is sent anywhere; parsing
and layout both run in the browser.

Built with **Vite + React + TypeScript + D3** (`d3-force`, `d3-drag`,
`d3-zoom`) — no backend, no npm registry calls, no build-time dependency
resolution.

## Why it's structured this way

The package.json → graph transformation (`src/lib/graphBuilder.ts`) is a
pure, DOM-free module: `parsePackageJson(raw: string)` turns text into a
validated object (throwing a `PackageJsonParseError` with a UI-safe message
on anything malformed), and `buildGraph(pkg)` turns that object into
`{ nodes, links }`. Neither function touches React or D3, so the logic that
actually matters — dependency-type classification, deduplication when a
package is listed in more than one section, defaulting on missing
name/version — is unit tested directly with Vitest, without spinning up a
DOM or a browser.

Everything D3 owns (the force simulation, drag behavior, zoom transform,
tick loop) lives in `src/components/GraphCanvas.tsx` behind a `useEffect`
that drives the SVG imperatively. This is the standard way to mix D3 and
React: a force simulation runs its own mutable tick loop, and fighting that
with React's render cycle causes more problems than it solves. The pure
graph module never has to know either of them exists.

Color/label mapping for the four node types (root / dependencies /
devDependencies / peerDependencies) lives in one place,
`src/lib/theme.ts`, so the legend and the renderer can't drift apart.

## Deliberate simplifications (this is a portfolio piece, not a package manager)

- Only **direct** dependencies are graphed — no recursive resolution into
  transitive dependencies, no npm registry lookups. Versions shown are
  exactly the range strings written in the pasted `package.json`.
- `optionalDependencies` and `bundledDependencies` aren't included; the
  spec called out `dependencies` / `devDependencies` / `peerDependencies`
  and that's what's implemented.
- When a dependency name appears in more than one section (a plugin
  package legitimately listing something under both `dependencies` and
  `peerDependencies`, say), it gets a single node — first section in
  fixed order (`dependencies` → `devDependencies` → `peerDependencies`)
  wins for its color — rather than duplicate nodes or parallel edges.
- No persistence, no export, no shareable URL — paste in, look at the
  graph, done.

## Run it

```
npm install
npm run dev
```

Opens with a bundled sample `package.json` (`src/data/samplePackageJson.ts`)
already rendered, so the graph isn't empty on first load. Paste your own
JSON into the textarea and click **Render graph**, or use **Open file…**
to load a `package.json` from disk. Malformed JSON shows an inline error
instead of crashing the graph.

## Run tests

```
npm test
```

18 Vitest cases in `src/lib/graphBuilder.test.ts` cover `parsePackageJson`
and `buildGraph` directly: valid parsing, malformed-JSON and non-object
JSON rejection, root-node defaulting, per-section node classification,
cross-section deduplication (node and link), non-object dependency
sections being skipped rather than throwing, empty-string dependency
names, non-string version coercion, and the root-vs-same-named-dependency
id collision case.

## Build

```
npm run build
```

Type-checks (`tsc -b`) and produces a static bundle in `dist/` — the app
has no server component, so `dist/` is deployable as-is to any static host.

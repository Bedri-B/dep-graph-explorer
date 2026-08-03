/**
 * A small, realistic package.json used to populate the graph on first load
 * so the app isn't an empty textarea. Loosely modeled on a typical
 * Vite + React + TypeScript app with a couple of dev/peer deps thrown in
 * so all three dependency-type colors show up immediately.
 */
export const samplePackageJson = `{
  "name": "acme-dashboard",
  "version": "1.4.0",
  "private": true,
  "description": "Internal analytics dashboard",
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "^7.1.0",
    "d3": "^7.9.0",
    "zustand": "^5.0.2",
    "date-fns": "^4.1.0",
    "clsx": "^2.1.1"
  },
  "devDependencies": {
    "vite": "^8.2.0",
    "typescript": "^5.7.2",
    "vitest": "^3.0.0",
    "eslint": "^9.17.0",
    "@types/d3": "^7.4.3",
    "@vitejs/plugin-react": "^6.0.4"
  },
  "peerDependencies": {
    "react": "^19.2.0"
  }
}
`

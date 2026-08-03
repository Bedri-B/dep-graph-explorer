import type { DependencyType } from './graphBuilder'

/** Single source of truth for node color + legend labels, shared between
 * the D3 renderer and the Legend component so they can never drift apart. */
export const NODE_COLORS: Record<DependencyType, string> = {
  root: '#f2b705',
  dependencies: '#4fb0ff',
  devDependencies: '#7ee787',
  peerDependencies: '#d38aff',
}

export const NODE_LABELS: Record<DependencyType, string> = {
  root: 'Root package',
  dependencies: 'dependencies',
  devDependencies: 'devDependencies',
  peerDependencies: 'peerDependencies',
}

export const LEGEND_ORDER: DependencyType[] = [
  'root',
  'dependencies',
  'devDependencies',
  'peerDependencies',
]

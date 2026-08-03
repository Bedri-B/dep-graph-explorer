/**
 * Pure, DOM-free logic for turning package.json text into a graph the
 * renderer can draw. Nothing in this file touches React, D3, or the DOM,
 * so it can be unit tested directly (see graphBuilder.test.ts).
 */

/** The four node categories the app distinguishes, each with its own color. */
export type DependencyType =
  | 'root'
  | 'dependencies'
  | 'devDependencies'
  | 'peerDependencies'

export interface GraphNode {
  /** Unique within a graph. The root node uses a `root:` prefix so a
   * dependency that happens to share the package's own name never collides
   * with it. */
  id: string
  /** Display text (package name, no prefix). */
  label: string
  version: string
  type: DependencyType
}

export interface GraphLink {
  source: string
  target: string
}

export interface DependencyGraph {
  nodes: GraphNode[]
  links: GraphLink[]
}

/** A loosely-typed shape for whatever JSON.parse hands back — we validate
 * and coerce fields defensively rather than trusting a package.json shape. */
export type UnknownRecord = Record<string, unknown>

export class PackageJsonParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PackageJsonParseError'
  }
}

const DEPENDENCY_SECTIONS: Array<{ key: string; type: DependencyType }> = [
  { key: 'dependencies', type: 'dependencies' },
  { key: 'devDependencies', type: 'devDependencies' },
  { key: 'peerDependencies', type: 'peerDependencies' },
]

const ROOT_PREFIX = 'root:'

/**
 * Parses raw textarea input into an object. Throws PackageJsonParseError
 * with a message safe to show directly in the UI on any malformed input
 * (invalid JSON, or valid JSON that isn't a plain object).
 */
export function parsePackageJson(raw: string): UnknownRecord {
  if (raw.trim().length === 0) {
    throw new PackageJsonParseError('Paste some package.json content first.')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    throw new PackageJsonParseError(`That isn't valid JSON: ${detail}`)
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new PackageJsonParseError(
      'A package.json has to be a JSON object (e.g. { "name": ... }), not an array or a bare value.',
    )
  }

  return parsed as UnknownRecord
}

function asNonEmptyString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

/** Dependency version fields are normally strings ("^1.2.3") but we coerce
 * anything JSON allows there rather than crashing on odd input. */
function versionToString(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function asRecord(value: unknown): UnknownRecord | undefined {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as UnknownRecord
  }
  return undefined
}

/**
 * Builds a {nodes, links} graph from a parsed package.json:
 * - one root node for the package itself (name/version, falling back to
 *   sensible defaults when missing)
 * - one node per entry across dependencies / devDependencies /
 *   peerDependencies, deduplicated by name
 * - one link from root to each unique dependency
 *
 * When the same dependency name appears in more than one section, the
 * first section wins for its color/type (checked in the fixed order above)
 * and only a single node + link is produced — the graph has no use for
 * duplicate nodes or parallel edges.
 */
export function buildGraph(pkg: UnknownRecord): DependencyGraph {
  const rootName = asNonEmptyString(pkg.name, 'package')
  const rootVersion = asNonEmptyString(pkg.version, '0.0.0')
  const rootId = `${ROOT_PREFIX}${rootName}`

  const nodes: GraphNode[] = [
    { id: rootId, label: rootName, version: rootVersion, type: 'root' },
  ]
  const links: GraphLink[] = []
  const seenNodeIds = new Set<string>()
  const seenLinkKeys = new Set<string>()

  for (const { key, type } of DEPENDENCY_SECTIONS) {
    const section = asRecord(pkg[key])
    if (!section) continue

    for (const [rawName, rawVersion] of Object.entries(section)) {
      const depName = rawName.trim()
      if (!depName) continue

      if (!seenNodeIds.has(depName)) {
        nodes.push({
          id: depName,
          label: depName,
          version: versionToString(rawVersion),
          type,
        })
        seenNodeIds.add(depName)
      }

      const linkKey = `${rootId}=>${depName}`
      if (!seenLinkKeys.has(linkKey)) {
        links.push({ source: rootId, target: depName })
        seenLinkKeys.add(linkKey)
      }
    }
  }

  return { nodes, links }
}

/** Convenience wrapper combining parse + build for callers that don't need
 * the intermediate parsed object. */
export function graphFromPackageJsonText(raw: string): DependencyGraph {
  return buildGraph(parsePackageJson(raw))
}

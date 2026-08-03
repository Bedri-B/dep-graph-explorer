import { describe, expect, it } from 'vitest'
import {
  buildGraph,
  graphFromPackageJsonText,
  parsePackageJson,
  PackageJsonParseError,
  type UnknownRecord,
} from './graphBuilder'

describe('parsePackageJson', () => {
  it('parses valid JSON into an object', () => {
    const result = parsePackageJson('{"name": "foo", "version": "1.0.0"}')
    expect(result).toEqual({ name: 'foo', version: '1.0.0' })
  })

  it('throws PackageJsonParseError on malformed JSON', () => {
    expect(() => parsePackageJson('{"name": "foo",}')).toThrow(PackageJsonParseError)
  })

  it('throws a readable error message on malformed JSON', () => {
    expect(() => parsePackageJson('not json at all')).toThrow(/valid JSON/i)
  })

  it('throws PackageJsonParseError when the JSON is an array, not an object', () => {
    expect(() => parsePackageJson('[1, 2, 3]')).toThrow(PackageJsonParseError)
  })

  it('throws PackageJsonParseError when the JSON is a bare primitive', () => {
    expect(() => parsePackageJson('"just a string"')).toThrow(PackageJsonParseError)
  })

  it('throws on empty input rather than silently producing an empty graph', () => {
    expect(() => parsePackageJson('   ')).toThrow(PackageJsonParseError)
  })
})

describe('buildGraph', () => {
  it('creates a root node from name and version', () => {
    const graph = buildGraph({ name: 'my-app', version: '2.3.4' })
    expect(graph.nodes).toEqual([
      { id: 'root:my-app', label: 'my-app', version: '2.3.4', type: 'root' },
    ])
    expect(graph.links).toEqual([])
  })

  it('falls back to defaults when name/version are missing', () => {
    const graph = buildGraph({})
    expect(graph.nodes).toEqual([
      { id: 'root:package', label: 'package', version: '0.0.0', type: 'root' },
    ])
  })

  it('creates one node and one link per dependency entry', () => {
    const graph = buildGraph({
      name: 'app',
      dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' },
    })
    const depNodes = graph.nodes.filter((n) => n.type === 'dependencies')
    expect(depNodes).toHaveLength(2)
    expect(depNodes).toContainEqual({ id: 'react', label: 'react', version: '^19.0.0', type: 'dependencies' })
    expect(graph.links).toContainEqual({ source: 'root:app', target: 'react' })
    expect(graph.links).toContainEqual({ source: 'root:app', target: 'react-dom' })
  })

  it('classifies devDependencies and peerDependencies with distinct types', () => {
    const graph = buildGraph({
      name: 'app',
      devDependencies: { vitest: '^3.0.0' },
      peerDependencies: { react: '^19.0.0' },
    })
    expect(graph.nodes).toContainEqual({ id: 'vitest', label: 'vitest', version: '^3.0.0', type: 'devDependencies' })
    expect(graph.nodes).toContainEqual({ id: 'react', label: 'react', version: '^19.0.0', type: 'peerDependencies' })
  })

  it('dedupes a dependency listed in more than one section, keeping the first section it appears in', () => {
    const graph = buildGraph({
      name: 'app',
      dependencies: { typescript: '^5.0.0' },
      devDependencies: { typescript: '^5.0.0' },
    })
    const typescriptNodes = graph.nodes.filter((n) => n.id === 'typescript')
    expect(typescriptNodes).toHaveLength(1)
    expect(typescriptNodes[0].type).toBe('dependencies')

    const links = graph.links.filter((l) => l.target === 'typescript')
    expect(links).toHaveLength(1)
  })

  it('produces only the root node when no dependency sections are present', () => {
    const graph = buildGraph({ name: 'lonely-package' })
    expect(graph.nodes).toHaveLength(1)
    expect(graph.links).toHaveLength(0)
  })

  it('ignores a dependency section that is not an object instead of throwing', () => {
    const graph = buildGraph({
      name: 'app',
      dependencies: 'not-an-object' as unknown as UnknownRecord,
    })
    expect(graph.nodes).toHaveLength(1)
    expect(graph.links).toHaveLength(0)
  })

  it('skips empty-string dependency names', () => {
    const graph = buildGraph({
      name: 'app',
      dependencies: { '': '^1.0.0', lodash: '^4.0.0' },
    })
    expect(graph.nodes.map((n) => n.id)).toEqual(['root:app', 'lodash'])
  })

  it('coerces a non-string version value to a string instead of crashing', () => {
    const graph = buildGraph({
      name: 'app',
      dependencies: { weird: 123 as unknown as string },
    })
    expect(graph.nodes.find((n) => n.id === 'weird')?.version).toBe('123')
  })

  it('keeps a dependency and the root as distinct nodes even when their names collide', () => {
    const graph = buildGraph({
      name: 'react',
      dependencies: { react: '^19.0.0' },
    })
    expect(graph.nodes).toHaveLength(2)
    expect(graph.nodes.map((n) => n.id)).toEqual(['root:react', 'react'])
  })
})

describe('graphFromPackageJsonText', () => {
  it('parses and builds in one call for a realistic package.json', () => {
    const text = JSON.stringify({
      name: 'demo',
      version: '1.2.3',
      dependencies: { d3: '^7.9.0' },
      devDependencies: { vitest: '^3.0.0' },
    })
    const graph = graphFromPackageJsonText(text)
    expect(graph.nodes).toHaveLength(3)
    expect(graph.links).toHaveLength(2)
  })

  it('propagates parse errors for malformed input', () => {
    expect(() => graphFromPackageJsonText('{ broken')).toThrow(PackageJsonParseError)
  })
})

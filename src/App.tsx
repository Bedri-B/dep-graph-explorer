import { useCallback, useMemo, useState } from 'react'
import { GraphCanvas } from './components/GraphCanvas'
import { Legend } from './components/Legend'
import { SearchBox } from './components/SearchBox'
import { graphFromPackageJsonText, type DependencyGraph } from './lib/graphBuilder'
import { samplePackageJson } from './data/samplePackageJson'

function buildOrError(text: string): { graph: DependencyGraph | null; error: string | null } {
  try {
    return { graph: graphFromPackageJsonText(text), error: null }
  } catch (err) {
    return { graph: null, error: err instanceof Error ? err.message : String(err) }
  }
}

const initial = buildOrError(samplePackageJson)

function App() {
  const [rawInput, setRawInput] = useState(samplePackageJson)
  const [graph, setGraph] = useState<DependencyGraph | null>(initial.graph)
  const [error, setError] = useState<string | null>(initial.error)
  const [searchTerm, setSearchTerm] = useState('')

  const handleRender = useCallback(() => {
    const result = buildOrError(rawInput)
    setGraph(result.graph)
    setError(result.error)
  }, [rawInput])

  const handleLoadSample = useCallback(() => {
    setRawInput(samplePackageJson)
    const result = buildOrError(samplePackageJson)
    setGraph(result.graph)
    setError(result.error)
  }, [])

  const handleFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      setRawInput(text)
      const result = buildOrError(text)
      setGraph(result.graph)
      setError(result.error)
    }
    reader.readAsText(file)
    event.target.value = ''
  }, [])

  const stats = useMemo(() => {
    if (!graph) return null
    const depCount = graph.nodes.length - 1
    return `${depCount} ${depCount === 1 ? 'dependency' : 'dependencies'} · ${graph.links.length} links`
  }, [graph])

  return (
    <div className="app">
      <header className="app-header">
        <h1>DepGraphExplorer</h1>
        <p className="tagline">Paste a package.json. Get an interactive force-directed dependency graph. Nothing leaves your browser.</p>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <div className="sidebar-actions">
            <button type="button" onClick={handleLoadSample} className="secondary">
              Load sample
            </button>
            <label className="file-picker">
              Open file…
              <input type="file" accept="application/json,.json" onChange={handleFile} />
            </label>
          </div>

          <textarea
            className="package-input"
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            spellCheck={false}
            aria-label="package.json content"
            placeholder='Paste package.json here, e.g. { "name": "my-app", "dependencies": { ... } }'
          />

          <button type="button" className="primary" onClick={handleRender}>
            Render graph
          </button>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {!error && stats && <p className="stats">{stats}</p>}
        </aside>

        <main className="canvas-area">
          <div className="canvas-overlay">
            <SearchBox value={searchTerm} onChange={setSearchTerm} />
            <Legend />
          </div>

          {graph ? (
            <GraphCanvas graph={graph} searchTerm={searchTerm} />
          ) : (
            <div className="empty-state">Fix the JSON on the left, then click "Render graph".</div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App

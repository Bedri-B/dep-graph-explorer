import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { DependencyGraph, GraphNode } from '../lib/graphBuilder'
import { NODE_COLORS } from '../lib/theme'

interface SimNode extends GraphNode, d3.SimulationNodeDatum {}
interface SimLink extends d3.SimulationLinkDatum<SimNode> {}

interface GraphCanvasProps {
  graph: DependencyGraph
  searchTerm: string
}

const ROOT_RADIUS = 16
const DEP_RADIUS = 9

function radiusFor(node: SimNode): number {
  return node.type === 'root' ? ROOT_RADIUS : DEP_RADIUS
}

function dragBehavior(simulation: d3.Simulation<SimNode, SimLink>) {
  return d3
    .drag<SVGGElement, SimNode>()
    .on('start', (event, d) => {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    })
    .on('drag', (event, d) => {
      d.fx = event.x
      d.fy = event.y
    })
    .on('end', (event, d) => {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    })
}

/**
 * Renders `graph` as a force-directed layout inside an SVG. All D3 state
 * (simulation, selections, zoom transform) lives in refs and is driven
 * imperatively from effects — the usual pattern for mixing D3 with React,
 * since a force simulation owns its own mutable tick loop that React's
 * render cycle shouldn't fight with.
 */
export function GraphCanvas({ graph, searchTerm }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const nodeSelectionRef = useRef<d3.Selection<SVGGElement, SimNode, SVGGElement, unknown> | null>(null)
  const linkSelectionRef = useRef<d3.Selection<SVGLineElement, SimLink, SVGGElement, unknown> | null>(null)

  useEffect(() => {
    const svgEl = svgRef.current
    const container = containerRef.current
    if (!svgEl || !container) return

    const width = container.clientWidth || 800
    const height = container.clientHeight || 600

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const zoomRoot = svg.append('g').attr('class', 'zoom-root')

    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        zoomRoot.attr('transform', event.transform.toString())
      })
    svg.call(zoomBehavior)

    const nodes: SimNode[] = graph.nodes.map((n) => ({ ...n }))
    const links: SimLink[] = graph.links.map((l) => ({ ...l }))

    const linkForce = d3
      .forceLink<SimNode, SimLink>(links)
      .id((d) => d.id)
      .distance(90)
      .strength(0.7)

    const simulation = d3
      .forceSimulation(nodes)
      .force('link', linkForce)
      .force('charge', d3.forceManyBody().strength(-260))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collide',
        d3.forceCollide<SimNode>().radius((d) => radiusFor(d) + 10),
      )

    const linkSelection = zoomRoot
      .append('g')
      .attr('class', 'links')
      .attr('stroke', '#3a4353')
      .attr('stroke-width', 1.5)
      .selectAll<SVGLineElement, SimLink>('line')
      .data(links)
      .join('line')

    const nodeSelection = zoomRoot
      .append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, SimNode>('g')
      .data(nodes, (d) => d.id)
      .join('g')
      .attr('class', 'node')
      .call(dragBehavior(simulation))

    nodeSelection
      .append('circle')
      .attr('r', (d) => radiusFor(d))
      .attr('fill', (d) => NODE_COLORS[d.type])
      .attr('stroke', '#0b0e14')
      .attr('stroke-width', 1.5)

    nodeSelection
      .append('text')
      .text((d) => d.label)
      .attr('x', (d) => radiusFor(d) + 5)
      .attr('y', 4)
      .attr('fill', '#e7ecf3')
      .attr('font-size', 11)
      .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
      .style('pointer-events', 'none')
      .style('user-select', 'none')

    nodeSelection.append('title').text((d) => `${d.label}${d.version ? `@${d.version}` : ''} (${d.type})`)

    nodeSelectionRef.current = nodeSelection
    linkSelectionRef.current = linkSelection

    simulation.on('tick', () => {
      linkSelection
        .attr('x1', (d) => (d.source as SimNode).x ?? 0)
        .attr('y1', (d) => (d.source as SimNode).y ?? 0)
        .attr('x2', (d) => (d.target as SimNode).x ?? 0)
        .attr('y2', (d) => (d.target as SimNode).y ?? 0)

      nodeSelection.attr('transform', (d) => `translate(${d.x ?? 0}, ${d.y ?? 0})`)
    })

    const handleResize = () => {
      const w = container.clientWidth || width
      const h = container.clientHeight || height
      svg.attr('viewBox', `0 0 ${w} ${h}`)
      simulation.force('center', d3.forceCenter(w / 2, h / 2))
      simulation.alpha(0.3).restart()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      simulation.stop()
    }
  }, [graph])

  useEffect(() => {
    const nodeSelection = nodeSelectionRef.current
    const linkSelection = linkSelectionRef.current
    if (!nodeSelection || !linkSelection) return

    const term = searchTerm.trim().toLowerCase()
    const matches = (label: string) => label.toLowerCase().includes(term)

    if (!term) {
      nodeSelection.attr('opacity', 1)
      nodeSelection.select('circle').attr('stroke', '#0b0e14')
      linkSelection.attr('opacity', 0.6)
      return
    }

    nodeSelection.attr('opacity', (d) => (matches(d.label) ? 1 : 0.15))
    nodeSelection.select('circle').attr('stroke', (d) => (matches(d.label) ? '#ffffff' : '#0b0e14'))
    linkSelection.attr('opacity', (d) => {
      const source = d.source as SimNode
      const target = d.target as SimNode
      const hit = (source.label && matches(source.label)) || (target.label && matches(target.label))
      return hit ? 0.85 : 0.05
    })
  }, [searchTerm, graph])

  return (
    <div ref={containerRef} className="graph-canvas">
      <svg ref={svgRef} role="img" aria-label="Dependency graph" />
    </div>
  )
}

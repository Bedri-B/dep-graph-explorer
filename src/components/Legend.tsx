import { LEGEND_ORDER, NODE_COLORS, NODE_LABELS } from '../lib/theme'

export function Legend() {
  return (
    <ul className="legend" aria-label="Node color legend">
      {LEGEND_ORDER.map((type) => (
        <li key={type}>
          <span className="legend-swatch" style={{ backgroundColor: NODE_COLORS[type] }} aria-hidden="true" />
          {NODE_LABELS[type]}
        </li>
      ))}
    </ul>
  )
}

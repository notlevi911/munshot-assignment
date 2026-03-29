import { useEffect, useState } from 'react'
import { fetchThemes, type ThemeData } from '../api/client'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
} from 'recharts'

const ASPECTS = ['wheels', 'handle', 'material', 'zipper', 'size', 'durability', 'lock', 'weight'] as const
type Aspect = typeof ASPECTS[number]

const BRAND_COLORS: Record<string, string> = {
  'Safari': '#4f8ef7', 'Skybags': '#a855f7', 'American Tourister': '#22c55e',
  'VIP': '#f97316', 'Aristocrat': '#ef4444', 'Nasher Miles': '#06b6d4',
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map((p: any) => <div key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></div>)}
    </div>
  )
}

function scoreColor(s: number) {
  if (s >= 20) return 'var(--accent-green)'
  if (s >= 0) return 'var(--accent-yellow)'
  return 'var(--accent-red)'
}

export default function ThemesPage() {
  const [themes, setThemes] = useState<ThemeData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAspect, setSelectedAspect] = useState<Aspect>('wheels')

  useEffect(() => {
    fetchThemes().then(d => { setThemes(d); setLoading(false) }).catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return <div className="loading-wrap"><div className="spinner" /></div>
  if (error) return <div className="page-body"><div className="error-box">⚠️ {error}</div></div>

  const radarData = ASPECTS.map(a => {
    const row: Record<string, string | number> = { aspect: a }
    themes.forEach(t => { row[t.brand.split(' ')[0]] = Math.round((t.aspect_scores[a] ?? 0) * 100) })
    return row
  })

  // Per-aspect brand comparison
  const aspectBarData = themes.map(t => ({
    brand: t.brand.split(' ')[0],
    fullBrand: t.brand,
    score: Math.round((t.aspect_scores[selectedAspect] ?? 0) * 100),
  })).sort((a, b) => b.score - a.score)

  // Heatmap data
  const heatmapRows = themes.map(t => ({
    brand: t.brand,
    scores: ASPECTS.reduce((acc, a) => ({ ...acc, [a]: Math.round((t.aspect_scores[a] ?? 0) * 100) }), {} as Record<string, number>),
  }))

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="gradient-text">Sentiment & Themes</h2>
          <p>Aspect-level sentiment breakdown — wheels, handle, material, zipper, size, durability, lock, weight</p>
        </div>
      </div>
      <div className="page-body">
        <div className="grid-2" style={{ marginBottom: 24 }}>
          {/* Radar */}
          <div className="card">
            <div className="card-title">Aspect Sentiment Radar — All Brands</div>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="aspect" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                {themes.map(t => (
                  <Radar key={t.brand} name={t.brand.split(' ')[0]} dataKey={t.brand.split(' ')[0]}
                    stroke={BRAND_COLORS[t.brand]} fill={BRAND_COLORS[t.brand]} fillOpacity={0.1} />
                ))}
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Per-aspect bar chart */}
          <div className="card">
            <div className="card-title">Brand Comparison — Select Aspect</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {ASPECTS.map(a => (
                <button key={a} className={`filter-chip${selectedAspect === a ? ' active' : ''}`}
                  onClick={() => setSelectedAspect(a)} style={{ fontSize: 11, padding: '4px 10px' }}>{a}</button>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={aspectBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" domain={[-100, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis type="category" dataKey="brand" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={55} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="score" name={`${selectedAspect} score`} radius={[0, 4, 4, 0]}>
                  {aspectBarData.map((d, i) => <Cell key={i} fill={BRAND_COLORS[d.fullBrand] ?? '#4f8ef7'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Aspect Heatmap */}
        <div className="section-title">Aspect Heatmap (Score ×100)</div>
        <div className="table-wrap" style={{ marginBottom: 24 }}>
          <table>
            <thead>
              <tr>
                <th>Brand</th>
                {ASPECTS.map(a => <th key={a} style={{ textAlign: 'center' }}>{a}</th>)}
                <th style={{ textAlign: 'center' }}>Overall Avg</th>
              </tr>
            </thead>
            <tbody>
              {heatmapRows.map(row => {
                const avg = Math.round(Object.values(row.scores).reduce((s, v) => s + v, 0) / ASPECTS.length)
                return (
                  <tr key={row.brand}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="brand-avatar" style={{ background: BRAND_COLORS[row.brand], width: 26, height: 26, fontSize: 11 }}>{row.brand[0]}</div>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{row.brand}</span>
                      </div>
                    </td>
                    {ASPECTS.map(a => {
                      const v = row.scores[a]
                      const intensity = Math.abs(v) / 100
                      const bg = v >= 0
                        ? `rgba(34, 197, 94, ${0.08 + intensity * 0.25})`
                        : `rgba(239, 68, 68, ${0.08 + intensity * 0.25})`
                      return (
                        <td key={a} style={{ textAlign: 'center', background: bg }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: scoreColor(v) }}>{v > 0 ? '+' : ''}{v}</span>
                        </td>
                      )
                    })}
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: scoreColor(avg) }}>{avg > 0 ? '+' : ''}{avg}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Aspect Leaders */}
        <div className="section-title">Category Leaders</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {ASPECTS.map(aspect => {
            const best = [...themes].sort((a, b) => (b.aspect_scores[aspect] ?? 0) - (a.aspect_scores[aspect] ?? 0))[0]
            const worst = [...themes].sort((a, b) => (a.aspect_scores[aspect] ?? 0) - (b.aspect_scores[aspect] ?? 0))[0]
            const bestScore = Math.round((best?.aspect_scores[aspect] ?? 0) * 100)
            const worstScore = Math.round((worst?.aspect_scores[aspect] ?? 0) * 100)
            return (
              <div key={aspect} className="card" style={{ padding: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>{aspect}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--accent-green)', fontWeight: 600 }}>BEST</div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{best?.brand.split(' ')[0]}</div>
                    <div style={{ fontSize: 11, color: 'var(--accent-green)' }}>+{bestScore}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: 'var(--accent-red)', fontWeight: 600 }}>WORST</div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{worst?.brand.split(' ')[0]}</div>
                    <div style={{ fontSize: 11, color: 'var(--accent-red)' }}>{worstScore}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

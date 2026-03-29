import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts'
import { fetchBrands, type BrandSummary } from '../api/client'

const BRAND_COLORS: Record<string, string> = {
  'Safari': '#4f8ef7', 'Skybags': '#a855f7', 'American Tourister': '#22c55e',
  'VIP': '#f97316', 'Aristocrat': '#ef4444', 'Nasher Miles': '#06b6d4',
}

const ALL_BRANDS = ['Safari', 'Skybags', 'American Tourister', 'VIP', 'Aristocrat', 'Nasher Miles']
const METRICS = ['avg_price', 'avg_discount_pct', 'avg_rating', 'avg_sentiment', 'review_count']
const METRIC_LABELS: Record<string, string> = {
  avg_price: 'Avg Price (₹)', avg_discount_pct: 'Discount (%)', avg_rating: 'Rating (★)',
  avg_sentiment: 'Sentiment (×100)', review_count: 'Reviews Scraped',
}

function Stars({ r }: { r: number }) {
  return <span className="stars">{'★'.repeat(Math.round(r))}{'☆'.repeat(5 - Math.round(r))} {r.toFixed(1)}</span>
}

type SortKey = 'avg_price' | 'avg_discount_pct' | 'avg_rating' | 'avg_sentiment' | 'review_count'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map((p: any) => <div key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></div>)}
    </div>
  )
}

export default function BrandComparison() {
  const [brands, setBrands] = useState<BrandSummary[]>([])
  const [selected, setSelected] = useState<string[]>(ALL_BRANDS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('avg_rating')
  const [sortAsc, setSortAsc] = useState(false)
  const [activeMetric, setActiveMetric] = useState<SortKey>('avg_price')

  useEffect(() => {
    fetchBrands().then(data => { setBrands(data); setLoading(false) }).catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return <div className="loading-wrap"><div className="spinner" /></div>
  if (error) return <div className="page-body"><div className="error-box">⚠️ {error}</div></div>

  const filtered = brands
    .filter(b => selected.includes(b.brand))
    .sort((a, b) => {
      const av = activeMetric === 'avg_sentiment' ? a.avg_sentiment * 100 : a[activeMetric as keyof BrandSummary] as number
      const bv = activeMetric === 'avg_sentiment' ? b.avg_sentiment * 100 : b[activeMetric as keyof BrandSummary] as number
      return sortAsc ? av - bv : bv - av
    })

  const chartData = filtered.map(b => ({
    brand: b.brand.split(' ')[0],
    fullBrand: b.brand,
    avg_price: Math.round(b.avg_price),
    avg_discount_pct: b.avg_discount_pct,
    avg_rating: +b.avg_rating.toFixed(2),
    avg_sentiment: +(b.avg_sentiment * 100).toFixed(1),
    review_count: b.review_count,
    positive_pct: b.positive_pct,
    negative_pct: b.negative_pct,
  }))

  const radarData = ['wheels', 'handle', 'material', 'zipper', 'size', 'durability', 'lock', 'weight'].map(a => {
    const row: Record<string, string | number> = { aspect: a }
    filtered.forEach(b => { row[b.brand.split(' ')[0]] = Math.round((b.aspect_scores[a as keyof typeof b.aspect_scores] ?? 0) * 100) })
    return row
  })

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(false) }
  }

  const renderBar = (key: SortKey) => {
    const vals = chartData.map(d => ({ brand: d.brand, value: d[key] as number }))
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={vals}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="brand" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
          <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" name={METRIC_LABELS[key]} radius={[4, 4, 0, 0]}>
            {vals.map((entry, i) => {
              const fullName = filtered[i]?.brand ?? ''
              return <rect key={fullName} fill={BRAND_COLORS[fullName] ?? '#4f8ef7'} />
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="gradient-text">Brand Comparison</h2>
          <p>Side-by-side competitive benchmarking across all key metrics</p>
        </div>
      </div>
      <div className="page-body">
        {/* Brand filter chips */}
        <div className="filter-bar">
          <span className="filter-label">Brands</span>
          {ALL_BRANDS.map(b => (
            <button key={b} className={`filter-chip${selected.includes(b) ? ' active' : ''}`}
              style={selected.includes(b) ? { background: BRAND_COLORS[b], borderColor: BRAND_COLORS[b] } : {}}
              onClick={() => setSelected(s => s.includes(b) ? s.filter(x => x !== b) : [...s, b])}>
              {b.split(' ')[0]}
            </button>
          ))}
          <button className="filter-chip" onClick={() => setSelected(ALL_BRANDS)}>All</button>
          <button className="filter-chip" onClick={() => setSelected([])}>None</button>
        </div>

        {/* Metric bar chart */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {(METRICS as SortKey[]).map(m => (
              <button key={m} className={`tab-btn${activeMetric === m ? ' active' : ''}`}
                onClick={() => setActiveMetric(m)}>{METRIC_LABELS[m]}</button>
            ))}
          </div>
          <div className="card-title">{METRIC_LABELS[activeMetric]}</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData.map(d => ({ brand: d.brand, value: d[activeMetric] }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="brand" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name={METRIC_LABELS[activeMetric]} radius={[4, 4, 0, 0]} fill="#4f8ef7" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar */}
        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div className="card">
            <div className="card-title">Aspect Sentiment Radar (×100)</div>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="aspect" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                {filtered.map(b => (
                  <Radar key={b.brand} name={b.brand.split(' ')[0]} dataKey={b.brand.split(' ')[0]}
                    stroke={BRAND_COLORS[b.brand]} fill={BRAND_COLORS[b.brand]} fillOpacity={0.1} />
                ))}
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <div className="card-title">Positive vs Negative Sentiment %</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                <YAxis type="category" dataKey="brand" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="positive_pct" name="Positive %" fill="#22c55e" radius={[0, 4, 4, 0]} />
                <Bar dataKey="negative_pct" name="Negative %" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Comparison table */}
        <div className="section-title">Sortable Comparison Table</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Brand</th>
                <th onClick={() => handleSort('avg_price')} style={{ color: sortKey === 'avg_price' ? 'var(--accent-blue)' : undefined }}>
                  Avg Price {sortKey === 'avg_price' ? (sortAsc ? '↑' : '↓') : '⇅'}
                </th>
                <th onClick={() => handleSort('avg_discount_pct')} style={{ color: sortKey === 'avg_discount_pct' ? 'var(--accent-blue)' : undefined }}>
                  Discount {sortKey === 'avg_discount_pct' ? (sortAsc ? '↑' : '↓') : '⇅'}
                </th>
                <th onClick={() => handleSort('avg_rating')} style={{ color: sortKey === 'avg_rating' ? 'var(--accent-blue)' : undefined }}>
                  Rating {sortKey === 'avg_rating' ? (sortAsc ? '↑' : '↓') : '⇅'}
                </th>
                <th onClick={() => handleSort('avg_sentiment')} style={{ color: sortKey === 'avg_sentiment' ? 'var(--accent-blue)' : undefined }}>
                  Sentiment {sortKey === 'avg_sentiment' ? (sortAsc ? '↑' : '↓') : '⇅'}
                </th>
                <th>Reviews</th>
                <th>Top Pros</th>
                <th>Top Cons</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.brand}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="brand-avatar" style={{ background: BRAND_COLORS[b.brand], width: 28, height: 28, fontSize: 11 }}>{b.brand[0]}</div>
                      <span style={{ fontWeight: 600 }}>{b.brand}</span>
                    </div>
                  </td>
                  <td><span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>₹{Math.round(b.avg_price).toLocaleString()}</span></td>
                  <td><span className="badge badge-orange">{b.avg_discount_pct}% off</span></td>
                  <td><Stars r={b.avg_rating} /></td>
                  <td>
                    <span style={{ color: b.avg_sentiment > 0.2 ? 'var(--accent-green)' : b.avg_sentiment > 0 ? 'var(--accent-yellow)' : 'var(--accent-red)', fontWeight: 700 }}>
                      {(b.avg_sentiment * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td>{b.review_count.toLocaleString()}</td>
                  <td>{b.top_themes_positive.slice(0, 2).map(t => <span key={t} className="pill pos">{t}</span>)}</td>
                  <td>{b.top_themes_negative.slice(0, 2).map(t => <span key={t} className="pill neg">{t}</span>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

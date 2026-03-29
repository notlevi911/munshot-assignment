import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ScatterChart, Scatter,
  ZAxis, Legend,
} from 'recharts'
import { fetchOverview, fetchBrands, type Overview, type BrandSummary } from '../api/client'

const BRAND_COLORS: Record<string, string> = {
  'Safari': '#4f8ef7',
  'Skybags': '#a855f7',
  'American Tourister': '#22c55e',
  'VIP': '#f97316',
  'Aristocrat': '#ef4444',
  'Nasher Miles': '#06b6d4',
}

function sentimentLabel(s: number) {
  if (s >= 0.3) return { label: 'Positive', cls: 'aspect-positive' }
  if (s >= -0.1) return { label: 'Neutral', cls: 'aspect-neutral' }
  return { label: 'Negative', cls: 'aspect-negative' }
}

function StarRating({ rating }: { rating: number }) {
  return <span className="stars">{'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))} <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{rating.toFixed(1)}</span></span>
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></div>
      ))}
    </div>
  )
}

function ScrapingWidget() {
  const [status, setStatus] = useState<'idle' | 'running'>('idle')
  const [logs, setLogs] = useState('')
  const [open, setOpen] = useState(false)
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    let timer: any;
    if (status === 'running') {
      timer = setInterval(() => setSeconds(s => s + 1), 1000)
    }
    return () => clearInterval(timer)
  }, [status])

  useEffect(() => {
    let interval: any;
    if (status === 'running') {
      interval = setInterval(async () => {
        try {
          const res = await fetch('http://localhost:8000/api/scrape/status').then(r => r.json())
          setStatus(res.status)
          setLogs(res.logs)
          if (res.status === 'idle' && status === 'running') {
             // reload page when done
             window.location.reload()
          }
        } catch { }
      }, 2000)
    }
    return () => clearInterval(interval)
  }, [status])

  const trigger = async () => {
    try {
      await fetch('http://localhost:8000/api/scrape', { method: 'POST' })
      setStatus('running')
      setSeconds(0)
      setOpen(true)
    } catch {
      alert("Failed to start scraping. Is the backend running?")
    }
  }

  return (
    <div style={{ position: 'relative', zIndex: 50 }}>
      {status === 'running' ? (
        <button onClick={() => setOpen(!open)} style={{ background: 'rgba(255,165,0,0.1)', color: 'orange', border: '1px solid orange', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
          ⏳ Scraping... ({seconds}s)
        </button>
      ) : (
        <button onClick={trigger} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
          ↻ Sync Data
        </button>
      )}
      
      {open && status === 'running' && (
        <div style={{ position: 'absolute', right: 0, top: 40, width: 340, background: '#111', border: '1px solid #333', borderRadius: 6, padding: 12, fontSize: 11, fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: 240, overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', color: '#ccc' }}>
          <div style={{ paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid #333', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
            <span>Terminal Output</span>
            <span style={{ cursor: 'pointer', color: '#666' }} onClick={() => setOpen(false)}>✖</span>
          </div>
          {logs || 'Starting scraper process...'}
        </div>
      )}
    </div>
  )
}

export default function OverviewPage() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [brands, setBrands] = useState<BrandSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchOverview(), fetchBrands()])
      .then(([ov, br]) => { setOverview(ov); setBrands(br) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-wrap"><div className="spinner" /><span style={{ color: 'var(--text-muted)' }}>Loading dashboard…</span></div>
  if (error) return <div className="page-body"><div className="error-box">⚠️ {error}<br /><small>Make sure the backend is running: <code>uvicorn main:app --reload</code></small></div></div>
  if (!overview) return null

  const priceData = brands.map(b => ({ brand: b.brand.split(' ')[0], avg_price: Math.round(b.avg_price), avg_mrp: Math.round(b.avg_mrp) }))
  const discountData = brands.map(b => ({ brand: b.brand.split(' ')[0], discount: b.avg_discount_pct })).sort((a, b) => b.discount - a.discount)
  const sentimentData = brands.map(b => ({ brand: b.brand.split(' ')[0], sentiment: +(b.avg_sentiment * 100).toFixed(1) }))
  const scatterData = brands.map(b => ({ x: Math.round(b.avg_price), y: +b.avg_sentiment.toFixed(3), z: b.total_platform_reviews, brand: b.brand }))
  const radarData = ['wheels', 'handle', 'material', 'zipper', 'size', 'durability'].map(aspect => {
    const row: Record<string, string | number> = { aspect }
    brands.forEach(b => { row[b.brand.split(' ')[0]] = Math.round((b.aspect_scores[aspect as keyof typeof b.aspect_scores] ?? 0) * 100) })
    return row
  })

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="gradient-text">Dashboard Overview</h2>
          <p>Amazon India luggage market intelligence — 6 brands tracked</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="badge badge-green">● Live Data</span>
          <ScrapingWidget />
        </div>
      </div>
      <div className="page-body">
        {/* KPIs */}
        <div className="kpi-grid">
          <div className="kpi-card blue">
            <div className="kpi-icon blue">🏷️</div>
            <div className="kpi-value">{overview.total_brands}</div>
            <div className="kpi-label">Brands Tracked</div>
          </div>
          <div className="kpi-card green">
            <div className="kpi-icon green">📦</div>
            <div className="kpi-value">{overview.total_products}</div>
            <div className="kpi-label">Products Analyzed</div>
          </div>
          <div className="kpi-card orange">
            <div className="kpi-icon orange">💬</div>
            <div className="kpi-value">{overview.total_reviews_scraped.toLocaleString()}</div>
            <div className="kpi-label">Reviews Scraped</div>
          </div>
          <div className="kpi-card blue">
            <div className="kpi-icon purple">⭐</div>
            <div className="kpi-value">{overview.total_reviews_on_platform.toLocaleString()}</div>
            <div className="kpi-label">Platform Reviews</div>
          </div>
          <div className="kpi-card green">
            <div className="kpi-icon green">😊</div>
            <div className="kpi-value">{(overview.avg_sentiment * 100).toFixed(0)}%</div>
            <div className="kpi-label">Avg Sentiment Score</div>
          </div>
          <div className="kpi-card orange">
            <div className="kpi-icon orange">💰</div>
            <div className="kpi-value">₹{Math.round(overview.avg_price).toLocaleString()}</div>
            <div className="kpi-label">Avg Selling Price</div>
          </div>
          <div className="kpi-card red">
            <div className="kpi-icon orange">🏷</div>
            <div className="kpi-value">{overview.avg_discount_pct}%</div>
            <div className="kpi-label">Avg Discount</div>
          </div>
          <div className="kpi-card blue">
            <div className="kpi-icon blue">⭑</div>
            <div className="kpi-value">{overview.avg_rating.toFixed(1)}</div>
            <div className="kpi-label">Avg Rating</div>
          </div>
        </div>

        {/* Brand scorecards */}
        <div className="section-title">Brand Snapshot</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 28 }}>
          {brands.map(b => {
            const { label } = sentimentLabel(b.avg_sentiment)
            const color = BRAND_COLORS[b.brand] ?? '#4f8ef7'
            return (
              <div key={b.brand} className="card" style={{ borderTop: `2px solid ${color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div className="brand-avatar" style={{ background: color }}>{b.brand[0]}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{b.brand}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{b.market_position ?? 'mid'}</div>
                  </div>
                  <div style={{ marginLeft: 'auto' }}><span className={`badge ${b.avg_sentiment > 0.2 ? 'badge-green' : b.avg_sentiment > 0 ? 'badge-orange' : 'badge-red'}`}>{label}</span></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                  <div><div style={{ color: 'var(--text-muted)', fontSize: 10 }}>AVG PRICE</div><div style={{ fontWeight: 700 }}>₹{Math.round(b.avg_price).toLocaleString()}</div></div>
                  <div><div style={{ color: 'var(--text-muted)', fontSize: 10 }}>DISCOUNT</div><div style={{ fontWeight: 700, color: 'var(--accent-orange)' }}>{b.avg_discount_pct}%</div></div>
                  <div><div style={{ color: 'var(--text-muted)', fontSize: 10 }}>RATING</div><div style={{ fontWeight: 700 }}><StarRating rating={b.avg_rating} /></div></div>
                  <div><div style={{ color: 'var(--text-muted)', fontSize: 10 }}>SENTIMENT</div><div style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{(b.avg_sentiment * 100).toFixed(0)}%</div></div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <div className="sentiment-bar">
                    <div className="pos" style={{ flex: b.positive_pct }} />
                    <div className="neu" style={{ flex: 100 - b.positive_pct - b.negative_pct }} />
                    <div className="neg" style={{ flex: b.negative_pct }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                    <span>+{b.positive_pct}%</span><span>-{b.negative_pct}%</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Charts row 1 */}
        <div className="grid-2" style={{ marginBottom: 24 }}>
          <div className="card">
            <div className="card-title">Average Price vs MRP by Brand</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={priceData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="brand" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
                <Bar dataKey="avg_price" name="Avg Price" fill="#4f8ef7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avg_mrp" name="Avg MRP" fill="rgba(79,142,247,0.3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <div className="card-title">Average Discount % by Brand</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={discountData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="brand" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="discount" name="Discount %" fill="#f97316" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts row 2 */}
        <div className="grid-2" style={{ marginBottom: 24 }}>
          <div className="card">
            <div className="card-title">Sentiment Score by Brand (×100)</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={sentimentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="brand" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="sentiment" name="Sentiment" fill="#22c55e" radius={[4, 4, 0, 0]}
                  label={{ position: 'top', fill: 'var(--text-secondary)', fontSize: 10 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <div className="card-title">Price vs Sentiment (bubble = review volume)</div>
            <ResponsiveContainer width="100%" height={240}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="x" name="Price" type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                <YAxis dataKey="y" name="Sentiment" type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <ZAxis dataKey="z" range={[60, 400]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload
                  return (
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
                      <div style={{ fontWeight: 700 }}>{d.brand}</div>
                      <div>Price: ₹{d.x}</div>
                      <div>Sentiment: {d.y}</div>
                      <div>Reviews: {d.z.toLocaleString()}</div>
                    </div>
                  )
                }} />
                <Scatter data={scatterData} fill="#a855f7" opacity={0.85} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radar */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-title">Aspect Sentiment Radar — All Brands (×100)</div>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="aspect" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              {brands.map(b => (
                <Radar key={b.brand} name={b.brand.split(' ')[0]} dataKey={b.brand.split(' ')[0]}
                  stroke={BRAND_COLORS[b.brand]} fill={BRAND_COLORS[b.brand]} fillOpacity={0.08} />
              ))}
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  )
}

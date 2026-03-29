import { useEffect, useState } from 'react'
import { fetchProducts, fetchProduct, type Product, type ProductDetail } from '../api/client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { ArrowLeft, ExternalLink } from 'lucide-react'

const BRAND_COLORS: Record<string, string> = {
  'Safari': '#4f8ef7', 'Skybags': '#a855f7', 'American Tourister': '#22c55e',
  'VIP': '#f97316', 'Aristocrat': '#ef4444', 'Nasher Miles': '#06b6d4',
}

const ASPECTS = ['wheels', 'handle', 'material', 'zipper', 'size', 'durability', 'lock', 'weight'] as const

function Stars({ r }: { r: number }) {
  return <span className="stars">{'★'.repeat(Math.round(r))}{'☆'.repeat(5 - Math.round(r))} {r.toFixed(1)}</span>
}

const PIE_COLORS = ['#22c55e', '#eab308', '#ef4444']

function ProductDrilldown({ asin, onBack }: { asin: string; onBack: () => void }) {
  const [detail, setDetail] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchProduct(asin).then(d => { setDetail(d); setLoading(false) })
  }, [asin])

  if (loading) return <div className="loading-wrap"><div className="spinner" /></div>
  if (!detail) return null

  const pieData = [
    { name: 'Positive', value: detail.sentiment_distribution.positive },
    { name: 'Neutral', value: detail.sentiment_distribution.neutral },
    { name: 'Negative', value: detail.sentiment_distribution.negative },
  ]

  const aspectData = ASPECTS.map(a => {
    const s = detail.aspect_scores[a]
    return {
      aspect: a,
      score: s != null ? Math.round(s * 100) : null,
    }
  }).filter(a => a.score !== null)

  return (
    <>
      <div className="page-header">
        <div>
          <button className="btn-back" onClick={onBack}><ArrowLeft size={14} /> Back to Products</button>
          <h2 style={{ marginTop: 8 }} className="gradient-text">Product Drilldown</h2>
          <p style={{ maxWidth: 600 }}>{detail.title}</p>
        </div>
      </div>
      <div className="page-body">
        <div className="grid-2" style={{ marginBottom: 20 }}>
          {/* Product basics */}
          <div className="card">
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ width: 80, height: 80, background: 'var(--bg-secondary)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0 }}>🧳</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: BRAND_COLORS[detail.brand] ?? 'var(--accent-blue)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{detail.brand}</div>
                <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.4, marginBottom: 8 }}>{detail.title}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <span className="badge badge-blue">{detail.category}</span>
                  <span className="badge badge-purple">{detail.material}</span>
                  <span className="badge badge-blue">{detail.color}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 16 }}>
              <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-green)' }}>₹{detail.price.toLocaleString()}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>SELLING PRICE</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-orange)' }}>{detail.discount_pct}%</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>DISCOUNT</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{detail.rating}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>RATING ★</div>
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <a href={detail.url || `https://www.amazon.in/dp/${detail.asin}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--accent-blue)', textDecoration: 'none' }}>
                View on Amazon <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* Sentiment distribution */}
          <div className="card">
            <div className="card-title">Sentiment Distribution</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: detail.avg_sentiment > 0.2 ? 'var(--accent-green)' : 'var(--accent-orange)' }}>
                Sentiment Score: {(detail.avg_sentiment * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Aspect sentiment */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">Aspect-Level Sentiment (×100)</div>
          {aspectData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(120, aspectData.length * 40)}>
              <BarChart data={aspectData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" domain={[-100, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `${v}`} />
                <YAxis type="category" dataKey="aspect" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={70} />
                <Tooltip />
                <Bar dataKey="score" name="Score" radius={[0, 4, 4, 0]}>
                  {aspectData.map((a, i) => <Cell key={i} fill={a.score! >= 0 ? '#22c55e' : '#ef4444'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>
              No feature-specific sentiment detected in reviews.
            </div>
          )}
        </div>

        <div className="grid-2" style={{ marginBottom: 20 }}>
          {/* Themes */}
          <div className="card">
            <div className="card-title">Top Positive Themes</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {detail.top_themes_positive.map(t => <span key={t} className="pill pos">✓ {t}</span>)}
              {detail.top_themes_positive.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No strong positive themes</span>}
            </div>
          </div>
          <div className="card">
            <div className="card-title">Top Complaint Themes</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {detail.top_themes_negative.map(t => <span key={t} className="pill neg">✗ {t}</span>)}
              {detail.top_themes_negative.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No major complaints</span>}
            </div>
          </div>
        </div>

        {/* Top reviews */}
        <div className="section-title">Top Reviews</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {detail.top_reviews.map(r => (
            <div key={r.review_id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Stars r={r.rating} />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className={`badge ${r.sentiment === 'positive' ? 'badge-green' : r.sentiment === 'negative' ? 'badge-red' : 'badge-orange'}`}>{r.sentiment}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.review_date}</span>
                </div>
              </div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{r.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{r.body}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAsin, setSelectedAsin] = useState<string | null>(null)

  // Filters
  const [brand, setBrand] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minRating, setMinRating] = useState('')
  const [category, setCategory] = useState('')
  const [sortBy, setSortBy] = useState('rating')
  const [sortOrder, setSortOrder] = useState('desc')

  const ALL_BRANDS = ['Safari', 'Skybags', 'American Tourister', 'VIP', 'Aristocrat', 'Nasher Miles']
  const CATEGORIES = ['Cabin', 'Medium', 'Large', 'Set of 2', 'Set of 3', 'Backpack']

  useEffect(() => {
    setLoading(true)
    const params: Record<string, string | number | undefined> = {}
    if (brand) params.brand = brand
    if (minPrice) params.min_price = parseFloat(minPrice)
    if (maxPrice) params.max_price = parseFloat(maxPrice)
    if (minRating) params.min_rating = parseFloat(minRating)
    if (category) params.category = category
    params.sort_by = sortBy
    params.sort_order = sortOrder
    fetchProducts(params).then(d => { setProducts(d); setLoading(false) }).catch(e => { setError(e.message); setLoading(false) })
  }, [brand, minPrice, maxPrice, minRating, category, sortBy, sortOrder])

  if (selectedAsin) return <ProductDrilldown asin={selectedAsin} onBack={() => setSelectedAsin(null)} />

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="gradient-text">Products</h2>
          <p>Browse and filter all {products.length} products across 6 brands</p>
        </div>
      </div>
      <div className="page-body">
        <div className="filter-bar">
          <span className="filter-label">Filters</span>
          <select className="filter-select" value={brand} onChange={e => setBrand(e.target.value)}>
            <option value="">All Brands</option>
            {ALL_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select className="filter-select" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="filter-input" placeholder="Min Price (₹)" value={minPrice} onChange={e => setMinPrice(e.target.value)} style={{ width: 110 }} />
          <input className="filter-input" placeholder="Max Price (₹)" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} style={{ width: 110 }} />
          <select className="filter-select" value={minRating} onChange={e => setMinRating(e.target.value)}>
            <option value="">Min Rating</option>
            {[3, 3.5, 4, 4.5].map(r => <option key={r} value={r}>≥ {r}★</option>)}
          </select>
          <select className="filter-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="rating">Sort: Rating</option>
            <option value="price">Sort: Price</option>
            <option value="discount_pct">Sort: Discount</option>
            <option value="review_count">Sort: Reviews</option>
          </select>
          <select className="filter-select" value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
            <option value="desc">↓ Desc</option>
            <option value="asc">↑ Asc</option>
          </select>
        </div>

        {loading ? (
          <div className="loading-wrap"><div className="spinner" /></div>
        ) : error ? (
          <div className="error-box">⚠️ {error}</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Brand</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>MRP</th>
                  <th>Discount</th>
                  <th>Rating</th>
                  <th>Reviews</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.asin} onClick={() => setSelectedAsin(p.asin)}>
                    <td style={{ maxWidth: 260 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>{p.title}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{p.asin} · {p.material} · {p.color}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="brand-avatar" style={{ background: BRAND_COLORS[p.brand], width: 22, height: 22, fontSize: 10 }}>{p.brand[0]}</div>
                        <span style={{ fontSize: 12 }}>{p.brand}</span>
                      </div>
                    </td>
                    <td><span className="badge badge-blue">{p.category}</span></td>
                    <td><span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>₹{p.price.toLocaleString()}</span></td>
                    <td><span style={{ color: 'var(--text-muted)', fontSize: 12, textDecoration: 'line-through' }}>₹{p.mrp.toLocaleString()}</span></td>
                    <td><span className="badge badge-orange">{p.discount_pct}%</span></td>
                    <td><Stars r={p.rating} /></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{p.review_count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

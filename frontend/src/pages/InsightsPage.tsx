import { useEffect, useState } from 'react'
import { fetchInsights, type Insight } from '../api/client'
import { AlertTriangle, TrendingUp, Info, CheckCircle, Zap } from 'lucide-react'

const TYPE_CONFIG = {
  warning: { icon: AlertTriangle, color: 'var(--accent-orange)', badge: 'badge-orange', label: '⚠ Watch Out' },
  alert: { icon: AlertTriangle, color: 'var(--accent-red)', badge: 'badge-red', label: '🚨 Alert' },
  insight: { icon: Info, color: 'var(--accent-blue)', badge: 'badge-blue', label: '💡 Insight' },
  positive: { icon: CheckCircle, color: 'var(--accent-green)', badge: 'badge-green', label: '✓ Winner' },
}

const BRAND_COLORS: Record<string, string> = {
  'Safari': '#4f8ef7', 'Skybags': '#a855f7', 'American Tourister': '#22c55e',
  'VIP': '#f97316', 'Aristocrat': '#ef4444', 'Nasher Miles': '#06b6d4',
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchInsights().then(d => { setInsights(d); setLoading(false) }).catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return <div className="loading-wrap"><div className="spinner" /></div>
  if (error) return <div className="page-body"><div className="error-box">⚠️ {error}</div></div>

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="gradient-text">Agent Insights</h2>
          <p>AI-generated non-obvious conclusions from the competitive intelligence data</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--accent-purple)' }}>
          <Zap size={16} />
          <span>{insights.length} insights generated</span>
        </div>
      </div>
      <div className="page-body">
        <div style={{ background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 24, fontSize: 13, color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>🤖 How these are generated:</strong> The Agent Insights engine analyzes brand sentiment, pricing, discount patterns, aspect scores, and review distribution to surface non-obvious competitive signals — going beyond rating comparisons to explain <em>why</em> brands win or lose.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {insights.map(insight => {
            const cfg = TYPE_CONFIG[insight.type]
            return (
              <div key={insight.id} className={`insight-card ${insight.type}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-muted)', width: 28 }}>#{insight.id}</span>
                    <div className="insight-title" style={{ margin: 0 }}>{insight.title}</div>
                  </div>
                  <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
                </div>
                <p className="insight-body">{insight.body}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12, alignItems: 'center' }}>
                  <div className="insight-metric" style={{ margin: 0 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{insight.metric.label}:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{insight.metric.value}</strong>
                  </div>
                  {insight.brands_involved.map(b => (
                    <div key={b} className="insight-metric" style={{ margin: 0 }}>
                      <div className="brand-avatar" style={{ background: BRAND_COLORS[b] ?? 'var(--accent-blue)', width: 18, height: 18, fontSize: 9, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>{b[0]}</div>
                      <span style={{ color: BRAND_COLORS[b] ?? 'var(--accent-blue)', fontWeight: 600 }}>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary table */}
        <div className="section-title" style={{ marginTop: 32 }}>Insight Summary Matrix</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Finding</th>
                <th>Type</th>
                <th>Brands</th>
                <th>Key Metric</th>
              </tr>
            </thead>
            <tbody>
              {insights.map(i => (
                <tr key={i.id}>
                  <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>#{i.id}</td>
                  <td style={{ fontWeight: 600 }}>{i.title}</td>
                  <td><span className={`badge ${TYPE_CONFIG[i.type].badge}`}>{i.type}</span></td>
                  <td>{i.brands_involved.map(b => <span key={b} style={{ marginRight: 4, fontSize: 12, color: BRAND_COLORS[b] ?? 'var(--text-secondary)', fontWeight: 600 }}>{b}</span>)}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{i.metric.label}: <strong style={{ color: 'var(--text-primary)' }}>{i.metric.value}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

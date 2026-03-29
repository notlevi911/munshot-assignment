import { } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, BarChart3, ShoppingBag, Lightbulb, Layers, Download } from 'lucide-react'
import Overview from './pages/Overview.tsx'
import BrandComparison from './pages/BrandComparison.tsx'
import Products from './pages/Products.tsx'
import InsightsPage from './pages/InsightsPage.tsx'
import ThemesPage from './pages/ThemesPage.tsx'
import './index.css'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },
  { to: '/compare', icon: BarChart3, label: 'Brand Comparison' },
  { to: '/products', icon: ShoppingBag, label: 'Products' },
  { to: '/themes', icon: Layers, label: 'Sentiment & Themes' },
  { to: '/insights', icon: Lightbulb, label: 'Agent Insights' },
]

function Sidebar() {
  useLocation()
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>🧳 Luggage IQ</h1>
        <p>Amazon India Intelligence</p>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-section-label">Dashboard</div>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
        <div className="nav-section-label" style={{ marginTop: 16 }}>Data</div>
        <a className="nav-item" href="http://localhost:8000/api/dataset" download>
          <Download />
          <span>Download CSV</span>
        </a>
        <a className="nav-item" href="http://localhost:8000/docs" target="_blank" rel="noreferrer">
          <Layers />
          <span>API Docs</span>
        </a>
      </nav>
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
        <div>6 Brands · 72 Products</div>
        <div>Amazon India · 2024–2026</div>
      </div>
    </aside>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/compare" element={<BrandComparison />} />
            <Route path="/products" element={<Products />} />
            <Route path="/themes" element={<ThemesPage />} />
            <Route path="/insights" element={<InsightsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

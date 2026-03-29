# 🧳 Luggage IQ — Amazon India Brand Intelligence Dashboard

A full-stack competitive intelligence dashboard for luggage brands on Amazon India. Built with **FastAPI** (backend) and **React + TypeScript + Vite** (frontend).

---

## 📦 Project Structure

```
munshot/
├── backend/
│   ├── main.py               ← FastAPI application (9 API endpoints)
│   ├── analyzer.py           ← Sentiment analysis, theme extraction, agent insights
│   ├── requirements.txt
│   ├── scripts/
│   │   └── generate_dataset.py   ← Dataset generator (72 products, 1033 reviews)
│   └── data/
│       ├── products.csv      ← 72 products across 6 brands
│       ├── reviews.csv       ← 1033 reviews with sentiment + aspect scores
│       └── brand_summary.json
└── frontend/
    ├── src/
    │   ├── api/client.ts     ← Typed Axios API client
    │   ├── pages/
    │   │   ├── Overview.tsx        ← KPIs, brand snapshots, 5 charts
    │   │   ├── BrandComparison.tsx ← Sortable table, radar, bar charts
    │   │   ├── Products.tsx        ← Filter + product drilldown
    │   │   ├── ThemesPage.tsx      ← Aspect heatmap, radar, leaders
    │   │   └── InsightsPage.tsx    ← 6 AI-generated insights
    │   ├── App.tsx
    │   └── index.css
    └── index.html
```

---

## 🚀 Quick Start

### 1. Backend (FastAPI) with venv

```bash
cd backend

### 1a. Environment Variables

Before running, create a `.env` file in the `backend/` directory with the following keys for the scraper and AI to work:

```env
AMAZON_EMAIL=your_amazon_email@example.com
AMAZON_PASSWORD=your_amazon_password
GEMINI_API_KEY=your_gemini_api_key  # Get a free key at aistudio.google.com
```

### 1b. Installation & Run

# Activate the virtual environment
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies (already done if venv exists)
pip install -r requirements.txt

# ── Option A: Use synthetic dataset (instant, always works) ──
python scripts/generate_dataset.py

# ── Option B: Run the real Amazon India scraper ──────────────
# This opens a Chromium browser and pauses for manual login.
# Log into your Amazon account, then press ENTER in the terminal.
python scraper.py --brands "Safari,Skybags,American Tourister,VIP" --products 10 --reviews 50

# Start the API server
python -m uvicorn main:app --reload --port 8000
```

API: **http://localhost:8000** | Docs: **http://localhost:8000/docs**

### 2. Frontend (React + TypeScript)

```bash
cd frontend
npm install
npm run dev
```

Dashboard: **http://localhost:5173**

---

## 📊 Dashboard Views

| Page | What You See |
|------|-------------|
| **Overview** | 8 KPI cards, brand snapshots with sentiment bars, 5 charts (price, discount, sentiment, price-vs-sentiment scatter, aspect radar) |
| **Brand Comparison** | Toggleable brand filter, 5-metric bar chart switcher, aspect radar, sentiment stacked bar, sortable table with pros/cons |
| **Products** | 7 filter controls (brand, category, price range, rating, sort), product table, full product drilldown on click |
| **Sentiment & Themes** | Aspect radar, per-aspect brand bar chart (8 aspect selector), color-coded heatmap, category leaders grid |
| **Agent Insights** | 6 AI-generated non-obvious insights with type badges, metric callouts, and summary matrix |

---

## 🏷️ Brands Covered

| Brand | Position | Avg Price | Focus |
|-------|----------|-----------|-------|
| Safari | Mid-Premium | ₹3,500–5,500 | Durability, wheels |
| Skybags | Value | ₹2,200–4,000 | Design, color variety |
| American Tourister | Premium | ₹5,000–8,000 | Material quality, brand trust |
| VIP | Mid | ₹2,800–4,800 | Value for money |
| Aristocrat | Budget | ₹1,500–2,800 | Affordability |
| Nasher Miles | Mid-Premium | ₹3,000–6,000 | Wheels, modern design |

---

## 🔌 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/overview` | Dashboard KPIs |
| `GET /api/brands` | All brands with full stats |
| `GET /api/brand/{name}` | Single brand detail |
| `GET /api/products` | Products with filters |
| `GET /api/product/{asin}` | Product drilldown |
| `GET /api/compare?brands=a,b` | Side-by-side comparison |
| `GET /api/insights` | 6 agent-generated insights |
| `GET /api/themes` | Aspect sentiment per brand |
| `GET /api/dataset` | Download products.csv |

---

## 🧠 Methodology

### Sentiment Analysis
- **Method**: Compound sentiment scoring (VADER-style scale: -1.0 to +1.0)
- **Granularity**: Per-review scoring → aggregated to product and brand level
- **Aspect sentiment**: 8 dimensions — wheels, handle, material, zipper, size, durability, lock, weight

### Data Collection
- **Dataset**: Synthetically generated with realistic brand-specific profiles, price distributions, review language, and aspect scoring profiles
- This avoids Amazon's bot-detection blocks while providing high-quality structured data perfect for analysis
- A real Playwright scraper (`scraper.py`) is included as an optional module for live scraping

### Agent Insights Engine
The `get_insights()` function in `analyzer.py` generates 6 non-obvious conclusions:
1. **Discount trap detection** — High discounts vs. low sentiment
2. **Rating vs. sentiment divergence** — When stars and text disagree
3. **Durability anomaly** — Hidden complaints behind high ratings
4. **Value-for-money winner** — Sentiment ÷ price-band ratio
5. **Premium justification test** — Is the price premium earned?
6. **Wheel quality battleground** — Key differentiating aspect

---

## 📁 Dataset

Files included in `backend/data/`:

| File | Contents |
|------|----------|
| `products.csv` | 72 rows: ASIN, brand, title, category, price, MRP, discount, rating, review count, material, color |
| `reviews.csv` | 1033 rows: review text, rating, sentiment, compound score, 8 aspect scores, date, verified |
| `brand_summary.json` | Pre-aggregated brand stats for fast loading |

---

## ⚙️ Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Python 3.12, FastAPI, Pandas |
| Frontend | React 18, TypeScript, Vite |
| Charts | Recharts (BarChart, RadarChart, ScatterChart, PieChart) |
| Styling | Vanilla CSS — dark mode, glassmorphism |
| Fonts | Inter (Google Fonts) |
| Icons | Lucide React |

---

## ⚠️ Limitations & Notes

- Dataset is synthetically generated with realistic brands/pricing/language profiles. Live Amazon scraping requires additional anti-bot handling.
- Sentiment scoring in the engine uses a custom compound-score model; VADER/TextBlob can be integrated by replacing the `compound_score` field in `reviews.csv`.
- Review counts shown are representative Amazon-scale estimates, not scraped values.

---

## 🔮 Future Improvements

- Live scraping with Playwright + proxy rotation
- LLM-based review summarization (GPT / Gemini)
- Time-series trend charts (sentiment over months)
- User-uploadable CSV for custom analysis
- Export dashboard as PDF report

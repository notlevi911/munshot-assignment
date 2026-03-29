# 🧳 Luggage IQ: Amazon Competitive Intelligence Dashboard

Luggage IQ is a state-of-the-art competitive intelligence dashboard engineered to track, analyze, and extract insights from the top luggage brands selling on Amazon India. 

Powered by autonomous **Playwright browser automation**, **VADER Sentiment Analysis**, and the cutting-edge **Google Gemini 2.5 Flash AI**, this platform transforms raw unstructured product pages and customer reviews into actionable, real-time business intelligence.

## 🚀 Key Features

*   **Autonomous Playwright Scraping**: Our headless Chromium agent circumvents Amazon's bot defenses by directly interacting with the Amazon OpenID sign-in endpoints. It utilizes programmatic form submissions and human-like randomized delays (2–4 seconds) to extract live ASIN data invisibly and reliably.
*   **Dual-Tier Analysis Engine**: Combines NLP algorithms to quantitatively score individual product aspects (e.g., wheels, zippers, handles, durability) alongside **Gemini AI** to autonomously deduce market anomalies, discount traps, and value-for-money trends.
*   **Ultra-Modern React Dashboard**: A highly polished, custom-styled React frontend featuring dynamic glassmorphism UI principles, interactive Recharts visualizations, dark-mode styling, and real-time backend synchronization timers. 

## 🛠️ Tech Stack

*   **Backend**: FastAPI, Python (Uvicorn), Playwright (Async API), Pandas, NLTK/VADER (Sentiment), Google GenAI SDK.
*   **Frontend**: React 18, Vite, TypeScript, Recharts, Lucide React, Custom CSS.

## 🕵️ How the Scraper Works

The background scraping engine (`scraper.py`) is the backbone of Luggage IQ. It uses the **Playwright Async API** to autonomously navigate Amazon India and extract pristine product and review data. Here is how the pipeline operates:

1.  **Headless Execution**: The scraper spins up an invisible Chromium instance, keeping your desktop clean while it works in the background.
2.  **Direct Login Authentication**: To bypass Amazon's notoriously strict homepage slider CAPTCHAs, the agent navigates directly to the Amazon OpenID sign-in URL (`/ap/signin`). 
3.  **Programmatic Form Submission**: Instead of relying on brittle DOM selectors to find "Sign In" buttons (which Amazon frequently renames to throw off bots), the agent types the credentials and simulates `page.press('Enter')` directly on the keyboard.
4.  **Intelligent Bot Bypass**: The golden rule of scraping is mimicking human behavior. The Playwright agent injects randomized, human-like `page.wait_for_timeout(2000, 4000)` pauses (2 to 4 seconds) between every major click, search, and page transition to ensure it stays completely undetected by Amazon's velocity checks.
5.  **Execution Time**: Given the necessary 2-4 second pauses to avoid bans, a full scraping cycle spanning 6 luggage brands, 10 products per brand, and 50 reviews per brand takes **approximately 4 minutes** to complete.

## ⚙️ Quick Start Installation

### 1. Environment Variables

Before launching the API, create a `.env` file in the `backend/` directory. You must supply your Amazon credentials (make sure no 2fa, and better to make a fake acc) for the scraper to login, along with a free Gemini API key for the AI-generated agent insights.

```env
AMAZON_EMAIL=your_amazon_email@example.com
AMAZON_PASSWORD=your_amazon_password
GEMINI_API_KEY=your_gemini_api_key
```

### 2. Backend Initialization
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Start the API and AI Engine
python -m uvicorn main:app --reload --port 8000
```

### 3. Frontend Initialization
```bash
cd frontend
npm install
npm run dev
```

Navigate to `http://localhost:5173` to access the dashboard portal.

## 📊 How To Use

1. Click the **Sync Data** button in the top right of the Overview tab to initialize the background Playwright agent.
2. The UI will display an active countdown timer giving you an estimate of the scraper's execution progress while it crawls Amazon India.
3. Once completed, the dashboard will seamlessly populate with fresh market data across all visual components.
4. Navigate to the **Agent Insights** tab to allow the Gemini AI engine to compute deep, non-obvious conclusions regarding brand competition and consumer sentiment.

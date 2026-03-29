"""
main.py — FastAPI application for the Luggage Brand Intelligence Dashboard.
"""

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
import sys
import subprocess
import analyzer

app = FastAPI(
    title="Luggage Intelligence Dashboard API",
    description="Competitive intelligence for Amazon India luggage brands",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


@app.get("/")
def root():
    return {"message": "Luggage Intelligence Dashboard API", "docs": "/docs"}


@app.get("/api/overview")
def overview():
    try:
        return analyzer.get_overview()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/api/brands")
def brands():
    try:
        return analyzer.get_brand_summary()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/api/brand/{brand_name}")
def brand_detail(brand_name: str):
    try:
        result = analyzer.get_brand_summary(brand_name)
        if not result:
            raise HTTPException(status_code=404, detail=f"Brand '{brand_name}' not found")
        return result[0]
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/api/products")
def products(
    brand: str | None = Query(None, description="Comma-separated brand names"),
    min_price: float | None = Query(None),
    max_price: float | None = Query(None),
    min_rating: float | None = Query(None),
    category: str | None = Query(None),
    sort_by: str = Query("rating", enum=["price", "rating", "discount_pct", "review_count"]),
    sort_order: str = Query("desc", enum=["asc", "desc"]),
):
    try:
        return analyzer.get_products(
            brand=brand,
            min_price=min_price,
            max_price=max_price,
            min_rating=min_rating,
            category=category,
            sort_by=sort_by,
            sort_order=sort_order,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/api/product/{asin}")
def product_detail(asin: str):
    try:
        result = analyzer.get_product_detail(asin)
        if not result:
            raise HTTPException(status_code=404, detail=f"Product '{asin}' not found")
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/api/compare")
def compare(brands: str = Query(..., description="Comma-separated brand names")):
    try:
        brand_list = [b.strip() for b in brands.split(",")]
        all_brands = analyzer.get_brand_summary()
        return [b for b in all_brands if b["brand"] in brand_list]
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/api/insights")
def insights():
    try:
        return analyzer.get_insights()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/api/themes")
def themes():
    try:
        return analyzer.get_themes()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/api/dataset")
def download_dataset():
    path = os.path.join(DATA_DIR, "products.csv")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Dataset not generated yet.")
    return FileResponse(path, media_type="text/csv", filename="luggage_products.csv")


@app.get("/api/dataset/reviews")
def download_reviews():
    path = os.path.join(DATA_DIR, "reviews.csv")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Reviews dataset not generated yet.")
    return FileResponse(path, media_type="text/csv", filename="luggage_reviews.csv")


# --- Scraper Execution logic ---
scrape_process = None

@app.post("/api/scrape")
def trigger_scrape():
    global scrape_process
    if scrape_process and scrape_process.poll() is None:
        return {"status": "running", "message": "Scraping already in progress."}
        
    log_path = os.path.join(DATA_DIR, "scrape.log")
    os.makedirs(DATA_DIR, exist_ok=True)
    
    # Open log file to stream output
    log_file = open(log_path, "w", encoding="utf-8")
    
    # Run the scraper
    # Note: If manual login is needed, it will stall since it requires stdin,
    # but the automated .env mode will handle it in headful mode!
    scrape_process = subprocess.Popen(
        [sys.executable, "-u", "-X", "utf8", "scraper.py"],
        cwd=os.path.dirname(__file__),
        stdout=log_file,
        stderr=subprocess.STDOUT
    )
    
    return {"status": "started", "message": "Scraping started."}

@app.get("/api/scrape/status")
def scrape_status():
    global scrape_process
    is_running = scrape_process is not None and scrape_process.poll() is None
    
    log_path = os.path.join(DATA_DIR, "scrape.log")
    logs = ""
    if os.path.exists(log_path):
        with open(log_path, "r", encoding="utf-8") as f:
            # Get last 50 lines to keep request lightweight but useful
            lines = f.readlines()
            logs = "".join(lines[-50:])
            
    return {
        "status": "running" if is_running else "idle",
        "logs": logs
    }

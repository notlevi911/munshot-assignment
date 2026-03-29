"""
scraper.py — Amazon India luggage scraper with manual GUI login

Strategy:
  • Opens a headful Chromium browser
  • Navigates to Amazon.in and WAITs for you to log in manually
  • You press ENTER in the terminal to resume
  • Uses the single logged-in session to scrape all brands
  • 2s human delays between requests
"""

import argparse
import asyncio
import csv
import json
import os
import random
import re
import statistics
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

DEFAULT_BRANDS = [
    "Safari",
    "Skybags",
    "American Tourister",
    "VIP",
]

ASPECTS = ["wheels", "handle", "material", "zipper", "size", "durability", "lock", "weight"]
ASPECT_KW = {
    "wheels":     ["wheel", "spinner", "360", "rolling", "roll", "castor"],
    "handle":     ["handle", "grip", "telescop", "pull"],
    "material":   ["material", "plastic", "shell", "hard case", "fabric", "polycarbonate", "abs"],
    "zipper":     ["zipper", "zip", "closure"],
    "size":       ["size", "spacious", "capacity", "space", "fits", "inches", "cm"],
    "durability": ["durable", "durability", "sturdy", "strong", "lasted", "broke", "crack", "damage"],
    "lock":       ["lock", "tsa", "combination", "secure"],
    "weight":     ["weight", "heavy", "lightweight", "light"],
}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def parse_price(t: str) -> float | None:
    t = t.replace(",", "").replace("₹", "").replace("\u20b9", "").strip()
    m = re.search(r"[\d]+\.?\d*", t)
    return float(m.group()) if m else None

def parse_int(t: str) -> int:
    d = re.sub(r"[^\d]", "", t)
    return int(d) if d else 0

async def delay(lo=1.5, hi=3.0):
    await asyncio.sleep(random.uniform(lo, hi))

async def scroll(page, steps=2):
    for _ in range(steps):
        await page.mouse.wheel(0, random.randint(300, 700))
        await asyncio.sleep(random.uniform(0.3, 0.7))

def guess_category(title: str) -> str:
    t = title.lower()
    if "backpack" in t:               return "Backpack"
    if "set of 3" in t:               return "Set of 3"
    if "set of 2" in t:               return "Set of 2"
    if "cabin" in t or " 55" in t or " 56" in t: return "Cabin"
    if any(x in t for x in ["75", "76", "77", "78", "large", "xl"]): return "Large"
    return "Medium"

def sentiment(text: str) -> tuple[str, float]:
    try:
        from textblob import TextBlob
        p = round(TextBlob(text).sentiment.polarity, 3)
        lbl = "positive" if p > 0.05 else "negative" if p < -0.05 else "neutral"
        return lbl, p
    except Exception:
        pos = ["good","great","excellent","love","perfect","amazing","smooth","sturdy","recommend"]
        neg = ["bad","poor","broke","broken","terrible","awful","cheap","disapp","crack","worst"]
        tl = text.lower()
        s = sum(1 for w in pos if w in tl) - sum(1 for w in neg if w in tl)
        score = max(-1.0, min(1.0, s * 0.15))
        lbl = "positive" if score > 0.05 else "negative" if score < -0.05 else "neutral"
        return lbl, score

def aspect_score(text: str, compound: float, aspect: str) -> float:
    tl = text.lower()
    if any(kw in tl for kw in ASPECT_KW[aspect]):
        return round(compound, 3)
    return 0.0


# ─── Scrape products ──────────────────────────────────────────────────────────

async def scrape_products(page, brand: str, max_n: int) -> list[dict]:
    url = f"https://www.amazon.in/s?k={brand.replace(' ', '+')}+luggage"
    print(f"  GET {url}")

    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=60_000)
        await delay(2, 4)
    except Exception as e:
        print(f"  ❌ goto failed: {e}")
        return []

    await scroll(page, 3)
    products: list[dict] = []
    page_no = 0

    while len(products) < max_n and page_no < 3:
        page_no += 1

        cards = await page.query_selector_all('[data-component-type="s-search-result"][data-asin]')
        if not cards:
            cards = await page.query_selector_all('div[data-asin][data-index]')
        print(f"  Page {page_no}: {len(cards)} cards")

        for card in cards:
            if len(products) >= max_n:
                break

            asin = (await card.get_attribute("data-asin") or "").strip()
            if not asin:
                continue

            if await card.query_selector('[data-component-type="sp-sponsored-result"]'):
                continue

            try:
                title_text = ""
                for sel in ["h2 a span", "h2 span", ".a-size-medium", ".a-size-base-plus"]:
                    el = await card.query_selector(sel)
                    if el:
                        t = (await el.inner_text()).strip()
                        if t and len(t) > 10:
                            title_text = t
                            break
                if not title_text:
                    continue

                price = None
                for sel in [".a-price:not(.a-text-price) .a-offscreen", ".a-price .a-offscreen", "span.a-price-whole"]:
                    el = await card.query_selector(sel)
                    if el:
                        price = parse_price(await el.inner_text())
                        if price and price > 100: break

                mrp = None
                for sel in [".a-text-price .a-offscreen", ".a-price.a-text-price .a-offscreen"]:
                    el = await card.query_selector(sel)
                    if el:
                        mrp = parse_price(await el.inner_text())
                        if mrp and mrp > 100: break

                disc = None
                for sel in [".a-badge-text", ".a-badge-label-inner"]:
                    el = await card.query_selector(sel)
                    if el:
                        m = re.search(r"(\d+)%", await el.inner_text())
                        if m: disc = int(m.group(1)); break
                if not disc and price and mrp and mrp > price:
                    disc = round((mrp - price) / mrp * 100)

                rating = 0.0
                for sel in [".a-icon-alt", "span[aria-label*='out of 5']", ".a-icon-star-small .a-icon-alt"]:
                    el = await card.query_selector(sel)
                    if el:
                        txt = await el.inner_text() or await el.get_attribute("aria-label") or ""
                        m = re.search(r"([\d.]+)\s*out of 5", txt)
                        if m: rating = float(m.group(1)); break

                rev_count = 0
                for sel in [".a-size-base.s-underline-text", "span.a-size-base[aria-label]", ".a-size-small .a-link-normal"]:
                    el = await card.query_selector(sel)
                    if el:
                        txt = (await el.inner_text()).replace(",", "")
                        n = parse_int(txt)
                        if n > 0: rev_count = n; break

                img_url = ""
                img = await card.query_selector("img.s-image")
                if img: img_url = await img.get_attribute("src") or ""

                prod_url = f"https://www.amazon.in/dp/{asin}" if asin else ""

                if not price:
                    continue

                products.append({
                    "asin":         asin,
                    "brand":        brand,
                    "title":        title_text,
                    "category":     guess_category(title_text),
                    "price":        price,
                    "mrp":          mrp or price,
                    "discount_pct": disc or 0,
                    "rating":       rating,
                    "review_count": rev_count,
                    "material":     "Unknown",
                    "color":        "Unknown",
                    "image_url":    img_url,
                    "url":          prod_url,
                })

            except Exception as ex:
                print(f"    card err: {ex}")

        if len(products) < max_n:
            nxt = await page.query_selector("a.s-pagination-next:not(.s-pagination-disabled)")
            if not nxt:
                break
            await nxt.click()
            await delay(2, 4)
            await scroll(page, 2)

    return products


# ─── Scrape review pages ──────────────────────────────────────────────────────

async def scrape_reviews(page, asin: str, brand: str, max_n: int) -> list[dict]:
    reviews: list[dict] = []
    
    # Use the reviews-specific URL
    rev_url = f"https://www.amazon.in/product-reviews/{asin}?reviewerType=all_reviews&sortBy=recent"
    try:
        await page.goto(rev_url, wait_until="domcontentloaded", timeout=60_000)
        await delay(2, 3)
    except Exception as e:
        print(f"    goto err: {e}")
        return reviews

    page_no = 0
    while len(reviews) < max_n and page_no < 5:
        page_no += 1
        await scroll(page, 2)
        await delay(1, 2)

        cards = await page.query_selector_all('[data-hook="review"]')
        for card in cards:
            if len(reviews) >= max_n:
                break
            try:
                rid = await card.get_attribute("id") or f"R{len(reviews):05d}"

                r_el = await card.query_selector(
                    '[data-hook="review-star-rating"] .a-icon-alt,'
                    '[data-hook="cmps-review-star-rating"] .a-icon-alt'
                )
                r_txt = (await r_el.inner_text()).strip() if r_el else "3 out of 5"
                rm = re.search(r"([\d.]+) out of 5", r_txt)
                star = float(rm.group(1)) if rm else 3.0

                te = await card.query_selector('[data-hook="review-title"] span:last-child')
                rev_title = (await te.inner_text()).strip() if te else ""

                be = await card.query_selector('[data-hook="review-body"] span')
                body = (await be.inner_text()).strip() if be else ""
                if not body:
                    continue

                de = await card.query_selector('[data-hook="review-date"]')
                date_txt = (await de.inner_text()).strip() if de else ""
                dm = re.search(r"(\d{1,2}\s+\w+\s+\d{4})", date_txt)
                rev_date = dm.group(1) if dm else datetime.now().strftime("%d %B %Y")

                ve = await card.query_selector('[data-hook="avp-badge-linkless"],[data-hook="avp-badge"]')
                verified = ve is not None

                he = await card.query_selector('[data-hook="helpful-vote-statement"]')
                helpful = parse_int((await he.inner_text()) if he else "0")

                lbl, compound = sentiment(body)
                row: dict = {
                    "review_id":         rid,
                    "asin":              asin,
                    "brand":             brand,
                    "rating":            int(star),
                    "title":             rev_title,
                    "body":              body,
                    "sentiment":         lbl,
                    "compound_score":    compound,
                    "verified_purchase": verified,
                    "helpful_votes":     helpful,
                    "review_date":       rev_date,
                }
                for asp in ASPECTS:
                    row[f"aspect_{asp}"] = aspect_score(body, compound, asp)
                reviews.append(row)
            except Exception as ex:
                print(f"      card err: {ex}")

        if len(reviews) < max_n:
            nxt = await page.query_selector("li.a-last:not(.a-disabled) a")
            if not nxt:
                break
            await nxt.click()
            await delay(2, 4)

    return reviews


# ─── Brand summary ────────────────────────────────────────────────────────────

def build_summary(products: list[dict], reviews: list[dict]) -> dict:
    out = {}
    for brand in {p["brand"] for p in products}:
        bp = [p for p in products if p["brand"] == brand]
        br = [r for r in reviews  if r["brand"] == brand]
        prices   = [p["price"]        for p in bp if p["price"]]
        ratings  = [p["rating"]       for p in bp if p["rating"]]
        discounts= [p["discount_pct"] for p in bp]
        sentiments=[r["compound_score"]for r in br]
        pos = [r for r in br if r["sentiment"] == "positive"]
        neg = [r for r in br if r["sentiment"] == "negative"]

        asp = {}
        for a in ASPECTS:
            vals = [r.get(f"aspect_{a}", 0) for r in br if r.get(f"aspect_{a}", 0) != 0]
            asp[a] = round(statistics.mean(vals), 3) if vals else 0.0

        out[brand] = {
            "brand":                brand,
            "product_count":        len(bp),
            "review_count":         len(br),
            "total_platform_reviews": sum(p["review_count"] for p in bp),
            "avg_price":            round(statistics.mean(prices), 2)    if prices    else 0,
            "avg_mrp":              round(statistics.mean(p["mrp"] for p in bp), 2),
            "avg_discount_pct":     round(statistics.mean(discounts), 1)  if discounts else 0,
            "avg_rating":           round(statistics.mean(ratings), 2)    if ratings   else 0,
            "avg_sentiment":        round(statistics.mean(sentiments), 3) if sentiments else 0,
            "positive_pct":         round(len(pos) / max(len(br), 1) * 100, 1),
            "negative_pct":         round(len(neg) / max(len(br), 1) * 100, 1),
            "aspect_scores":        asp,
        }
    return out


# ─── Main ─────────────────────────────────────────────────────────────────────

async def run(brands, max_products, max_reviews):
    from playwright.async_api import async_playwright

    os.makedirs(DATA_DIR, exist_ok=True)
    all_products: list[dict] = []
    all_reviews:  list[dict] = []

    async with async_playwright() as pw:
        # Launch headless so it doesn't pop up on the user's screen
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1366, "height": 768},
            locale="en-IN",
            timezone_id="Asia/Kolkata",
        )
        page = await context.new_page()

        # Step 1: Login Flow
        print("\n=======================================================")
        print("  1. Navigating directly to Amazon Sign-In page...")
        print("  2. Attempting automated login from .env...")
        print("=======================================================\n")
        
        sign_in_url = (
            "https://www.amazon.in/ap/signin?"
            "openid.pape.max_auth_age=0&"
            "openid.return_to=https%3A%2F%2Fwww.amazon.in%2F&"
            "openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&"
            "openid.assoc_handle=inflex&"
            "openid.mode=checkid_setup&"
            "openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&"
            "openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0"
        )
        await page.goto(sign_in_url, wait_until="domcontentloaded")
        await delay(1, 2)
        
        email = os.environ.get("AMAZON_EMAIL")
        pwd = os.environ.get("AMAZON_PASSWORD")
        
        auto_login_success = False
        if email and pwd:
            try:
                # If we are directly on the sign-in page, the email input should be visible
                if await page.query_selector("input[name='email']"):
                    print("  → Entering email...")
                    await page.fill("input[name='email']", email)
                    await delay(0.5, 1.0)
                    await page.press("input[name='email']", "Enter")
                    await page.wait_for_load_state("domcontentloaded")
                    await delay(1, 2)
                
                if await page.query_selector("input[name='password']"):
                    print("  → Entering password...")
                    await page.fill("input[name='password']", pwd)
                    await delay(0.5, 1.0)
                    await page.press("input[name='password']", "Enter")
                    await page.wait_for_load_state("domcontentloaded")
                    await delay(2, 4)
                    
                # Check if we successfully bypassed the login page
                if "signin" not in page.url.lower():
                    auto_login_success = True
                    print("\n✓ Auto-login successful (or already signed in)!\n")
                else:
                    print("\n⚠ Still on the sign-in page. May have hit an OTP or CAPTCHA.")
                    auto_login_success = False
                    
            except Exception as e:
                print(f"\n⚠ Auto-login encountered an issue: {e}")
        else:
            print("⚠ No AMAZON_EMAIL or AMAZON_PASSWORD found in .env.")

        if not auto_login_success:
            print("\n=======================================================")
            print("  ACTION REQUIRED: FALLBACK TO MANUAL LOGIN")
            print("  Please complete the login manually in the browser window.")
            print("  (Solve any CAPTCHAs or enter OTPs if prompted)")
            print("=======================================================\n")
            try:
                await asyncio.to_thread(input, "Press ENTER here when fully logged in... ")
                print("\nLogin confirmed! Proceeding with scraper...\n")
            except EOFError:
                print("\n[ERROR] Automated scraping via UI requires valid .env credentials!")
                print("If you want to use manual login, please run 'python scraper.py' directly in your terminal.")
                await browser.close()
                return

        # Step 2: Scrape with the authenticated session!
        for brand in brands:
            print(f"\n{'='*55}")
            print(f"🏷  {brand}")
            print(f"{'='*55}")

            products = await scrape_products(page, brand, max_products)
            print(f"  ✓ {len(products)} products scraped")
            all_products.extend(products)

            rev_budget = max_reviews
            for prod in products:
                if rev_budget <= 0:
                    break
                quota = max(6, rev_budget // max(len(products), 1))
                print(f"\n  📝 {prod['asin']} — {prod['title'][:45]}…")
                await delay(2, 4)
                
                revs = await scrape_reviews(page, prod["asin"], brand, quota)
                
                print(f"     → {len(revs)} reviews")
                all_reviews.extend(revs)
                rev_budget -= len(revs)

            await delay(3, 5)   # gap between brands

        await browser.close()

    # ── Save ──────────────────────────────────────────────────────────────────
    print(f"\n\n{'='*55}")
    print("💾  Saving…")

    if all_products:
        p = os.path.join(DATA_DIR, "products.csv")
        with open(p, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=all_products[0].keys())
            w.writeheader(); w.writerows(all_products)
        print(f"  ✓ products.csv  ({len(all_products)} rows)")

    if all_reviews:
        p = os.path.join(DATA_DIR, "reviews.csv")
        with open(p, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=all_reviews[0].keys())
            w.writeheader(); w.writerows(all_reviews)
        print(f"  ✓ reviews.csv   ({len(all_reviews)} rows)")

    summary = build_summary(all_products, all_reviews)
    with open(os.path.join(DATA_DIR, "brand_summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(f"  ✓ brand_summary.json")

    print(f"\n🎉  Done! Brands={len(brands)}, Products={len(all_products)}, Reviews={len(all_reviews)}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--brands",   default=",".join(DEFAULT_BRANDS))
    ap.add_argument("--products", type=int, default=10)
    ap.add_argument("--reviews",  type=int, default=50)
    args = ap.parse_args()

    brands = [b.strip() for b in args.brands.split(",") if b.strip()]

    print("🕷  Amazon India Luggage Scraper (MANUAL LOGIN MODE)")
    print(f"   Brands:   {brands}")
    print(f"   Products: {args.products}/brand")
    print(f"   Reviews:  {args.reviews}/brand\n")

    asyncio.run(run(brands, args.products, args.reviews))


if __name__ == "__main__":
    main()

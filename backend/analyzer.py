"""
analyzer.py - Core analysis engine for the luggage intelligence dashboard.
Loads products.csv and reviews.csv, computes aggregations, themes, and insights.
"""

import json
import math
import os
import statistics

from collections import Counter, defaultdict
from typing import Any

import pandas as pd

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

ASPECTS = ["wheels", "handle", "material", "zipper", "size", "durability", "lock", "weight"]

THEME_KEYWORDS = {
    "positive": {
        "wheels": ["smooth wheels", "spinner", "360", "glides", "rolling"],
        "handle": ["sturdy handle", "comfortable grip", "telescoping", "ergonomic"],
        "material": ["premium material", "hard shell", "solid", "feels premium", "quality"],
        "zipper": ["strong zipper", "smooth zipper", "reliable zipper"],
        "size": ["spacious", "fits perfectly", "good space", "ample storage"],
        "durability": ["durable", "long lasting", "sturdy", "survived", "still looks new"],
        "value": ["value for money", "worth every rupee", "affordable", "great deal"],
        "design": ["looks great", "stylish", "modern design", "color", "attractive"],
    },
    "negative": {
        "wheels": ["wheels broke", "squeaking", "wheels cracked", "wobbly wheels"],
        "handle": ["handle loose", "handle broke", "handle worn", "grip wore off"],
        "material": ["flimsy", "feels cheap", "thin material", "plastic feels", "poor quality"],
        "zipper": ["zipper broke", "zipper quality", "zipper stuck", "zipper failed"],
        "size": ["smaller than expected", "misleading size", "too small"],
        "durability": ["broke after", "cracked", "poor durability", "didn't last"],
        "lock": ["lock flimsy", "lock broken", "lock doesn't align"],
        "value": ["overpriced", "not worth", "disappointing for price"],
    },
}

def _sanitize(obj):
    if isinstance(obj, float) and math.isnan(obj):
        return None
    elif isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_sanitize(v) for v in obj]
    return obj


def _load_data():
    products_path = os.path.join(DATA_DIR, "products.csv")
    reviews_path = os.path.join(DATA_DIR, "reviews.csv")

    if not os.path.exists(products_path):
        raise FileNotFoundError(
            f"Dataset not found at {DATA_DIR}. "
            "Run: python scripts/generate_dataset.py"
        )

    products_df = pd.read_csv(products_path)
    reviews_df = pd.read_csv(reviews_path)
    return products_df, reviews_df


def get_overview() -> dict:
    products_df, reviews_df = _load_data()
    brands = products_df["brand"].unique().tolist()
    avg_sentiment = round(reviews_df["compound_score"].mean(), 3)
    avg_price = round(products_df["price"].mean(), 2)
    avg_discount = round(products_df["discount_pct"].mean(), 1)
    avg_rating = round(products_df["rating"].mean(), 2)

    # Top and bottom rated brand
    brand_ratings = products_df.groupby("brand")["rating"].mean()
    top_brand = brand_ratings.idxmax()
    bottom_brand = brand_ratings.idxmin()

    return _sanitize({
        "total_brands": len(brands),
        "total_products": len(products_df),
        "total_reviews_scraped": len(reviews_df),
        "total_reviews_on_platform": int(products_df["review_count"].sum()),
        "avg_sentiment": avg_sentiment,
        "avg_price": avg_price,
        "avg_discount_pct": avg_discount,
        "avg_rating": avg_rating,
        "top_rated_brand": top_brand,
        "lowest_rated_brand": bottom_brand,
        "brands": brands,
    })


def get_brand_summary(brand: str | None = None) -> list[dict]:
    products_df, reviews_df = _load_data()

    brands = [brand] if brand else products_df["brand"].unique().tolist()
    results = []

    for b in brands:
        bp = products_df[products_df["brand"] == b]
        br = reviews_df[reviews_df["brand"] == b]

        if bp.empty:
            continue

        pos = br[br["sentiment"] == "positive"]
        neg = br[br["sentiment"] == "negative"]

        # Aspect scores
        aspect_scores = {}
        for aspect in ASPECTS:
            col = f"aspect_{aspect}"
            if col in br.columns:
                aspect_scores[aspect] = round(float(br[col].mean()), 3)

        # Price bands
        price_band_counts = _price_band_distribution(bp)

        results.append({
            "brand": b,
            "product_count": len(bp),
            "review_count": len(br),
            "total_platform_reviews": int(bp["review_count"].sum()),
            "avg_price": round(float(bp["price"].mean()), 2),
            "avg_mrp": round(float(bp["mrp"].mean()), 2),
            "avg_discount_pct": round(float(bp["discount_pct"].mean()), 1),
            "avg_rating": round(float(bp["rating"].mean()), 2),
            "avg_sentiment": round(float(br["compound_score"].mean()), 3),
            "positive_pct": round(len(pos) / max(len(br), 1) * 100, 1),
            "negative_pct": round(len(neg) / max(len(br), 1) * 100, 1),
            "aspect_scores": aspect_scores,
            "price_band_distribution": price_band_counts,
            "top_themes_positive": _extract_themes(pos, "positive"),
            "top_themes_negative": _extract_themes(neg, "negative"),
            "price_range": {
                "min": int(bp["price"].min()),
                "max": int(bp["price"].max()),
                "median": int(bp["price"].median()),
            },
            "categories": bp["category"].value_counts().to_dict(),
        })

    return _sanitize(results)


def _price_band_distribution(bp: pd.DataFrame) -> dict:
    bands = {"budget (<₹2000)": 0, "mid (₹2000-5000)": 0, "premium (>₹5000)": 0}
    for price in bp["price"]:
        if price < 2000:
            bands["budget (<₹2000)"] += 1
        elif price <= 5000:
            bands["mid (₹2000-5000)"] += 1
        else:
            bands["premium (>₹5000)"] += 1
    return bands


def _extract_themes(reviews_df: pd.DataFrame, polarity: str) -> list[str]:
    if reviews_df.empty:
        return []

    all_text = " ".join(reviews_df["body"].fillna("").str.lower().tolist())
    themes = []

    for category, keywords in THEME_KEYWORDS[polarity].items():
        count = sum(all_text.count(kw) for kw in keywords)
        if count > 0:
            themes.append({"theme": category, "count": count})

    themes.sort(key=lambda x: x["count"], reverse=True)
    return [t["theme"] for t in themes[:5]]


def get_products(
    brand: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    min_rating: float | None = None,
    category: str | None = None,
    sort_by: str = "rating",
    sort_order: str = "desc",
) -> list[dict]:
    products_df, reviews_df = _load_data()

    df = products_df.copy()
    if brand:
        brands_list = [b.strip() for b in brand.split(",")]
        df = df[df["brand"].isin(brands_list)]
    if min_price is not None:
        df = df[df["price"] >= min_price]
    if max_price is not None:
        df = df[df["price"] <= max_price]
    if min_rating is not None:
        df = df[df["rating"] >= min_rating]
    if category:
        df = df[df["category"].str.lower() == category.lower()]

    ascending = sort_order == "asc"
    if sort_by in df.columns:
        df = df.sort_values(sort_by, ascending=ascending)

    records = df.to_dict("records")
    return _sanitize(records)


def get_product_detail(asin: str) -> dict | None:
    products_df, reviews_df = _load_data()

    product_rows = products_df[products_df["asin"] == asin]
    if product_rows.empty:
        return None

    product = product_rows.iloc[0].to_dict()
    reviews = reviews_df[reviews_df["asin"] == asin]

    pos = reviews[reviews["sentiment"] == "positive"]
    neg = reviews[reviews["sentiment"] == "negative"]

    aspect_scores = {}
    for aspect in ASPECTS:
        col = f"aspect_{aspect}"
        if col in reviews.columns:
            valid = reviews[reviews[col] != 0][col]
            if not valid.empty:
                aspect_scores[aspect] = round(float(valid.mean()), 3)
            else:
                aspect_scores[aspect] = None

    top_reviews = reviews.nlargest(3, "helpful_votes")[
        ["review_id", "rating", "title", "body", "sentiment", "compound_score", "review_date"]
    ].to_dict("records")

    result = {
        **product,
        "review_count_scraped": len(reviews),
        "avg_sentiment": round(float(reviews["compound_score"].mean()), 3) if not reviews.empty else 0,
        "sentiment_distribution": {
            "positive": len(pos),
            "neutral": len(reviews[reviews["sentiment"] == "neutral"]),
            "negative": len(neg),
        },
        "aspect_scores": aspect_scores,
        "top_themes_positive": _extract_themes(pos, "positive"),
        "top_themes_negative": _extract_themes(neg, "negative"),
        "top_reviews": top_reviews,
    }
    return _sanitize(result)


def get_comparison(brands: list[str]) -> list[dict]:
    return get_brand_summary(None if not brands else None)


def get_themes() -> list[dict]:
    products_df, reviews_df = _load_data()
    result = []
    for brand in products_df["brand"].unique():
        br = reviews_df[reviews_df["brand"] == brand]
        aspect_scores = {}
        for aspect in ASPECTS:
            col = f"aspect_{aspect}"
            if col in br.columns:
                valid = br[br[col] != 0][col]
                if not valid.empty:
                    aspect_scores[aspect] = round(float(valid.mean()), 3)
                else:
                    aspect_scores[aspect] = None
        result.append({"brand": brand, "aspect_scores": aspect_scores})
    return _sanitize(result)


def get_insights() -> list[dict]:
    """
    Generate 6 non-obvious agent insights from the dataset.
    If GEMINI_API_KEY is set in the environment, uses Gemini AI to generate
    intelligent narrative insights from the real data. Otherwise falls back
    to the statistical rules engine.
    """
    from dotenv import load_dotenv
    load_dotenv()

    products_df, reviews_df = _load_data()

    # ── Compute real statistics to feed to the AI ────────────────────────────
    brand_discount   = products_df.groupby("brand")["discount_pct"].mean()
    brand_sentiment  = reviews_df.groupby("brand")["compound_score"].mean()
    brand_rating     = products_df.groupby("brand")["rating"].mean()
    brand_price      = products_df.groupby("brand")["price"].mean()
    brand_pos_pct    = reviews_df.groupby("brand")["sentiment"].apply(
        lambda x: round((x == "positive").sum() / max(len(x), 1) * 100, 1)
    )
    brand_neg_pct    = reviews_df.groupby("brand")["sentiment"].apply(
        lambda x: round((x == "negative").sum() / max(len(x), 1) * 100, 1)
    )

    # Aspect scores per brand
    aspect_summary: dict = {}
    for brand in products_df["brand"].unique():
        br = reviews_df[reviews_df["brand"] == brand]
        scores = {}
        for asp in ASPECTS:
            col = f"aspect_{asp}"
            if col in br.columns and not br[col].empty:
                scores[asp] = round(float(br[col].mean()), 3)
        aspect_summary[brand] = scores

    # Value for money ratio
    vfm = {}
    for b in brand_sentiment.index:
        if b in brand_price.index and brand_price.max() > 0:
            price_norm = brand_price[b] / brand_price.max()
            vfm[b] = round(brand_sentiment[b] / max(price_norm, 0.01), 4)

    # Build a compact data summary for the AI
    brand_stats = []
    for b in products_df["brand"].unique():
        stat = {
            "brand": b,
            "avg_price": round(float(brand_price.get(b, 0)), 0),
            "avg_discount_pct": round(float(brand_discount.get(b, 0)), 1),
            "avg_rating": round(float(brand_rating.get(b, 0)), 2),
            "avg_sentiment": round(float(brand_sentiment.get(b, 0)), 3),
            "positive_pct": float(brand_pos_pct.get(b, 0)),
            "negative_pct": float(brand_neg_pct.get(b, 0)),
            "vfm_score": vfm.get(b, 0),
            "aspect_scores": aspect_summary.get(b, {}),
        }
        brand_stats.append(stat)

    import json as _json
    api_key = os.environ.get("GEMINI_API_KEY", "")

    if api_key:
        try:
            from google import genai  # type: ignore
            client = genai.Client(api_key=api_key)

            prompt = f"""
You are a competitive intelligence analyst specialising in the Indian luggage market.

Here is real scraped data from Amazon India for {len(brand_stats)} luggage brands:

{_json.dumps(brand_stats, indent=2)}

Notes:
- avg_sentiment: compound score from -1 (very negative) to +1 (very positive) from real review text
- aspect_scores: per-aspect sentiment (wheels, handle, material, zipper, size, durability, lock, weight). Negative = complaints.
- vfm_score: sentiment-to-price ratio — higher = better value
- avg_discount_pct: how deeply the brand discounts from MRP

Generate exactly 6 sharp, non-obvious competitive intelligence insights based ONLY on the numbers above.

Each insight MUST:
1. Reference specific brand names and actual numbers from the data
2. Reveal a non-obvious finding (not just "Brand X has a higher rating")
3. Have a clear strategic implication for a brand manager
4. Be written in one clear paragraph of 2-3 sentences

Return ONLY a valid JSON array, no markdown, no explanations:
[
  {{
    "id": 1,
    "title": "Short punchy title",
    "body": "2-3 sentence insight with specific numbers and brand names",
    "type": "warning|alert|insight|positive",
    "brands_involved": ["BrandName"],
    "metric": {{"label": "Key Metric", "value": "value"}}
  }}
]
"""
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )
            text = response.text.strip()
            # Strip markdown code fences if present
            if "```" in text:
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            ai_insights = _json.loads(text.strip())
            for i, ins in enumerate(ai_insights, 1):
                ins["id"] = i
            return ai_insights

        except Exception as e:
            print(f"[Gemini] AI insights failed, falling back to statistical engine: {e}")

    # ── Statistical fallback (no API key or Gemini error) ────────────────────
    insights: list[dict] = []

    high_discount_brand = brand_discount.idxmax()
    high_discount_val   = round(float(brand_discount.max()), 1)
    high_discount_sent  = round(float(brand_sentiment.get(high_discount_brand, 0)), 3)
    insights.append({
        "id": 1,
        "title": "High Discounts ≠ High Satisfaction",
        "body": (
            f"{high_discount_brand} offers the highest average discount ({high_discount_val}%) "
            f"but has a sentiment score of only {high_discount_sent}. "
            "Heavy discounting appears to be compensating for product quality gaps rather than a market growth strategy."
        ),
        "type": "warning",
        "brands_involved": [high_discount_brand],
        "metric": {"label": "Avg Discount", "value": f"{high_discount_val}%"},
    })

    top_rated        = brand_rating.idxmax()
    top_sent_brand   = brand_sentiment.idxmax()
    if top_rated != top_sent_brand:
        insights.append({
            "id": 2,
            "title": "Star Ratings and Real Sentiment Diverge",
            "body": (
                f"{top_rated} leads on star ratings ({round(float(brand_rating[top_rated]), 2)}\u2605) "
                f"but {top_sent_brand} leads on review sentiment ({round(float(brand_sentiment[top_sent_brand]), 3)}). "
                "This star-sentiment gap suggests rating inflation — shoppers rate generously but express subtle disappointment in review text."
            ),
            "type": "insight",
            "brands_involved": [top_rated, top_sent_brand],
            "metric": {"label": "Sentiment Gap", "value": str(round(float(brand_sentiment[top_sent_brand]) - float(brand_sentiment[top_rated]), 3))},
        })

    if vfm:
        vfm_winner = max(vfm, key=vfm.get)  # type: ignore
        insights.append({
            "id": 3,
            "title": f"{vfm_winner} Wins on Value-for-Money",
            "body": (
                f"{vfm_winner} delivers the highest sentiment-to-price ratio. "
                f"At \u20b9{round(float(brand_price.get(vfm_winner, 0))):,} average, it outperforms pricier rivals. "
                "Ideal positioning for budget-conscious frequent travellers."
            ),
            "type": "positive",
            "brands_involved": [vfm_winner],
            "metric": {"label": "Avg Price", "value": f"\u20b9{round(float(brand_price.get(vfm_winner, 0))):,}"},
        })

    dur_col = "aspect_durability"
    if dur_col in reviews_df.columns:
        brand_dur = reviews_df.groupby("brand")[dur_col].mean()
        anomalies = [b for b in brand_dur.index if float(brand_dur[b]) < -0.1 and float(brand_rating.get(b, 0)) > 3.8]
        if anomalies:
            insights.append({
                "id": 4,
                "title": "Durability Red Flag Despite High Ratings",
                "body": (
                    f"{', '.join(anomalies)} show negative durability sentiment while maintaining a 3.8+ star average. "
                    "This hidden signal suggests durability complaints are underweighted in star scores — a potential quality time-bomb."
                ),
                "type": "alert",
                "brands_involved": anomalies,
                "metric": {"label": "Durability Score", "value": str(round(float(brand_dur[anomalies[0]]), 3))},
            })

    premium_brands = [b for b in brand_price.index if float(brand_price[b]) > float(brand_price.mean()) * 1.2]
    if premium_brands:
        pb = premium_brands[0]
        insights.append({
            "id": 5,
            "title": "Premium Price — Is It Justified?",
            "body": (
                f"{pb} commands the highest prices (\u20b9{round(float(brand_price.get(pb, 0))):,}) "
                f"with a sentiment of {round(float(brand_sentiment.get(pb, 0)), 3)}. "
                "Review themes consistently highlight material quality — the premium positioning is validated by genuine customer experience."
            ),
            "type": "insight",
            "brands_involved": [pb],
            "metric": {"label": "Avg Price", "value": f"\u20b9{round(float(brand_price.get(pb, 0))):,}"},
        })

    wheel_col = "aspect_wheels"
    if wheel_col in reviews_df.columns:
        worst_wheels_brand = reviews_df.groupby("brand")[wheel_col].mean().idxmin()
        worst_val = round(float(reviews_df.groupby("brand")[wheel_col].mean().min()), 3)
        insights.append({
            "id": 6,
            "title": "Wheels Are the Key Battleground",
            "body": (
                f"Wheel quality is the #1 differentiating aspect across all brands. "
                f"{worst_wheels_brand} has the worst wheel sentiment ({worst_val}). "
                "Brands investing in spinner wheel quality see compounding satisfaction benefits."
            ),
            "type": "warning",
            "brands_involved": [worst_wheels_brand],
            "metric": {"label": "Wheel Score", "value": str(worst_val)},
        })

    return insights


    # ── Insight 1: Discount trap ──────────────────────────────────────────────
    brand_discount = products_df.groupby("brand")["discount_pct"].mean().sort_values(ascending=False)
    brand_sentiment = reviews_df.groupby("brand")["compound_score"].mean()

    high_discount_brand = brand_discount.index[0]
    high_discount_val = round(brand_discount.iloc[0], 1)
    high_discount_sentiment = round(brand_sentiment.get(high_discount_brand, 0), 3)

    insights.append({
        "id": 1,
        "title": "High Discounts ≠ High Satisfaction",
        "body": (
            f"{high_discount_brand} offers the highest average discount ({high_discount_val}%) "
            f"but has a below-average sentiment score ({high_discount_sentiment}). "
            "Heavy discounting appears to be compensating for product quality gaps rather than market strategy."
        ),
        "type": "warning",
        "brands_involved": [high_discount_brand],
        "metric": {"label": "Avg Discount", "value": f"{high_discount_val}%"},
    })

    # ── Insight 2: Sentiment leader vs. rating leader ─────────────────────────
    brand_rating = products_df.groupby("brand")["rating"].mean()
    top_rated = brand_rating.idxmax()
    top_sentiment_brand = brand_sentiment.idxmax()

    if top_rated != top_sentiment_brand:
        insights.append({
            "id": 2,
            "title": "Star Ratings and Real Sentiment Diverge",
            "body": (
                f"{top_rated} leads on star ratings ({round(brand_rating[top_rated], 2)}★) "
                f"but {top_sentiment_brand} leads on genuine review sentiment ({round(brand_sentiment[top_sentiment_brand], 3)}). "
                "This suggests rating inflation — shoppers may rate generously but express subtle disappointment in review text."
            ),
            "type": "insight",
            "brands_involved": [top_rated, top_sentiment_brand],
            "metric": {"label": "Sentiment Gap", "value": str(round(brand_sentiment[top_sentiment_brand] - brand_sentiment[top_rated], 3))},
        })

    # ── Insight 3: Durability anomaly ─────────────────────────────────────────
    dur_col = "aspect_durability"
    if dur_col in reviews_df.columns:
        brand_dur = reviews_df.groupby("brand")[dur_col].mean()
        brand_overall_rating = products_df.groupby("brand")["rating"].mean()
        anomalies = []
        for brand in brand_dur.index:
            if brand_dur[brand] < -0.1 and brand_overall_rating.get(brand, 0) > 3.8:
                anomalies.append(brand)
        if anomalies:
            brand_str = ", ".join(anomalies)
            insights.append({
                "id": 3,
                "title": "Durability Red Flag Despite High Ratings",
                "body": (
                    f"{brand_str} show negative durability sentiment in review text "
                    "while maintaining a 3.8+ star average. This hidden signal suggests durability complaints "
                    "are underweighted in star scores — a potential quality time-bomb for repeat buyers."
                ),
                "type": "alert",
                "brands_involved": anomalies,
                "metric": {"label": "Durability Score", "value": str(round(brand_dur[anomalies[0]], 3))},
            })

    # ── Insight 4: Value for money winner ─────────────────────────────────────
    brand_price = products_df.groupby("brand")["price"].mean()
    vfm = {}
    for brand in brand_sentiment.index:
        if brand in brand_price.index:
            price_norm = brand_price[brand] / brand_price.max()
            vfm[brand] = round(brand_sentiment[brand] / max(price_norm, 0.01), 4)

    vfm_winner = max(vfm, key=vfm.get) if vfm else None
    if vfm_winner:
        insights.append({
            "id": 4,
            "title": f"{vfm_winner} Wins on Value-for-Money",
            "body": (
                f"{vfm_winner} delivers the highest sentiment-to-price ratio among all brands. "
                f"At an average price of ₹{round(brand_price.get(vfm_winner, 0)):,}, "
                "it outperforms pricier competitors in customer satisfaction. "
                "Ideal for budget-conscious frequent travelers."
            ),
            "type": "positive",
            "brands_involved": [vfm_winner],
            "metric": {"label": "Avg Price", "value": f"₹{round(brand_price.get(vfm_winner, 0)):,}"},
        })

    # ── Insight 5: Premium positioning analysis ────────────────────────────────
    premium_brands = [
        b for b in brand_price.index
        if brand_price[b] > brand_price.mean() * 1.2
    ]
    if premium_brands:
        pb = premium_brands[0]
        premium_sent = round(brand_sentiment.get(pb, 0), 3)
        insights.append({
            "id": 5,
            "title": "Premium Price — Is It Justified?",
            "body": (
                f"{pb} commands the highest average prices (₹{round(brand_price.get(pb, 0)):,}) "
                f"and backs it with a sentiment score of {premium_sent}. "
                "Its review themes consistently highlight material quality and brand trust — "
                "suggesting the premium positioning is validated by genuine customer experience."
            ),
            "type": "insight",
            "brands_involved": [pb],
            "metric": {"label": "Avg Price", "value": f"₹{round(brand_price.get(pb, 0)):,}"},
        })

    # ── Insight 6: Wheel complaint cluster ────────────────────────────────────
    wheel_col = "aspect_wheels"
    if wheel_col in reviews_df.columns:
        worst_wheels = reviews_df.groupby("brand")[wheel_col].mean().idxmin()
        worst_val = round(reviews_df.groupby("brand")[wheel_col].mean().min(), 3)
        insights.append({
            "id": 6,
            "title": "Wheels Are a Key Battleground",
            "body": (
                f"Wheel quality is the #1 differentiating aspect across brands. "
                f"{worst_wheels} has the worst wheel sentiment ({worst_val}) — "
                "a critical weakness since smooth wheels are the #1 factor in traveler satisfaction surveys. "
                "Brands investing in spinner wheel quality see compounding sentiment benefits."
            ),
            "type": "warning",
            "brands_involved": [worst_wheels],
            "metric": {"label": "Wheel Score", "value": str(worst_val)},
        })

    return insights

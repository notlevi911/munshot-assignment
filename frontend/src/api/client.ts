// API client for the Luggage Intelligence Dashboard
import axios from 'axios';

const BASE = 'http://localhost:8000';

const api = axios.create({ baseURL: BASE });

export interface Overview {
  total_brands: number;
  total_products: number;
  total_reviews_scraped: number;
  total_reviews_on_platform: number;
  avg_sentiment: number;
  avg_price: number;
  avg_discount_pct: number;
  avg_rating: number;
  top_rated_brand: string;
  lowest_rated_brand: string;
  brands: string[];
}

export interface AspectScores {
  wheels: number;
  handle: number;
  material: number;
  zipper: number;
  size: number;
  durability: number;
  lock: number;
  weight: number;
}

export interface BrandSummary {
  brand: string;
  product_count: number;
  review_count: number;
  total_platform_reviews: number;
  avg_price: number;
  avg_mrp: number;
  avg_discount_pct: number;
  avg_rating: number;
  avg_sentiment: number;
  positive_pct: number;
  negative_pct: number;
  aspect_scores: AspectScores;
  price_band_distribution: Record<string, number>;
  top_themes_positive: string[];
  top_themes_negative: string[];
  price_range: { min: number; max: number; median: number };
  categories: Record<string, number>;
  market_position?: string;
  strengths?: string[];
  weaknesses?: string[];
}

export interface Product {
  asin: string;
  brand: string;
  title: string;
  category: string;
  price: number;
  mrp: number;
  discount_pct: number;
  rating: number;
  review_count: number;
  material: string;
  color: string;
  image_url: string;
  url: string;
}

export interface ProductDetail extends Product {
  review_count_scraped: number;
  avg_sentiment: number;
  sentiment_distribution: { positive: number; neutral: number; negative: number };
  aspect_scores: AspectScores;
  top_themes_positive: string[];
  top_themes_negative: string[];
  top_reviews: Array<{
    review_id: string;
    rating: number;
    title: string;
    body: string;
    sentiment: string;
    compound_score: number;
    review_date: string;
  }>;
}

export interface Insight {
  id: number;
  title: string;
  body: string;
  type: 'warning' | 'alert' | 'insight' | 'positive';
  brands_involved: string[];
  metric: { label: string; value: string };
}

export interface ThemeData {
  brand: string;
  aspect_scores: AspectScores;
}

export const fetchOverview = () => api.get<Overview>('/api/overview').then(r => r.data);
export const fetchBrands = () => api.get<BrandSummary[]>('/api/brands').then(r => r.data);
export const fetchBrand = (brand: string) => api.get<BrandSummary>(`/api/brand/${brand}`).then(r => r.data);
export const fetchProducts = (params?: Record<string, string | number | undefined>) =>
  api.get<Product[]>('/api/products', { params }).then(r => r.data);
export const fetchProduct = (asin: string) => api.get<ProductDetail>(`/api/product/${asin}`).then(r => r.data);
export async function fetchCompare(brands: string): Promise<BrandSummary[]> {
  const res = await api.get('/api/compare', { params: { brands } })
  return res.data
}

let cachedInsights: Insight[] | null = null;

export async function fetchInsights(forceRefresh: boolean = false): Promise<Insight[]> {
  if (cachedInsights && !forceRefresh) {
    return cachedInsights;
  }
  const res = await api.get('/api/insights')
  cachedInsights = res.data;
  return res.data
}

export const fetchThemes = () => api.get<ThemeData[]>('/api/themes').then(r => r.data);

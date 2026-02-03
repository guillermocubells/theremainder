# Backend API Documentation

## Overview

FrondaPrima runs on **Lovable Cloud** (Supabase) with the following backend components:

## Database Tables

| Table | Description |
|-------|-------------|
| `plants` | Product catalog with botanical data |
| `categories` | Plant categories |
| `orders` / `order_items` | Order management |
| `profiles` | User profiles |
| `addresses` | Shipping addresses + garden profiles |
| `owned_plants` | User's plant collection |
| `plant_observations` / `plant_notes` | Collection tracking |
| `wishlist_items` | User wishlists |
| `shipping_zones` | Shipping configuration |
| `stock_notifications` | Stock alerts |
| `user_roles` | Admin role management |

## Edge Functions (API Endpoints)

### 1. Public Catalog API (`api-catalog`)

**Base URL:** `https://qsjnjitjbegtrxgwqygg.supabase.co/functions/v1/api-catalog`

#### Endpoints:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/plants` | List plants with filters |
| GET | `/plants/:slug` | Get plant details |
| GET | `/categories` | List categories |
| GET | `/shipping-zones` | List shipping zones |

#### Query Parameters for `/plants`:
- `category` - Filter by category slug
- `plant_type` - Filter by type (palm, fern, tree, cycad, shrub)
- `min_price` / `max_price` - Price range
- `in_stock` - Only in-stock items (true/false)
- `climate_zone` - Filter by climate zone
- `difficulty` - Filter by difficulty (easy, intermediate, advanced)
- `limit` - Results per page (default: 50)
- `offset` - Pagination offset

**Example:**
```bash
curl "https://qsjnjitjbegtrxgwqygg.supabase.co/functions/v1/api-catalog/plants?plant_type=palm&in_stock=true&limit=10"
```

---

### 2. Analytics API (`api-analytics`) - Admin Only

**Base URL:** `https://qsjnjitjbegtrxgwqygg.supabase.co/functions/v1/api-analytics`

**Requires:** Admin authentication (JWT in Authorization header)

#### Endpoints:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard` | Main metrics overview |
| GET | `/top-products` | Best selling products |
| GET | `/orders-by-status` | Orders breakdown |
| GET | `/shipping-zones-stats` | Revenue by country |
| GET | `/daily-revenue` | Revenue over time |

#### Query Parameters:
- `period` - Time range: 7d, 30d, 90d, 365d (default: 30d)
- `limit` - For top-products (default: 10)

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_JWT" \
  "https://qsjnjitjbegtrxgwqygg.supabase.co/functions/v1/api-analytics/dashboard?period=30d"
```

---

### 3. Plant Recommendations (`recommend-plants`)

AI-powered plant recommendations based on user filters and catalog.

**Method:** POST  
**Body:**
```json
{
  "user_prompt": "Palmera resistente al frío para exterior",
  "filters": {
    "min_temp_c": -5,
    "exposure": ["full_sun"],
    "difficulty": "easy"
  }
}
```

---

### 4. Shipping Calculator (`calculate-shipping`)

**Method:** POST  
**Body:**
```json
{
  "items": [{ "plantId": "uuid", "quantity": 2 }],
  "countryCode": "ES"
}
```

---

### 5. Checkout (`create-checkout`)

Creates Stripe checkout session.

**Method:** POST  
**Requires:** Authentication

---

### 6. Notification Emails (`send-notification-email`)

**Method:** POST  
**Requires:** RESEND_API_KEY secret

**Email Types:**
- `stock_available` - Stock notification
- `order_shipped` - Shipping confirmation
- `order_delivered` - Delivery confirmation
- `welcome` - Welcome email

**Body:**
```json
{
  "type": "stock_available",
  "to": "user@example.com",
  "data": {
    "plant_name": "Trachycarpus fortunei",
    "price": 49.90,
    "plant_url": "https://..."
  }
}
```

---

## Authentication

Uses Supabase Auth with:
- Email/password authentication
- Row Level Security (RLS) on all tables
- Admin role checks via `has_role()` function

---

## Storage Buckets

| Bucket | Purpose | Public |
|--------|---------|--------|
| `plant-images` | Product images | Yes |
| `collection-photos` | User plant photos | Yes |

---

## Secrets Required

| Secret | Purpose |
|--------|---------|
| `STRIPE_SECRET_KEY` | Payment processing |
| `LOVABLE_API_KEY` | AI recommendations |
| `RESEND_API_KEY` | Email notifications (optional) |

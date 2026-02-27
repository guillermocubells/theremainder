# Search Index Schema — FrondaPrima Catalog

> Version: 1.0 · Date: 2026-02-27 · Engine: Edge Function + Lovable AI (gemini-2.5-flash)

## 1. Primary Entity: `plants`

### 1.1 Searchable Fields (Full-Text, Analyzed)

| Field              | DB Column          | Analyzer          | Boost | Notes                          |
|--------------------|--------------------|-------------------|-------|--------------------------------|
| `name`             | `name`             | standard + ngram  | 3.0   | Scientific name, primary match |
| `common_name`      | `common_name`      | standard + ngram  | 2.5   | Vernacular / trade name        |
| `scientific_name`  | `scientific_name`  | keyword + lower   | 2.0   | Binomial nomenclature          |
| `family`           | `family`           | keyword + lower   | 1.0   | Taxonomic family               |
| `variety`          | `variety`          | standard          | 1.5   | Cultivar / subspecies          |
| `description`      | `description`      | standard + stop   | 1.0   | Long-text body (es/en)         |
| `notes`            | `notes`            | standard          | 0.5   | Internal / admin context       |

### 1.2 Filterable / Facet Fields

| Field              | DB Column          | Type       | Facet | Multi-value |
|--------------------|--------------------|------------|-------|-------------|
| `category`         | `category_id`      | uuid→name  | ✅    | No          |
| `plant_type`       | `plant_type`       | enum       | ✅    | No          |
| `difficulty`       | `difficulty`       | enum       | ✅    | No          |
| `rarity`           | `rarity`           | enum       | ✅    | No          |
| `water`            | `water`            | enum       | ✅    | No          |
| `humidity`         | `humidity`         | enum       | ✅    | No          |
| `exposure`         | `exposure`         | keyword[]  | ✅    | Yes         |
| `climate_zones`    | `climate_zones`    | keyword[]  | ✅    | Yes         |
| `hardiness_zones`  | `hardiness_zones`  | keyword[]  | ✅    | Yes         |
| `plant_use`        | `plant_use`        | keyword[]  | ✅    | Yes         |
| `is_active`        | `is_active`        | boolean    | ❌    | No (pre-filter) |
| `is_featured`      | `is_featured`      | boolean    | ❌    | No (boost signal) |
| `in_stock`         | `stock_qty > 0`    | boolean    | ❌    | No (pre-filter) |

### 1.3 Sortable Fields

| Field              | DB Column          | Direction   | Default |
|--------------------|--------------------|-------------|---------|
| `price`            | `price`            | asc / desc  | —       |
| `sale_price`       | `sale_price`       | asc / desc  | —       |
| `display_order`    | `display_order`    | asc         | ✅ primary |
| `created_at`       | `created_at`       | desc        | —       |
| `name`             | `name`             | asc         | —       |
| `rarity_ordinal`   | mapped from rarity | desc        | —       |

### 1.4 Relevance Signals

| Signal                   | Weight | Logic                            |
|--------------------------|--------|----------------------------------|
| `is_featured`            | +50%   | Boosted in default ranking       |
| `in_stock`               | +30%   | Prefer available items           |
| `has_product_images`     | +10%   | Visual completeness bonus        |
| `on_sale`                | +5%    | Active promotion bonus           |
| `viability_score`        | ×1.2   | When postal/climate context present |

---

## 2. Analyzers / Tokenizers

### 2.1 `standard`
- Unicode tokenization → lowercase → accent folding
- Language: es/en dual

### 2.2 `ngram` (edge n-gram, min=2, max=15)
- Applied to `name`, `common_name` for prefix/partial matching
- Example: "Rhopa" → matches "Rhopalostylis"

### 2.3 `keyword_lower`
- No tokenization → lowercase only
- Used for exact-match scientific names and family

### 2.4 `stopwords_es_en`
- Standard + Spanish stop words + English stop words
- Applied to `description`

### 2.5 `synonym_expansion`
Managed in `src/config/searchIndex.ts` — synonym groups:

```
palmera → palm, arecaceae, rhopalostylis, brahea, sabal, chamaedorea
helecho → fern, cyathea, dicksonia, arborescente
tropical → cálido, exótico, subtropical
frío → resistente, heladas, continental
sol → soleada, luz, directo, pleno
sombra → sombreada, semisombra, filtrada
```

---

## 3. AI Semantic Layer

The search pipeline has two tiers:

### Tier 1: Client-side fast filter (`useAISearch`)
- Fuzzy matching (Levenshtein + trigram)
- Pattern detection (location, care, type queries)
- Synonym expansion
- Viability scoring when postal code detected
- **Latency**: <5ms, no network call

### Tier 2: Server-side AI ranking (`recommend-plants` edge function)
- Sends filtered catalog subset to Lovable AI (gemini-2.5-flash)
- AI returns `fit_score`, `reasoning`, `tradeoffs` per plant
- Viability factors calculated server-side
- **Latency**: 1–3s, rate-limited (30 req/hr auth, 10 req/hr anon)

### Pipeline Flow
```
User Query
  │
  ├─► Tier 1: Client fuzzy + pattern matching (instant)
  │     └─► Results displayed immediately
  │
  └─► Tier 2: AI recommendation (async, optional)
        └─► Enhanced results with viability + reasoning
```

---

## 4. Pre-filters (Always Applied)

```sql
WHERE is_active = true
  AND stock_qty > 0   -- for shop views (optional in admin)
```

---

## 5. Viability Scoring Model

When geographic context is detected (postal code or city name):

| Factor             | Range | Source                    |
|--------------------|-------|---------------------------|
| `globalViability`  | 1–10  | Climate ↔ plant compatibility |
| `coldResistance`   | 1–10  | `min_temp_c` + plant_type |
| `humidityTolerance`| 1–10  | `water` + `humidity`      |
| `clayAdaptation`   | 1–10  | Plant family heuristics   |
| `sunExposure`      | 1–10  | `exposure` array          |
| `pestResistance`   | 1–10  | Plant type heuristics     |

**Total score** = avg(all factors), clamped 1–10.

---

## 6. Query Parameter API

### Client-side URL params (catalog page)

```
?search=palmera+tropical
&type=palm
&zone=9a,9b
&difficulty=beginner,intermediate
&water=low,medium
&exposure=full_sun
&sort=price_asc
&page=1
```

### Edge function request body

```json
{
  "user_prompt": "palmera resistente al frío para Cantabria",
  "filters": {
    "plant_type": ["palm"],
    "climate_zones": ["atlantico"],
    "min_stock": 1
  },
  "catalog_subset": []
}
```

---

## 7. Response Schema

```json
{
  "recommendations": [
    {
      "plant_id": "uuid",
      "fit_score": 0.85,
      "reasoning": "Excellent cold tolerance for Atlantic climate",
      "tradeoffs": "Slower growth in humid conditions",
      "viability": {
        "totalScore": 8,
        "factors": {
          "globalViability": 8,
          "coldResistance": 9,
          "humidityTolerance": 7,
          "clayAdaptation": 8,
          "sunExposure": 6,
          "pestResistance": 7
        },
        "recommendation": "Excelente opción para clima atlántico"
      }
    }
  ],
  "confidence": "high",
  "no_good_match": false
}
```

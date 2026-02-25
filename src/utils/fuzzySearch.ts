/**
 * Fuzzy full-text search with typo tolerance, scoring and highlight ranges.
 */

// ── Levenshtein distance (bounded) ──────────────────────────────────────────

function levenshtein(a: string, b: string, maxDist: number): number {
  if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1;
  const la = a.length, lb = b.length;
  let prev = Array.from({ length: lb + 1 }, (_, i) => i);
  let curr = new Array(lb + 1);
  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[lb];
}

// ── Normalize text (strip accents, lowercase) ───────────────────────────────

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// ── Highlight range ─────────────────────────────────────────────────────────

export interface HighlightRange {
  start: number;
  end: number; // exclusive
}

/**
 * Find ranges in `text` that match `query` tokens (exact substring or fuzzy).
 * Returns ranges in the ORIGINAL text (not normalized).
 */
function findHighlightRanges(text: string, queryTokens: string[]): HighlightRange[] {
  const normText = normalize(text);
  const ranges: HighlightRange[] = [];

  for (const token of queryTokens) {
    if (token.length < 2) continue;
    let idx = 0;
    // Exact substring matches first
    while ((idx = normText.indexOf(token, idx)) !== -1) {
      ranges.push({ start: idx, end: idx + token.length });
      idx += token.length;
    }
  }

  // Merge overlapping ranges
  if (ranges.length === 0) return [];
  ranges.sort((a, b) => a.start - b.start);
  const merged: HighlightRange[] = [ranges[0]];
  for (let i = 1; i < ranges.length; i++) {
    const last = merged[merged.length - 1];
    if (ranges[i].start <= last.end) {
      last.end = Math.max(last.end, ranges[i].end);
    } else {
      merged.push(ranges[i]);
    }
  }
  return merged;
}

// ── Searchable fields ───────────────────────────────────────────────────────

export interface SearchableItem {
  id: string;
  /** Fields to search, ordered by relevance weight (first = highest) */
  fields: string[];
}

export interface SearchResult<T> {
  item: T;
  score: number;
  /** Highlight ranges per field index */
  highlights: Map<number, HighlightRange[]>;
}

// ── Scoring ─────────────────────────────────────────────────────────────────

const FIELD_WEIGHTS = [10, 7, 5, 3, 2, 1]; // weight by field position

function scoreToken(token: string, fieldNorm: string, maxTypos: number): number {
  // Exact substring → best
  if (fieldNorm.includes(token)) return 1.0;
  // Prefix match on any word in the field
  const words = fieldNorm.split(/\s+/);
  for (const w of words) {
    if (w.startsWith(token)) return 0.9;
  }
  // Fuzzy match on words
  for (const w of words) {
    const dist = levenshtein(token, w.slice(0, token.length + 2), maxTypos);
    if (dist <= maxTypos) return 0.7 - dist * 0.1;
  }
  // Fuzzy match on substrings (sliding window)
  if (token.length >= 3) {
    for (let i = 0; i <= fieldNorm.length - token.length; i++) {
      const sub = fieldNorm.slice(i, i + token.length);
      const dist = levenshtein(token, sub, maxTypos);
      if (dist <= maxTypos) return 0.5 - dist * 0.1;
    }
  }
  return 0;
}

/**
 * Max allowed typos based on token length.
 */
function maxTypos(tokenLen: number): number {
  if (tokenLen <= 3) return 0;
  if (tokenLen <= 5) return 1;
  return 2;
}

// ── Main search function ────────────────────────────────────────────────────

export function fuzzySearch<T extends SearchableItem>(
  items: T[],
  query: string,
  limit = 8
): SearchResult<T>[] {
  const normQuery = normalize(query.trim());
  if (!normQuery) return [];

  const tokens = normQuery.split(/\s+/).filter(t => t.length >= 2);
  if (tokens.length === 0) return [];

  const results: SearchResult<T>[] = [];

  for (const item of items) {
    let totalScore = 0;
    const highlights = new Map<number, HighlightRange[]>();

    for (let fi = 0; fi < item.fields.length; fi++) {
      const field = item.fields[fi];
      if (!field) continue;
      const fieldNorm = normalize(field);
      const weight = FIELD_WEIGHTS[Math.min(fi, FIELD_WEIGHTS.length - 1)];
      let fieldScore = 0;

      for (const token of tokens) {
        const ts = scoreToken(token, fieldNorm, maxTypos(token.length));
        fieldScore += ts;
      }

      if (fieldScore > 0) {
        totalScore += fieldScore * weight;
        const hl = findHighlightRanges(field, tokens);
        if (hl.length > 0) highlights.set(fi, hl);
      }
    }

    // Bonus: full query exact match in name
    if (normalize(item.fields[0] || "").includes(normQuery)) {
      totalScore += 20;
    }

    if (totalScore > 0) {
      results.push({ item, score: totalScore, highlights });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

// ── Helpers for rendering ───────────────────────────────────────────────────

export interface HighlightSegment {
  text: string;
  highlighted: boolean;
}

/**
 * Split text into highlighted / plain segments.
 */
export function splitByHighlights(text: string, ranges: HighlightRange[]): HighlightSegment[] {
  if (!ranges.length) return [{ text, highlighted: false }];
  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const { start, end } of ranges) {
    if (start > cursor) segments.push({ text: text.slice(cursor, start), highlighted: false });
    segments.push({ text: text.slice(start, end), highlighted: true });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), highlighted: false });
  return segments;
}

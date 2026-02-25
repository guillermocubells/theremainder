import { Plant } from "@/data/plants";

/**
 * Multi-factor scoring for plant relatedness.
 * Higher score = more related to the reference plant.
 */
function scoreRelatedness(candidate: Plant, ref: Plant): number {
  let score = 0;

  // Same plant group (strongest signal)
  if (candidate.plantGroup && candidate.plantGroup === ref.plantGroup) {
    score += 40;
  }

  // Overlapping climate zones
  if (candidate.climateZones?.length && ref.climateZones?.length) {
    const overlap = candidate.climateZones.filter(z => ref.climateZones!.includes(z)).length;
    score += Math.min(overlap * 10, 20);
  }

  // Overlapping hardiness zones (compatible growing conditions)
  if (candidate.hardinessZones?.length && ref.hardinessZones?.length) {
    const overlap = candidate.hardinessZones.filter(z => ref.hardinessZones!.includes(z)).length;
    score += Math.min(overlap * 3, 15);
  }

  // Same water needs
  if (candidate.waterNeeds && candidate.waterNeeds === ref.waterNeeds) {
    score += 10;
  }

  // Same light requirements
  if (candidate.light && candidate.light === ref.light) {
    score += 8;
  }

  // Similar price range (within 40%)
  if (candidate.price != null && ref.price != null && ref.price > 0) {
    const ratio = candidate.price / ref.price;
    if (ratio >= 0.6 && ratio <= 1.4) score += 5;
  }

  // Same ornamental value tier
  if (candidate.ornamentalValue && candidate.ornamentalValue === ref.ornamentalValue) {
    score += 5;
  }

  // Prefer in-stock items
  if (candidate.quantity > 0) score += 8;

  return score;
}

/**
 * Returns scored & sorted related plants for a given reference plant.
 * Falls back to popular/in-stock items if not enough related matches.
 */
export function getRelatedPlants(
  allPlants: Plant[],
  currentPlant: Plant,
  maxItems = 4,
  minScore = 15,
): Plant[] {
  const candidates = allPlants.filter(p => p.id !== currentPlant.id);

  const scored = candidates
    .map(p => ({ plant: p, score: scoreRelatedness(p, currentPlant) }))
    .sort((a, b) => b.score - a.score);

  // Take items above the minimum relatedness threshold
  const related = scored
    .filter(s => s.score >= minScore)
    .slice(0, maxItems)
    .map(s => s.plant);

  // If we don't have enough, fill with popular fallback (in-stock first, then by price desc)
  if (related.length < maxItems) {
    const usedIds = new Set([currentPlant.id, ...related.map(p => p.id)]);
    const fallback = candidates
      .filter(p => !usedIds.has(p.id))
      .sort((a, b) => {
        // In-stock first
        const stockDiff = (b.quantity > 0 ? 1 : 0) - (a.quantity > 0 ? 1 : 0);
        if (stockDiff !== 0) return stockDiff;
        // Then by price descending (premium items = more interesting)
        return (b.price ?? 0) - (a.price ?? 0);
      })
      .slice(0, maxItems - related.length);

    related.push(...fallback);
  }

  return related;
}

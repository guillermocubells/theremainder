import { useMemo } from "react";
import { plants, type Plant } from "@/data/plants";

export interface RecentPurchase {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  city: string;
  hoursAgo: number;
  quantity: number;
  buyerType: "first" | "repeat";
}

const CITIES = [
  "Barcelona", "Madrid", "Valencia", "Sevilla", "Bilbao",
  "Málaga", "Zaragoza", "Santander", "A Coruña", "Alicante",
  "Cádiz", "Granada", "Palma", "Tenerife", "Oviedo",
];

/**
 * Deterministic pseudo-random from a seed string.
 */
function seedRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = (h ^ (h >>> 16)) * 0x45d9f3b;
    h = (h ^ (h >>> 16)) * 0x45d9f3b;
    h = h ^ (h >>> 16);
    return (h >>> 0) / 0xffffffff;
  };
}

/**
 * Generates mock recent-purchase data for social proof.
 * Uses a deterministic seed (productId + day) so results stay
 * stable during a browsing session but rotate daily.
 */
export function useRecentPurchases(
  currentPlant: Plant,
  maxItems = 5
): RecentPurchase[] {
  return useMemo(() => {
    const dayKey = new Date().toISOString().slice(0, 10);
    const rand = seedRandom(`${currentPlant.id}-${dayKey}`);

    // Collect the current product + related (same group) products
    const related = plants.filter(
      (p) =>
        p.id !== currentPlant.id &&
        p.plantGroup === currentPlant.plantGroup &&
        p.quantity > 0
    );

    const pool: Plant[] = [currentPlant, ...related];

    // Decide how many purchases to show (2–5, weighted by stock)
    const count = Math.min(
      maxItems,
      Math.max(2, Math.floor(rand() * 4) + 2)
    );

    const purchases: RecentPurchase[] = [];

    for (let i = 0; i < count; i++) {
      const plant = pool[Math.floor(rand() * pool.length)];
      const hoursAgo = Math.floor(rand() * 168) + 1; // 1 h – 7 days
      const city = CITIES[Math.floor(rand() * CITIES.length)];
      const qty = rand() > 0.7 ? Math.floor(rand() * 2) + 2 : 1;
      const buyerType = rand() > 0.6 ? "repeat" : "first";

      purchases.push({
        id: `rp-${plant.id}-${i}`,
        productId: plant.id,
        productName: plant.name,
        productImage: plant.images?.[0],
        city,
        hoursAgo,
        quantity: qty,
        buyerType,
      });
    }

    // Sort most recent first
    purchases.sort((a, b) => a.hoursAgo - b.hoursAgo);

    return purchases;
  }, [currentPlant, maxItems]);
}

import { useMemo } from 'react';
import { plants, Plant } from '@/data/plants';
import { useCart, CartItem } from '@/contexts/CartContext';
import { PROMO_CONFIG } from '@/config/store';

export interface PromoState {
  /** Current cart subtotal (products only) */
  subtotal: number;
  /** Amount remaining to unlock the discount */
  missingAmount: number;
  /** Whether the threshold has been reached */
  isUnlocked: boolean;
  /** The discount percentage */
  discountValue: number;
  /** The saved amount in EUR when unlocked */
  savedAmount: number;
  /** Progress 0–100 */
  progress: number;
  /** Threshold in EUR */
  threshold: number;
  /** Recommended filler products to reach threshold */
  recommendations: Plant[];
}

/**
 * Scores a candidate plant for recommendation.
 * Higher score = better recommendation.
 */
function scorePlant(
  plant: Plant,
  cartGroups: Set<string | undefined>,
  fillerMax: number,
): number {
  let score = 0;

  // Prefer cheapest items (normalised: cheaper → higher score)
  const price = plant.price ?? 0;
  if (price <= fillerMax) score += 30;
  else if (price <= fillerMax * 1.6) score += 15; // fallback <8€
  else if (price <= fillerMax * 2.4) score += 5;  // fallback <12€

  // Same group as something in the cart
  if (cartGroups.has(plant.plantGroup)) score += 20;

  // Lower absolute price is better (tie-breaker)
  score += Math.max(0, 20 - price);

  // Higher stock = more available = slight preference
  if (plant.quantity >= 3) score += 5;

  // Lighter items = cheaper shipping
  if (plant.weightGrams && plant.weightGrams < 3000) score += 5;

  return score;
}

export function useOrderPromotion(): PromoState {
  const { items, getTotalPrice } = useCart();

  return useMemo(() => {
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const { thresholdAmount, discountPercent, fillerMaxPrice, maxRecommendations } = PROMO_CONFIG;

    const missingAmount = Math.max(0, thresholdAmount - subtotal);
    const isUnlocked = subtotal >= thresholdAmount;
    const savedAmount = isUnlocked ? +(subtotal * discountPercent / 100).toFixed(2) : 0;
    const progress = Math.min(100, (subtotal / thresholdAmount) * 100);

    // ── Build recommendations ──
    const cartIds = new Set(items.map((i) => i.plantId));
    const cartGroups = new Set(items.map((i) => {
      const p = plants.find((pl) => pl.id === i.plantId);
      return p?.plantGroup;
    }));

    const candidates = plants
      .filter((p) => !cartIds.has(p.id) && p.quantity > 0)
      .map((p) => ({ plant: p, score: scorePlant(p, cartGroups, fillerMaxPrice) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxRecommendations)
      .map((c) => c.plant);

    return {
      subtotal,
      missingAmount,
      isUnlocked,
      discountValue: discountPercent,
      savedAmount,
      progress,
      threshold: thresholdAmount,
      recommendations: candidates,
    };
  }, [items]);
}

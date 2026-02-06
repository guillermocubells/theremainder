import { useState, useEffect, useCallback } from "react";
import { STORAGE_KEYS } from "@/config/store";

const STORAGE_KEY = STORAGE_KEYS.recentlyViewed;
const MAX_ITEMS = 8;

export interface RecentlyViewedItem {
  id: string;
  viewedAt: number;
}

export const useRecentlyViewed = () => {
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedItem[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as RecentlyViewedItem[];
        setRecentlyViewed(parsed);
      }
    } catch (error) {
      console.error("Error loading recently viewed:", error);
    }
  }, []);

  // Add a plant to recently viewed
  const addToRecentlyViewed = useCallback((plantId: string) => {
    setRecentlyViewed((prev) => {
      // Remove if already exists
      const filtered = prev.filter((item) => item.id !== plantId);
      
      // Add to beginning with current timestamp
      const updated = [
        { id: plantId, viewedAt: Date.now() },
        ...filtered,
      ].slice(0, MAX_ITEMS);

      // Persist to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Error saving recently viewed:", error);
      }

      return updated;
    });
  }, []);

  // Clear all recently viewed
  const clearRecentlyViewed = useCallback(() => {
    setRecentlyViewed([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing recently viewed:", error);
    }
  }, []);

  // Get plant IDs (excluding a specific one if needed)
  const getRecentIds = useCallback(
    (excludeId?: string) => {
      return recentlyViewed
        .filter((item) => item.id !== excludeId)
        .map((item) => item.id);
    },
    [recentlyViewed]
  );

  return {
    recentlyViewed,
    addToRecentlyViewed,
    clearRecentlyViewed,
    getRecentIds,
  };
};

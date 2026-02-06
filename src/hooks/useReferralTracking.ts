import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { storePendingReferral } from "@/hooks/useReferral";

const REFERRAL_EXPIRY_KEY = "frondaprima_referral_expiry";
const REFERRAL_EXPIRY_DAYS = 30;

/**
 * Hook to capture ?ref=CODE from URL and store it in localStorage.
 * Should be used on the landing page (Index).
 */
export const useReferralTracking = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (!refCode) return;

    // Store the referral code
    storePendingReferral(refCode);

    // Set expiry (30 days)
    const expiry = Date.now() + REFERRAL_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    try {
      localStorage.setItem(REFERRAL_EXPIRY_KEY, expiry.toString());
    } catch (e) {
      // silent
    }

    // Clean URL without reloading
    searchParams.delete("ref");
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);
};

/**
 * Check if the stored referral has expired and clean it up
 */
export const cleanExpiredReferral = () => {
  try {
    const expiry = localStorage.getItem(REFERRAL_EXPIRY_KEY);
    if (expiry && Date.now() > parseInt(expiry, 10)) {
      localStorage.removeItem("frondaprima_pending_referral");
      localStorage.removeItem(REFERRAL_EXPIRY_KEY);
    }
  } catch (e) {
    // silent
  }
};

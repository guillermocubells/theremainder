import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { STORAGE_KEYS } from "@/config/store";

export interface CurrencyRate {
  target_currency: string;
  rate: number;
}

interface CurrencyContextValue {
  /** Active currency code (e.g. "EUR", "USD") */
  currency: string;
  /** All loaded rates (base = EUR) */
  rates: Record<string, number>;
  /** Whether rates have loaded */
  isReady: boolean;
  /** Convert an amount in EUR to the active currency */
  convert: (eurAmount: number) => number;
  /** Format an amount in EUR into the active currency string */
  formatPrice: (eurAmount: number) => string;
  /** Manually switch currency */
  setCurrency: (code: string) => void;
  /** Available currency codes */
  availableCurrencies: string[];
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

// Map locale/country to currency
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  US: "USD", CA: "CAD", GB: "GBP", AU: "AUD",
  CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK",
  PL: "PLN", CZ: "CZK", JP: "JPY",
  // All eurozone countries default to EUR
  ES: "EUR", FR: "EUR", DE: "EUR", IT: "EUR", PT: "EUR",
  NL: "EUR", BE: "EUR", AT: "EUR", IE: "EUR", FI: "EUR",
  GR: "EUR", LU: "EUR", MT: "EUR", CY: "EUR", SK: "EUR",
  SI: "EUR", EE: "EUR", LV: "EUR", LT: "EUR", HR: "EUR",
};

const CURRENCY_LOCALES: Record<string, string> = {
  EUR: "es-ES", USD: "en-US", GBP: "en-GB", CHF: "de-CH",
  SEK: "sv-SE", NOK: "nb-NO", DKK: "da-DK", PLN: "pl-PL",
  CZK: "cs-CZ", JPY: "ja-JP", CAD: "en-CA", AUD: "en-AU",
};

function detectCurrencyFromLocale(): string {
  try {
    // Try navigator.language → extract country
    const lang = navigator.language || "es-ES";
    const parts = lang.split("-");
    const country = parts.length > 1 ? parts[1].toUpperCase() : "";
    if (country && COUNTRY_CURRENCY_MAP[country]) {
      return COUNTRY_CURRENCY_MAP[country];
    }
    // Try Intl
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz.startsWith("America/New_York") || tz.startsWith("America/Chicago") || tz.startsWith("America/Denver") || tz.startsWith("America/Los_Angeles")) return "USD";
    if (tz.startsWith("Europe/London")) return "GBP";
    if (tz.startsWith("Asia/Tokyo")) return "JPY";
    if (tz.startsWith("Australia/")) return "AUD";
    if (tz.startsWith("America/Toronto") || tz.startsWith("America/Vancouver")) return "CAD";
  } catch {
    // ignore
  }
  return "EUR";
}

const STORAGE_KEY = "frondaprima_currency";

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || detectCurrencyFromLocale();
    } catch {
      return "EUR";
    }
  });
  const [rates, setRates] = useState<Record<string, number>>({ EUR: 1 });
  const [isReady, setIsReady] = useState(false);

  // Load rates from DB
  useEffect(() => {
    const loadRates = async () => {
      const { data, error } = await supabase
        .from("currency_rates")
        .select("target_currency, rate");

      if (error) {
        console.warn("[CurrencyContext] Failed to load rates:", error.message);
        setIsReady(true);
        return;
      }

      if (data && data.length > 0) {
        const rateMap: Record<string, number> = { EUR: 1 };
        data.forEach((r: any) => {
          rateMap[r.target_currency] = Number(r.rate);
        });
        setRates(rateMap);
      }
      setIsReady(true);
    };

    loadRates();
  }, []);

  // If detected currency not in rates, fall back to EUR
  useEffect(() => {
    if (isReady && !rates[currency]) {
      setCurrencyState("EUR");
    }
  }, [isReady, rates, currency]);

  const setCurrency = useCallback((code: string) => {
    setCurrencyState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch { /* ignore */ }
  }, []);

  const convert = useCallback(
    (eurAmount: number): number => {
      const rate = rates[currency] ?? 1;
      return eurAmount * rate;
    },
    [currency, rates]
  );

  const formatPrice = useCallback(
    (eurAmount: number): string => {
      const converted = convert(eurAmount);
      const locale = CURRENCY_LOCALES[currency] || "es-ES";
      return converted.toLocaleString(locale, {
        style: "currency",
        currency: currency,
        minimumFractionDigits: currency === "JPY" ? 0 : 2,
        maximumFractionDigits: currency === "JPY" ? 0 : 2,
      });
    },
    [currency, convert]
  );

  const availableCurrencies = useMemo(() => Object.keys(rates).sort(), [rates]);

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      rates,
      isReady,
      convert,
      formatPrice,
      setCurrency,
      availableCurrencies,
    }),
    [currency, rates, isReady, convert, formatPrice, setCurrency, availableCurrencies]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }
  return ctx;
}

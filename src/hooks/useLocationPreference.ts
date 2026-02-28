import { useState, useEffect, useCallback, useRef } from "react";
import { analyzePostalCodeClimate, ClimateInfo } from "@/utils/viabilityCalculator";

// ── Types ────────────────────────────────────────────────────────────

export type LocationSource = "geolocation" | "manual" | "ip" | "saved_address" | "none";
export type GeoPermission = "prompt" | "granted" | "denied" | "unavailable";

export interface LocationPreference {
  postalCode: string;
  city: string;
  region: string;
  country: string;
  source: LocationSource;
  climate: ClimateInfo | null;
  addressId: string | null;
  updatedAt: number;
}

interface UseLocationPreferenceResult {
  location: LocationPreference | null;
  permission: GeoPermission;
  loading: boolean;
  error: string | null;
  /** Try browser geolocation → reverse geocode → extract postal code */
  requestGeolocation: () => Promise<void>;
  /** Set location manually from postal code */
  setManualPostalCode: (postalCode: string) => void;
  /** Set location from a saved user address */
  setFromAddress: (address: { id: string; postal_code: string; city: string; province: string; country: string }) => void;
  /** Clear stored location */
  clearLocation: () => void;
  /** Check if geolocation API is available */
  isGeoAvailable: boolean;
}

// ── Storage key ──────────────────────────────────────────────────────
const STORAGE_KEY = "fp_location_pref";

function loadStored(): LocationPreference | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocationPreference;
    // Expire after 30 days
    if (Date.now() - parsed.updatedAt > 30 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveStored(pref: LocationPreference) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pref));
  } catch {
    // quota exceeded, ignore
  }
}

// ── Reverse geocode via Nominatim (free, no API key) ─────────────────
async function reverseGeocode(lat: number, lon: number): Promise<{
  postalCode: string;
  city: string;
  region: string;
  country: string;
} | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&accept-language=es`,
      { headers: { "User-Agent": "FrondaPrima/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};
    return {
      postalCode: addr.postcode || "",
      city: addr.city || addr.town || addr.village || addr.municipality || "",
      region: addr.state || addr.county || "",
      country: addr.country_code?.toUpperCase() || "",
    };
  } catch {
    return null;
  }
}

// ── IP-based fallback via ipapi (free tier, no key) ──────────────────
async function ipFallbackLocation(): Promise<{
  postalCode: string;
  city: string;
  region: string;
  country: string;
} | null> {
  try {
    const res = await fetch("https://ipapi.co/json/", {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      postalCode: data.postal || "",
      city: data.city || "",
      region: data.region || "",
      country: data.country_code || "",
    };
  } catch {
    return null;
  }
}

// ── Postal code → region name mapping (for manual input) ─────────────
function postalCodeToRegionLabel(code: string): string {
  const num = parseInt(code.replace(/\D/g, ""), 10);
  if (isNaN(num)) return "";

  // Spanish codes
  if (num >= 1000 && num <= 52999) {
    const province = Math.floor(num / 1000);
    const map: Record<number, string> = {
      1: "Álava", 2: "Albacete", 3: "Alicante", 4: "Almería", 5: "Ávila",
      6: "Badajoz", 7: "Baleares", 8: "Barcelona", 9: "Burgos", 10: "Cáceres",
      11: "Cádiz", 12: "Castellón", 13: "Ciudad Real", 14: "Córdoba", 15: "A Coruña",
      16: "Cuenca", 17: "Girona", 18: "Granada", 19: "Guadalajara", 20: "Gipuzkoa",
      21: "Huelva", 22: "Huesca", 23: "Jaén", 24: "León", 25: "Lleida",
      26: "La Rioja", 27: "Lugo", 28: "Madrid", 29: "Málaga", 30: "Murcia",
      31: "Navarra", 32: "Ourense", 33: "Asturias", 34: "Palencia", 35: "Las Palmas",
      36: "Pontevedra", 37: "Salamanca", 38: "S/C Tenerife", 39: "Cantabria",
      40: "Segovia", 41: "Sevilla", 42: "Soria", 43: "Tarragona", 44: "Teruel",
      45: "Toledo", 46: "Valencia", 47: "Valladolid", 48: "Bizkaia", 49: "Zamora",
      50: "Zaragoza", 51: "Ceuta", 52: "Melilla",
    };
    return map[province] || "";
  }
  return "";
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useLocationPreference(): UseLocationPreferenceResult {
  const [location, setLocation] = useState<LocationPreference | null>(loadStored);
  const [permission, setPermission] = useState<GeoPermission>("prompt");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ipFetchedRef = useRef(false);

  const isGeoAvailable = typeof navigator !== "undefined" && "geolocation" in navigator;

  // Check permission state on mount
  useEffect(() => {
    if (!isGeoAvailable) {
      setPermission("unavailable");
      return;
    }
    navigator.permissions?.query({ name: "geolocation" }).then((result) => {
      setPermission(result.state as GeoPermission);
      result.addEventListener("change", () => {
        setPermission(result.state as GeoPermission);
      });
    }).catch(() => {
      // permissions API not available, stay at "prompt"
    });
  }, [isGeoAvailable]);

  // IP fallback on mount if no stored location
  useEffect(() => {
    if (location || ipFetchedRef.current) return;
    ipFetchedRef.current = true;

    ipFallbackLocation().then((geo) => {
      if (!geo || !geo.postalCode) return;
      const climate = analyzePostalCodeClimate(geo.postalCode);
      const pref: LocationPreference = {
        postalCode: geo.postalCode,
        city: geo.city,
        region: geo.region,
        country: geo.country,
        source: "ip",
        climate,
        addressId: null,
        updatedAt: Date.now(),
      };
      setLocation(pref);
      // Don't persist IP-based — ephemeral until user confirms
    });
  }, [location]);

  const applyLocation = useCallback(
    (
      postalCode: string,
      city: string,
      region: string,
      country: string,
      source: LocationSource,
      addressId: string | null = null
    ) => {
      const climate = postalCode ? analyzePostalCodeClimate(postalCode) : null;
      const pref: LocationPreference = {
        postalCode,
        city,
        region,
        country,
        source,
        climate,
        addressId,
        updatedAt: Date.now(),
      };
      setLocation(pref);
      if (source !== "ip") saveStored(pref);
      setError(null);
    },
    []
  );

  const requestGeolocation = useCallback(async () => {
    if (!isGeoAvailable) {
      setError("La geolocalización no está disponible en este navegador");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000, // 5 min cache
        });
      });

      const geo = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      if (!geo || !geo.postalCode) {
        // Fallback to IP if reverse geocode fails
        const ipGeo = await ipFallbackLocation();
        if (ipGeo?.postalCode) {
          applyLocation(ipGeo.postalCode, ipGeo.city, ipGeo.region, ipGeo.country, "geolocation");
        } else {
          setError("No se pudo determinar tu ubicación. Introduce un código postal manualmente.");
        }
      } else {
        applyLocation(geo.postalCode, geo.city, geo.region, geo.country, "geolocation");
      }
    } catch (err) {
      const geoErr = err as GeolocationPositionError;
      if (geoErr.code === geoErr.PERMISSION_DENIED) {
        setPermission("denied");
        setError("Permiso de ubicación denegado. Puedes introducir tu código postal manualmente.");
      } else if (geoErr.code === geoErr.TIMEOUT) {
        setError("La solicitud de ubicación ha expirado. Inténtalo de nuevo o introduce un código postal.");
      } else {
        setError("Error al obtener tu ubicación. Introduce un código postal manualmente.");
      }
      // Try IP fallback
      const ipGeo = await ipFallbackLocation();
      if (ipGeo?.postalCode) {
        applyLocation(ipGeo.postalCode, ipGeo.city, ipGeo.region, ipGeo.country, "ip");
      }
    } finally {
      setLoading(false);
    }
  }, [isGeoAvailable, applyLocation]);

  const setManualPostalCode = useCallback(
    (postalCode: string) => {
      const trimmed = postalCode.trim();
      if (!trimmed) return;
      const regionLabel = postalCodeToRegionLabel(trimmed);
      applyLocation(trimmed, "", regionLabel, "", "manual");
    },
    [applyLocation]
  );

  const setFromAddress = useCallback(
    (address: { id: string; postal_code: string; city: string; province: string; country: string }) => {
      applyLocation(
        address.postal_code,
        address.city,
        address.province,
        address.country,
        "saved_address",
        address.id
      );
    },
    [applyLocation]
  );

  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
    ipFetchedRef.current = false;
  }, []);

  return {
    location,
    permission,
    loading,
    error,
    requestGeolocation,
    setManualPostalCode,
    setFromAddress,
    clearLocation,
    isGeoAvailable,
  };
}

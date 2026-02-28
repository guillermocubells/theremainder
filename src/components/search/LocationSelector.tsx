import { useState, useRef } from "react";
import {
  MapPin, Navigation, X, ChevronDown, AlertTriangle,
  Globe, Loader2, Check, Pencil
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  useLocationPreference,
  type LocationPreference,
  type GeoPermission,
} from "@/hooks/useLocationPreference";
import { useAuth } from "@/contexts/AuthContext";
import { useGardenAddresses } from "@/components/account/ActiveGardenSelector";

// ── Source labels ────────────────────────────────────────────────────
const SOURCE_LABELS: Record<string, string> = {
  geolocation: "GPS",
  manual: "Manual",
  ip: "Aproximada",
  saved_address: "Jardín",
  none: "",
};

// ── Subcomponents ────────────────────────────────────────────────────

function PermissionDeniedBanner() {
  return (
    <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <div>
        <p className="font-medium">Permiso de ubicación denegado</p>
        <p className="mt-0.5 text-destructive/80">
          Para activarlo, ve a la configuración de tu navegador → Permisos del sitio → Ubicación.
        </p>
      </div>
    </div>
  );
}

function ClimatePreview({ location }: { location: LocationPreference }) {
  if (!location.climate) return null;

  return (
    <div className="grid grid-cols-2 gap-1.5 text-[11px] text-muted-foreground mt-2">
      <span>🌡️ {location.climate.hardiness}</span>
      <span>☀️ {location.climate.sunIntensity}</span>
      <span>💧 {location.climate.humidity}</span>
      <span>🗺️ {location.climate.zone}</span>
    </div>
  );
}

function PostalCodeInput({
  onSubmit,
}: {
  onSubmit: (code: string) => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed.length >= 4) {
      onSubmit(trimmed);
      setValue("");
    }
  };

  return (
    <div className="flex gap-1.5">
      <Input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        placeholder="Código postal..."
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, 10))}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        className="h-8 text-sm flex-1"
        autoFocus
      />
      <Button
        size="sm"
        variant="secondary"
        className="h-8 px-2.5"
        disabled={value.trim().length < 4}
        onClick={handleSubmit}
      >
        <Check className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────

interface LocationSelectorProps {
  /** Compact mode hides the popover and just shows a chip */
  compact?: boolean;
  /** Called when location changes — parent can wire to search filters */
  onLocationChange?: (location: LocationPreference | null) => void;
}

const LocationSelector = ({ compact, onLocationChange }: LocationSelectorProps) => {
  const {
    location,
    permission,
    loading,
    error,
    requestGeolocation,
    setManualPostalCode,
    setFromAddress,
    clearLocation,
    isGeoAvailable,
  } = useLocationPreference();

  const { user } = useAuth();
  const { data: gardenAddresses } = useGardenAddresses();
  const [open, setOpen] = useState(false);
  const [showManual, setShowManual] = useState(false);

  const handleSetPostal = (code: string) => {
    setManualPostalCode(code);
    setShowManual(false);
    onLocationChange?.(null); // will re-read from hook
  };

  const handleGeo = async () => {
    await requestGeolocation();
    onLocationChange?.(null);
  };

  const handleSelectAddress = (addr: {
    id: string;
    city: string;
    province: string;
  }) => {
    // We don't have postal_code in the garden address query — use city as proxy
    setFromAddress({
      id: addr.id,
      postal_code: "",
      city: addr.city,
      province: addr.province,
      country: "ES",
    });
    setOpen(false);
    onLocationChange?.(null);
  };

  const handleClear = () => {
    clearLocation();
    onLocationChange?.(null);
  };

  // Notify parent when location changes
  // (via effect in parent using the hook directly is preferred, but this is the prop-based API)

  // ── Compact chip ───────────────────────────────────────────────────
  const locationLabel = location
    ? location.city || location.region || location.postalCode || "Ubicación"
    : "Mi ubicación";

  if (compact && location) {
    return (
      <Badge
        variant="outline"
        className="gap-1 cursor-pointer hover:bg-accent transition-colors text-xs h-7 px-2"
        onClick={() => setOpen(true)}
      >
        <MapPin className="h-3 w-3" />
        {locationLabel}
        {location.source === "ip" && (
          <Globe className="h-3 w-3 text-muted-foreground" />
        )}
      </Badge>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={location ? "outline" : "secondary"}
          size="sm"
          className="gap-1.5 h-8 text-xs"
        >
          <MapPin className="h-3.5 w-3.5" />
          <span className="max-w-[120px] truncate">{locationLabel}</span>
          {location?.source === "ip" && (
            <Globe className="h-3 w-3 text-muted-foreground" />
          )}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[280px] p-3 space-y-3"
        sideOffset={4}
      >
        {/* Current location display */}
        {location && (
          <div className="relative rounded-md border border-border bg-muted/30 p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-sm font-medium truncate">
                    {location.city || location.region || location.postalCode}
                  </span>
                </div>
                {location.postalCode && (
                  <p className="text-xs text-muted-foreground mt-0.5 ml-5">
                    CP {location.postalCode}
                    {location.region && ` · ${location.region}`}
                  </p>
                )}
                <Badge
                  variant="secondary"
                  className="text-[10px] h-4 px-1.5 mt-1 ml-5"
                >
                  {SOURCE_LABELS[location.source]}
                </Badge>
                <ClimatePreview location={location} />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={handleClear}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Permission denied banner */}
        {permission === "denied" && <PermissionDeniedBanner />}

        {/* Error message */}
        {error && !location && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        {/* Actions */}
        <div className="space-y-1.5">
          {/* Geolocation button */}
          {isGeoAvailable && permission !== "denied" && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 h-8 text-xs"
              onClick={handleGeo}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Navigation className="h-3.5 w-3.5" />
              )}
              {loading ? "Localizando..." : "Usar mi ubicación"}
            </Button>
          )}

          {/* Manual input toggle / form */}
          {showManual ? (
            <PostalCodeInput onSubmit={handleSetPostal} />
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 h-8 text-xs"
              onClick={() => setShowManual(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Introducir código postal
            </Button>
          )}

          {/* Saved garden addresses */}
          {user && gardenAddresses && gardenAddresses.length > 0 && (
            <div className="pt-1 border-t border-border">
              <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">
                Mis jardines
              </p>
              {gardenAddresses.map((addr) => (
                <Button
                  key={addr.id}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 h-7 text-xs"
                  onClick={() => handleSelectAddress(addr)}
                >
                  <MapPin className="h-3 w-3 text-primary" />
                  <span className="truncate">
                    {addr.city}, {addr.province}
                  </span>
                  {addr.climate_zone && (
                    <Badge variant="secondary" className="text-[9px] h-3.5 px-1 ml-auto">
                      Z{addr.climate_zone}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* IP disclaimer */}
        {location?.source === "ip" && (
          <p className="text-[10px] text-muted-foreground leading-tight">
            Ubicación aproximada basada en tu conexión. Para mayor precisión,
            usa GPS o introduce tu código postal.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default LocationSelector;

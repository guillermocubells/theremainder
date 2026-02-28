import { MapPin, Navigation, Pencil, ShieldAlert, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocationPreference, type GeoPermission } from "@/hooks/useLocationPreference";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Check, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

// ── Inline postal code input ─────────────────────────────────────────

function InlinePostalInput({ onSubmit }: { onSubmit: (code: string) => void }) {
  const [value, setValue] = useState("");
  const { i18n } = useTranslation();
  const isEs = i18n.language.startsWith("es");

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed.length >= 4) {
      onSubmit(trimmed);
      setValue("");
    }
  };

  return (
    <div className="flex gap-1.5 w-full max-w-[220px]">
      <Input
        type="text"
        inputMode="numeric"
        placeholder={isEs ? "Código postal..." : "Postal code..."}
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

// ── Permission denied variant ────────────────────────────────────────

function PermissionDeniedContent({ onManual }: { onManual: () => void }) {
  const { i18n } = useTranslation();
  const isEs = i18n.language.startsWith("es");
  const [showInput, setShowInput] = useState(false);
  const { setManualPostalCode } = useLocationPreference();

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
        <ShieldAlert className="h-5 w-5 text-destructive" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">
          {isEs ? "Permiso de ubicación denegado" : "Location permission denied"}
        </p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
          {isEs
            ? "No podemos acceder a tu GPS. Introduce tu código postal para personalizar las recomendaciones."
            : "We can't access your GPS. Enter your postal code to personalize recommendations."}
        </p>
      </div>
      {showInput ? (
        <InlinePostalInput
          onSubmit={(code) => {
            setManualPostalCode(code);
            onManual();
          }}
        />
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setShowInput(true)}
        >
          <Pencil className="h-3.5 w-3.5" />
          {isEs ? "Introducir código postal" : "Enter postal code"}
        </Button>
      )}
    </div>
  );
}

// ── Main empty state ─────────────────────────────────────────────────

export type LocationEmptyVariant = "card" | "inline" | "compact";

interface LocationEmptyStateProps {
  /** Visual style */
  variant?: LocationEmptyVariant;
  /** Extra context about why location is needed */
  contextLabel?: string;
  className?: string;
}

/**
 * Unified empty/denied state for location-dependent features.
 * Automatically detects permission state and offers the right CTA.
 */
const LocationEmptyState = ({
  variant = "card",
  contextLabel,
  className,
}: LocationEmptyStateProps) => {
  const { i18n } = useTranslation();
  const isEs = i18n.language.startsWith("es");
  const {
    permission,
    loading,
    requestGeolocation,
    setManualPostalCode,
    isGeoAvailable,
  } = useLocationPreference();

  const [showManual, setShowManual] = useState(false);
  const [resolved, setResolved] = useState(false);

  if (resolved) return null;

  const isDenied = permission === "denied";

  const content = isDenied ? (
    <PermissionDeniedContent onManual={() => setResolved(true)} />
  ) : (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
        <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">
          {isEs ? "Indica tu ubicación" : "Set your location"}
        </p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
          {contextLabel ||
            (isEs
              ? "Sabrás qué plantas se adaptan mejor a tu zona"
              : "See which plants thrive in your area")}
        </p>
      </div>

      <div className="flex flex-col items-center gap-2 w-full">
        {isGeoAvailable && (
          <Button
            variant="default"
            size="sm"
            className="gap-1.5 text-xs w-full max-w-[220px]"
            onClick={async () => {
              await requestGeolocation();
              setResolved(true);
            }}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Navigation className="h-3.5 w-3.5" />
            )}
            {loading
              ? (isEs ? "Localizando..." : "Locating...")
              : (isEs ? "Usar mi ubicación" : "Use my location")}
          </Button>
        )}

        {showManual ? (
          <InlinePostalInput
            onSubmit={(code) => {
              setManualPostalCode(code);
              setResolved(true);
            }}
          />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground"
            onClick={() => setShowManual(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
            {isEs ? "Introducir código postal" : "Enter postal code"}
          </Button>
        )}
      </div>
    </div>
  );

  // ── Compact: no card wrapper ───────────────────────────────────────
  if (variant === "compact") {
    return (
      <div className={cn("py-3", className)} role="status" aria-live="polite">
        {content}
      </div>
    );
  }

  // ── Inline: subtle background ──────────────────────────────────────
  if (variant === "inline") {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed border-border bg-muted/30 p-4",
          className
        )}
        role="status"
        aria-live="polite"
      >
        {content}
      </div>
    );
  }

  // ── Card (default) ─────────────────────────────────────────────────
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="py-6">{content}</CardContent>
    </Card>
  );
};

export default LocationEmptyState;

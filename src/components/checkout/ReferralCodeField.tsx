import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Gift, X, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getPendingReferral, clearPendingReferral } from "@/hooks/useReferral";

interface ReferralCodeFieldProps {
  appliedCode: string | null;
  onApply: (code: string, referrerUserId: string) => void;
  onRemove: () => void;
}

const ReferralCodeField = ({ appliedCode, onApply, onRemove }: ReferralCodeFieldProps) => {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoApplied, setAutoApplied] = useState(false);

  // Auto-apply from cookie/localStorage on mount
  useEffect(() => {
    if (appliedCode || autoApplied) return;
    const pending = getPendingReferral();
    if (pending) {
      setAutoApplied(true);
      validateAndApply(pending);
    }
  }, [appliedCode, autoApplied]);

  const validateAndApply = async (codeToValidate: string) => {
    const trimmed = codeToValidate.trim().toUpperCase();
    if (!trimmed) return;

    setIsValidating(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from("referral_codes")
        .select("user_id, code")
        .eq("code", trimmed)
        .single();

      if (dbError || !data) {
        setError(t("referral.invalidCode", "Código no válido"));
        setIsValidating(false);
        return;
      }

      // Check self-referral
      const { data: { user } } = await supabase.auth.getUser();
      if (user && data.user_id === user.id) {
        setError(t("referral.selfReferral", "No puedes usar tu propio código"));
        setIsValidating(false);
        return;
      }

      onApply(data.code, data.user_id);
      clearPendingReferral();
      setCode("");
    } catch {
      setError(t("referral.validationError", "Error al validar el código"));
    } finally {
      setIsValidating(false);
    }
  };

  if (appliedCode) {
    return (
      <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
        <Check className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {t("referral.codeApplied", "Código aplicado")}: <span className="font-mono">{appliedCode}</span>
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Gift className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {t("referral.haveCode", "¿Tienes un código de referido?")}
        </span>
      </div>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
          }}
          placeholder={t("referral.codePlaceholder", "Ej: FP-XXXX")}
          className={`font-mono uppercase ${error ? "border-destructive" : ""}`}
          maxLength={10}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => validateAndApply(code)}
          disabled={!code.trim() || isValidating}
          className="shrink-0"
        >
          {isValidating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            t("referral.apply", "Aplicar")
          )}
        </Button>
      </div>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
};

export default ReferralCodeField;

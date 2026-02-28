import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSubmitVerification, type VerificationTargetType } from "@/hooks/useVerification";
import EvidenceUploader from "./EvidenceUploader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { BadgeCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface VerificationRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: VerificationTargetType;
  targetId: string;
}

export default function VerificationRequestDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
}: VerificationRequestDialogProps) {
  const { t } = useTranslation();
  const submitVerification = useSubmitVerification();
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const handleSubmit = async () => {
    if (evidenceUrls.length === 0) {
      toast.error(t("verification.needEvidence", "Sube al menos un archivo de evidencia"));
      return;
    }
    if (notes.length > 500) {
      toast.error("Las notas no pueden superar los 500 caracteres");
      return;
    }

    try {
      await submitVerification.mutateAsync({
        target_type: targetType,
        target_id: targetId,
        evidence_urls: evidenceUrls,
        notes: notes.trim() || undefined,
      });
      toast.success(t("verification.submitted", "Solicitud de verificación enviada"));
      setEvidenceUrls([]);
      setNotes("");
      onOpenChange(false);
    } catch {
      toast.error(t("verification.submitError", "Error al enviar la solicitud"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <BadgeCheck className="h-5 w-5 text-primary" />
            {t("verification.requestTitle", "Solicitar verificación")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              {t("verification.evidenceLabel", "Evidencia (fotos, documentos)")}
            </Label>
            <EvidenceUploader onUrlsReady={setEvidenceUrls} maxFiles={10} />
          </div>

          <div>
            <Label htmlFor="ver-notes" className="text-xs text-muted-foreground mb-1 block">
              {t("verification.notesLabel", "Notas adicionales (opcional)")}
            </Label>
            <Textarea
              id="ver-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("verification.notesPlaceholder", "Describe la evidencia...")}
              className="text-sm min-h-[60px]"
              maxLength={500}
            />
            <p className="text-[10px] text-muted-foreground text-right mt-0.5">
              {notes.length}/500
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t("common.cancel", "Cancelar")}
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitVerification.isPending || evidenceUrls.length === 0}
          >
            {submitVerification.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <BadgeCheck className="h-4 w-4 mr-1" />
            )}
            {t("verification.submit", "Enviar solicitud")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flag, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateReport, useHasReported, ReportReason, ReportEntityType } from '@/hooks/useContentReport';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: ReportEntityType;
  entityId: string;
}

type Step = 'reason' | 'confirm' | 'success' | 'error' | 'already';

const REASONS: { value: ReportReason; labelKey: string; icon: string }[] = [
  { value: 'spam', labelKey: 'report.reasons.spam', icon: '🚫' },
  { value: 'offensive', labelKey: 'report.reasons.offensive', icon: '⚠️' },
  { value: 'misinformation', labelKey: 'report.reasons.misinformation', icon: '❌' },
  { value: 'harassment', labelKey: 'report.reasons.harassment', icon: '🛑' },
  { value: 'other', labelKey: 'report.reasons.other', icon: '📝' },
];

const ReportModal = ({ open, onOpenChange, entityType, entityId }: ReportModalProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const createReport = useCreateReport();
  const { data: alreadyReported } = useHasReported(entityType, entityId);

  const [step, setStep] = useState<Step>('reason');
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');

  const reset = () => {
    setStep('reason');
    setReason('');
    setDetails('');
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleNext = () => {
    if (!user) {
      toast.info(t('report.loginRequired', 'Inicia sesión para reportar contenido'));
      return;
    }
    if (alreadyReported) {
      setStep('already');
      return;
    }
    if (!reason) return;
    setStep('confirm');
  };

  const handleSubmit = async () => {
    if (!reason) return;
    try {
      await createReport.mutateAsync({
        entity_type: entityType,
        entity_id: entityId,
        reason: reason as ReportReason,
        details: details.trim() || undefined,
      });
      setStep('success');
    } catch (err) {
      if ((err as Error).message === 'ALREADY_REPORTED') {
        setStep('already');
      } else {
        setStep('error');
      }
    }
  };

  const entityLabel = entityType === 'review'
    ? t('report.entityReview', 'reseña')
    : t('report.entityComment', 'comentario');

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Step: Reason Selection */}
        {step === 'reason' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Flag className="h-4 w-4 text-destructive" />
                {t('report.title', 'Reportar contenido')}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {t('report.description', 'Selecciona el motivo por el que quieres reportar esta {{entity}}.', { entity: entityLabel })}
              </DialogDescription>
            </DialogHeader>

            <RadioGroup value={reason} onValueChange={(v) => setReason(v as ReportReason)} className="space-y-2 my-3">
              {REASONS.map((r) => (
                <Label
                  key={r.value}
                  htmlFor={`reason-${r.value}`}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    reason === r.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/30'
                  )}
                >
                  <RadioGroupItem value={r.value} id={`reason-${r.value}`} />
                  <span className="text-base">{r.icon}</span>
                  <span className="text-sm font-medium text-foreground">
                    {t(r.labelKey, r.value)}
                  </span>
                </Label>
              ))}
            </RadioGroup>

            {reason === 'other' && (
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={t('report.detailsPlaceholder', 'Describe el problema...')}
                className="text-sm min-h-[60px] mb-2"
                maxLength={500}
              />
            )}

            <div className="flex items-center justify-between mt-2">
              <a
                href="/terms-of-sale"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                {t('report.guidelines', 'Normas de la comunidad')}
              </a>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleOpenChange(false)} className="text-xs">
                  {t('common.cancel')}
                </Button>
                <Button size="sm" onClick={handleNext} disabled={!reason} className="text-xs">
                  {t('report.continue', 'Continuar')}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Step: Confirmation */}
        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-base">
                {t('report.confirmTitle', '¿Confirmar reporte?')}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {t('report.confirmDescription', 'Vas a reportar esta {{entity}} por: {{reason}}. Nuestro equipo revisará el contenido.', {
                  entity: entityLabel,
                  reason: t(`report.reasons.${reason}`, reason),
                })}
              </DialogDescription>
            </DialogHeader>

            {details && (
              <div className="p-2 bg-muted rounded text-xs text-muted-foreground my-2">
                "{details}"
              </div>
            )}

            <div className="flex justify-end gap-2 mt-3">
              <Button variant="ghost" size="sm" onClick={() => setStep('reason')} className="text-xs">
                {t('report.back', 'Volver')}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleSubmit}
                disabled={createReport.isPending}
                className="text-xs"
              >
                {createReport.isPending ? t('common.loading') : t('report.submit', 'Enviar reporte')}
              </Button>
            </div>
          </>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="text-center py-4">
            <div className="inline-flex p-3 bg-primary/10 rounded-full mb-3">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground text-sm mb-1">
              {t('report.successTitle', 'Reporte enviado')}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {t('report.successDescription', 'Gracias por ayudar a mantener nuestra comunidad segura. Revisaremos tu reporte pronto.')}
            </p>
            <Button size="sm" onClick={() => handleOpenChange(false)} className="text-xs">
              {t('common.close')}
            </Button>
          </div>
        )}

        {/* Step: Already Reported */}
        {step === 'already' && (
          <div className="text-center py-4">
            <div className="inline-flex p-3 bg-muted rounded-full mb-3">
              <Flag className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground text-sm mb-1">
              {t('report.alreadyTitle', 'Ya has reportado este contenido')}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {t('report.alreadyDescription', 'Tu reporte anterior sigue en revisión. Gracias por tu paciencia.')}
            </p>
            <Button size="sm" variant="outline" onClick={() => handleOpenChange(false)} className="text-xs">
              {t('common.close')}
            </Button>
          </div>
        )}

        {/* Step: Error */}
        {step === 'error' && (
          <div className="text-center py-4">
            <div className="inline-flex p-3 bg-destructive/10 rounded-full mb-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="font-semibold text-foreground text-sm mb-1">
              {t('report.errorTitle', 'Error al enviar')}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {t('report.errorDescription', 'No se pudo enviar tu reporte. Por favor, inténtalo de nuevo.')}
            </p>
            <div className="flex justify-center gap-2">
              <Button size="sm" variant="outline" onClick={() => handleOpenChange(false)} className="text-xs">
                {t('common.close')}
              </Button>
              <Button size="sm" onClick={() => setStep('confirm')} className="text-xs">
                {t('report.retry', 'Reintentar')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReportModal;

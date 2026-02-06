import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, MessageSquare, ShoppingCart, ArrowLeftRight, Ban } from 'lucide-react';
import { useUpdatePlantSharingControls, type VisibilityInSharedLists, type AvailabilityIntent, type InquiryHandlingMode } from '@/hooks/collection/usePlantSharingControls';

interface PlantSharingControlsProps {
  plantId: string;
  visibilityInSharedLists: VisibilityInSharedLists;
  allowInquiries: boolean;
  availabilityIntent: AvailabilityIntent;
  inquiryHandlingMode: InquiryHandlingMode;
}

const availabilityLabels: Record<AvailabilityIntent, { label: string; icon: typeof ShoppingCart }> = {
  not_open: { label: 'No disponible', icon: Ban },
  for_sale: { label: 'En venta', icon: ShoppingCart },
  for_trade: { label: 'Para intercambio', icon: ArrowLeftRight },
};

const handlingLabels: Record<InquiryHandlingMode, string> = {
  allow: 'Permitir consultas',
  muted: 'Silenciar (se guardan sin notificar)',
  blocked: 'Bloquear consultas',
};

const PlantSharingControls = ({
  plantId,
  visibilityInSharedLists,
  allowInquiries,
  availabilityIntent,
  inquiryHandlingMode,
}: PlantSharingControlsProps) => {
  const updateControls = useUpdatePlantSharingControls();

  const handleVisibilityChange = (checked: boolean) => {
    updateControls.mutate({
      plantId,
      visibility_in_shared_lists: checked ? 'visible' : 'hidden',
    });
  };

  const handleInquiriesChange = (checked: boolean) => {
    updateControls.mutate({
      plantId,
      allow_inquiries: checked,
    });
  };

  const handleAvailabilityChange = (value: string) => {
    updateControls.mutate({
      plantId,
      availability_intent: value as AvailabilityIntent,
    });
  };

  const handleHandlingChange = (value: string) => {
    updateControls.mutate({
      plantId,
      inquiry_handling_mode: value as InquiryHandlingMode,
    });
  };

  return (
    <div className="space-y-3 pt-2">
      <Separator />
      
      {/* Visibility toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {visibilityInSharedLists === 'visible' ? (
            <Eye className="h-4 w-4 text-primary flex-shrink-0" />
          ) : (
            <EyeOff className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
          <Label htmlFor="visibility-toggle" className="text-sm cursor-pointer">
            Visible en listas compartidas
          </Label>
        </div>
        <Switch
          id="visibility-toggle"
          checked={visibilityInSharedLists === 'visible'}
          onCheckedChange={handleVisibilityChange}
          disabled={updateControls.isPending}
        />
      </div>

      {/* Only show remaining controls if visible */}
      {visibilityInSharedLists === 'visible' && (
        <>
          {/* Availability intent */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Disponibilidad</Label>
            <RadioGroup
              value={availabilityIntent}
              onValueChange={handleAvailabilityChange}
              className="grid grid-cols-3 gap-2"
              disabled={updateControls.isPending}
            >
              {(Object.entries(availabilityLabels) as [AvailabilityIntent, typeof availabilityLabels[AvailabilityIntent]][]).map(([value, { label, icon: Icon }]) => (
                <label
                  key={value}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border cursor-pointer transition-colors text-center ${
                    availabilityIntent === value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <RadioGroupItem value={value} className="sr-only" />
                  <Icon className={`h-4 w-4 ${availabilityIntent === value ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="text-xs font-medium">{label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Allow inquiries */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Label htmlFor="inquiries-toggle" className="text-sm cursor-pointer">
                Permitir consultas
              </Label>
            </div>
            <Switch
              id="inquiries-toggle"
              checked={allowInquiries && inquiryHandlingMode !== 'blocked'}
              onCheckedChange={handleInquiriesChange}
              disabled={updateControls.isPending || inquiryHandlingMode === 'blocked'}
            />
          </div>

          {/* Inquiry handling mode */}
          {allowInquiries && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Gestión de consultas</Label>
              <RadioGroup
                value={inquiryHandlingMode}
                onValueChange={handleHandlingChange}
                className="space-y-1"
                disabled={updateControls.isPending}
              >
                {(Object.entries(handlingLabels) as [InquiryHandlingMode, string][]).map(([value, label]) => (
                  <label
                    key={value}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      inquiryHandlingMode === value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <RadioGroupItem value={value} />
                    <span className="text-xs">{label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PlantSharingControls;

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Send, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface InquiryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plantName: string;
  plantId: string;
  sharedListId: string;
  availabilityIntent: string;
}

const InquiryForm = ({
  open,
  onOpenChange,
  plantName,
  plantId,
  sharedListId,
  availabilityIntent,
}: InquiryFormProps) => {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [offerType, setOfferType] = useState<string>('question');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || message.length > 700) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('submit-inquiry', {
        body: {
          owned_plant_id: plantId,
          shared_list_id: sharedListId,
          message: message.trim(),
          viewer_email: email.trim() || null,
          offer_type: offerType,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success('Consulta enviada correctamente');
      onOpenChange(false);
      setMessage('');
      setEmail('');
      setOfferType('question');
    } catch {
      toast.error('No se pudo enviar la consulta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const offerOptions = [];
  if (availabilityIntent === 'for_sale') {
    offerOptions.push({ value: 'buy', label: 'Quiero comprar' });
  }
  if (availabilityIntent === 'for_trade') {
    offerOptions.push({ value: 'trade', label: 'Proponer intercambio' });
  }
  offerOptions.push({ value: 'question', label: 'Pregunta general' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Consulta sobre {plantName}
          </DialogTitle>
          <DialogDescription>
            Envía un mensaje al propietario de esta planta
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {offerOptions.length > 1 && (
            <div className="space-y-2">
              <Label>Tipo de consulta</Label>
              <RadioGroup value={offerType} onValueChange={setOfferType} className="space-y-1">
                {offerOptions.map(opt => (
                  <label key={opt.value} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    offerType === opt.value ? 'border-primary bg-primary/5' : 'border-border'
                  }`}>
                    <RadioGroupItem value={opt.value} />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="inquiry-message">Mensaje *</Label>
            <Textarea
              id="inquiry-message"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 700))}
              placeholder="Escribe tu consulta..."
              rows={4}
              required
            />
            <p className="text-xs text-muted-foreground text-right">{message.length}/700</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inquiry-email">Tu email (para recibir respuesta)</Label>
            <Input
              id="inquiry-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting || !message.trim()}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Enviar consulta
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InquiryForm;

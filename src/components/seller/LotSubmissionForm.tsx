import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuctionSubmission } from '@/hooks/useAuctionSubmission';
import { useSellerProfile } from '@/hooks/useSellerProfile';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ImagePlus, Video, X, Loader2, Upload, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const lotSchema = z.object({
  title: z.string().min(3, 'Título obligatorio').max(200),
  description: z.string().min(10, 'Descripción mínima 10 caracteres').max(5000),
  starting_price: z.coerce.number().min(0.01, 'Precio mínimo 0.01€'),
  reserve_price: z.coerce.number().min(0).optional().or(z.literal('')),
  buy_now_price: z.coerce.number().min(0).optional().or(z.literal('')),
  bid_increment: z.coerce.number().min(0.5).optional(),
  condition: z.string().optional(),
  provenance: z.string().max(2000).optional(),
  height: z.string().max(50).optional(),
  width: z.string().max(50).optional(),
  pot_size: z.string().max(50).optional(),
});

type LotFormData = z.infer<typeof lotSchema>;

const LotSubmissionForm = () => {
  const { profile } = useSellerProfile();
  const { submitLot } = useAuctionSubmission();
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LotFormData>({
    resolver: zodResolver(lotSchema),
    defaultValues: {
      bid_increment: 1,
      condition: 'excellent',
    },
  });

  if (!profile || profile.verification_status !== 'verified') {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            Debes completar la verificación KYC antes de crear subastas.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleFileUpload = async (files: FileList | null, type: 'image' | 'video') => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const path = `auctions/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('plant-images').upload(path, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('plant-images').getPublicUrl(path);
        uploaded.push(publicUrl);
      }
      if (type === 'image') {
        setImages(prev => [...prev, ...uploaded].slice(0, 10));
      } else {
        setVideos(prev => [...prev, ...uploaded].slice(0, 3));
      }
    } catch (e: any) {
      toast.error('Error al subir archivo: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (url: string, type: 'image' | 'video') => {
    if (type === 'image') setImages(prev => prev.filter(i => i !== url));
    else setVideos(prev => prev.filter(v => v !== url));
  };

  const onSubmit = async (data: LotFormData) => {
    if (images.length === 0) {
      toast.error('Sube al menos una foto');
      return;
    }

    await submitLot.mutateAsync({
      title: data.title,
      description: data.description,
      starting_price: data.starting_price,
      reserve_price: data.reserve_price ? Number(data.reserve_price) : undefined,
      buy_now_price: data.buy_now_price ? Number(data.buy_now_price) : undefined,
      bid_increment: data.bid_increment,
      condition: data.condition,
      provenance: data.provenance,
      dimensions: {
        height: data.height || undefined,
        width: data.width || undefined,
        pot_size: data.pot_size || undefined,
      },
      images,
      videos,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nuevo lote de subasta</CardTitle>
        <CardDescription>Completa los datos del ejemplar que deseas subastar.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic info */}
          <div className="space-y-2">
            <Label htmlFor="title">Título del lote *</Label>
            <Input id="title" {...register('title')} placeholder="Trachycarpus fortunei 120cm" />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción *</Label>
            <Textarea id="description" {...register('description')} rows={4} placeholder="Describe el estado, edad, historia del ejemplar..." />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          {/* Media */}
          <div className="space-y-3">
            <Label>Fotos ({images.length}/10) *</Label>
            <div className="flex flex-wrap gap-3">
              {images.map(url => (
                <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeMedia(url, 'image')}
                    className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < 10 && (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploading}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary transition-colors"
                >
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
                </button>
              )}
            </div>
            <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFileUpload(e.target.files, 'image')} />
          </div>

          <div className="space-y-3">
            <Label>Vídeos ({videos.length}/3)</Label>
            <div className="flex flex-wrap gap-3">
              {videos.map(url => (
                <div key={url} className="relative flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">{url.split('/').pop()}</span>
                  <button type="button" onClick={() => removeMedia(url, 'video')}>
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {videos.length < 3 && (
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 px-4 py-2 hover:border-primary transition-colors"
                >
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Subir vídeo</span>
                </button>
              )}
            </div>
            <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={e => handleFileUpload(e.target.files, 'video')} />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="starting_price">Precio de salida (€) *</Label>
              <Input id="starting_price" type="number" step="0.01" {...register('starting_price')} />
              {errors.starting_price && <p className="text-sm text-destructive">{errors.starting_price.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reserve_price">Precio de reserva (€)</Label>
              <Input id="reserve_price" type="number" step="0.01" {...register('reserve_price')} placeholder="Opcional" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buy_now_price">Compra inmediata (€)</Label>
              <Input id="buy_now_price" type="number" step="0.01" {...register('buy_now_price')} placeholder="Opcional" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bid_increment">Incremento mínimo de puja (€)</Label>
            <Input id="bid_increment" type="number" step="0.5" {...register('bid_increment')} />
          </div>

          {/* Condition & Provenance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estado del ejemplar</Label>
              <Select defaultValue="excellent" onValueChange={v => setValue('condition', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excelente</SelectItem>
                  <SelectItem value="good">Bueno</SelectItem>
                  <SelectItem value="fair">Aceptable</SelectItem>
                  <SelectItem value="needs_care">Necesita cuidados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="provenance">Procedencia / Historial</Label>
            <Textarea
              id="provenance"
              {...register('provenance')}
              rows={3}
              placeholder="Origen del ejemplar, vivero de procedencia, años en colección..."
            />
          </div>

          {/* Dimensions */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Dimensiones</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="height" className="text-xs text-muted-foreground">Altura</Label>
                <Input id="height" {...register('height')} placeholder="120cm" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="width" className="text-xs text-muted-foreground">Envergadura</Label>
                <Input id="width" {...register('width')} placeholder="80cm" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pot_size" className="text-xs text-muted-foreground">Maceta</Label>
                <Input id="pot_size" {...register('pot_size')} placeholder="30L" />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={submitLot.isPending}>
            {submitLot.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Enviar lote para revisión
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default LotSubmissionForm;

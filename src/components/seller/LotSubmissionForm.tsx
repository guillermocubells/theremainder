import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuctionSubmission } from '@/hooks/useAuctionSubmission';
import { useSellerProfile } from '@/hooks/useSellerProfile';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ImagePlus, Video, X, Loader2, Upload, AlertCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import AuctionConsentGate from '@/components/auction/AuctionConsentGate';

const EU_COUNTRIES = [
  'España', 'Portugal', 'Francia', 'Italia', 'Alemania', 'Países Bajos', 'Bélgica',
  'Austria', 'Grecia', 'Irlanda', 'Luxemburgo', 'Finlandia', 'Suecia', 'Dinamarca',
  'Polonia', 'Chequia', 'Rumanía', 'Hungría', 'Bulgaria', 'Croacia', 'Eslovaquia',
  'Eslovenia', 'Lituania', 'Letonia', 'Estonia', 'Chipre', 'Malta',
];

const DURATION_OPTIONS = [
  { value: '24', label: '24 horas' },
  { value: '48', label: '48 horas' },
  { value: '72', label: '72 horas' },
  { value: '168', label: '7 días' },
];

const lotSchema = z.object({
  title: z.string().min(3, 'Título obligatorio (mín. 3 caracteres)').max(200),
  genus: z.string().min(1, 'Género obligatorio').max(100),
  species: z.string().max(100).optional(),
  cultivar: z.string().max(100).optional(),
  common_name: z.string().max(200).optional(),
  description: z.string().min(10, 'Descripción mínima 10 caracteres').max(5000),
  category: z.string().min(1, 'Categoría obligatoria'),
  tags: z.string().max(500).optional(),
  starting_price: z.coerce.number().min(0.01, 'Precio mínimo 0.01 €'),
  reserve_price: z.coerce.number().min(0).optional().or(z.literal('')),
  condition: z.string().min(1, 'Estado obligatorio'),
  provenance: z.string().max(2000).optional(),
  age_size: z.string().max(100).optional(),
  height: z.string().max(50).optional(),
  width: z.string().max(50).optional(),
  pot_size: z.string().max(50).optional(),
  hardiness_zone: z.string().max(20).optional(),
  humidity_tolerance: z.string().max(50).optional(),
  duration_hours: z.string().min(1, 'Duración obligatoria'),
  location_country: z.string().min(1, 'País obligatorio'),
  location_region: z.string().max(100).optional(),
  shipping_eu_only: z.boolean().default(true),
  excluded_countries: z.string().max(500).optional(),
  shipping_cost: z.coerce.number().min(0, 'Coste de envío obligatorio'),
  shipping_tiers: z.string().max(500).optional(),
  handling_time: z.string().min(1, 'Tiempo de preparación obligatorio'),
}).refine(
  (d) => {
    if (d.reserve_price && typeof d.reserve_price === 'number') {
      return d.reserve_price >= d.starting_price;
    }
    return true;
  },
  { message: 'El precio de reserva debe ser ≥ precio de salida', path: ['reserve_price'] }
);

type LotFormData = z.infer<typeof lotSchema>;

const LotSubmissionForm = () => {
  const { profile } = useSellerProfile();
  const { submitLot } = useAuctionSubmission();
  const queryClient = useQueryClient();
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [provenanceDocs, setProvenanceDocs] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Compliance checkboxes
  const [consentOver18, setConsentOver18] = useState(false);
  const [consentOwnership, setConsentOwnership] = useState(false);
  const [consentEULegal, setConsentEULegal] = useState(false);
  const [consentSpainRules, setConsentSpainRules] = useState(false);
  const [consentGDPR, setConsentGDPR] = useState(false);
  const [consentFee, setConsentFee] = useState(false);

  const allConsentsAccepted = consentOver18 && consentOwnership && consentEULegal && consentSpainRules && consentGDPR && consentFee;

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LotFormData>({
    resolver: zodResolver(lotSchema),
    defaultValues: {
      condition: 'excellent',
      duration_hours: '72',
      location_country: 'España',
      shipping_eu_only: true,
      shipping_cost: 0,
      handling_time: '3-5 días',
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

  const handleFileUpload = async (files: FileList | null, type: 'image' | 'video' | 'doc') => {
    if (!files || files.length === 0) return;

    // Validate image dimensions
    if (type === 'image') {
      for (const file of Array.from(files)) {
        if (!['image/jpeg', 'image/png'].includes(file.type)) {
          toast.error('Solo se aceptan imágenes JPEG o PNG');
          return;
        }
        // Check min dimension (1200px longest side)
        const valid = await new Promise<boolean>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(Math.max(img.width, img.height) >= 1200);
          img.onerror = () => resolve(false);
          img.src = URL.createObjectURL(file);
        });
        if (!valid) {
          toast.error('Las imágenes deben tener al menos 1200px en su lado más largo');
          return;
        }
      }
    }

    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const subdir = type === 'doc' ? 'docs' : '';
        const path = `auctions/${subdir ? subdir + '/' : ''}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('plant-images').upload(path, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('plant-images').getPublicUrl(path);
        uploaded.push(publicUrl);
      }
      if (type === 'image') {
        setImages(prev => [...prev, ...uploaded].slice(0, 10));
      } else if (type === 'video') {
        setVideos(prev => [...prev, ...uploaded].slice(0, 1));
      } else {
        setProvenanceDocs(prev => [...prev, ...uploaded].slice(0, 5));
      }
    } catch (e: any) {
      toast.error('Error al subir archivo: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (url: string, type: 'image' | 'video' | 'doc') => {
    if (type === 'image') setImages(prev => prev.filter(i => i !== url));
    else if (type === 'video') setVideos(prev => prev.filter(v => v !== url));
    else setProvenanceDocs(prev => prev.filter(d => d !== url));
  };

  const onSubmit = async (data: LotFormData) => {
    if (images.length === 0) {
      toast.error('Sube al menos una foto (mín. 1200px, JPEG/PNG)');
      return;
    }
    if (!allConsentsAccepted) {
      toast.error('Debes aceptar todos los consentimientos obligatorios');
      return;
    }

    await submitLot.mutateAsync({
      title: data.title,
      description: data.description,
      starting_price: data.starting_price,
      reserve_price: data.reserve_price ? Number(data.reserve_price) : undefined,
      condition: data.condition,
      provenance: data.provenance,
      dimensions: {
        height: data.height || undefined,
        width: data.width || undefined,
        pot_size: data.pot_size || undefined,
        age_size: data.age_size || undefined,
      },
      images,
      videos,
      provenance_documents: provenanceDocs,
      // Extended fields
      genus: data.genus,
      species: data.species,
      cultivar: data.cultivar,
      common_name: data.common_name,
      category: data.category,
      tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      duration_hours: parseInt(data.duration_hours),
      location_country: data.location_country,
      location_region: data.location_region,
      shipping_eu_only: data.shipping_eu_only,
      excluded_countries: data.excluded_countries,
      shipping_cost: data.shipping_cost,
      shipping_tiers: data.shipping_tiers,
      handling_time: data.handling_time,
      hardiness_zone: data.hardiness_zone,
      humidity_tolerance: data.humidity_tolerance,
    });
  };

  return (
    <AuctionConsentGate consentType="seller">
    <Card>
      <CardHeader>
        <CardTitle>Nuevo lote de subasta</CardTitle>
        <CardDescription>Completa los datos del ejemplar que deseas subastar. Los campos marcados con * son obligatorios.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* === SECTION: Basic info === */}
          <div className="space-y-2">
            <Label htmlFor="title">Título del lote *</Label>
            <Input id="title" {...register('title')} placeholder="Trachycarpus fortunei 120cm tronco pelado" />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          {/* Taxonomy */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Taxonomía *</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="genus" className="text-xs text-muted-foreground">Género *</Label>
                <Input id="genus" {...register('genus')} placeholder="Trachycarpus" />
                {errors.genus && <p className="text-xs text-destructive">{errors.genus.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="species" className="text-xs text-muted-foreground">Especie</Label>
                <Input id="species" {...register('species')} placeholder="fortunei" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cultivar" className="text-xs text-muted-foreground">Cultivar</Label>
                <Input id="cultivar" {...register('cultivar')} placeholder="'Wagnerianus'" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="common_name">Nombre común</Label>
              <Input id="common_name" {...register('common_name')} placeholder="Palmera china" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoría *</Label>
              <Select defaultValue="" onValueChange={v => setValue('category', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="palms">Palmeras</SelectItem>
                  <SelectItem value="cycads">Cícadas</SelectItem>
                  <SelectItem value="succulents">Suculentas</SelectItem>
                  <SelectItem value="tropicals">Tropicales</SelectItem>
                  <SelectItem value="conifers">Coníferas</SelectItem>
                  <SelectItem value="ferns">Helechos</SelectItem>
                  <SelectItem value="other">Otras</SelectItem>
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Etiquetas (separadas por comas)</Label>
            <Input id="tags" {...register('tags')} placeholder="rara, ejemplar maduro, tronco limpio" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción *</Label>
            <Textarea id="description" {...register('description')} rows={4} placeholder="Describe el estado, edad, historia del ejemplar..." />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          {/* === SECTION: Media === */}
          <Separator />
          <div className="space-y-3">
            <Label>Fotos ({images.length}/10) * <span className="text-xs text-muted-foreground font-normal">— Mín. 1200px lado largo, JPEG o PNG</span></Label>
            <div className="flex flex-wrap gap-3">
              {images.map(url => (
                <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeMedia(url, 'image')} className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < 10 && (
                <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploading} className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary transition-colors">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
                </button>
              )}
            </div>
            <input ref={imageInputRef} type="file" accept="image/jpeg,image/png" multiple className="hidden" onChange={e => handleFileUpload(e.target.files, 'image')} />
          </div>

          <div className="space-y-3">
            <Label>Vídeo ({videos.length}/1) <span className="text-xs text-muted-foreground font-normal">— Opcional, enlace de 20s máx.</span></Label>
            <div className="flex flex-wrap gap-3">
              {videos.map(url => (
                <div key={url} className="relative flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">{url.split('/').pop()}</span>
                  <button type="button" onClick={() => removeMedia(url, 'video')}><X className="h-3 w-3" /></button>
                </div>
              ))}
              {videos.length < 1 && (
                <button type="button" onClick={() => videoInputRef.current?.click()} disabled={uploading} className="flex items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 px-4 py-2 hover:border-primary transition-colors">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Subir vídeo</span>
                </button>
              )}
            </div>
            <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={e => handleFileUpload(e.target.files, 'video')} />
          </div>

          <div className="space-y-3">
            <Label>Documentos de procedencia ({provenanceDocs.length}/5)</Label>
            <p className="text-xs text-muted-foreground">Certificados, facturas de compra, fotos históricas u otros documentos que acrediten el origen.</p>
            <div className="flex flex-wrap gap-2">
              {provenanceDocs.map((url, i) => (
                <div key={url} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Doc {i + 1}</span>
                  <button type="button" onClick={() => removeMedia(url, 'doc')}><X className="h-3 w-3" /></button>
                </div>
              ))}
              {provenanceDocs.length < 5 && (
                <button type="button" onClick={() => docInputRef.current?.click()} disabled={uploading} className="flex items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 px-4 py-2 hover:border-primary transition-colors">
                  <Upload className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Subir documento</span>
                </button>
              )}
            </div>
            <input ref={docInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" multiple className="hidden" onChange={e => handleFileUpload(e.target.files, 'doc')} />
          </div>

          {/* === SECTION: Condition & Dimensions === */}
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estado del ejemplar *</Label>
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
            <div className="space-y-2">
              <Label htmlFor="age_size">Edad / Tamaño</Label>
              <Input id="age_size" {...register('age_size')} placeholder="15 años, 120cm tronco" />
            </div>
          </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hardiness_zone">Zona de rusticidad</Label>
              <Select onValueChange={v => setValue('hardiness_zone', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {['7a', '7b', '8a', '8b', '9a', '9b', '10a', '10b', '11a', '11b', '12a', '12b'].map(z => (
                    <SelectItem key={z} value={z}>{z}{['9a', '9b', '10a'].includes(z) ? ' ⭐' : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="humidity_tolerance">Tolerancia a humedad</Label>
              <Select onValueChange={v => setValue('humidity_tolerance', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="provenance">Procedencia / Historial</Label>
            <Textarea id="provenance" {...register('provenance')} rows={3} placeholder="Origen del ejemplar, vivero de procedencia, años en colección..." />
          </div>

          {/* === SECTION: Pricing & Duration === */}
          <Separator />
          <p className="text-sm font-medium text-foreground">Precio y duración</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="starting_price">Precio de salida (€) *</Label>
              <Input id="starting_price" type="number" step="0.01" {...register('starting_price')} />
              {errors.starting_price && <p className="text-sm text-destructive">{errors.starting_price.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reserve_price">Precio de reserva (€)</Label>
              <Input id="reserve_price" type="number" step="0.01" {...register('reserve_price')} placeholder="Opcional, ≥ precio salida" />
              {errors.reserve_price && <p className="text-sm text-destructive">{errors.reserve_price.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Duración *</Label>
              <Select defaultValue="72" onValueChange={v => setValue('duration_hours', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.duration_hours && <p className="text-sm text-destructive">{errors.duration_hours.message}</p>}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            El incremento mínimo de puja se calcula automáticamente según escala: 0–49,99 € → +1 €, 50–199,99 € → +5 €, 200–999,99 € → +10 €, 1.000 €+ → +50 €.
            <br />La opción de compra inmediata no está disponible para subastas.
          </p>

          {/* === SECTION: Location & Shipping === */}
          <Separator />
          <p className="text-sm font-medium text-foreground">Ubicación y envío</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>País de ubicación *</Label>
              <Select defaultValue="España" onValueChange={v => setValue('location_country', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EU_COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.location_country && <p className="text-xs text-destructive">{errors.location_country.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location_region">Región</Label>
              <Input id="location_region" {...register('location_region')} placeholder="Comunidad Valenciana" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox id="shipping_eu_only" defaultChecked onCheckedChange={v => setValue('shipping_eu_only', v === true)} />
              <label htmlFor="shipping_eu_only" className="text-sm">Solo envío dentro de la UE</label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="excluded_countries">Países excluidos del envío</Label>
              <Input id="excluded_countries" {...register('excluded_countries')} placeholder="Chipre, Malta (separados por comas)" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shipping_cost">Coste de envío (€) *</Label>
              <Input id="shipping_cost" type="number" step="0.01" {...register('shipping_cost')} />
              {errors.shipping_cost && <p className="text-xs text-destructive">{errors.shipping_cost.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipping_tiers">Escalado envío</Label>
              <Input id="shipping_tiers" {...register('shipping_tiers')} placeholder="Ej: UE peninsular 15€, islas 25€" />
            </div>
            <div className="space-y-2">
              <Label>Tiempo de preparación *</Label>
              <Select defaultValue="3-5 días" onValueChange={v => setValue('handling_time', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-2 días">1-2 días</SelectItem>
                  <SelectItem value="3-5 días">3-5 días</SelectItem>
                  <SelectItem value="5-7 días">5-7 días</SelectItem>
                  <SelectItem value="7-14 días">7-14 días</SelectItem>
                </SelectContent>
              </Select>
              {errors.handling_time && <p className="text-xs text-destructive">{errors.handling_time.message}</p>}
            </div>
          </div>

          {/* === SECTION: Compliance checkboxes === */}
          <Separator />
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Declaraciones obligatorias *</p>

            <div className="flex items-start gap-2">
              <Checkbox id="c18" checked={consentOver18} onCheckedChange={v => setConsentOver18(v === true)} className="mt-0.5" />
              <label htmlFor="c18" className="text-xs leading-tight cursor-pointer">Confirmo que soy mayor de 18 años.</label>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="cown" checked={consentOwnership} onCheckedChange={v => setConsentOwnership(v === true)} className="mt-0.5" />
              <label htmlFor="cown" className="text-xs leading-tight cursor-pointer">Declaro ser legítimo propietario del ejemplar ofrecido.</label>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="ceu" checked={consentEULegal} onCheckedChange={v => setConsentEULegal(v === true)} className="mt-0.5" />
              <label htmlFor="ceu" className="text-xs leading-tight cursor-pointer">Confirmo que la especie es legal para su venta y envío dentro de la UE (no protegida por CITES o con documentación válida).</label>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="ces" checked={consentSpainRules} onCheckedChange={v => setConsentSpainRules(v === true)} className="mt-0.5" />
              <label htmlFor="ces" className="text-xs leading-tight cursor-pointer">Acepto las normas de subastas conforme a la legislación española vigente.</label>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="cgdpr" checked={consentGDPR} onCheckedChange={v => setConsentGDPR(v === true)} className="mt-0.5" />
              <label htmlFor="cgdpr" className="text-xs leading-tight cursor-pointer">Consiento el tratamiento de mis datos personales conforme al RGPD para la gestión de esta subasta.</label>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="cfee" checked={consentFee} onCheckedChange={v => setConsentFee(v === true)} className="mt-0.5" />
              <label htmlFor="cfee" className="text-xs leading-tight cursor-pointer">Acepto la comisión de plataforma del 6% sobre el precio de venta final (+IVA cuando corresponda).</label>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={submitLot.isPending || !allConsentsAccepted}>
            {submitLot.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Enviar lote para revisión
          </Button>
        </form>
      </CardContent>
    </Card>
    </AuctionConsentGate>
  );
};

export default LotSubmissionForm;

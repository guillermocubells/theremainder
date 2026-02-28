import { useState, useEffect } from "react";
import { PLANT_TYPE_TO_CATEGORY_SLUG } from "@/utils/taxonomyMapping";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, X, AlertCircle, Sparkles, ShieldCheck } from "lucide-react";
import { ImageUploader } from "./ImageUploader";
import { COUNTRIES } from "@/data/countries";
import { z } from "zod";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface PlantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plant?: any;
  onSuccess: () => void | Promise<void>;
}

// ── Validation Schema ──
const plantSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200, "Máx. 200 caracteres"),
  slug: z.string().trim().min(1, "El slug es obligatorio").max(200).regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
  price: z.string().refine((v) => {
    const n = parseFloat(v);
    return !isNaN(n) && n >= 0;
  }, "Introduce un precio válido ≥ 0"),
  sale_price: z.string().refine((v) => {
    if (!v) return true;
    const n = parseFloat(v);
    return !isNaN(n) && n >= 0;
  }, "Precio oferta inválido").optional(),
  stock: z.string().refine((v) => {
    const n = parseInt(v);
    return !isNaN(n) && n >= 0;
  }, "Stock inválido"),
  meta_title: z.string().max(60, "Máx. 60 caracteres").optional(),
  meta_description: z.string().max(160, "Máx. 160 caracteres").optional(),
  reference_url: z.string().url("URL no válida").or(z.literal("")).optional(),
});

type ValidationErrors = Partial<Record<string, string>>;

// ── Field Error Component ──
function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
      <AlertCircle className="h-3 w-3 flex-shrink-0" />
      {error}
    </p>
  );
}

// ── Constants ──
const PLANT_TYPES = [
  { value: "palm", label: "Palmera" },
  { value: "fern", label: "Helecho arbóreo" },
  { value: "cycad", label: "Cícada" },
  { value: "tree", label: "Árbol ornamental" },
  { value: "shrub", label: "Arbusto" },
  { value: "succulent", label: "Suculenta" },
  { value: "grass", label: "Hierba" },
  { value: "bamboo", label: "Bambú" },
  { value: "bromeliad", label: "Bromeliácea" },
  { value: "heliconia", label: "Heliconia" },
  { value: "strelitzia", label: "Estrelicia" },
  { value: "ginger", label: "Jengibre" },
  { value: "banana", label: "Plátano" },
  { value: "agave", label: "Agave / Yuca" },
  { value: "aroid", label: "Arácea" },
  { value: "cactus", label: "Cactus" },
  { value: "conifer", label: "Conífera" },
  { value: "perennial", label: "Perenne" },
  { value: "other", label: "Otro" },
];

const WATER_LEVELS = [
  { value: "low", label: "Bajo" },
  { value: "medium", label: "Medio" },
  { value: "high", label: "Alto" },
];

const HUMIDITY_LEVELS = [
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
];

const RARITY_LEVELS = [
  { value: "common", label: "Común" },
  { value: "uncommon", label: "Poco común" },
  { value: "rare", label: "Rara" },
  { value: "very_rare", label: "Muy rara" },
  { value: "extremely_rare", label: "Extremadamente rara" },
];

const DIFFICULTY_LEVELS = [
  { value: "easy", label: "Fácil" },
  { value: "intermediate", label: "Intermedio" },
  { value: "advanced", label: "Avanzado" },
];

const EXPOSURE_OPTIONS = [
  { value: "sol", label: "Sol" },
  { value: "semisol", label: "Semisol" },
  { value: "semisombra", label: "Semisombra" },
  { value: "sombra", label: "Sombra" },
];

const PLANT_USE_OPTIONS = [
  { value: "interior", label: "Interior" },
  { value: "exterior", label: "Exterior" },
  { value: "jardin", label: "Jardín" },
  { value: "maceta", label: "Maceta" },
  { value: "seto", label: "Seto" },
  { value: "cobertura", label: "Cobertura" },
];

const CLIMATE_ZONE_OPTIONS = [
  "tropical",
  "subtropical",
  "mediterráneo",
  "templado",
  "continental",
  "oceánico",
  "árido",
  "semiárido",
];

function MultiChipSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[] | string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const opts =
    typeof options[0] === "string"
      ? (options as string[]).map((o) => ({ value: o, label: o }))
      : (options as { value: string; label: string }[]);

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5 mt-1">
        {opts.map((o) => {
          const active = selected.includes(o.value);
          return (
            <Badge
              key={o.value}
              variant={active ? "default" : "outline"}
              className={`cursor-pointer select-none ${active ? "bg-moss hover:bg-moss/80" : "hover:bg-muted"}`}
              onClick={() =>
                onChange(
                  active
                    ? selected.filter((s) => s !== o.value)
                    : [...selected, o.value]
                )
              }
            >
              {o.label}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}

const defaultForm = {
  name: "",
  scientific_name: "",
  common_name: "",
  slug: "",
  description: "",
  short_description: "",
  category_id: "",
  price: "",
  sale_price: "",
  stock: "0",
  container_size: "",
  germination_date: "",
  growth_rate: "",
  mature_height: "",
  mature_width: "",
  origin_country: "",
  origin_region: "",
  native_habitat: "",
  is_active: true,
  is_featured: false,
  images: [] as string[],
  product_images: [] as string[],
  primary_image: null as string | null,
  plant_type: "",
  water: "",
  humidity: "",
  rarity: "",
  difficulty: "",
  exposure: [] as string[],
  climate_zones: [] as string[],
  hardiness_zones: [] as string[],
  plant_use: [] as string[],
  tags: [] as string[],
  min_temp_c: "",
  family: "",
  variety: "",
  weight_grams: "",
  notes: "",
  meta_title: "",
  meta_description: "",
  image_alt_text: "",
  reference_url: "",
};

export function PlantFormDialog({
  open,
  onOpenChange,
  plant,
  onSuccess,
}: PlantFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({ ...defaultForm });
  const [hardinessInput, setHardinessInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // AI autocomplete state
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiPreserveEdited, setAiPreserveEdited] = useState(true);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [aiResult, setAiResult] = useState<{
    confidence: number;
    confidenceByField: Record<string, number>;
    priceSuggestion: string;
    warnings: string[];
    filledCount: number;
  } | null>(null);

  useEffect(() => {
    if (open) {
      setErrors({});
      setHasAttemptedSubmit(false);
      setTouchedFields({});
      setAiResult(null);
      fetchCategories();
      if (plant) {
        setFormData({
          name: plant.name || "",
          scientific_name: plant.scientific_name || "",
          common_name: plant.common_name || "",
          slug: plant.slug || "",
          description: plant.description || "",
          short_description: plant.short_description || "",
          category_id: plant.category_id || "",
          price: plant.price?.toString() || "",
          sale_price: plant.sale_price?.toString() || "",
          stock: plant.stock_qty?.toString() || "0",
          container_size: plant.container_size || "",
          germination_date: plant.germination_date || "",
          growth_rate: plant.growth_rate || "",
          mature_height: plant.mature_height || "",
          mature_width: plant.mature_width || "",
          origin_country: plant.origin_country || "",
          origin_region: plant.origin_region || "",
          native_habitat: plant.native_habitat || "",
          is_active: plant.is_active ?? true,
          is_featured: plant.is_featured ?? false,
          images: plant.images || [],
          product_images: plant.product_images || [],
          primary_image: plant.primary_image || null,
          plant_type: plant.plant_type || "",
          water: plant.water || "",
          humidity: plant.humidity || "",
          rarity: plant.rarity || "",
          difficulty: plant.difficulty || "",
          exposure: plant.exposure || [],
          climate_zones: plant.climate_zones || [],
          hardiness_zones: plant.hardiness_zones || [],
          plant_use: plant.plant_use || [],
          tags: plant.tags || [],
          min_temp_c: plant.min_temp_c?.toString() || "",
          family: plant.family || "",
          variety: plant.variety || "",
          weight_grams: plant.weight_grams?.toString() || "",
          notes: plant.notes || "",
          meta_title: plant.meta_title || "",
          meta_description: plant.meta_description || "",
          image_alt_text: plant.image_alt_text || "",
          reference_url: plant.reference_url || "",
        });
      } else {
        setFormData({ ...defaultForm });
      }
    }
  }, [open, plant]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("id, name, slug")
      .order("display_order", { ascending: true });
    setCategories(data || []);
  };

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const validate = (): boolean => {
    const result = plantSchema.safeParse({
      name: formData.name,
      slug: formData.slug,
      price: formData.price,
      sale_price: formData.sale_price || undefined,
      stock: formData.stock,
      meta_title: formData.meta_title || undefined,
      meta_description: formData.meta_description || undefined,
      reference_url: formData.reference_url || undefined,
    });

    if (result.success) {
      setErrors({});
      return true;
    }

    const fieldErrors: ValidationErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0]?.toString();
      if (field && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    setErrors(fieldErrors);
    return false;
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "name" && !plant) {
        updated.slug = generateSlug(value);
      }
      return updated;
    });
    // Mark as manually touched
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
    // Clear error for this field on change
    if (hasAttemptedSubmit && errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // ── AI Autocomplete ──
  const handleAiAutocomplete = async () => {
    const textQuery = formData.scientific_name || formData.name || formData.common_name;
    const imageUrls = formData.images.filter((url) => url.startsWith("http"));

    if (!textQuery && imageUrls.length === 0) {
      toast.error("Introduce un nombre o sube imágenes antes de usar el autocompletado");
      return;
    }

    setIsAiLoading(true);
    setAiResult(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) {
        toast.error("Sesión expirada");
        return;
      }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-plant-autocomplete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            textQuery,
            imageUrls: imageUrls.slice(0, 3),
          }),
        }
      );

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      const result = await resp.json();
      const aiData: Record<string, any> = result.data || {};

      // Fields that should NOT be touched by AI
      const skipFields = new Set(["price", "sale_price", "stock", "germination_date", "is_active", "is_featured", "images", "product_images", "primary_image"]);

      let filledCount = 0;

      setFormData((prev) => {
        const updated = { ...prev };
        for (const [field, value] of Object.entries(aiData)) {
          if (skipFields.has(field)) continue;
          if (!(field in defaultForm)) continue;

          // Check if field has meaningful value from AI
          const hasValue = Array.isArray(value) ? value.length > 0 : value !== "" && value != null;
          if (!hasValue) continue;

          // Respect manually edited fields if toggle is on
          if (aiPreserveEdited && touchedFields[field]) continue;

          // Check if field already has a value (from editing existing plant)
          const currentValue = (prev as any)[field];
          const currentHasValue = Array.isArray(currentValue) ? currentValue.length > 0 : currentValue !== "" && currentValue != null && currentValue !== false;
          if (aiPreserveEdited && currentHasValue && plant) continue;

          (updated as any)[field] = value;
          filledCount++;
        }

        // Auto-map plant_type → category_id if not manually set
        if (updated.plant_type && (!aiPreserveEdited || !touchedFields["category_id"])) {
          const slug = PLANT_TYPE_TO_CATEGORY_SLUG[updated.plant_type];
          if (slug) {
            const match = categories.find((c) => c.slug === slug);
            if (match) {
              const prevCatHasValue = prev.category_id !== "" && prev.category_id != null;
              if (!(aiPreserveEdited && prevCatHasValue && plant)) {
                updated.category_id = match.id;
                filledCount++;
              }
            }
          }
        }

        return updated;
      });

      setAiResult({
        confidence: result.confidence || 0,
        confidenceByField: result.confidenceByField || {},
        priceSuggestion: result.priceSuggestion || "",
        warnings: result.warnings || [],
        filledCount,
      });

      if (result.priceSuggestion) {
        toast.info(`💰 Sugerencia de precio: ${result.priceSuggestion}`, { duration: 8000 });
      }

      toast.success(
        `Autocompletado listo (${filledCount} campos). ` +
        `Confianza: ${Math.round((result.confidence || 0) * 100)}%. Revisa los valores.`,
        { duration: 6000 }
      );

      // ── Fetch iNaturalist images if species identified and images empty ──
      const scientificName = aiData.scientific_name || aiData.name || "";
      if (scientificName && (!aiPreserveEdited || !touchedFields["images"])) {
        fetchINaturalistImages(scientificName);
      }
    } catch (err: any) {
      console.error("AI autocomplete error:", err);
      toast.error(err.message || "Error al autocompletar con IA");
    } finally {
      setIsAiLoading(false);
    }
  };

  const fetchINaturalistImages = async (scientificName: string) => {
    try {
      const query = encodeURIComponent(scientificName.trim());
      const url = `https://api.inaturalist.org/v1/observations?taxon_name=${query}&photos=true&per_page=12&quality_grade=research&order_by=votes&order=desc`;
      const resp = await fetch(url);
      if (!resp.ok) return;

      const data = await resp.json();
      const results = data.results || [];

      // Collect unique medium-quality photo URLs (deduplicate by photo id)
      const seenIds = new Set<number>();
      const photoUrls: string[] = [];

      for (const obs of results) {
        if (photoUrls.length >= 5) break;
        for (const photo of obs.photos || []) {
          if (photoUrls.length >= 5) break;
          if (seenIds.has(photo.id)) continue;
          seenIds.add(photo.id);
          // Replace "square" with "medium" for better quality
          const mediumUrl = (photo.url || "").replace("/square.", "/medium.");
          if (mediumUrl) photoUrls.push(mediumUrl);
        }
      }

      if (photoUrls.length === 0) return;

      setFormData((prev) => {
        // Don't overwrite if user already added images
        if (prev.images && prev.images.length > 0 && aiPreserveEdited) return prev;
        return { ...prev, images: photoUrls };
      });

      toast.success(`📷 ${photoUrls.length} imágenes de iNaturalist añadidas. Revisa en la pestaña "Media".`, { duration: 5000 });
    } catch (err) {
      console.error("iNaturalist fetch error:", err);
      // Silent fail – images are optional
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);

    if (!validate()) {
      toast.error("Corrige los errores antes de guardar");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        scientific_name: formData.scientific_name || null,
        common_name: formData.common_name || null,
        slug: formData.slug,
        description: formData.description || null,
        short_description: formData.short_description || null,
        category_id: formData.category_id || null,
        price: parseFloat(formData.price) || 0,
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
        stock_qty: parseInt(formData.stock) || 0,
        container_size: formData.container_size || null,
        germination_date: formData.germination_date || null,
        growth_rate: formData.growth_rate || null,
        mature_height: formData.mature_height || null,
        mature_width: formData.mature_width || null,
        origin_country: formData.origin_country || null,
        origin_region: formData.origin_region || null,
        native_habitat: formData.native_habitat || null,
        is_active: formData.is_active,
        is_featured: formData.is_featured,
        images: formData.images,
        product_images: formData.product_images,
        primary_image: formData.primary_image,
        plant_type: (formData.plant_type || null) as any,
        water: (formData.water || null) as any,
        humidity: (formData.humidity || null) as any,
        rarity: (formData.rarity || null) as any,
        difficulty: (formData.difficulty || null) as any,
        exposure: formData.exposure,
        climate_zones: formData.climate_zones,
        hardiness_zones: formData.hardiness_zones,
        plant_use: formData.plant_use,
        tags: formData.tags,
        min_temp_c: formData.min_temp_c ? parseInt(formData.min_temp_c) : null,
        family: formData.family || null,
        variety: formData.variety || null,
        weight_grams: formData.weight_grams ? parseInt(formData.weight_grams) : null,
        notes: formData.notes || null,
        meta_title: formData.meta_title || null,
        meta_description: formData.meta_description || null,
        image_alt_text: formData.image_alt_text || null,
        reference_url: formData.reference_url || null,
      };

      if (plant) {
        const { error } = await supabase
          .from("plants")
          .update(payload)
          .eq("id", plant.id);
        if (error) throw error;
        toast.success("Planta actualizada correctamente");
      } else {
        const { error } = await supabase.from("plants").insert(payload);
        if (error) throw error;
        toast.success("Planta creada correctamente");
      }

      await onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving plant:", error);
      toast.error(error.message || "Error al guardar la planta");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addHardinessZone = () => {
    const v = hardinessInput.trim().toUpperCase();
    if (v && !formData.hardiness_zones.includes(v)) {
      handleChange("hardiness_zones", [...formData.hardiness_zones, v]);
    }
    setHardinessInput("");
  };

  const addTag = () => {
    const v = tagInput.trim().toLowerCase();
    if (v && !formData.tags.includes(v)) {
      handleChange("tags", [...formData.tags, v]);
    }
    setTagInput("");
  };

  // Count errors per tab for badge indicators
  const generalErrors = ["name", "slug", "price", "sale_price", "stock"].filter((k) => errors[k]).length;
  const seoErrors = ["meta_title", "meta_description", "reference_url"].filter((k) => errors[k]).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4 pr-6">
            <DialogTitle>
              {plant ? "Editar Planta" : "Nueva Planta"}
            </DialogTitle>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Switch
                  id="ai-preserve"
                  checked={aiPreserveEdited}
                  onCheckedChange={setAiPreserveEdited}
                  className="scale-75"
                />
                <Label htmlFor="ai-preserve" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
                  <ShieldCheck className="h-3 w-3 inline mr-0.5" />
                  No sobrescribir
                </Label>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAiAutocomplete}
                disabled={isAiLoading}
              >
                {isAiLoading ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1.5" />
                )}
                {isAiLoading ? "Analizando…" : "Autocompletar con IA"}
              </Button>
            </div>
          </div>
          {aiResult && (
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
              <span>
                ✅ {aiResult.filledCount} campos · Confianza {Math.round(aiResult.confidence * 100)}%
              </span>
              {aiResult.warnings.length > 0 && (
                <span className="text-destructive">
                  ⚠ {aiResult.warnings[0]}
                </span>
              )}
            </div>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <ScrollArea className="flex-1">
            <Tabs defaultValue="general" className="w-full px-1">
              <TabsList className="grid grid-cols-6 w-full mb-4">
                <TabsTrigger value="general" className="relative">
                  General
                  {generalErrors > 0 && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                      {generalErrors}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="attributes">Atributos</TabsTrigger>
                <TabsTrigger value="details">Detalles</TabsTrigger>
                <TabsTrigger value="origin">Origen</TabsTrigger>
                <TabsTrigger value="media">Imágenes</TabsTrigger>
                <TabsTrigger value="seo" className="relative">
                  SEO
                  {seoErrors > 0 && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                      {seoErrors}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* ── General Tab ── */}
              <TabsContent value="general" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nombre *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      className={errors.name ? "border-destructive" : ""}
                    />
                    <FieldError error={errors.name} />
                  </div>
                  <div>
                    <Label htmlFor="scientific_name">Nombre científico</Label>
                    <Input
                      id="scientific_name"
                      value={formData.scientific_name}
                      onChange={(e) => handleChange("scientific_name", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="common_name">Nombre común</Label>
                    <Input
                      id="common_name"
                      value={formData.common_name}
                      onChange={(e) => handleChange("common_name", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="slug">Slug (URL) *</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => handleChange("slug", e.target.value)}
                      className={errors.slug ? "border-destructive" : ""}
                    />
                    <FieldError error={errors.slug} />
                  </div>
                </div>

                <div>
                  <Label htmlFor="short_description">Descripción corta</Label>
                  <Input
                    id="short_description"
                    value={formData.short_description}
                    onChange={(e) => handleChange("short_description", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descripción completa</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="category_id">Categoría</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(v) => handleChange("category_id", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="price">Precio (€) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => handleChange("price", e.target.value)}
                      className={errors.price ? "border-destructive" : ""}
                    />
                    <FieldError error={errors.price} />
                  </div>
                  <div>
                    <Label htmlFor="sale_price">Precio oferta (€)</Label>
                    <Input
                      id="sale_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.sale_price}
                      onChange={(e) => handleChange("sale_price", e.target.value)}
                      className={errors.sale_price ? "border-destructive" : ""}
                    />
                    <FieldError error={errors.sale_price} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="stock">Stock *</Label>
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) => handleChange("stock", e.target.value)}
                      className={errors.stock ? "border-destructive" : ""}
                    />
                    <FieldError error={errors.stock} />
                  </div>
                  <div>
                    <Label htmlFor="container_size">Tamaño contenedor</Label>
                    <Input
                      id="container_size"
                      value={formData.container_size}
                      onChange={(e) => handleChange("container_size", e.target.value)}
                      placeholder="ej: C-2 (2L)"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(v) => handleChange("is_active", v)}
                    />
                    <Label htmlFor="is_active">Publicada</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="is_featured"
                      checked={formData.is_featured}
                      onCheckedChange={(v) => handleChange("is_featured", v)}
                    />
                    <Label htmlFor="is_featured">Destacada</Label>
                  </div>
                </div>
              </TabsContent>

              {/* ── Attributes Tab ── */}
              <TabsContent value="attributes" className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Tipo de planta</Label>
                    <Select
                      value={formData.plant_type}
                      onValueChange={(v) => handleChange("plant_type", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PLANT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Riego</Label>
                    <Select
                      value={formData.water}
                      onValueChange={(v) => handleChange("water", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona..." />
                      </SelectTrigger>
                      <SelectContent>
                        {WATER_LEVELS.map((w) => (
                          <SelectItem key={w.value} value={w.value}>
                            {w.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Humedad</Label>
                    <Select
                      value={formData.humidity}
                      onValueChange={(v) => handleChange("humidity", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona..." />
                      </SelectTrigger>
                      <SelectContent>
                        {HUMIDITY_LEVELS.map((h) => (
                          <SelectItem key={h.value} value={h.value}>
                            {h.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Rareza</Label>
                    <Select
                      value={formData.rarity}
                      onValueChange={(v) => handleChange("rarity", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona..." />
                      </SelectTrigger>
                      <SelectContent>
                        {RARITY_LEVELS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Dificultad</Label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(v) => handleChange("difficulty", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona..." />
                      </SelectTrigger>
                      <SelectContent>
                        {DIFFICULTY_LEVELS.map((d) => (
                          <SelectItem key={d.value} value={d.value}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="min_temp_c">Temp. mín. (°C)</Label>
                    <Input
                      id="min_temp_c"
                      type="number"
                      value={formData.min_temp_c}
                      onChange={(e) => handleChange("min_temp_c", e.target.value)}
                      placeholder="ej: -5"
                    />
                  </div>
                </div>

                <MultiChipSelect
                  label="Exposición"
                  options={EXPOSURE_OPTIONS}
                  selected={formData.exposure}
                  onChange={(v) => handleChange("exposure", v)}
                />

                <MultiChipSelect
                  label="Uso"
                  options={PLANT_USE_OPTIONS}
                  selected={formData.plant_use}
                  onChange={(v) => handleChange("plant_use", v)}
                />

                <MultiChipSelect
                  label="Zonas climáticas"
                  options={CLIMATE_ZONE_OPTIONS}
                  selected={formData.climate_zones}
                  onChange={(v) => handleChange("climate_zones", v)}
                />

                {/* Hardiness zones as free-text chips */}
                <div>
                  <Label>Zonas de rusticidad (USDA)</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1 mb-2">
                    {formData.hardiness_zones.map((z) => (
                      <Badge key={z} variant="default" className="bg-moss gap-1">
                        {z}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() =>
                            handleChange(
                              "hardiness_zones",
                              formData.hardiness_zones.filter((hz) => hz !== z)
                            )
                          }
                        />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={hardinessInput}
                      onChange={(e) => setHardinessInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addHardinessZone();
                        }
                      }}
                      placeholder="ej: 9a, 10b"
                      className="max-w-[200px]"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addHardinessZone}>
                      Añadir
                    </Button>
                  </div>
                </div>

                {/* Tags as free-text chips */}
                <div>
                  <Label>Etiquetas</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1 mb-2">
                    {formData.tags.map((t) => (
                      <Badge key={t} variant="default" className="bg-moss gap-1">
                        {t}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() =>
                            handleChange("tags", formData.tags.filter((tag) => tag !== t))
                          }
                        />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      placeholder="ej: tropical, resistente, rara"
                      className="max-w-[300px]"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addTag}>
                      Añadir
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* ── Details Tab ── */}
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="growth_rate">Velocidad crecimiento</Label>
                    <Select
                      value={formData.growth_rate}
                      onValueChange={(v) => handleChange("growth_rate", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="slow">Lento</SelectItem>
                        <SelectItem value="moderate">Moderado</SelectItem>
                        <SelectItem value="fast">Rápido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="mature_height">Altura adulta</Label>
                    <Input
                      id="mature_height"
                      value={formData.mature_height}
                      onChange={(e) => handleChange("mature_height", e.target.value)}
                      placeholder="ej: 2-3m"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mature_width">Anchura adulta</Label>
                    <Input
                      id="mature_width"
                      value={formData.mature_width}
                      onChange={(e) => handleChange("mature_width", e.target.value)}
                      placeholder="ej: 1-2m"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="germination_date">Fecha germinación</Label>
                    <Input
                      id="germination_date"
                      type="date"
                      value={formData.germination_date}
                      onChange={(e) => handleChange("germination_date", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="family">Familia</Label>
                    <Input
                      id="family"
                      value={formData.family}
                      onChange={(e) => handleChange("family", e.target.value)}
                      placeholder="ej: Arecaceae"
                    />
                  </div>
                  <div>
                    <Label htmlFor="variety">Variedad</Label>
                    <Input
                      id="variety"
                      value={formData.variety}
                      onChange={(e) => handleChange("variety", e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="weight_grams">Peso (g)</Label>
                  <Input
                    id="weight_grams"
                    type="number"
                    min="0"
                    value={formData.weight_grams}
                    onChange={(e) => handleChange("weight_grams", e.target.value)}
                    className="max-w-[200px]"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notas internas</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    rows={3}
                    placeholder="Notas privadas, no visibles al público"
                  />
                </div>
              </TabsContent>

              {/* ── Origin Tab ── */}
              <TabsContent value="origin" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="origin_country">País de origen</Label>
                    <Select
                      value={formData.origin_country}
                      onValueChange={(v) => handleChange("origin_country", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona país..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="origin_region">Región de origen</Label>
                    <Input
                      id="origin_region"
                      value={formData.origin_region}
                      onChange={(e) => handleChange("origin_region", e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="native_habitat">Hábitat natural</Label>
                  <Textarea
                    id="native_habitat"
                    value={formData.native_habitat}
                    onChange={(e) => handleChange("native_habitat", e.target.value)}
                    rows={3}
                  />
                </div>
              </TabsContent>

              {/* ── Media Tab ── */}
              <TabsContent value="media" className="space-y-4">
                <ImageUploader
                  images={formData.images}
                  onImagesChange={(urls) => handleChange("images", urls)}
                  productImages={formData.product_images}
                  onProductImagesChange={(pi) => handleChange("product_images", pi)}
                  primaryImage={formData.primary_image ?? undefined}
                  onPrimaryImageChange={(pi) => handleChange("primary_image", pi)}
                />
                {formData.images.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Usa el menú ⋯ en cada imagen para marcarla como imagen de producto o principal.
                  </p>
                )}
              </TabsContent>

              {/* ── SEO Tab ── */}
              <TabsContent value="seo" className="space-y-4">
                <div>
                  <Label htmlFor="meta_title">Meta título</Label>
                  <Input
                    id="meta_title"
                    value={formData.meta_title}
                    onChange={(e) => handleChange("meta_title", e.target.value)}
                    maxLength={60}
                    placeholder="Máx 60 caracteres"
                    className={errors.meta_title ? "border-destructive" : ""}
                  />
                  <div className="flex items-center justify-between mt-1">
                    <FieldError error={errors.meta_title} />
                    <p className="text-xs text-muted-foreground">
                      {formData.meta_title.length}/60
                    </p>
                  </div>
                </div>
                <div>
                  <Label htmlFor="meta_description">Meta descripción</Label>
                  <Textarea
                    id="meta_description"
                    value={formData.meta_description}
                    onChange={(e) => handleChange("meta_description", e.target.value)}
                    maxLength={160}
                    rows={2}
                    placeholder="Máx 160 caracteres"
                    className={errors.meta_description ? "border-destructive" : ""}
                  />
                  <div className="flex items-center justify-between mt-1">
                    <FieldError error={errors.meta_description} />
                    <p className="text-xs text-muted-foreground">
                      {formData.meta_description.length}/160
                    </p>
                  </div>
                </div>
                <div>
                  <Label htmlFor="image_alt_text">Alt text imagen</Label>
                  <Input
                    id="image_alt_text"
                    value={formData.image_alt_text}
                    onChange={(e) => handleChange("image_alt_text", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="reference_url">URL de referencia</Label>
                  <Input
                    id="reference_url"
                    value={formData.reference_url}
                    onChange={(e) => handleChange("reference_url", e.target.value)}
                    placeholder="https://..."
                    className={errors.reference_url ? "border-destructive" : ""}
                  />
                  <FieldError error={errors.reference_url} />
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-moss hover:bg-moss/90"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {plant ? "Guardar cambios" : "Crear planta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

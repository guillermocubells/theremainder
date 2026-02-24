import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { Loader2, Upload, X, Plus } from "lucide-react";
import { ImageUploader } from "./ImageUploader";
import { COUNTRIES } from "@/data/countries";

interface Category {
  id: string;
  name: string;
}

interface PlantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plant?: any;
  onSuccess: () => void;
}

export function PlantFormDialog({
  open,
  onOpenChange,
  plant,
  onSuccess,
}: PlantFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    scientific_name: "",
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
  });

  useEffect(() => {
    if (open) {
      fetchCategories();
      if (plant) {
        setFormData({
          name: plant.name || "",
          scientific_name: plant.scientific_name || "",
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
        });
      } else {
        setFormData({
          name: "",
          scientific_name: "",
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
          images: [],
        });
      }
    }
  }, [open, plant]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("id, name")
      .order("name");
    setCategories(data || []);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "name" && !plant) {
        updated.slug = generateSlug(value);
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        scientific_name: formData.scientific_name || null,
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

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving plant:", error);
      toast.error(error.message || "Error al guardar la planta");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImagesChange = (urls: string[]) => {
    setFormData((prev) => ({
      ...prev,
      images: urls,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {plant ? "Editar Planta" : "Nueva Planta"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <ScrollArea className="h-[calc(90vh-150px)]">
            <Tabs defaultValue="general" className="w-full px-1">
              <TabsList className="grid grid-cols-4 w-full mb-4">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="details">Detalles</TabsTrigger>
                <TabsTrigger value="origin">Origen</TabsTrigger>
                <TabsTrigger value="media">Imágenes</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nombre *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="scientific_name">Nombre científico</Label>
                    <Input
                      id="scientific_name"
                      value={formData.scientific_name}
                      onChange={(e) =>
                        handleChange("scientific_name", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="slug">Slug (URL)</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => handleChange("slug", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="short_description">Descripción corta</Label>
                  <Input
                    id="short_description"
                    value={formData.short_description}
                    onChange={(e) =>
                      handleChange("short_description", e.target.value)
                    }
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
                      required
                    />
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
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="stock">Stock</Label>
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) => handleChange("stock", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="container_size">Tamaño contenedor</Label>
                    <Input
                      id="container_size"
                      value={formData.container_size}
                      onChange={(e) =>
                        handleChange("container_size", e.target.value)
                      }
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
                    <Label htmlFor="is_active">Activa</Label>
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

              <TabsContent value="details" className="space-y-4">
                {/* Removed: sun_requirement, water_requirement, temperature_range, hardiness_zone — use exposure, water, min_temp_c, climate_zones instead */}

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
                      onChange={(e) =>
                        handleChange("mature_height", e.target.value)
                      }
                      placeholder="ej: 2-3m"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mature_width">Anchura adulta</Label>
                    <Input
                      id="mature_width"
                      value={formData.mature_width}
                      onChange={(e) =>
                        handleChange("mature_width", e.target.value)
                      }
                      placeholder="ej: 1-2m"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="germination_date">Fecha germinación</Label>
                  <Input
                    id="germination_date"
                    type="date"
                    value={formData.germination_date}
                    onChange={(e) =>
                      handleChange("germination_date", e.target.value)
                    }
                  />
                </div>
              </TabsContent>

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
                      onChange={(e) =>
                        handleChange("origin_region", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="native_habitat">Hábitat natural</Label>
                  <Textarea
                    id="native_habitat"
                    value={formData.native_habitat}
                    onChange={(e) =>
                      handleChange("native_habitat", e.target.value)
                    }
                    rows={3}
                  />
                </div>
              </TabsContent>

              <TabsContent value="media" className="space-y-4">
                <ImageUploader
                  images={formData.images}
                  onImagesChange={handleImagesChange}
                />

                {formData.images.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    La primera imagen se usa como imagen principal.
                  </p>
                )}
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

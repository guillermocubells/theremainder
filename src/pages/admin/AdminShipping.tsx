import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Pencil, Trash2, Loader2, Calculator } from "lucide-react";
import { toast } from "sonner";

interface ShippingZone {
  id: string;
  country_code: string;
  country_name: string;
  base_cost: number;
  per_item_cost: number;
  free_shipping_threshold: number | null;
  delivery_days_min: number;
  delivery_days_max: number;
  is_active: boolean;
}

interface FormErrors {
  country_code?: string;
  country_name?: string;
  base_cost?: string;
  per_item_cost?: string;
  free_shipping_threshold?: string;
  delivery_days_min?: string;
  delivery_days_max?: string;
}

function validateForm(
  data: typeof INITIAL_FORM,
  existingCodes: string[],
  editingCode: string | null
): FormErrors {
  const errors: FormErrors = {};

  // Country code
  const code = data.country_code.trim().toUpperCase();
  if (!code) {
    errors.country_code = "El código ISO es obligatorio";
  } else if (!/^[A-Z]{2}$/.test(code)) {
    errors.country_code = "Debe ser un código ISO de 2 letras (ej: ES)";
  } else if (
    existingCodes.includes(code) &&
    code !== editingCode
  ) {
    errors.country_code = "Ya existe una zona para este código de país";
  }

  // Country name
  if (!data.country_name.trim()) {
    errors.country_name = "El nombre del país es obligatorio";
  }

  // Base cost
  const baseCost = parseFloat(data.base_cost);
  if (isNaN(baseCost) || baseCost < 0) {
    errors.base_cost = "Debe ser un número ≥ 0";
  }

  // Per item cost
  const perItem = parseFloat(data.per_item_cost);
  if (isNaN(perItem) || perItem < 0) {
    errors.per_item_cost = "Debe ser un número ≥ 0";
  }

  // Free shipping threshold
  if (data.free_shipping_threshold.trim()) {
    const threshold = parseFloat(data.free_shipping_threshold);
    if (isNaN(threshold) || threshold <= 0) {
      errors.free_shipping_threshold = "Debe ser un número > 0 o dejarlo vacío";
    }
  }

  // Delivery days
  const dMin = parseInt(data.delivery_days_min);
  const dMax = parseInt(data.delivery_days_max);
  if (isNaN(dMin) || dMin < 1) {
    errors.delivery_days_min = "Debe ser al menos 1";
  }
  if (isNaN(dMax) || dMax < 1) {
    errors.delivery_days_max = "Debe ser al menos 1";
  }
  if (!isNaN(dMin) && !isNaN(dMax) && dMax < dMin) {
    errors.delivery_days_max = "No puede ser menor que el mínimo";
  }

  return errors;
}

const INITIAL_FORM = {
  country_code: "",
  country_name: "",
  base_cost: "0",
  per_item_cost: "0",
  free_shipping_threshold: "",
  delivery_days_min: "3",
  delivery_days_max: "7",
  is_active: true,
};

/** Live preview of shipping cost for the current form values */
function ShippingPreviewCalc({ formData }: { formData: typeof INITIAL_FORM }) {
  const [qty, setQty] = useState("1");
  const [subtotal, setSubtotal] = useState("50");

  const result = useMemo(() => {
    const baseCost = parseFloat(formData.base_cost) || 0;
    const perItem = parseFloat(formData.per_item_cost) || 0;
    const threshold = formData.free_shipping_threshold
      ? parseFloat(formData.free_shipping_threshold)
      : null;
    const items = parseInt(qty) || 1;
    const sub = parseFloat(subtotal) || 0;

    const isFree = threshold !== null && sub >= threshold;
    const cost = isFree ? 0 : baseCost + perItem * items;

    return { cost, isFree, total: sub + cost };
  }, [formData.base_cost, formData.per_item_cost, formData.free_shipping_threshold, qty, subtotal]);

  return (
    <Card className="border-dashed border-primary/30">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2 text-primary">
          <Calculator className="h-4 w-4" />
          Vista previa de coste
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Nº ítems</Label>
            <Input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Subtotal (€)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={subtotal}
              onChange={(e) => setSubtotal(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>
        <Separator />
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Envío:</span>
            <span className="font-medium">
              {result.isFree ? (
                <Badge variant="default" className="bg-primary text-xs">Gratis</Badge>
              ) : (
                `${result.cost.toFixed(2)} €`
              )}
            </span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total:</span>
            <span>{result.total.toFixed(2)} €</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

export default function AdminShipping() {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
  const [deletingZone, setDeletingZone] = useState<ShippingZone | null>(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState(false);

  const existingCodes = useMemo(
    () => zones.map((z) => z.country_code),
    [zones]
  );

  const fetchZones = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("shipping_zones")
        .select("*")
        .order("country_name", { ascending: true });

      if (error) throw error;
      setZones(data || []);
    } catch (error) {
      console.error("Error fetching shipping zones:", error);
      toast.error("Error al cargar las zonas de envío");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  // Re-validate on every form change after first submit attempt
  useEffect(() => {
    if (!touched) return;
    setErrors(
      validateForm(formData, existingCodes, editingZone?.country_code ?? null)
    );
  }, [formData, touched, existingCodes, editingZone]);

  const handleOpenForm = (zone?: ShippingZone) => {
    setTouched(false);
    setErrors({});
    if (zone) {
      setEditingZone(zone);
      setFormData({
        country_code: zone.country_code,
        country_name: zone.country_name,
        base_cost: zone.base_cost.toString(),
        per_item_cost: zone.per_item_cost.toString(),
        free_shipping_threshold: zone.free_shipping_threshold?.toString() || "",
        delivery_days_min: zone.delivery_days_min.toString(),
        delivery_days_max: zone.delivery_days_max.toString(),
        is_active: zone.is_active,
      });
    } else {
      setEditingZone(null);
      setFormData({ ...INITIAL_FORM });
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    const validationErrors = validateForm(
      formData,
      existingCodes,
      editingZone?.country_code ?? null
    );
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);

    try {
      const payload = {
        country_code: formData.country_code.trim().toUpperCase(),
        country_name: formData.country_name.trim(),
        base_cost: parseFloat(formData.base_cost) || 0,
        per_item_cost: parseFloat(formData.per_item_cost) || 0,
        free_shipping_threshold: formData.free_shipping_threshold.trim()
          ? parseFloat(formData.free_shipping_threshold)
          : null,
        delivery_days_min: parseInt(formData.delivery_days_min) || 3,
        delivery_days_max: parseInt(formData.delivery_days_max) || 7,
        is_active: formData.is_active,
      };

      if (editingZone) {
        const { error } = await supabase
          .from("shipping_zones")
          .update(payload)
          .eq("id", editingZone.id);

        if (error) throw error;
        toast.success("Zona de envío actualizada");
      } else {
        const { error } = await supabase.from("shipping_zones").insert(payload);

        if (error) throw error;
        toast.success("Zona de envío creada");
      }

      fetchZones();
      setIsFormOpen(false);
    } catch (error: any) {
      console.error("Error saving shipping zone:", error);
      toast.error(error.message || "Error al guardar la zona de envío");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingZone) return;

    try {
      const { error } = await supabase
        .from("shipping_zones")
        .delete()
        .eq("id", deletingZone.id);

      if (error) throw error;
      toast.success("Zona de envío eliminada");
      fetchZones();
    } catch (error) {
      console.error("Error deleting shipping zone:", error);
      toast.error("Error al eliminar la zona de envío");
    } finally {
      setDeletingZone(null);
    }
  };

  const formatCurrency = (amount: number) =>
    amount.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Zonas de Envío</h1>
          <p className="text-muted-foreground">
            Configura los costes de envío por país
          </p>
        </div>
        <Button
          onClick={() => handleOpenForm()}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Zona
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : zones.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No hay zonas de envío configuradas</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>País</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Coste base</TableHead>
                <TableHead>Por ítem</TableHead>
                <TableHead>Envío gratis desde</TableHead>
                <TableHead>Días entrega</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map((zone) => (
                <TableRow key={zone.id}>
                  <TableCell className="font-medium">{zone.country_name}</TableCell>
                  <TableCell>{zone.country_code}</TableCell>
                  <TableCell>{formatCurrency(zone.base_cost)}</TableCell>
                  <TableCell>{formatCurrency(zone.per_item_cost)}</TableCell>
                  <TableCell>
                    {zone.free_shipping_threshold
                      ? formatCurrency(zone.free_shipping_threshold)
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {zone.delivery_days_min}-{zone.delivery_days_max} días
                  </TableCell>
                  <TableCell>
                    {zone.is_active ? (
                      <Badge variant="default" className="bg-primary">
                        Activa
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inactiva</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenForm(zone)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingZone(zone)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingZone ? "Editar Zona de Envío" : "Nueva Zona de Envío"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country_name">País *</Label>
                <Input
                  id="country_name"
                  value={formData.country_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, country_name: e.target.value }))
                  }
                  placeholder="España"
                  className={errors.country_name ? "border-destructive" : ""}
                />
                <FieldError message={errors.country_name} />
              </div>
              <div>
                <Label htmlFor="country_code">Código ISO *</Label>
                <Input
                  id="country_code"
                  value={formData.country_code}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      country_code: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="ES"
                  maxLength={2}
                  className={errors.country_code ? "border-destructive" : ""}
                />
                <FieldError message={errors.country_code} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="base_cost">Coste base (€)</Label>
                <Input
                  id="base_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.base_cost}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, base_cost: e.target.value }))
                  }
                  className={errors.base_cost ? "border-destructive" : ""}
                />
                <FieldError message={errors.base_cost} />
              </div>
              <div>
                <Label htmlFor="per_item_cost">Coste por ítem (€)</Label>
                <Input
                  id="per_item_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.per_item_cost}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, per_item_cost: e.target.value }))
                  }
                  className={errors.per_item_cost ? "border-destructive" : ""}
                />
                <FieldError message={errors.per_item_cost} />
              </div>
            </div>

            <div>
              <Label htmlFor="free_shipping_threshold">Envío gratis desde (€)</Label>
              <Input
                id="free_shipping_threshold"
                type="number"
                step="0.01"
                min="0"
                value={formData.free_shipping_threshold}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    free_shipping_threshold: e.target.value,
                  }))
                }
                placeholder="Dejar vacío si no aplica"
                className={errors.free_shipping_threshold ? "border-destructive" : ""}
              />
              <FieldError message={errors.free_shipping_threshold} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="delivery_days_min">Días mínimo</Label>
                <Input
                  id="delivery_days_min"
                  type="number"
                  min="1"
                  value={formData.delivery_days_min}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      delivery_days_min: e.target.value,
                    }))
                  }
                  className={errors.delivery_days_min ? "border-destructive" : ""}
                />
                <FieldError message={errors.delivery_days_min} />
              </div>
              <div>
                <Label htmlFor="delivery_days_max">Días máximo</Label>
                <Input
                  id="delivery_days_max"
                  type="number"
                  min="1"
                  value={formData.delivery_days_max}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      delivery_days_max: e.target.value,
                    }))
                  }
                  className={errors.delivery_days_max ? "border-destructive" : ""}
                />
                <FieldError message={errors.delivery_days_max} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(v) =>
                  setFormData((prev) => ({ ...prev, is_active: v }))
                }
              />
              <Label htmlFor="is_active">Zona activa</Label>
            </div>

            {/* Shipping preview calculator */}
            <ShippingPreviewCalc formData={formData} />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingZone ? "Guardar" : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingZone} onOpenChange={() => setDeletingZone(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar zona de envío?</AlertDialogTitle>
            <AlertDialogDescription>
              Los clientes de {deletingZone?.country_name} ya no podrán realizar pedidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

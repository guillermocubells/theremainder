import { useState, useEffect } from "react";
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
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
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

export default function AdminShipping() {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
  const [deletingZone, setDeletingZone] = useState<ShippingZone | null>(null);
  const [formData, setFormData] = useState({
    country_code: "",
    country_name: "",
    base_cost: "0",
    per_item_cost: "0",
    free_shipping_threshold: "",
    delivery_days_min: "3",
    delivery_days_max: "7",
    is_active: true,
  });

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

  const handleOpenForm = (zone?: ShippingZone) => {
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
      setFormData({
        country_code: "",
        country_name: "",
        base_cost: "0",
        per_item_cost: "0",
        free_shipping_threshold: "",
        delivery_days_min: "3",
        delivery_days_max: "7",
        is_active: true,
      });
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        country_code: formData.country_code.toUpperCase(),
        country_name: formData.country_name,
        base_cost: parseFloat(formData.base_cost) || 0,
        per_item_cost: parseFloat(formData.per_item_cost) || 0,
        free_shipping_threshold: formData.free_shipping_threshold
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
          className="bg-moss hover:bg-moss/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Zona
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-moss" />
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
                      <Badge variant="default" className="bg-moss">
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
        <DialogContent>
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
                  required
                />
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
                  required
                />
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
                />
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
                />
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
              />
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
                />
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
                />
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
                className="bg-moss hover:bg-moss/90"
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

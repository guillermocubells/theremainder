import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PlantFormDialog } from "@/components/admin/PlantFormDialog";
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

interface Plant {
  id: string;
  name: string;
  scientific_name: string | null;
  price: number;
  stock_qty: number;
  is_active: boolean;
  is_featured: boolean;
  images: string[] | null;
  category_id: string | null;
  categories?: { name: string } | null;
}

export default function AdminPlants() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);
  const [deletingPlant, setDeletingPlant] = useState<Plant | null>(null);

  const fetchPlants = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("plants")
        .select("*, categories(name)")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setPlants(data || []);
    } catch (error) {
      console.error("Error fetching plants:", error);
      toast.error("Error al cargar las plantas");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlants();
  }, []);

  const handleDelete = async () => {
    if (!deletingPlant) return;

    try {
      const { error } = await supabase
        .from("plants")
        .delete()
        .eq("id", deletingPlant.id);

      if (error) throw error;

      toast.success("Planta eliminada correctamente");
      fetchPlants();
    } catch (error) {
      console.error("Error deleting plant:", error);
      toast.error("Error al eliminar la planta");
    } finally {
      setDeletingPlant(null);
    }
  };

  const filteredPlants = plants.filter(
    (plant) =>
      plant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plant.scientific_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (amount: number) =>
    amount.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Plantas</h1>
          <p className="text-muted-foreground">
            Gestiona el catálogo de plantas
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingPlant(null);
            setIsFormOpen(true);
          }}
          className="bg-moss hover:bg-moss/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Añadir Planta
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar plantas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-moss" />
          </div>
        ) : filteredPlants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? "No se encontraron plantas" : "No hay plantas registradas"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Imagen</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlants.map((plant) => (
                <TableRow key={plant.id}>
                  <TableCell>
                    {plant.images?.[0] ? (
                      <img
                        src={plant.images[0]}
                        alt={plant.name}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded-lg" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{plant.name}</p>
                      {plant.scientific_name && (
                        <p className="text-sm text-muted-foreground italic">
                          {plant.scientific_name}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {plant.categories?.name || (
                      <span className="text-muted-foreground">Sin categoría</span>
                    )}
                  </TableCell>
                  <TableCell>{formatCurrency(plant.price)}</TableCell>
                  <TableCell>{plant.stock_qty}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {plant.is_active ? (
                        <Badge variant="default" className="bg-moss">
                          Activa
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactiva</Badge>
                      )}
                      {plant.is_featured && (
                        <Badge variant="outline">Destacada</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingPlant(plant);
                          setIsFormOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingPlant(plant)}
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

      <PlantFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        plant={editingPlant}
        onSuccess={fetchPlants}
      />

      <AlertDialog open={!!deletingPlant} onOpenChange={() => setDeletingPlant(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar planta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente{" "}
              <strong>{deletingPlant?.name}</strong>.
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

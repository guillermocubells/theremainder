import { useState, useEffect } from 'react';
import { useCreateWishlistItem, WishlistPriority, WishlistSource, WishlistItemInput } from '@/hooks/wishlist';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Loader2, Search, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AddWishlistItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CatalogPlant {
  id: string;
  name: string;
  scientific_name: string | null;
  thumbnail_url: string | null;
  price: number;
}

export const AddWishlistItemDialog = ({ open, onOpenChange }: AddWishlistItemDialogProps) => {
  const [tab, setTab] = useState<'catalog' | 'manual'>('catalog');
  const [catalogPlants, setCatalogPlants] = useState<CatalogPlant[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<CatalogPlant | null>(null);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [varietyNotes, setVarietyNotes] = useState('');
  const [priority, setPriority] = useState<WishlistPriority>('medium');
  const [sourcePreference, setSourcePreference] = useState<WishlistSource>('any');
  const [providerName, setProviderName] = useState('');
  const [providerUrl, setProviderUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [notifyAvailability, setNotifyAvailability] = useState(true);
  const [notifyPriceDrop, setNotifyPriceDrop] = useState(false);

  const createItem = useCreateWishlistItem();

  // Load catalog plants
  useEffect(() => {
    if (open && tab === 'catalog') {
      loadCatalogPlants();
    }
  }, [open, tab]);

  const loadCatalogPlants = async () => {
    setIsLoadingCatalog(true);
    try {
      const { data, error } = await supabase
        .from('plants')
        .select('id, name, scientific_name, thumbnail_url, price')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setCatalogPlants(data || []);
    } catch (error) {
      console.error('Error loading catalog:', error);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  const resetForm = () => {
    setSelectedPlant(null);
    setName('');
    setScientificName('');
    setVarietyNotes('');
    setPriority('medium');
    setSourcePreference('any');
    setProviderName('');
    setProviderUrl('');
    setNotes('');
    setNotifyAvailability(true);
    setNotifyPriceDrop(false);
    setTab('catalog');
  };

  const handleSubmit = async () => {
    const itemData: Partial<WishlistItemInput> = {
      name: tab === 'catalog' && selectedPlant ? selectedPlant.name : name,
      scientific_name: tab === 'catalog' && selectedPlant ? selectedPlant.scientific_name : scientificName || null,
      variety_notes: varietyNotes || null,
      priority,
      source_preference: sourcePreference,
      provider_name: sourcePreference === 'specific' ? providerName : null,
      provider_url: sourcePreference === 'specific' ? providerUrl : null,
      image_url: tab === 'catalog' && selectedPlant ? selectedPlant.thumbnail_url : null,
      notes: notes || null,
      notify_availability: notifyAvailability,
      notify_price_drop: notifyPriceDrop,
      catalog_product_id: tab === 'catalog' && selectedPlant ? selectedPlant.id : null,
      status: 'wishlist',
    };

    if (!itemData.name) {
      toast.error('Por favor, introduce un nombre');
      return;
    }

    createItem.mutate(itemData, {
      onSuccess: () => {
        toast.success('Planta añadida a tu lista de deseos');
        resetForm();
        onOpenChange(false);
      },
      onError: (error) => {
        console.error('Error creating wishlist item:', error);
        toast.error('Error al añadir la planta');
      },
    });
  };

  const handleSelectPlant = (plant: CatalogPlant) => {
    setSelectedPlant(plant);
    setSourcePreference('frondaprima');
    setIsComboboxOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Añadir a Lista de Deseos</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'catalog' | 'manual')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="catalog">
              <Search className="h-4 w-4 mr-2" />
              Del catálogo
            </TabsTrigger>
            <TabsTrigger value="manual">
              <PenLine className="h-4 w-4 mr-2" />
              Manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="catalog" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Buscar en catálogo</Label>
              <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isComboboxOpen}
                    className="w-full justify-between"
                  >
                    {selectedPlant ? selectedPlant.name : "Selecciona una planta..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar planta..." />
                    <CommandList>
                      <CommandEmpty>
                        {isLoadingCatalog ? 'Cargando...' : 'No se encontraron plantas.'}
                      </CommandEmpty>
                      <CommandGroup>
                        {catalogPlants.map((plant) => (
                          <CommandItem
                            key={plant.id}
                            value={plant.name}
                            onSelect={() => handleSelectPlant(plant)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedPlant?.id === plant.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex items-center gap-2">
                              {plant.thumbnail_url && (
                                <img 
                                  src={plant.thumbnail_url} 
                                  alt={plant.name}
                                  className="w-8 h-8 rounded object-cover"
                                />
                              )}
                              <div>
                                <p className="font-medium">{plant.name}</p>
                                {plant.scientific_name && (
                                  <p className="text-xs text-muted-foreground italic">{plant.scientific_name}</p>
                                )}
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {selectedPlant && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                {selectedPlant.thumbnail_url && (
                  <img 
                    src={selectedPlant.thumbnail_url} 
                    alt={selectedPlant.name}
                    className="w-16 h-16 rounded object-cover"
                  />
                )}
                <div>
                  <p className="font-medium">{selectedPlant.name}</p>
                  {selectedPlant.scientific_name && (
                    <p className="text-sm text-muted-foreground italic">{selectedPlant.scientific_name}</p>
                  )}
                  <p className="text-sm font-medium text-primary">{selectedPlant.price.toFixed(2)}€</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la planta *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Monstera Thai Constellation"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scientific">Nombre científico</Label>
              <Input
                id="scientific"
                value={scientificName}
                onChange={(e) => setScientificName(e.target.value)}
                placeholder="Ej: Monstera deliciosa"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Common fields */}
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="variety">Variedad / Notas específicas</Label>
            <Input
              id="variety"
              value={varietyNotes}
              onChange={(e) => setVarietyNotes(e.target.value)}
              placeholder="Ej: Variegata, mínimo 3 hojas"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as WishlistPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Origen preferido</Label>
              <Select value={sourcePreference} onValueChange={(v) => setSourcePreference(v as WishlistSource)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Cualquiera</SelectItem>
                  <SelectItem value="frondaprima">Solo Frondaprima</SelectItem>
                  <SelectItem value="specific">Proveedor específico</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {sourcePreference === 'specific' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="provider">Proveedor</Label>
                <Input
                  id="provider"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  placeholder="Nombre del vivero"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  value={providerUrl}
                  onChange={(e) => setProviderUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales sobre esta planta..."
              rows={2}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notify-availability">Notificar disponibilidad</Label>
                <p className="text-xs text-muted-foreground">Recibe un aviso cuando esté disponible</p>
              </div>
              <Switch
                id="notify-availability"
                checked={notifyAvailability}
                onCheckedChange={setNotifyAvailability}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notify-price">Notificar bajada de precio</Label>
                <p className="text-xs text-muted-foreground">Recibe un aviso si baja el precio</p>
              </div>
              <Switch
                id="notify-price"
                checked={notifyPriceDrop}
                onCheckedChange={setNotifyPriceDrop}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createItem.isPending}>
            {createItem.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Añadir a la Lista
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

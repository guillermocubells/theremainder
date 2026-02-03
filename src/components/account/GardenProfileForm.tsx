import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { ChevronDown, Leaf, Info } from 'lucide-react';
import { useState } from 'react';

export interface GardenProfileData {
  is_garden_location: boolean;
  climate_zone: string | null;
  avg_annual_rainfall_mm: number | null;
  sun_exposure: 'full_sun' | 'partial_shade' | 'shade' | null;
  soil_type: 'sandy' | 'loamy' | 'clay' | 'rocky' | 'peat' | 'mixed' | null;
  drainage: 'fast' | 'medium' | 'poor' | null;
  wind_exposure: 'low' | 'medium' | 'high' | null;
  altitude_m: number | null;
  min_winter_temp_c: number | null;
  humidity_level: 'low' | 'medium' | 'high' | null;
  frost_frequency: 'rare' | 'occasional' | 'frequent' | null;
  soil_ph: 'acid' | 'neutral' | 'alkaline' | null;
  garden_notes: string | null;
}

interface GardenProfileFormProps {
  data: GardenProfileData;
  onChange: (data: GardenProfileData) => void;
}

const climateZones = [
  { value: '8a', label: 'Zona 8a (-12°C a -9°C)' },
  { value: '8b', label: 'Zona 8b (-9°C a -7°C)' },
  { value: '9a', label: 'Zona 9a (-7°C a -4°C)' },
  { value: '9b', label: 'Zona 9b (-4°C a -1°C)' },
  { value: '10a', label: 'Zona 10a (-1°C a 2°C)' },
  { value: '10b', label: 'Zona 10b (2°C a 4°C)' },
  { value: '11a', label: 'Zona 11a (4°C a 7°C)' },
  { value: '11b', label: 'Zona 11b (7°C a 10°C)' },
  { value: '12a', label: 'Zona 12a (10°C a 13°C)' },
  { value: '12b', label: 'Zona 12b (>13°C)' },
];

const sunExposureOptions = [
  { value: 'full_sun', label: 'Pleno sol (>6h directas)' },
  { value: 'partial_shade', label: 'Semisombra (3-6h)' },
  { value: 'shade', label: 'Sombra (<3h directas)' },
];

const soilTypeOptions = [
  { value: 'sandy', label: 'Arenoso' },
  { value: 'loamy', label: 'Franco (equilibrado)' },
  { value: 'clay', label: 'Arcilloso' },
  { value: 'rocky', label: 'Rocoso' },
  { value: 'peat', label: 'Turboso' },
  { value: 'mixed', label: 'Mixto' },
];

const drainageOptions = [
  { value: 'fast', label: 'Rápido (se seca rápido)' },
  { value: 'medium', label: 'Medio (equilibrado)' },
  { value: 'poor', label: 'Lento (retiene agua)' },
];

const windExposureOptions = [
  { value: 'low', label: 'Baja (protegido)' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta (expuesto)' },
];

const humidityOptions = [
  { value: 'low', label: 'Baja (<40%)' },
  { value: 'medium', label: 'Media (40-70%)' },
  { value: 'high', label: 'Alta (>70%)' },
];

const frostOptions = [
  { value: 'rare', label: 'Rara vez' },
  { value: 'occasional', label: 'Ocasional' },
  { value: 'frequent', label: 'Frecuente' },
];

const phOptions = [
  { value: 'acid', label: 'Ácido (<6.5)' },
  { value: 'neutral', label: 'Neutro (6.5-7.5)' },
  { value: 'alkaline', label: 'Alcalino (>7.5)' },
];

const GardenProfileForm = ({ data, onChange }: GardenProfileFormProps) => {
  const [isOpen, setIsOpen] = useState(data.is_garden_location);

  const handleToggle = (checked: boolean) => {
    onChange({ ...data, is_garden_location: checked });
    if (checked) setIsOpen(true);
  };

  const updateField = <K extends keyof GardenProfileData>(field: K, value: GardenProfileData[K]) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-full">
            <Leaf className="h-5 w-5 text-primary" />
          </div>
          <div>
            <Label htmlFor="is_garden_location" className="text-base font-medium">
              Aquí está mi jardín
            </Label>
            <p className="text-sm text-muted-foreground">
              Activa para recibir recomendaciones personalizadas
            </p>
          </div>
        </div>
        <Switch
          id="is_garden_location"
          checked={data.is_garden_location}
          onCheckedChange={handleToggle}
        />
      </div>

      {data.is_garden_location && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors w-full justify-between py-2">
            <span>Configurar perfil del jardín</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Estos datos se usan para afinar recomendaciones y filtrar plantas según las condiciones de tu jardín. No es obligatorio rellenar todo.
              </p>
            </div>

            {/* Essential fields - MVP */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="climate_zone">Zona climática (USDA)</Label>
                <Select 
                  value={data.climate_zone || ''} 
                  onValueChange={(v) => updateField('climate_zone', v || null)}
                >
                  <SelectTrigger id="climate_zone">
                    <SelectValue placeholder="Seleccionar zona" />
                  </SelectTrigger>
                  <SelectContent>
                    {climateZones.map(z => (
                      <SelectItem key={z.value} value={z.value}>{z.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="avg_annual_rainfall_mm">Pluviometría anual (mm)</Label>
                <Input
                  id="avg_annual_rainfall_mm"
                  type="number"
                  min={0}
                  max={5000}
                  placeholder="ej. 800"
                  value={data.avg_annual_rainfall_mm ?? ''}
                  onChange={(e) => updateField('avg_annual_rainfall_mm', e.target.value ? parseInt(e.target.value) : null)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sun_exposure">Exposición solar</Label>
                <Select 
                  value={data.sun_exposure || ''} 
                  onValueChange={(v) => updateField('sun_exposure', (v || null) as GardenProfileData['sun_exposure'])}
                >
                  <SelectTrigger id="sun_exposure">
                    <SelectValue placeholder="Seleccionar exposición" />
                  </SelectTrigger>
                  <SelectContent>
                    {sunExposureOptions.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="soil_type">Tipo de suelo</Label>
                <Select 
                  value={data.soil_type || ''} 
                  onValueChange={(v) => updateField('soil_type', (v || null) as GardenProfileData['soil_type'])}
                >
                  <SelectTrigger id="soil_type">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {soilTypeOptions.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="drainage">Drenaje</Label>
                <Select 
                  value={data.drainage || ''} 
                  onValueChange={(v) => updateField('drainage', (v || null) as GardenProfileData['drainage'])}
                >
                  <SelectTrigger id="drainage">
                    <SelectValue placeholder="Seleccionar drenaje" />
                  </SelectTrigger>
                  <SelectContent>
                    {drainageOptions.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wind_exposure">Exposición al viento</Label>
                <Select 
                  value={data.wind_exposure || ''} 
                  onValueChange={(v) => updateField('wind_exposure', (v || null) as GardenProfileData['wind_exposure'])}
                >
                  <SelectTrigger id="wind_exposure">
                    <SelectValue placeholder="Seleccionar exposición" />
                  </SelectTrigger>
                  <SelectContent>
                    {windExposureOptions.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Optional fields - collapsible */}
            <Collapsible>
              <CollapsibleTrigger className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                <ChevronDown className="h-3 w-3" />
                Más opciones (opcional)
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="altitude_m">Altitud (m)</Label>
                    <Input
                      id="altitude_m"
                      type="number"
                      min={0}
                      max={4000}
                      placeholder="ej. 450"
                      value={data.altitude_m ?? ''}
                      onChange={(e) => updateField('altitude_m', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="min_winter_temp_c">Temp. mínima invernal (°C)</Label>
                    <Input
                      id="min_winter_temp_c"
                      type="number"
                      min={-40}
                      max={30}
                      placeholder="ej. -5"
                      value={data.min_winter_temp_c ?? ''}
                      onChange={(e) => updateField('min_winter_temp_c', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="humidity_level">Humedad ambiental</Label>
                    <Select 
                      value={data.humidity_level || ''} 
                      onValueChange={(v) => updateField('humidity_level', (v || null) as GardenProfileData['humidity_level'])}
                    >
                      <SelectTrigger id="humidity_level">
                        <SelectValue placeholder="Seleccionar nivel" />
                      </SelectTrigger>
                      <SelectContent>
                        {humidityOptions.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="frost_frequency">Frecuencia de heladas</Label>
                    <Select 
                      value={data.frost_frequency || ''} 
                      onValueChange={(v) => updateField('frost_frequency', (v || null) as GardenProfileData['frost_frequency'])}
                    >
                      <SelectTrigger id="frost_frequency">
                        <SelectValue placeholder="Seleccionar frecuencia" />
                      </SelectTrigger>
                      <SelectContent>
                        {frostOptions.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="soil_ph">pH del suelo</Label>
                    <Select 
                      value={data.soil_ph || ''} 
                      onValueChange={(v) => updateField('soil_ph', (v || null) as GardenProfileData['soil_ph'])}
                    >
                      <SelectTrigger id="soil_ph">
                        <SelectValue placeholder="Seleccionar pH" />
                      </SelectTrigger>
                      <SelectContent>
                        {phOptions.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label htmlFor="garden_notes">Notas adicionales</Label>
                  <Textarea
                    id="garden_notes"
                    placeholder="ej. Muro sur protegido, cerca del mar, microclimas..."
                    value={data.garden_notes || ''}
                    onChange={(e) => updateField('garden_notes', e.target.value || null)}
                    rows={2}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

export default GardenProfileForm;

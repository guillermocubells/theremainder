import { useState } from 'react';
import { HARDINESS_ZONES } from '@/utils/hardinessZones';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { HelpCircle, Thermometer } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HardinessZoneStepProps {
  selectedValue: string | null;
  onSelect: (value: string) => void;
}

const temperatureRanges = [
  { label: 'Muy frío (< -20°C)', minTemp: -50, maxTemp: -20, zones: ['7a', '7b', '6b', '6a', '5b', '5a', '4b', '4a', '3b', '3a'] },
  { label: 'Frío (-20°C a -10°C)', minTemp: -20, maxTemp: -10, zones: ['7b', '8a'] },
  { label: 'Templado (-10°C a 0°C)', minTemp: -10, maxTemp: 0, zones: ['8a', '8b', '9a', '9b'] },
  { label: 'Suave (0°C a 10°C)', minTemp: 0, maxTemp: 10, zones: ['10a', '10b', '11a', '11b'] },
  { label: 'Cálido (> 10°C)', minTemp: 10, maxTemp: 30, zones: ['12a', '12b', '13a', '13b'] },
];

const HardinessZoneStep = ({ selectedValue, onSelect }: HardinessZoneStepProps) => {
  const [showHelper, setShowHelper] = useState(false);

  // Filter to show most relevant zones (7a to 13b)
  const relevantZones = HARDINESS_ZONES.filter(z => {
    const num = parseInt(z.code);
    return num >= 7 && num <= 13;
  });

  if (showHelper) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
            ¿Cuál es la temperatura mínima en invierno?
          </h3>
          <p className="text-sm sm:text-base text-gray-500">
            Selecciona el rango que mejor describa tu zona
          </p>
        </div>

        <div className="space-y-3">
          {temperatureRanges.map((range) => (
            <button
              key={range.label}
              onClick={() => {
                // Select the middle zone of the range
                const middleIndex = Math.floor(range.zones.length / 2);
                onSelect(range.zones[middleIndex]);
                setShowHelper(false);
              }}
              className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-green-400 hover:bg-green-50 transition-all text-left"
            >
              <Thermometer className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-800">{range.label}</p>
                <p className="text-xs text-gray-500">
                  Zonas: {range.zones[0].toUpperCase()} – {range.zones[range.zones.length - 1].toUpperCase()}
                </p>
              </div>
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          onClick={() => setShowHelper(false)}
          className="w-full text-gray-500"
        >
          ← Volver a selección de zona
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
          Zona de rusticidad (Hardiness zone)
        </h3>
        <p className="text-sm sm:text-base text-gray-500">
          Indica la tolerancia al frío según la clasificación USDA
        </p>
      </div>

      <Button
        variant="outline"
        onClick={() => setShowHelper(true)}
        className="w-full border-amber-200 text-amber-700 hover:bg-amber-50"
      >
        <HelpCircle className="h-4 w-4 mr-2" />
        No sé mi zona – Ayúdame a encontrarla
      </Button>

      <ScrollArea className="h-64 sm:h-80 rounded-xl border border-gray-200 bg-white p-2">
        <div className="grid grid-cols-1 gap-2">
          {relevantZones.map((zone) => (
            <button
              key={zone.code}
              onClick={() => onSelect(zone.code)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all text-left text-sm",
                "hover:border-green-400 hover:bg-green-50",
                selectedValue === zone.code
                  ? "border-green-500 bg-green-50"
                  : "border-gray-100 bg-gray-50"
              )}
            >
              <span className={cn(
                "font-mono font-bold text-sm px-2 py-1 rounded",
                selectedValue === zone.code
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 text-gray-700"
              )}>
                {zone.code.toUpperCase()}
              </span>
              <span className="text-gray-600 text-xs">
                {zone.fromTemp !== null ? `${zone.fromTemp}°C` : '< -53.9°C'} a {zone.toTemp !== null ? `${zone.toTemp}°C` : '> 18.3°C'}
              </span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default HardinessZoneStep;

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HARDINESS_ZONES } from '@/utils/hardinessZones';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { HelpCircle, Thermometer } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HardinessZoneStepProps {
  selectedValue: string | null;
  onSelect: (value: string) => void;
}

const HardinessZoneStep = ({ selectedValue, onSelect }: HardinessZoneStepProps) => {
  const { t } = useTranslation();
  const [showHelper, setShowHelper] = useState(false);

  const temperatureRanges = [
    { labelKey: 'plantFinder.hardiness.veryCold', minTemp: -50, maxTemp: -20, zones: ['7a', '7b', '6b', '6a', '5b', '5a', '4b', '4a', '3b', '3a'] },
    { labelKey: 'plantFinder.hardiness.cold', minTemp: -20, maxTemp: -10, zones: ['7b', '8a'] },
    { labelKey: 'plantFinder.hardiness.temperate', minTemp: -10, maxTemp: 0, zones: ['8a', '8b', '9a', '9b'] },
    { labelKey: 'plantFinder.hardiness.mild', minTemp: 0, maxTemp: 10, zones: ['10a', '10b', '11a', '11b'] },
    { labelKey: 'plantFinder.hardiness.warm', minTemp: 10, maxTemp: 30, zones: ['12a', '12b', '13a', '13b'] },
  ];

  const relevantZones = HARDINESS_ZONES.filter(z => {
    const num = parseInt(z.code);
    return num >= 7 && num <= 13;
  });

  if (showHelper) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
            {t('plantFinder.hardiness.helperTitle')}
          </h3>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t('plantFinder.hardiness.helperSubtitle')}
          </p>
        </div>

        <div className="space-y-3">
          {temperatureRanges.map((range) => (
            <button
              key={range.labelKey}
              onClick={() => {
                const middleIndex = Math.floor(range.zones.length / 2);
                onSelect(range.zones[middleIndex]);
                setShowHelper(false);
              }}
              className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-border bg-card hover:border-primary/60 hover:bg-primary/5 transition-all text-left"
            >
              <Thermometer className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">{t(range.labelKey)}</p>
                <p className="text-xs text-muted-foreground">
                  {t('plantFinder.hardiness.zones')}: {range.zones[0].toUpperCase()} – {range.zones[range.zones.length - 1].toUpperCase()}
                </p>
              </div>
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          onClick={() => setShowHelper(false)}
          className="w-full text-muted-foreground"
        >
          {t('plantFinder.hardiness.backToZones')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
          {t('plantFinder.questions.hardinessZone.title')}
        </h3>
        <p className="text-sm sm:text-base text-muted-foreground">
          {t('plantFinder.questions.hardinessZone.subtitle')}
        </p>
      </div>

      <Button
        variant="outline"
        onClick={() => setShowHelper(true)}
        className="w-full border-amber-200 text-amber-700 hover:bg-amber-50"
      >
        <HelpCircle className="h-4 w-4 mr-2" />
        {t('plantFinder.hardiness.helpMe')}
      </Button>

      <ScrollArea className="h-64 sm:h-80 rounded-xl border border-border bg-card p-2">
        <div className="grid grid-cols-1 gap-2">
          {relevantZones.map((zone) => (
            <button
              key={zone.code}
              onClick={() => onSelect(zone.code)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all text-left text-sm",
                "hover:border-primary/60 hover:bg-primary/5",
                selectedValue === zone.code
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/30"
              )}
            >
              <span className={cn(
                "font-mono font-bold text-sm px-2 py-1 rounded",
                selectedValue === zone.code
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}>
                {zone.code.toUpperCase()}
              </span>
              <span className="text-muted-foreground text-xs">
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

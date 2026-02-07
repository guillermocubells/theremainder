// USDA Hardiness Zones with Celsius temperature ranges
export interface HardinessZone {
  code: string;
  label: string;
  fromTemp: number | null; // null for Zone 0a (no lower bound)
  toTemp: number | null;   // null for Zone 13b (no upper bound)
}

export const HARDINESS_ZONES: HardinessZone[] = [
  { code: "0a", label: "Zone 0a (< –53.9 °C)", fromTemp: null, toTemp: -53.9 },
  { code: "0b", label: "Zone 0b (from –53.9 °C to –51.1 °C)", fromTemp: -53.9, toTemp: -51.1 },
  { code: "1a", label: "Zone 1a (from –51.1 °C to –48.3 °C)", fromTemp: -51.1, toTemp: -48.3 },
  { code: "1b", label: "Zone 1b (from –48.3 °C to –45.6 °C)", fromTemp: -48.3, toTemp: -45.6 },
  { code: "2a", label: "Zone 2a (from –45.6 °C to –42.8 °C)", fromTemp: -45.6, toTemp: -42.8 },
  { code: "2b", label: "Zone 2b (from –42.8 °C to –40.0 °C)", fromTemp: -42.8, toTemp: -40.0 },
  { code: "3a", label: "Zone 3a (from –40.0 °C to –37.2 °C)", fromTemp: -40.0, toTemp: -37.2 },
  { code: "3b", label: "Zone 3b (from –37.2 °C to –34.4 °C)", fromTemp: -37.2, toTemp: -34.4 },
  { code: "4a", label: "Zone 4a (from –34.4 °C to –31.7 °C)", fromTemp: -34.4, toTemp: -31.7 },
  { code: "4b", label: "Zone 4b (from –31.7 °C to –28.9 °C)", fromTemp: -31.7, toTemp: -28.9 },
  { code: "5a", label: "Zone 5a (from –28.9 °C to –26.1 °C)", fromTemp: -28.9, toTemp: -26.1 },
  { code: "5b", label: "Zone 5b (from –26.1 °C to –23.3 °C)", fromTemp: -26.1, toTemp: -23.3 },
  { code: "6a", label: "Zone 6a (from –23.3 °C to –20.6 °C)", fromTemp: -23.3, toTemp: -20.6 },
  { code: "6b", label: "Zone 6b (from –20.6 °C to –17.8 °C)", fromTemp: -20.6, toTemp: -17.8 },
  { code: "7a", label: "Zone 7a (from –17.8 °C to –15.0 °C)", fromTemp: -17.8, toTemp: -15.0 },
  { code: "7b", label: "Zone 7b (from –15.0 °C to –12.2 °C)", fromTemp: -15.0, toTemp: -12.2 },
  { code: "8a", label: "Zone 8a (from –12.2 °C to –9.4 °C)", fromTemp: -12.2, toTemp: -9.4 },
  { code: "8b", label: "Zone 8b (from –9.4 °C to –6.7 °C)", fromTemp: -9.4, toTemp: -6.7 },
  { code: "9a", label: "Zone 9a (from –6.7 °C to –3.9 °C)", fromTemp: -6.7, toTemp: -3.9 },
  { code: "9b", label: "Zone 9b (from –3.9 °C to –1.1 °C)", fromTemp: -3.9, toTemp: -1.1 },
  { code: "10a", label: "Zone 10a (from –1.1 °C to 1.7 °C)", fromTemp: -1.1, toTemp: 1.7 },
  { code: "10b", label: "Zone 10b (from 1.7 °C to 4.4 °C)", fromTemp: 1.7, toTemp: 4.4 },
  { code: "11a", label: "Zone 11a (from 4.4 °C to 7.2 °C)", fromTemp: 4.4, toTemp: 7.2 },
  { code: "11b", label: "Zone 11b (from 7.2 °C to 10.0 °C)", fromTemp: 7.2, toTemp: 10.0 },
  { code: "12a", label: "Zone 12a (from 10.0 °C to 12.8 °C)", fromTemp: 10.0, toTemp: 12.8 },
  { code: "12b", label: "Zone 12b (from 12.8 °C to 15.6 °C)", fromTemp: 12.8, toTemp: 15.6 },
  { code: "13a", label: "Zone 13a (from 15.6 °C to 18.3 °C)", fromTemp: 15.6, toTemp: 18.3 },
  { code: "13b", label: "Zone 13b (> 18.3 °C)", fromTemp: 18.3, toTemp: null },
];

// Get zone label by code
export const getZoneLabel = (code: string): string => {
  const zone = HARDINESS_ZONES.find(z => z.code === code);
  return zone ? zone.label : `Zone ${code}`;
};

// Get short zone label (just the zone code formatted)
export const getShortZoneLabel = (code: string): string => {
  return `Zona ${toTitleCase(code)}`;
};

// Convert text to title case (proper case)
export const toTitleCase = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/(^|\s|–|-)\S/g, (match) => match.toUpperCase());
};

// Format multiple zones for display
export const formatHardinessZones = (zones: string[] | undefined): string => {
  if (!zones || zones.length === 0) return '';
  if (zones.length === 1) return getShortZoneLabel(zones[0]);
  
  const sorted = [...zones].sort((a, b) => {
    const numA = parseInt(a);
    const numB = parseInt(b);
    if (numA !== numB) return numA - numB;
    return a.localeCompare(b);
  });
  
  return `Zonas ${toTitleCase(sorted[0])}–${toTitleCase(sorted[sorted.length - 1])}`;
};

// Get zone count label
export const getZoneCountLabel = (zones: string[] | undefined): string => {
  if (!zones || zones.length === 0) return '';
  if (zones.length === 1) return '1 zona de rusticidad';
  return `${zones.length} zonas de rusticidad`;
};

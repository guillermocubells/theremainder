export interface Plant {
  id: string;
  name: string;
  variety: string;
  quantity: number;
  commonName: string;
  description: string;
  link: string;
  location: string;
  light: string;
  growthRate: string;
  notes: string;
  price?: number;
  images?: string[];
  hardinessZones?: string[]; // USDA hardiness zones with sub-zones (e.g., ["8a", "8b", "9a"])
  ornamentalValue?: 'Convencional' | 'Bonito' | 'Hermoso' | 'Impresionante' | 'Único';
  waterNeeds?: 'Baja' | 'Moderada' | 'Alta';
  plantGroup?: 'Palmeras' | 'Helechos arbóreos' | 'Cícadas' | 'Árboles ornamentales' | 'Arbustos ornamentales' | 'Bambús' | 'Hierbas' | 'Bromeliáceas' | 'Heliconias' | 'Estrelicias' | 'Jengibres' | 'Plátanos' | 'Agaves y yucas' | 'Aráceas' | 'Suculentas' | 'Cactus' | 'Coníferas' | 'Perennes';
  containerSize?: string; // e.g., "3 litros", "5 litros", "10 litros"
  germinationDate?: string; // e.g., "Marzo 2024"
  weightGrams?: number; // Weight in grams for shipping calculation
}

// Re-export helper functions from hardinessZones utility
export { formatHardinessZones, getZoneCountLabel } from '@/utils/hardinessZones';

export const plants: Plant[] = [{
  id: "ptychosperma-caryotoides",
  name: "Ptychosperma caryotoides",
  variety: "",
  quantity: 0,
  commonName: "Palmera Cereza del Bosque",
  description: "Palmera plumosa australiana con frutos rojos vibrantes",
  link: "https://palmpedia.net/wiki/Ptychosperma_caryotoides",
  location: "Baleares/Cantabria",
  light: "Soleada",
  growthRate: "Rápido",
  notes: "Tremendamente resistente al frío de las montañas del sudeste asiático. A nivel paisajistico combina muy bien si se planta en grupos",
  price: 75,
  hardinessZones: ["10a", "10b", "11a", "11b"],
  ornamentalValue: 'Hermoso',
  waterNeeds: 'Alta',
  plantGroup: 'Palmeras',
  containerSize: '3 litros',
  germinationDate: 'Junio 2024',
  weightGrams: 2500,
  images: [
    "/lovable-uploads/2a4b9586-d7ad-4739-b4f6-6d13018f59f4.png",
    "/lovable-uploads/445b5767-e24b-4d97-835b-b947e2295b98.png",
    "/lovable-uploads/0fb0e9dd-8970-4d5b-bbdc-118225ea58a4.png",
    "/lovable-uploads/1cced876-c109-43da-94f3-4f4df2f95601.png"
  ]
}, {
  id: "cyathea-sp",
  name: "Cyathea sp.",
  variety: "",
  quantity: 3,
  commonName: "Helecho Arborescente",
  description: "Helecho arborescente ancestral que crea una atmósfera de jardín prehistórico",
  link: "https://thetreefern.com/cyathea-cooperi-sphaeropteris-cooperi/",
  location: "Cantabria",
  light: "Sombreada",
  growthRate: "Medio",
  notes: "Pendiente de producción. Mi idea es daros varias especies con diferentes alturas pero no tengo del todo claro que va a salir adelante",
  price: 65,
  hardinessZones: ["9a", "9b", "10a", "10b", "11a", "11b"],
  ornamentalValue: 'Impresionante',
  waterNeeds: 'Alta',
  plantGroup: 'Helechos arbóreos',
  containerSize: '3 litros',
  germinationDate: 'Agosto 2023',
  weightGrams: 2000,
  images: [
    "/lovable-uploads/1f5616bb-8f86-40f3-93ac-5d7685c5a05b.png",
    "/lovable-uploads/fcfe4130-c0fc-4b17-bb21-26888ccf76cb.png",
    "/lovable-uploads/e61424a3-926c-4ece-8990-c7641f66e1ce.png",
    "/lovable-uploads/dd1f79be-222b-47a2-9e87-36d225e1ae1e.png",
    "/lovable-uploads/d7c2bb2a-6aec-46d6-a31f-c31abb156a3f.png"
  ]
}, {
  id: "dicksonia-sp",
  name: "Dicksonia sp.",
  variety: "",
  quantity: 2,
  commonName: "Helecho Arborescente Suave",
  description: "Majestuoso helecho arborescente australiano con frondas suaves y delicadas",
  link: "https://www.yarraranges.vic.gov.au/PlantDirectory/Ferns-Fern-Allies/Dicksonia-antarctica",
  location: "Cantabria",
  light: "Sombreada",
  growthRate: "Medio",
  notes: "My parecidas a las Cyatheas pero con tronco más robusto y ancho. Pendiente de producción. Mi idea es daros varias especies con diferentes alturas pero no tengo del todo claro que va a salir adelante",
  price: 70,
  hardinessZones: ["8a", "8b", "9a", "9b", "10a", "10b"],
  ornamentalValue: 'Impresionante',
  waterNeeds: 'Alta',
  plantGroup: 'Helechos arbóreos',
  containerSize: '5 litros',
  germinationDate: 'Septiembre 2023',
  weightGrams: 4500,
  images: [
    "/lovable-uploads/889919fc-5410-4f32-89b7-a8d0d819f236.png",
    "/lovable-uploads/747cd9a7-76af-4194-84cd-6793e34c0f82.png",
    "/lovable-uploads/5d376255-d859-4f74-987e-456b1789b2a8.png",
    "/lovable-uploads/34a76774-06d2-4550-8c63-c15a2f5a39a1.png",
    "/lovable-uploads/39358bc8-084d-4a6e-8f1e-130412406262.png"
  ]
}, {
  id: "zamia-integrifolia",
  name: "Zamia integrifolia",
  variety: "var. Jamaica Giant",
  quantity: 3,
  commonName: "Coontie",
  description: "Cícada ancestral del Caribe, planta fósil viviente",
  link: "https://www.youtube.com/watch?v=xSqD5wKcURU",
  location: "Baleares/Cantabria",
  light: "Soleada",
  growthRate: "Lento",
  notes: "Especie no clasificada probablemente extinta en habitat",
  price: 130,
  hardinessZones: ["8a", "8b", "9a", "9b", "10a", "10b", "11a", "11b"],
  ornamentalValue: 'Único',
  waterNeeds: 'Baja',
  plantGroup: 'Cícadas',
  containerSize: '3 litros',
  germinationDate: 'Octubre 2022',
  weightGrams: 3000,
  images: [
    "/lovable-uploads/861d759e-ba67-4d4e-8fad-5ad1993827ef.png",
    "/lovable-uploads/4c8c52b1-6bce-4e7c-9708-f05986d91b4b.png",
    "/lovable-uploads/6abcd806-9f8a-4783-a613-25fc8a7f46cd.png"
  ]
}, {
  id: "magnolia-laevifolia",
  name: "Magnolia laevifolia",
  variety: "",
  quantity: 1,
  commonName: "Magnolia de Hoja Lisa",
  description: "Magnolia elegante con hojas brillantes y flores fragantes",
  link: "https://www.treesandshrubsonline.org/articles/magnolia/magnolia-laevifolia/",
  location: "Cantabria",
  light: "Semisol",
  growthRate: "Rápido",
  notes: "Espectacular magnolia compacta. De Yunnan una rareza y una belleza para un lugar del jardín con orientación oeste o este",
  price: 90,
  hardinessZones: ["7a", "7b", "8a", "8b", "9a", "9b"],
  ornamentalValue: 'Hermoso',
  waterNeeds: 'Moderada',
  plantGroup: 'Arbustos ornamentales',
  containerSize: '5 litros',
  germinationDate: 'Noviembre 2023',
  weightGrams: 4500,
  images: [
    "/lovable-uploads/a04b7d73-9b68-4e31-9174-3d181aad491c.png",
    "/lovable-uploads/9b38e27d-78c3-4b53-a08a-b3441009766c.png",
    "/lovable-uploads/572c0131-eb0d-4fcf-9b74-8f1e4100f427.png",
    "/lovable-uploads/1e817628-12d6-4836-9977-07c3012a0df1.png"
  ]
}, {
  id: "chamaedorea-elegans",
  name: "Chamaedorea elegans",
  variety: "var. Negrita",
  quantity: 2,
  commonName: "Palmera de Salón Negrita",
  description: "Palmera compacta y resistente, perfecta para climas fríos",
  link: "https://www.picturethisai.com/es/wiki/Chamaedorea_elegans__Negrita_.html",
  location: "Cantabria",
  light: "Semisombra",
  growthRate: "Lento",
  notes: "Muy resistente al frío estamos hablando de hasta -10c algo muy alto para una palmera",
  price: 55,
  hardinessZones: ["8a", "8b"],
  ornamentalValue: 'Bonito',
  waterNeeds: 'Moderada',
  plantGroup: 'Palmeras',
  containerSize: '2 litros',
  germinationDate: 'Diciembre 2023',
  weightGrams: 1500,
  images: [
    "/lovable-uploads/be0531d2-cf9b-4f2c-8ec7-e758b8dbfd69.png",
    "/lovable-uploads/b04dba5e-73cf-4818-8829-a26db8d884c2.png",
    "/lovable-uploads/7276866f-a573-4959-99df-ecc5c91546f9.png",
    "/lovable-uploads/3576febc-43a5-46d0-a625-0c5e00fa5a62.png"
  ]
}];

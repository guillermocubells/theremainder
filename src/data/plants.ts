
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
  hardinessZones?: number[]; // USDA hardiness zones (e.g., [8, 9, 10])
  ornamentalValue?: 'Convencional' | 'Bonito' | 'Hermoso' | 'Impresionante' | 'Único';
  waterNeeds?: 'Baja' | 'Moderada' | 'Alta';
}

// Helper function to format hardiness zone display
export const formatHardinessZones = (zones: number[] | undefined): string => {
  if (!zones || zones.length === 0) return '';
  if (zones.length === 1) return `Zona ${zones[0]}`;
  const sorted = [...zones].sort((a, b) => a - b);
  return `Zonas ${sorted[0]}–${sorted[sorted.length - 1]}`;
};

// Helper function to get zone count label
export const getZoneCountLabel = (zones: number[] | undefined): string => {
  if (!zones || zones.length === 0) return '';
  if (zones.length === 1) return '1 zona de rusticidad';
  return `${zones.length} zonas de rusticidad`;
};

export const plants: Plant[] = [{
  id: "rhopalostylis-sapida",
  name: "Rhopalostylis sapida",
  variety: "var. Oceana o Paparoa",
  quantity: 4,
  commonName: "Palmera Nikau",
  description: "La única palmera nativa de Nueva Zelanda, elegante y resistente",
  link: "https://palmpedia.net/wiki/Rhopalostylis_sapida",
  location: "Cantabria",
  light: "Semisol",
  growthRate: "Medio",
  notes: "Variedas muy resistentes al frio. La variedad Oceana es conocidad por crecer más rápido y por ser más resistente y robusta que las demás. De pequeñas, principalmente los 1-3 años necesitan una cobertura de para filtrar la luz.",
  price: 85,
  hardinessZones: [9, 10, 11],
  ornamentalValue: 'Impresionante',
  waterNeeds: 'Moderada',
  images: [
    "/lovable-uploads/06e39b13-24ac-425d-aaba-e54afa8e9a13.png",
    "/lovable-uploads/9ec90b24-0543-43f9-8fbc-9e0550441101.png", 
    "/lovable-uploads/e2d5dc14-7a7d-4068-9048-41c51c5b3e3e.png",
    "/lovable-uploads/8dd65cc2-e17d-4d6d-9bf1-f6930328f729.png",
    "/lovable-uploads/9173c699-a4ce-47c6-915d-47ddd7101b34.png",
    "/lovable-uploads/0e644766-bd72-43c9-ba64-16a24ad9c928.png"
  ]
}, {
  id: "chuniophoenix-hainanensis",
  name: "Chuniophoenix hainanensis",
  variety: "",
  quantity: 1,
  commonName: "Palmera Cola de Pez de Hainan",
  description: "Palmera china rara con hojas distintivas en forma de cola de pez",
  link: "https://www.palmpedia.net/wiki/Chuniophoenix_hainanensis",
  location: "Cantabria",
  light: "Semisombra",
  growthRate: "Lento",
  notes: "Ideal para una zona con orientación norte o noroeste. Esta palmera necesita luz filtrada",
  price: 120,
  hardinessZones: [9, 10],
  ornamentalValue: 'Único',
  waterNeeds: 'Alta',
  images: [
    "/lovable-uploads/ad7146c5-db03-446d-b3b2-5239278106cb.png",
    "/lovable-uploads/c9a2894c-6df3-45f5-98e5-04b3dd36c2b1.png",
    "/lovable-uploads/3ece7e74-dc20-4838-8347-78e45ebcf6af.png",
    "/lovable-uploads/e946bd23-8422-4f00-a597-d5f9ffd633ff.png"
  ]
}, {
  id: "brahea-armata",
  name: "Brahea armata",
  variety: "var. Super Silver",
  quantity: 1,
  commonName: "Palmera Azul Mexicana",
  description: "Impresionante palmera abanico de color azul plateado de Baja California",
  link: "https://www.palmpedia.net/palmsforcal/Brahea_%27Super_Silver%27",
  location: "Baleares/Cantabria",
  light: "Soleada",
  growthRate: "Lento",
  notes: "Tolera la luz mas directa, Ideal para el spot más soleado del jardín, eso si sin olvidarse del agua",
  price: 150,
  hardinessZones: [8, 9, 10, 11],
  ornamentalValue: 'Impresionante',
  waterNeeds: 'Baja',
  images: [
    "/lovable-uploads/43efda5d-55eb-4fa9-b838-b43a3c7a2d1b.png",
    "/lovable-uploads/f77b4576-e17b-4cc8-a668-f80e5bd36ec2.png",
    "/lovable-uploads/b776a831-f1d0-4a40-ba6b-1935d94a30ad.png",
    "/lovable-uploads/9de9d435-f031-45a6-aa1f-ebb2e2b8c7a6.png",
    "/lovable-uploads/336f4453-40d3-461f-b29c-ab773093652f.png",
    "/lovable-uploads/59ed7d38-59ce-4812-ace9-9c0951355328.png"
  ]
}, {
  id: "sabal-miamensis",
  name: "Sabal miamensis",
  variety: "",
  quantity: 2,
  commonName: "Palmito de Miami",
  description: "Palmera nativa de Florida con hermosas hojas en forma de abanico",
  link: "https://palmpedia.net/wiki/Sabal_miamiensis",
  location: "Baleares/Cantabria",
  light: "Soleada",
  growthRate: "Medio",
  notes: "Extiento en habitat, una rareza se descubrió hace ya 40 años perdido en un jardín de Florida. Tolera el sol directo",
  price: 95,
  hardinessZones: [9, 10, 11],
  ornamentalValue: 'Único',
  waterNeeds: 'Baja',
  images: [
    "/lovable-uploads/83cb91af-99bc-45b2-813b-ff789c073d75.png",
    "/lovable-uploads/1e90a912-b532-4f36-b161-098738e1c354.png",
    "/lovable-uploads/ec0403a1-5f5f-43e3-8846-bf343401cf48.png",
    "/lovable-uploads/5cce3c2f-5660-474e-89d8-0442d95afd2b.png"
  ]
}, {
  id: "ptychosperma-caryotoides",
  name: "Ptychosperma caryotoides",
  variety: "",
  quantity: 3,
  commonName: "Palmera Cereza del Bosque",
  description: "Palmera plumosa australiana con frutos rojos vibrantes",
  link: "https://palmpedia.net/wiki/Ptychosperma_caryotoides",
  location: "Baleares/Cantabria",
  light: "Soleada",
  growthRate: "Rápido",
  notes: "Tremendamente resistente al frío de las montañas del sudeste asiático. A nivel paisajistico combina muy bien si se planta en grupos",
  price: 75,
  hardinessZones: [10, 11],
  ornamentalValue: 'Hermoso',
  waterNeeds: 'Alta',
  images: [
    "/lovable-uploads/2a4b9586-d7ad-4739-b4f6-6d13018f59f4.png",
    "/lovable-uploads/445b5767-e24b-4d97-835b-b947e2295b98.png",
    "/lovable-uploads/0fb0e9dd-8970-4d5b-bbdc-118225ea58a4.png",
    "/lovable-uploads/1cced876-c109-43da-94f3-4f4df2f95601.png"
  ]
}, {
  id: "caryota-obtusa",
  name: "Caryota obtusa",
  variety: "",
  quantity: 2,
  commonName: "Palmera Cola de Pez",
  description: "Palmera monocárpica con hojas características en forma de cola de pez",
  link: "https://www.palmpedia.net/palmsforcal/Caryota_obtusa",
  location: "Baleares/Cantabria",
  light: "Soleada",
  growthRate: "Rápido",
  notes: "Planta monocarpica que al llegar a su edad adulta muere. Preciosidad que puede monopolizar un espacio en el jardín de forma rápida",
  price: 110,
  hardinessZones: [9, 10, 11],
  ornamentalValue: 'Impresionante',
  waterNeeds: 'Moderada',
  images: [
    "/lovable-uploads/4b0c55aa-a762-40df-8abb-1a83b4d82ab7.png",
    "/lovable-uploads/074b2941-f6fe-4f65-9c05-7c09dcc25afb.png",
    "/lovable-uploads/1578c734-7382-4dc2-ab68-d95ad83ccc5e.png",
    "/lovable-uploads/2cec15ec-46ae-46f6-acd6-4d50f53dbe5b.png",
    "/lovable-uploads/08e149fe-8197-4e39-b8bb-e9e20e89a16b.png"
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
  hardinessZones: [9, 10, 11],
  ornamentalValue: 'Impresionante',
  waterNeeds: 'Alta',
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
  hardinessZones: [8, 9, 10],
  ornamentalValue: 'Impresionante',
  waterNeeds: 'Alta',
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
  hardinessZones: [8, 9, 10, 11],
  ornamentalValue: 'Único',
  waterNeeds: 'Baja',
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
  hardinessZones: [7, 8, 9],
  ornamentalValue: 'Hermoso',
  waterNeeds: 'Moderada',
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
  hardinessZones: [8],
  ornamentalValue: 'Bonito',
  waterNeeds: 'Moderada',
  images: [
    "/lovable-uploads/be0531d2-cf9b-4f2c-8ec7-e758b8dbfd69.png",
    "/lovable-uploads/b04dba5e-73cf-4818-8829-a26db8d884c2.png",
    "/lovable-uploads/7276866f-a573-4959-99df-ecc5c91546f9.png",
    "/lovable-uploads/3576febc-43a5-46d0-a625-0c5e00fa5a62.png"
  ]
}, {
  id: "basselinia-favieri",
  name: "Basselinia favieri",
  variety: "",
  quantity: 2,
  commonName: "Palmera de Nueva Caledonia",
  description: "Palmera tropical elegante de Nueva Caledonia con hojas pinnadas distintivas",
  link: "https://www.palmpedia.net/wiki/Basselinia_favieri",
  location: "Baleares",
  light: "Semisombra",
  growthRate: "Lento",
  notes: "De crecimiento muy lento necesita una cobertura de joven. No resiste heladas y necesita un clima mas favorable de árboles que le pueda proteger de las heladas",
  price: 140,
  hardinessZones: [10, 11],
  ornamentalValue: 'Único',
  waterNeeds: 'Alta',
  images: [
    "/lovable-uploads/a89e97f5-5824-4441-93f5-09cd6f7b3afb.png",
    "/lovable-uploads/bae0e819-14d7-4c16-84d0-87cb8b7d7dfc.png",
    "/lovable-uploads/0ca7c12d-1bcf-4050-af0c-5350aae3a5bb.png",
    "/lovable-uploads/71a2e414-3fff-4838-8607-6af82cb39f25.png"
  ]
}];

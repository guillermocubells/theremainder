import { Plant } from "@/data/plants";
import { plantDetails } from "@/data/plantDetailData";

export interface ViabilityFactors {
  globalViability: number;
  coldResistance: number;
  humidityTolerance: number;
  clayAdaptation: number;
  sunExposure: number;
  pestResistance: number;
}

export interface ViabilityResult {
  totalScore: number;
  factors: ViabilityFactors;
  recommendation: string;
}

export interface ClimateInfo {
  zone: string;
  hardiness: string;
  humidity: string;
  sunIntensity: string;
  coldTolerance: number;
  humidityLevel: number;
  sunLevel: number;
  region: string;
}

// Comprehensive European climate mapping
const EUROPEAN_CLIMATE_MAP = {
  // ESPAÑA - Detailed mapping
  spain: {
    // Comunidades Autónomas
    madrid: { zone: "Madrid - Continental", hardiness: "Zona 8b-9a", humidity: "Baja-Media (40-60%)", sunIntensity: "Alta (2800h/año)", coldTolerance: 6, humidityLevel: 4, sunLevel: 8, region: "continental_seco" },
    cataluña: { zone: "Cataluña - Mediterráneo", hardiness: "Zona 9a-9b", humidity: "Media (50-70%)", sunIntensity: "Alta (2500h/año)", coldTolerance: 7, humidityLevel: 6, sunLevel: 8, region: "mediterraneo" },
    valencia: { zone: "Valencia - Mediterráneo", hardiness: "Zona 9b-10a", humidity: "Media (45-65%)", sunIntensity: "Muy Alta (2900h/año)", coldTolerance: 8, humidityLevel: 5, sunLevel: 9, region: "mediterraneo_calido" },
    andalucia: { zone: "Andalucía - Mediterráneo Continental", hardiness: "Zona 9b-10a", humidity: "Baja (35-55%)", sunIntensity: "Muy Alta (3000h/año)", coldTolerance: 8, humidityLevel: 3, sunLevel: 10, region: "mediterraneo_calido" },
    cantabria: { zone: "Cantabria - Atlántico", hardiness: "Zona 8a-8b", humidity: "Muy Alta (70-85%)", sunIntensity: "Media (1800h/año)", coldTolerance: 5, humidityLevel: 9, sunLevel: 5, region: "atlantico_humedo" },
    asturias: { zone: "Asturias - Atlántico", hardiness: "Zona 8a-8b", humidity: "Muy Alta (75-90%)", sunIntensity: "Baja (1600h/año)", coldTolerance: 4, humidityLevel: 9, sunLevel: 4, region: "atlantico_humedo" },
    galicia: { zone: "Galicia - Atlántico", hardiness: "Zona 8a-8b", humidity: "Muy Alta (70-85%)", sunIntensity: "Baja-Media (1700h/año)", coldTolerance: 5, humidityLevel: 8, sunLevel: 5, region: "atlantico_humedo" },
    "pais_vasco": { zone: "País Vasco - Atlántico", hardiness: "Zona 8a-8b", humidity: "Alta (65-80%)", sunIntensity: "Media (1900h/año)", coldTolerance: 5, humidityLevel: 8, sunLevel: 5, region: "atlantico_humedo" },
    murcia: { zone: "Murcia - Mediterráneo Seco", hardiness: "Zona 9b-10a", humidity: "Muy Baja (30-50%)", sunIntensity: "Muy Alta (3100h/año)", coldTolerance: 8, humidityLevel: 2, sunLevel: 10, region: "mediterraneo_calido" },
    extremadura: { zone: "Extremadura - Continental Mediterráneo", hardiness: "Zona 9a-9b", humidity: "Baja (35-55%)", sunIntensity: "Muy Alta (2900h/año)", coldTolerance: 7, humidityLevel: 3, sunLevel: 9, region: "continental_calido" },
    "castilla_leon": { zone: "Castilla y León - Continental", hardiness: "Zona 7b-8b", humidity: "Baja-Media (40-60%)", sunIntensity: "Alta (2600h/año)", coldTolerance: 5, humidityLevel: 4, sunLevel: 8, region: "continental_seco" },
    "castilla_la_mancha": { zone: "Castilla-La Mancha - Continental", hardiness: "Zona 8b-9a", humidity: "Baja (35-55%)", sunIntensity: "Alta (2700h/año)", coldTolerance: 6, humidityLevel: 3, sunLevel: 8, region: "continental_seco" },
    aragon: { zone: "Aragón - Continental", hardiness: "Zona 7b-9a", humidity: "Baja-Media (40-60%)", sunIntensity: "Alta (2600h/año)", coldTolerance: 6, humidityLevel: 4, sunLevel: 8, region: "continental_seco" },
    navarra: { zone: "Navarra - Continental-Atlántico", hardiness: "Zona 8a-8b", humidity: "Media-Alta (55-75%)", sunIntensity: "Media (2200h/año)", coldTolerance: 6, humidityLevel: 7, sunLevel: 6, region: "continental_humedo" },
    "la_rioja": { zone: "La Rioja - Continental", hardiness: "Zona 8b-9a", humidity: "Media (45-65%)", sunIntensity: "Alta (2500h/año)", coldTolerance: 6, humidityLevel: 5, sunLevel: 7, region: "continental_seco" },
    canarias: { zone: "Canarias - Subtropical", hardiness: "Zona 10b-11", humidity: "Media-Alta (60-80%)", sunIntensity: "Alta (2500h/año)", coldTolerance: 9, humidityLevel: 7, sunLevel: 8, region: "subtropical" },
    baleares: { zone: "Baleares - Mediterráneo Insular", hardiness: "Zona 9b-10a", humidity: "Media (55-75%)", sunIntensity: "Alta (2700h/año)", coldTolerance: 8, humidityLevel: 6, sunLevel: 9, region: "mediterraneo_insular" }
  },

  // FRANCIA
  france: {
    "ile_de_france": { zone: "Île-de-France - Oceánico Continental", hardiness: "Zona 8a-8b", humidity: "Media (60-75%)", sunIntensity: "Media (1800h/año)", coldTolerance: 5, humidityLevel: 6, sunLevel: 6, region: "templado_continental" },
    provence: { zone: "Provenza - Mediterráneo", hardiness: "Zona 9a-9b", humidity: "Media (50-70%)", sunIntensity: "Muy Alta (2800h/año)", coldTolerance: 7, humidityLevel: 5, sunLevel: 9, region: "mediterraneo" },
    bretagne: { zone: "Bretaña - Oceánico", hardiness: "Zona 8b-9a", humidity: "Muy Alta (75-85%)", sunIntensity: "Baja (1600h/año)", coldTolerance: 6, humidityLevel: 9, sunLevel: 4, region: "atlantico_humedo" },
    normandie: { zone: "Normandía - Oceánico", hardiness: "Zona 8a-8b", humidity: "Alta (70-80%)", sunIntensity: "Baja-Media (1700h/año)", coldTolerance: 5, humidityLevel: 8, sunLevel: 5, region: "atlantico_humedo" },
    alsace: { zone: "Alsacia - Continental", hardiness: "Zona 7a-7b", humidity: "Media (55-70%)", sunIntensity: "Media (1900h/año)", coldTolerance: 4, humidityLevel: 6, sunLevel: 6, region: "continental_frio" },
    aquitaine: { zone: "Aquitania - Oceánico", hardiness: "Zona 8b-9a", humidity: "Media-Alta (65-80%)", sunIntensity: "Alta (2200h/año)", coldTolerance: 6, humidityLevel: 7, sunLevel: 7, region: "atlantico_templado" },
    "rhone_alpes": { zone: "Ródano-Alpes - Continental Montañoso", hardiness: "Zona 6b-8a", humidity: "Media (50-70%)", sunIntensity: "Alta (2100h/año)", coldTolerance: 4, humidityLevel: 6, sunLevel: 7, region: "continental_frio" },
    languedoc: { zone: "Languedoc - Mediterráneo", hardiness: "Zona 9a-9b", humidity: "Baja-Media (45-65%)", sunIntensity: "Muy Alta (2700h/año)", coldTolerance: 7, humidityLevel: 4, sunLevel: 9, region: "mediterraneo" },
    corse: { zone: "Córcega - Mediterráneo Insular", hardiness: "Zona 9b-10a", humidity: "Media (55-75%)", sunIntensity: "Muy Alta (2800h/año)", coldTolerance: 8, humidityLevel: 6, sunLevel: 9, region: "mediterraneo_insular" }
  },

  // ITALIA
  italy: {
    lombardia: { zone: "Lombardía - Continental", hardiness: "Zona 7b-8b", humidity: "Media (55-70%)", sunIntensity: "Media-Alta (2000h/año)", coldTolerance: 5, humidityLevel: 6, sunLevel: 7, region: "continental_templado" },
    toscana: { zone: "Toscana - Mediterráneo", hardiness: "Zona 8b-9a", humidity: "Media (50-70%)", sunIntensity: "Alta (2400h/año)", coldTolerance: 6, humidityLevel: 5, sunLevel: 8, region: "mediterraneo" },
    sicilia: { zone: "Sicilia - Mediterráneo", hardiness: "Zona 9b-10a", humidity: "Baja-Media (45-65%)", sunIntensity: "Muy Alta (2800h/año)", coldTolerance: 8, humidityLevel: 4, sunLevel: 9, region: "mediterraneo_calido" },
    veneto: { zone: "Véneto - Continental Húmedo", hardiness: "Zona 7b-8b", humidity: "Media-Alta (60-75%)", sunIntensity: "Media (1900h/año)", coldTolerance: 5, humidityLevel: 7, sunLevel: 6, region: "continental_humedo" },
    campania: { zone: "Campania - Mediterráneo", hardiness: "Zona 9a-9b", humidity: "Media (55-70%)", sunIntensity: "Alta (2500h/año)", coldTolerance: 7, humidityLevel: 6, sunLevel: 8, region: "mediterraneo" },
    piemonte: { zone: "Piamonte - Continental", hardiness: "Zona 7a-8a", humidity: "Media (55-70%)", sunIntensity: "Media (1800h/año)", coldTolerance: 4, humidityLevel: 6, sunLevel: 6, region: "continental_frio" },
    liguria: { zone: "Liguria - Mediterráneo", hardiness: "Zona 9a-9b", humidity: "Media (60-75%)", sunIntensity: "Alta (2300h/año)", coldTolerance: 7, humidityLevel: 7, sunLevel: 8, region: "mediterraneo" },
    puglia: { zone: "Puglia - Mediterráneo Seco", hardiness: "Zona 9b-10a", humidity: "Baja-Media (40-60%)", sunIntensity: "Muy Alta (2700h/año)", coldTolerance: 8, humidityLevel: 4, sunLevel: 9, region: "mediterraneo_calido" }
  },

  // ALEMANIA
  germany: {
    bayern: { zone: "Baviera - Continental", hardiness: "Zona 6b-7b", humidity: "Media (60-75%)", sunIntensity: "Media (1700h/año)", coldTolerance: 3, humidityLevel: 7, sunLevel: 5, region: "continental_frio" },
    "nordrhein_westfalen": { zone: "Renania Norte-Westfalia - Oceánico", hardiness: "Zona 7b-8a", humidity: "Alta (70-80%)", sunIntensity: "Baja-Media (1600h/año)", coldTolerance: 4, humidityLevel: 8, sunLevel: 5, region: "atlantico_templado" },
    "baden_wurttemberg": { zone: "Baden-Württemberg - Continental", hardiness: "Zona 7a-8a", humidity: "Media (60-75%)", sunIntensity: "Media (1800h/año)", coldTolerance: 4, humidityLevel: 7, sunLevel: 6, region: "continental_templado" },
    niedersachsen: { zone: "Baja Sajonia - Oceánico", hardiness: "Zona 7b-8a", humidity: "Alta (70-80%)", sunIntensity: "Baja (1500h/año)", coldTolerance: 4, humidityLevel: 8, sunLevel: 4, region: "atlantico_templado" },
    berlin: { zone: "Berlín - Continental", hardiness: "Zona 7a-7b", humidity: "Media (60-70%)", sunIntensity: "Media (1600h/año)", coldTolerance: 3, humidityLevel: 6, sunLevel: 5, region: "continental_frio" }
  },

  // REINO UNIDO
  uk: {
    england: { zone: "Inglaterra - Oceánico Templado", hardiness: "Zona 7b-8b", humidity: "Alta (70-85%)", sunIntensity: "Baja (1500h/año)", coldTolerance: 4, humidityLevel: 8, sunLevel: 4, region: "templado_humedo" },
    scotland: { zone: "Escocia - Oceánico Frío", hardiness: "Zona 6b-7b", humidity: "Muy Alta (75-90%)", sunIntensity: "Muy Baja (1200h/año)", coldTolerance: 2, humidityLevel: 9, sunLevel: 3, region: "templado_frio_humedo" },
    wales: { zone: "Gales - Oceánico", hardiness: "Zona 7b-8a", humidity: "Muy Alta (80-90%)", sunIntensity: "Baja (1400h/año)", coldTolerance: 4, humidityLevel: 9, sunLevel: 4, region: "templado_humedo" },
    "northern_ireland": { zone: "Irlanda del Norte - Oceánico", hardiness: "Zona 7b-8a", humidity: "Muy Alta (80-90%)", sunIntensity: "Baja (1300h/año)", coldTolerance: 4, humidityLevel: 9, sunLevel: 3, region: "templado_humedo" }
  },

  // PORTUGAL
  portugal: {
    lisboa: { zone: "Lisboa - Mediterráneo Atlántico", hardiness: "Zona 9b-10a", humidity: "Media-Alta (60-75%)", sunIntensity: "Alta (2600h/año)", coldTolerance: 8, humidityLevel: 7, sunLevel: 9, region: "mediterraneo_atlantico" },
    porto: { zone: "Oporto - Atlántico", hardiness: "Zona 9a-9b", humidity: "Alta (70-85%)", sunIntensity: "Media-Alta (2200h/año)", coldTolerance: 7, humidityLevel: 8, sunLevel: 7, region: "atlantico_templado" },
    algarve: { zone: "Algarve - Mediterráneo", hardiness: "Zona 9b-10a", humidity: "Media (55-70%)", sunIntensity: "Muy Alta (2900h/año)", coldTolerance: 8, humidityLevel: 6, sunLevel: 10, region: "mediterraneo_calido" }
  },

  // PAÍSES BAJOS
  netherlands: {
    holland: { zone: "Holanda - Oceánico", hardiness: "Zona 8a-8b", humidity: "Muy Alta (75-85%)", sunIntensity: "Baja (1600h/año)", coldTolerance: 5, humidityLevel: 9, sunLevel: 4, region: "atlantico_humedo" }
  },

  // BÉLGICA
  belgium: {
    flanders: { zone: "Flandes - Oceánico", hardiness: "Zona 8a-8b", humidity: "Alta (70-80%)", sunIntensity: "Baja (1500h/año)", coldTolerance: 5, humidityLevel: 8, sunLevel: 4, region: "atlantico_templado" },
    wallonia: { zone: "Valonia - Oceánico Continental", hardiness: "Zona 7b-8a", humidity: "Alta (70-80%)", sunIntensity: "Baja-Media (1600h/año)", coldTolerance: 4, humidityLevel: 8, sunLevel: 5, region: "continental_humedo" }
  },

  // SUIZA
  switzerland: {
    plateau: { zone: "Meseta Suiza - Continental Alpino", hardiness: "Zona 6b-7b", humidity: "Media (60-75%)", sunIntensity: "Media (1700h/año)", coldTolerance: 3, humidityLevel: 7, sunLevel: 6, region: "continental_frio" },
    valais: { zone: "Valais - Continental Seco", hardiness: "Zona 7a-8a", humidity: "Baja (45-60%)", sunIntensity: "Alta (2100h/año)", coldTolerance: 4, humidityLevel: 4, sunLevel: 7, region: "continental_seco" }
  },

  // AUSTRIA
  austria: {
    vienna: { zone: "Viena - Continental", hardiness: "Zona 7a-7b", humidity: "Media (60-70%)", sunIntensity: "Media (1800h/año)", coldTolerance: 3, humidityLevel: 6, sunLevel: 6, region: "continental_frio" },
    tyrol: { zone: "Tirol - Alpino", hardiness: "Zona 6a-7a", humidity: "Media-Alta (65-80%)", sunIntensity: "Alta (1900h/año)", coldTolerance: 2, humidityLevel: 7, sunLevel: 7, region: "continental_montano" }
  },

  // GRECIA
  greece: {
    athens: { zone: "Atenas - Mediterráneo", hardiness: "Zona 9b-10a", humidity: "Baja-Media (45-65%)", sunIntensity: "Muy Alta (2900h/año)", coldTolerance: 8, humidityLevel: 4, sunLevel: 10, region: "mediterraneo_calido" },
    thessaloniki: { zone: "Tesalónica - Mediterráneo Continental", hardiness: "Zona 9a-9b", humidity: "Media (50-70%)", sunIntensity: "Alta (2600h/año)", coldTolerance: 7, humidityLevel: 5, sunLevel: 9, region: "mediterraneo" },
    crete: { zone: "Creta - Mediterráneo Insular", hardiness: "Zona 10a-10b", humidity: "Media (55-70%)", sunIntensity: "Muy Alta (3000h/año)", coldTolerance: 9, humidityLevel: 6, sunLevel: 10, region: "mediterraneo_calido" }
  },

  // PAÍSES NÓRDICOS
  sweden: {
    stockholm: { zone: "Estocolmo - Continental Frío", hardiness: "Zona 6a-6b", humidity: "Media-Alta (65-80%)", sunIntensity: "Baja (1800h/año)", coldTolerance: 2, humidityLevel: 7, sunLevel: 5, region: "continental_frio" },
    gothenburg: { zone: "Gotemburgo - Oceánico Frío", hardiness: "Zona 6b-7a", humidity: "Alta (75-85%)", sunIntensity: "Baja (1600h/año)", coldTolerance: 2, humidityLevel: 8, sunLevel: 4, region: "atlantico_frio" }
  },

  norway: {
    oslo: { zone: "Oslo - Continental Frío", hardiness: "Zona 6a-6b", humidity: "Media (60-75%)", sunIntensity: "Baja (1700h/año)", coldTolerance: 1, humidityLevel: 7, sunLevel: 5, region: "continental_frio" },
    bergen: { zone: "Bergen - Oceánico Frío", hardiness: "Zona 7a-7b", humidity: "Muy Alta (85-95%)", sunIntensity: "Muy Baja (1200h/año)", coldTolerance: 3, humidityLevel: 10, sunLevel: 3, region: "atlantico_muy_humedo" }
  },

  denmark: {
    copenhagen: { zone: "Copenhague - Oceánico", hardiness: "Zona 7b-8a", humidity: "Alta (70-80%)", sunIntensity: "Baja (1600h/año)", coldTolerance: 4, humidityLevel: 8, sunLevel: 4, region: "atlantico_templado" }
  },

  finland: {
    helsinki: { zone: "Helsinki - Continental Frío", hardiness: "Zona 5b-6a", humidity: "Media-Alta (70-80%)", sunIntensity: "Baja (1800h/año)", coldTolerance: 1, humidityLevel: 8, sunLevel: 5, region: "continental_muy_frio" }
  },

  // EUROPA DEL ESTE
  poland: {
    warsaw: { zone: "Varsovia - Continental", hardiness: "Zona 6b-7a", humidity: "Media (60-75%)", sunIntensity: "Media (1700h/año)", coldTolerance: 2, humidityLevel: 7, sunLevel: 5, region: "continental_frio" },
    krakow: { zone: "Cracovia - Continental", hardiness: "Zona 6b-7a", humidity: "Media (65-75%)", sunIntensity: "Media (1650h/año)", coldTolerance: 2, humidityLevel: 7, sunLevel: 5, region: "continental_frio" }
  },

  czechia: {
    prague: { zone: "Praga - Continental", hardiness: "Zona 6b-7a", humidity: "Media (65-75%)", sunIntensity: "Media (1700h/año)", coldTolerance: 3, humidityLevel: 7, sunLevel: 6, region: "continental_templado" }
  },

  hungary: {
    budapest: { zone: "Budapest - Continental", hardiness: "Zona 7a-7b", humidity: "Media (60-70%)", sunIntensity: "Media-Alta (2000h/año)", coldTolerance: 3, humidityLevel: 6, sunLevel: 7, region: "continental_templado" }
  },

  romania: {
    bucharest: { zone: "Bucarest - Continental", hardiness: "Zona 7a-7b", humidity: "Media (60-70%)", sunIntensity: "Alta (2100h/año)", coldTolerance: 3, humidityLevel: 6, sunLevel: 7, region: "continental_templado" }
  }
};

// Enhanced postal code climate analysis with European mapping
export const analyzePostalCodeClimate = (postalCode: string): ClimateInfo => {
  const code = parseInt(postalCode.replace(/\D/g, ''));
  
  // Spanish postal codes analysis (01000-52999)
  if (code >= 1000 && code <= 52999) {
    // Madrid region (28000-28999)
    if (code >= 28000 && code <= 28999) return EUROPEAN_CLIMATE_MAP.spain.madrid;
    // Barcelona region (08000-08999)
    if (code >= 8000 && code <= 8999) return EUROPEAN_CLIMATE_MAP.spain.cataluña;
    // Valencia region (46000-46999)
    if (code >= 46000 && code <= 46999) return EUROPEAN_CLIMATE_MAP.spain.valencia;
    // Seville region (41000-41999)
    if (code >= 41000 && code <= 41999) return EUROPEAN_CLIMATE_MAP.spain.andalucia;
    // Cantabria region (39000-39999)
    if (code >= 39000 && code <= 39999) return EUROPEAN_CLIMATE_MAP.spain.cantabria;
    // Asturias (33000-33999)
    if (code >= 33000 && code <= 33999) return EUROPEAN_CLIMATE_MAP.spain.asturias;
    // Galicia (15000-15999, 27000-27999, 32000-32999, 36000-36999)
    if ((code >= 15000 && code <= 15999) || (code >= 27000 && code <= 27999) || 
        (code >= 32000 && code <= 32999) || (code >= 36000 && code <= 36999)) return EUROPEAN_CLIMATE_MAP.spain.galicia;
    // País Vasco (01000-01999, 20000-20999, 48000-48999)
    if ((code >= 1000 && code <= 1999) || (code >= 20000 && code <= 20999) || 
        (code >= 48000 && code <= 48999)) return EUROPEAN_CLIMATE_MAP.spain["pais_vasco"];
    // Murcia (30000-30999)
    if (code >= 30000 && code <= 30999) return EUROPEAN_CLIMATE_MAP.spain.murcia;
    // Canary Islands (35000-35999, 38000-38999)
    if ((code >= 35000 && code <= 35999) || (code >= 38000 && code <= 38999)) return EUROPEAN_CLIMATE_MAP.spain.canarias;
    // Balearic Islands (07000-07999)
    if (code >= 7000 && code <= 7999) return EUROPEAN_CLIMATE_MAP.spain.baleares;
    // Castilla y León (05000-05999, 09000-09999, 24000-24999, 34000-34999, 37000-37999, 40000-40999, 42000-42999, 47000-47999, 49000-49999)
    if ((code >= 5000 && code <= 5999) || (code >= 9000 && code <= 9999) || 
        (code >= 24000 && code <= 24999) || (code >= 34000 && code <= 34999) ||
        (code >= 37000 && code <= 37999) || (code >= 40000 && code <= 40999) ||
        (code >= 42000 && code <= 42999) || (code >= 47000 && code <= 47999) ||
        (code >= 49000 && code <= 49999)) return EUROPEAN_CLIMATE_MAP.spain["castilla_leon"];
    // Castilla-La Mancha (02000-02999, 13000-13999, 16000-16999, 19000-19999, 45000-45999)
    if ((code >= 2000 && code <= 2999) || (code >= 13000 && code <= 13999) ||
        (code >= 16000 && code <= 16999) || (code >= 19000 && code <= 19999) ||
        (code >= 45000 && code <= 45999)) return EUROPEAN_CLIMATE_MAP.spain["castilla_la_mancha"];
    // Aragón (22000-22999, 44000-44999, 50000-50999)
    if ((code >= 22000 && code <= 22999) || (code >= 44000 && code <= 44999) ||
        (code >= 50000 && code <= 50999)) return EUROPEAN_CLIMATE_MAP.spain.aragon;
    // Extremadura (06000-06999, 10000-10999)
    if ((code >= 6000 && code <= 6999) || (code >= 10000 && code <= 10999)) return EUROPEAN_CLIMATE_MAP.spain.extremadura;
    // Navarra (31000-31999)
    if (code >= 31000 && code <= 31999) return EUROPEAN_CLIMATE_MAP.spain.navarra;
    // La Rioja (26000-26999)
    if (code >= 26000 && code <= 26999) return EUROPEAN_CLIMATE_MAP.spain["la_rioja"];
  }

  // French postal codes (01000-95999)
  if (code >= 1000 && code <= 95999) {
    // Paris region (75000-75999, 77000-77999, 78000-78999, 91000-91999, 92000-92999, 93000-93999, 94000-94999, 95000-95999)
    if ((code >= 75000 && code <= 75999) || (code >= 77000 && code <= 78999) ||
        (code >= 91000 && code <= 95999)) return EUROPEAN_CLIMATE_MAP.france["ile_de_france"];
    // Provence region (13000-13999, 83000-83999, 84000-84999)
    if ((code >= 13000 && code <= 13999) || (code >= 83000 && code <= 84999)) return EUROPEAN_CLIMATE_MAP.france.provence;
    // Bretagne (22000-22999, 29000-29999, 35000-35999, 56000-56999)
    if ((code >= 22000 && code <= 22999) || (code >= 29000 && code <= 29999) ||
        (code >= 35000 && code <= 35999) || (code >= 56000 && code <= 56999)) return EUROPEAN_CLIMATE_MAP.france.bretagne;
    // Normandie (14000-14999, 27000-27999, 50000-50999, 61000-61999, 76000-76999)
    if ((code >= 14000 && code <= 14999) || (code >= 27000 && code <= 27999) ||
        (code >= 50000 && code <= 50999) || (code >= 61000 && code <= 61999) ||
        (code >= 76000 && code <= 76999)) return EUROPEAN_CLIMATE_MAP.france.normandie;
    // Corsica (20000-20999)
    if (code >= 20000 && code <= 20999) return EUROPEAN_CLIMATE_MAP.france.corse;
  }

  // Italian postal codes (00100-99999)
  if (code >= 100 && code <= 99999) {
    // Lombardia (20000-26999)
    if (code >= 20000 && code <= 26999) return EUROPEAN_CLIMATE_MAP.italy.lombardia;
    // Toscana (50000-59999)
    if (code >= 50000 && code <= 59999) return EUROPEAN_CLIMATE_MAP.italy.toscana;
    // Sicilia (90000-98999)
    if (code >= 90000 && code <= 98999) return EUROPEAN_CLIMATE_MAP.italy.sicilia;
    // Veneto (30000-32999, 35000-36999, 37000-37999, 45000-45999)
    if ((code >= 30000 && code <= 32999) || (code >= 35000 && code <= 37999) ||
        (code >= 45000 && code <= 45999)) return EUROPEAN_CLIMATE_MAP.italy.veneto;
  }

  // German postal codes (01000-99999)
  if (code >= 1000 && code <= 99999 && postalCode.length === 5) {
    // Bayern (80000-97999)
    if (code >= 80000 && code <= 97999) return EUROPEAN_CLIMATE_MAP.germany.bayern;
    // NRW (40000-59999)
    if (code >= 40000 && code <= 59999) return EUROPEAN_CLIMATE_MAP.germany["nordrhein_westfalen"];
    // Berlin (10000-14999)
    if (code >= 10000 && code <= 14999) return EUROPEAN_CLIMATE_MAP.germany.berlin;
  }

  // UK postcodes
  if (postalCode.match(/^[A-Z]/i)) {
    if (postalCode.toUpperCase().startsWith('EH') || postalCode.toUpperCase().startsWith('G')) {
      return EUROPEAN_CLIMATE_MAP.uk.scotland;
    }
    if (postalCode.toUpperCase().startsWith('CF') || postalCode.toUpperCase().startsWith('LL')) {
      return EUROPEAN_CLIMATE_MAP.uk.wales;
    }
    return EUROPEAN_CLIMATE_MAP.uk.england;
  }

  // Portuguese postal codes (1000-9999)
  if (code >= 1000 && code <= 9999 && postalCode.includes('-')) {
    if (code >= 1000 && code <= 1999) return EUROPEAN_CLIMATE_MAP.portugal.lisboa;
    if (code >= 4000 && code <= 4999) return EUROPEAN_CLIMATE_MAP.portugal.porto;
    if (code >= 8000 && code <= 8999) return EUROPEAN_CLIMATE_MAP.portugal.algarve;
  }

  // Default Mediterranean climate for unrecognized European codes
  return {
    zone: "Mediterráneo General",
    hardiness: "Zona 8b-9a",
    humidity: "Media (50-70%)",
    sunIntensity: "Alta (2400h/año)",
    coldTolerance: 7,
    humidityLevel: 6,
    sunLevel: 8,
    region: "mediterraneo"
  };
};

// Enhanced plant type classification system
const getPlantTypeFromName = (plantName: string): string => {
  const name = plantName.toLowerCase();
  
  if (name.includes('rhopalostylis') || name.includes('ptychosperma') || 
      name.includes('brahea') || name.includes('sabal') || 
      name.includes('chamaedorea') || name.includes('basselinia')) {
    return 'palmera';
  }
  if (name.includes('cyathea') || name.includes('dicksonia')) {
    return 'helecho';
  }
  if (name.includes('magnolia')) {
    return 'magnolia';
  }
  if (name.includes('zamia')) {
    return 'cicada';
  }
  if (name.includes('caryota')) {
    return 'palmera_cola_pez';
  }
  
  return 'tropical';
};

// Enhanced location climate analysis with European mapping
const analyzeLocationClimate = (location: string): { 
  coldTolerance: number, 
  humidity: number, 
  sunIntensity: number,
  region: string 
} => {
  const loc = location.toLowerCase();
  
  // Check all European regions
  for (const [country, regions] of Object.entries(EUROPEAN_CLIMATE_MAP)) {
    for (const [regionKey, climate] of Object.entries(regions)) {
      const regionName = regionKey.replace('_', ' ');
      if (loc.includes(regionName) || loc.includes(country)) {
        return {
          coldTolerance: climate.coldTolerance,
          humidity: climate.humidityLevel,
          sunIntensity: climate.sunLevel,
          region: climate.region
        };
      }
    }
  }
  
  // International locations (non-European)
  if (loc.includes('miami') || loc.includes('florida')) {
    return { coldTolerance: 9, humidity: 8, sunIntensity: 9, region: 'subtropical_humedo' };
  }
  if (loc.includes('california')) {
    return { coldTolerance: 8, humidity: 4, sunIntensity: 9, region: 'mediterraneo_seco' };
  }
  if (loc.includes('new york') || loc.includes('nueva york') || loc.includes('boston')) {
    return { coldTolerance: 2, humidity: 6, sunIntensity: 7, region: 'continental_frio' };
  }
  
  // Default Mediterranean climate
  return { coldTolerance: 7, humidity: 5, sunIntensity: 8, region: 'mediterraneo' };
};

// Enhanced care analysis
export const analyzePlantCare = (plant: Plant, query: string): {
  waterNeeds: string;
  coverageNeeds: string;
  careAdvice: string;
} => {
  const plantType = getPlantTypeFromName(plant.name);
  const plantDetail = plantDetails[plant.id];
  const queryLower = query.toLowerCase();
  
  let waterNeeds = "Riego moderado";
  let coverageNeeds = "Según exposición solar";
  let careAdvice = "";

  // Water needs analysis
  if (plantType === 'palmera') {
    if (plant.name.includes('Brahea')) {
      waterNeeds = "Riego escaso - tolera sequía una vez establecida";
    } else if (plant.name.includes('Rhopalostylis')) {
      waterNeeds = "Riego abundante - mantener humedad constante";
    } else {
      waterNeeds = "Riego moderado - evitar encharcamiento";
    }
  } else if (plantType === 'helecho') {
    waterNeeds = "Riego abundante - alta humedad ambiental";
  } else if (plantType === 'magnolia') {
    waterNeeds = "Riego moderado - más en época de crecimiento";
  }

  // Coverage needs analysis
  switch (plant.light.toLowerCase()) {
    case 'soleada':
      coverageNeeds = "Pleno sol - sin protección necesaria";
      break;
    case 'semisol':
      coverageNeeds = "Sol parcial - protección en horas más intensas";
      break;
    case 'semisombra':
      coverageNeeds = "Sombra parcial - malla de sombreo 30-50%";
      break;
    case 'sombreada':
      coverageNeeds = "Sombra completa - bajo dosel arbóreo o malla 70%";
      break;
  }

  // Specific care advice
  if (plant.notes.includes('joven') || plant.notes.includes('pequeña')) {
    careAdvice += "Cuando son jóvenes necesitan protección extra. ";
  }
  if (plant.notes.includes('drenaje')) {
    careAdvice += "Asegurar buen drenaje del suelo. ";
  }
  if (plant.notes.includes('heladas')) {
    careAdvice += "Proteger de heladas en invierno. ";
  }

  return { waterNeeds, coverageNeeds, careAdvice };
};

export const calculateViability = (plant: Plant, searchQuery: string, climateData?: ClimateInfo | null): ViabilityResult => {
  const lowerQuery = searchQuery.toLowerCase();
  const plantDetail = plantDetails[plant.id];
  const plantType = getPlantTypeFromName(plant.name);
  
  // Use climate data if provided (from postal code), otherwise analyze from query
  let locationClimate = { coldTolerance: 7, humidity: 5, sunIntensity: 8, region: 'mediterraneo' };
  
  if (climateData) {
    locationClimate = {
      coldTolerance: climateData.coldTolerance,
      humidity: climateData.humidityLevel,
      sunIntensity: climateData.sunLevel,
      region: climateData.region
    };
  } else {
    // Extract location from query
    const locationMatch = lowerQuery.match(/(madrid|barcelona|valencia|sevilla|santander|cantabria|asturias|galicia|bilbao|canarias|baleares|london|paris|miami|florida|california|new york)/);
    if (locationMatch) {
      locationClimate = analyzeLocationClimate(locationMatch[0]);
    }
  }

  // Base factors
  let globalViability = 5;
  let coldResistance = 5;
  let humidityTolerance = 5;
  let clayAdaptation = 5;
  let sunExposure = 5;
  let pestResistance = 5;

  // Enhanced plant-specific analysis
  if (plantType === 'palmera') {
    pestResistance = 7; // Generally hardy
    if (plant.name.includes('Rhopalostylis')) {
      coldResistance = 8;
      humidityTolerance = 9;
    } else if (plant.name.includes('Brahea')) {
      coldResistance = 7;
      humidityTolerance = 3;
      sunExposure = 9;
    } else if (plant.name.includes('Chamaedorea')) {
      coldResistance = 9;
      humidityTolerance = 7;
    }
  } else if (plantType === 'helecho') {
    humidityTolerance = 9;
    sunExposure = 3; // Prefer shade
    coldResistance = 6;
  } else if (plantType === 'magnolia') {
    coldResistance = 7;
    humidityTolerance = 6;
    sunExposure = 7;
  }

  // Enhanced location compatibility analysis with climate data
  const climateDiff = Math.abs(locationClimate.coldTolerance - coldResistance) + 
                     Math.abs(locationClimate.humidity - humidityTolerance);
  
  if (climateDiff <= 2) {
    globalViability += 3; // Better bonus for perfect match
  } else if (climateDiff <= 4) {
    globalViability += 1;
  } else if (climateDiff >= 6) {
    globalViability -= 2;
  }

  // Enhanced climate-specific adjustments
  if (climateData) {
    // Adjust based on specific climate zone
    if (climateData.region === 'subtropical' && plantType === 'palmera') {
      globalViability += 2;
      coldResistance += 1;
    }
    if (climateData.region === 'atlantico_humedo' && plantType === 'helecho') {
      globalViability += 2;
      humidityTolerance += 1;
    }
    if (climateData.region === 'continental_seco' && plant.name.includes('Brahea')) {
      globalViability += 1; // Drought tolerant palms do well
    }
  }

  // Soil adaptation based on plant origin
  if (plantDetail?.origin?.includes('Nueva Zelanda') || plantDetail?.origin?.includes('Australia')) {
    clayAdaptation = 8;
  } else if (plantDetail?.origin?.includes('México') || plantDetail?.origin?.includes('Baja California')) {
    clayAdaptation = 6;
  }

  // Sun exposure matching
  const lightRequirement = plant.light.toLowerCase();
  if (lightRequirement === 'soleada' && locationClimate.sunIntensity >= 8) {
    sunExposure = 9;
  } else if (lightRequirement === 'sombreada' && locationClimate.sunIntensity <= 5) {
    sunExposure = 8;
  } else {
    sunExposure = Math.max(3, 10 - Math.abs(locationClimate.sunIntensity - 6));
  }

  // Ensure values are within range
  globalViability = Math.max(1, Math.min(globalViability, 10));
  coldResistance = Math.max(1, Math.min(coldResistance, 10));
  humidityTolerance = Math.max(1, Math.min(humidityTolerance, 10));
  clayAdaptation = Math.max(1, Math.min(clayAdaptation, 10));
  sunExposure = Math.max(1, Math.min(sunExposure, 10));
  pestResistance = Math.max(1, Math.min(pestResistance, 10));

  const totalScore = Math.round(
    (globalViability + coldResistance + humidityTolerance + clayAdaptation + sunExposure + pestResistance) / 6
  );

  const recommendation = getRecommendation(totalScore, locationClimate.region, climateData?.zone);

  return {
    totalScore,
    factors: {
      globalViability,
      coldResistance,
      humidityTolerance,
      clayAdaptation,
      sunExposure,
      pestResistance
    },
    recommendation
  };
};

const getRecommendation = (score: number, region: string, specificZone?: string): string => {
  const regionText = specificZone ? ` para ${specificZone}` :
                    region === 'continental_seco' ? ' para clima continental' : 
                    region === 'atlantico_humedo' ? ' para clima atlántico' :
                    region === 'mediterraneo' ? ' para clima mediterráneo' :
                    region === 'subtropical' ? ' para clima subtropical' : '';

  if (score >= 8) return `Excelente opción${regionText} - muy recomendada`;
  if (score >= 7) return `Buena opción${regionText} - recomendada`;
  if (score >= 6) return `Opción viable${regionText} - con cuidados`;
  if (score >= 5) return `Opción moderada${regionText} - requiere atención`;
  if (score >= 4) return `Opción desafiante${regionText} - para expertos`;
  return `Opción muy desafiante${regionText} - no recomendada`;
};

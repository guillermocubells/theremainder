// Plant details data with additional fields for the detail view

export interface PlantDetailData {
  family?: string;
  origin?: string;
  height?: string;
  climate?: string;
  careInstructions?: string[];
  characteristics?: string[];
  curiousFacts?: string[];
  imageDescription?: string;
}

export const plantDetails: Record<string, PlantDetailData> = {
  "rhopalostylis-sapida": {
    family: "Arecaceae",
    origin: "Nueva Zelanda",
    height: "10-15 metros",
    climate: "Costero templado",
    careInstructions: ["Prefiere suelo fértil con buen drenaje", "Requiere humedad constante pero sin encharcamiento", "Prospera en sombra parcial a pleno sol", "Proteger de vientos fuertes cuando es joven", "Fertilizar con abono específico para palmeras durante la temporada de crecimiento"],
    characteristics: ["Elegantes frondas plumosas", "Base del tronco distintivamente hinchada", "Produce racimos de pequeños frutos rojos", "Extremadamente resistente y longeva", "Crea un hermoso ambiente tropical"],
    curiousFacts: ["Es la única palmera nativa de Nueva Zelanda", "Los maoríes utilizaban sus frutos como alimento", "Puede vivir más de 200 años", "Su base hinchada almacena nutrientes para tiempos difíciles", "Resiste vientos de hasta 200 km/h"],
    imageDescription: "Palmera alta y elegante con frondas plumosas contra fondo costero"
  },
  "chuniophoenix-hainanensis": {
    family: "Arecaceae",
    origin: "Isla de Hainan, China",
    height: "3-5 metros",
    climate: "Subtropical",
    careInstructions: ["Requiere condiciones cálidas y húmedas", "Prefiere sombra parcial", "Necesita suelo rico en materia orgánica con buen drenaje", "Riego regular pero permitir que el suelo se seque ligeramente entre riegos", "Proteger de temperaturas frías por debajo de 10°C"],
    characteristics: ["Folíolos distintivos en forma de cola de pez", "Rara y en peligro en estado silvestre", "Hábito de crecimiento compacto", "Hermosa forma arquitectónica", "Muy buscada por coleccionistas"],
    curiousFacts: ["Solo queda una población salvaje conocida en el mundo", "Fue redescubierta en 1985 después de creerse extinta", "Sus hojas únicas la hacen inconfundible", "Es considerada el 'santo grial' de los coleccionistas de palmeras", "Cada ejemplar puede valer miles de euros"],
    imageDescription: "Palmera rara con hojas distintivas en forma de cola de pez en hábitat natural"
  },
  "brahea-armata": {
    family: "Arecaceae",
    origin: "Baja California, México",
    height: "12-15 metros",
    climate: "Árido a semiárido",
    careInstructions: ["Extremadamente tolerante a la sequía una vez establecida", "Prefiere exposición a pleno sol", "Requiere excelente drenaje", "Riego mínimo necesario", "Muy bajo mantenimiento"],
    characteristics: ["Coloración azul plateado intenso", "Grandes hojas en forma de abanico", "Extremadamente tolerante a la sequía", "Crea punto focal dramático en el paisaje", "Longeva y resistente"],
    curiousFacts: ["Su color azul plateado es una adaptación para reflejar el calor", "Puede sobrevivir sin riego durante años", "Sus hojas se utilizaban para hacer sombreros tradicionales", "Puede alcanzar 50 años antes de florecer por primera vez", "Es inmune a la mayoría de plagas y enfermedades"],
    imageDescription: "Impresionante palmera abanico azul plateado con brillo metálico en entorno desértico"
  },
  "sabal-miamensis": {
    family: "Arecaceae",
    origin: "Sur de Florida, EE.UU.",
    height: "6-12 metros",
    climate: "Subtropical",
    careInstructions: ["Muy adaptable a diferentes tipos de suelo", "Tolerante a la sal - perfecta para áreas costeras", "Tolerante a la sequía una vez establecida", "Prefiere pleno sol a sombra parcial", "Cuidado mínimo requerido"],
    characteristics: ["Grandes hojas atractivas en forma de abanico", "Resistente a huracanes y viento", "Tolerante al rocío salino", "Especie nativa de Florida", "Produce pequeños frutos negros"],
    curiousFacts: ["Sobrevive a huracanes categoría 5 sin problemas", "Sus frutos son comestibles y nutritivos", "Era sagrada para las tribus nativas americanas", "Puede crecer tanto en agua dulce como salada", "Su madera es tan dura que se usaba para construir muelles"],
    imageDescription: "Palmito nativo de Florida con grandes hojas abanico en paisaje costero"
  },
  "ptychosperma-caryotoides": {
    family: "Arecaceae",
    origin: "Queensland, Australia",
    height: "8-12 metros",
    climate: "Tropical",
    careInstructions: ["Requiere condiciones cálidas y húmedas", "Prefiere sombra parcial a sol filtrado", "Necesita humedad constante", "Se beneficia de fertilización regular", "Proteger de vientos fuertes"],
    characteristics: ["Hermosas frondas plumosas", "Espectaculares racimos de frutos rojos brillantes", "Palmera tropical de crecimiento rápido", "Crea ambiente tropical instantáneo", "Tronco anillado atractivo"],
    curiousFacts: ["Sus frutos cambian de verde a rojo brillante al madurar", "Los aborígenes australianos usaban sus frutos como alimento", "Puede producir hasta 3 racimos de frutos al año", "Sus semillas germinan en solo 2-3 semanas", "Es una de las palmeras que crece más rápido en el mundo"],
    imageDescription: "Palmera tropical con frondas plumosas y racimos de frutos rojos brillantes"
  },
  "caryota-obtusa": {
    family: "Arecaceae",
    origin: "Sudeste Asiático",
    height: "8-12 metros",
    climate: "Tropical",
    careInstructions: ["Requiere condiciones cálidas y húmedas", "Prefiere sombra parcial a sol filtrado", "Necesita humedad constante", "Se beneficia de fertilización regular", "Proteger de vientos fuertes"],
    characteristics: ["Hojas distintivas en forma de cola de pez", "Crecimiento rápido", "Planta monocárpica", "Forma dramática", "Crea punto focal en el jardín"],
    curiousFacts: ["Muere después de florecer, como los bambúes", "Sus hojas parecen colas de pez, de ahí su nombre común", "Puede tardar 15-20 años en florecer", "Sus frutos son tóxicos para humanos pero no para aves", "Es la única palmera con hojas bífidas"],
    imageDescription: "Palmera con hojas distintivas en forma de cola de pez"
  },
  "cyathea-sp": {
    family: "Cyatheaceae",
    origin: "Australia/Regiones tropicales",
    height: "3-8 metros",
    climate: "Templado a tropical",
    careInstructions: ["Requiere alta humedad y protección del viento", "Prefiere luz filtrada o sombra parcial", "Necesita humedad constante", "Se beneficia de rociar el tronco y las frondas", "Requiere protección contra heladas"],
    characteristics: ["Apariencia ancestral y prehistórica", "Gran corona en forma de paraguas", "Frondas delicadas y encajadas", "Crea características dramáticas en el jardín", "Crecimiento rápido cuando las condiciones son adecuadas"],
    curiousFacts: ["Son fósiles vivientes de hace 180 millones de años", "Existían cuando los dinosaurios dominaban la Tierra", "Sus esporas pueden viajar miles de kilómetros en el viento", "Algunas especies pueden vivir más de 500 años", "Sus troncos fibrosos almacenan hasta 200 litros de agua"],
    imageDescription: "Helecho arborescente prehistórico con gran corona de paraguas de frondas delicadas"
  },
  "dicksonia-sp": {
    family: "Dicksoniaceae",
    origin: "Australia/Nueva Zelanda",
    height: "4-10 metros",
    climate: "Templado fresco",
    careInstructions: ["Prefiere condiciones frescas, húmedas y sombreadas", "Requiere protección del sol caliente de la tarde", "Mantener el tronco húmedo con riego regular", "Necesita protección de vientos fuertes", "Se beneficia del mulching alrededor de la base"],
    characteristics: ["Tronco grueso y fibroso", "Frondas suaves y delicadas", "Extremadamente longevo", "Crea atmósfera mística en el jardín", "Crecimiento lento pero constante"],
    curiousFacts: ["Pueden vivir más de 1000 años", "Crecen solo 2-3 cm por año", "Sus troncos se pueden trasplantar como 'troncos caminantes'", "Absorben agua directamente a través de su tronco fibroso", "Son considerados sagrados por los aborígenes australianos"],
    imageDescription: "Helecho arborescente majestuoso con tronco fibroso grueso y frondas suaves delicadas"
  },
  "zamia-integrifolia": {
    family: "Zamiaceae",
    origin: "Caribe/Jamaica",
    height: "1-2 metros",
    climate: "Tropical a subtropical",
    careInstructions: ["Prefiere suelo arenoso con buen drenaje", "Tolerante a la sequía una vez establecida", "Prospera en sombra parcial a pleno sol", "Muy bajo mantenimiento", "Proteger de heladas fuertes"],
    characteristics: ["Especie de cícada ancestral", "Más grande que las variedades típicas", "Extremadamente resistente y longeva", "Produce conos distintivos", "Atractivo de jardín prehistórico"],
    curiousFacts: ["Son más antiguas que los dinosaurios", "Pueden vivir más de 1000 años", "Son plantas dioicas: hay machos y hembras separados", "Sus semillas son tóxicas pero muy nutritivas una vez procesadas", "Fueron el alimento principal de los dinosaurios herbívoros"],
    imageDescription: "Cícada ancestral con tronco robusto y corona de hojas primitivas"
  },
  "magnolia-laevifolia": {
    family: "Magnoliaceae",
    origin: "América Central",
    height: "8-15 metros",
    climate: "Subtropical",
    careInstructions: ["Prefiere suelo rico con buen drenaje", "Se beneficia del riego regular", "Prospera en sombra parcial a sol matutino", "Mulch alrededor de la base para mantener las raíces frescas", "Alimentar con materia orgánica anualmente"],
    characteristics: ["Hojas perennes brillantes y lisas", "Grandes flores cerosas fragantes", "Forma arquitectónica elegante", "Atractivo de follaje durante todo el año", "Atrae polinizadores beneficiosos"],
    curiousFacts: ["Sus flores aparecieron antes que las abejas en la evolución", "Son polinizadas por escarabajos, no por abejas", "Pueden vivir más de 300 años", "Sus flores se abren y cierran durante varios días", "Son parientes directos de las primeras plantas con flores"],
    imageDescription: "Elegante árbol de magnolia con hojas brillantes y grandes flores fragantes"
  },
  "chamaedorea-elegans": {
    family: "Arecaceae",
    origin: "México/Centroamérica",
    height: "1-2 metros",
    climate: "Tropical a subtropical",
    careInstructions: ["Prefiere sombra parcial", "Tolerante a temperaturas frías", "Riego moderado", "Suelo bien drenado", "Protección de vientos fuertes"],
    characteristics: ["Muy resistente al frío", "Crecimiento compacto", "Ideal para interiores", "Bajo mantenimiento", "Follaje elegante"],
    curiousFacts: ["Es la palmera de interior más popular del mundo", "Puede sobrevivir a temperaturas de hasta -5°C", "Florece incluso en macetas pequeñas", "Sus flores son comestibles en algunos países", "NASA la incluyó en su lista de plantas purificadoras de aire"],
    imageDescription: "Palmera compacta con follaje elegante, ideal para climas fríos"
  },
  "basselinia-favieri": {
    origin: "Nueva Caledonia",
    climate: "Tropical húmedo",
    careInstructions: [
      "Requiere sombra parcial, especialmente cuando es joven",
      "Mantener el suelo húmedo pero bien drenado",
      "Proteger de heladas y vientos fuertes",
      "Necesita alta humedad ambiental",
      "Regar regularmente sin encharcar",
      "Aplicar fertilizante líquido diluido mensualmente en primavera y verano"
    ],
    characteristics: [
      "Palmera de crecimiento extremadamente lento",
      "Hojas pinnadas elegantes y arqueadas",
      "Tronco delgado y liso cuando es adulta",
      "Muy sensible a las heladas",
      "Requiere protección de otros árboles",
      "Ideal para jardines con microclima protegido"
    ],
    curiousFacts: [
      "Es endémica de Nueva Caledonia, una isla del Pacífico Sur",
      "Puede tardar décadas en alcanzar su tamaño adulto",
      "En su hábitat natural crece bajo el dosel de otros árboles",
      "Es una de las palmeras más lentas del mundo en crecer",
      "Necesita un clima muy específico para prosperar",
      "Sus semillas son muy difíciles de germinar fuera de su hábitat natural"
    ]
  }
};

export interface PlantFinderAnswers {
  plantGroup: string | null;
  location: string | null;
  sunExposure: string | null;
  waterNeeds: string | null;
  growthRate: string | null;
  wowFactor: string | null;
  hardinessZone: string | null;
}

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
}

export interface Question {
  id: keyof PlantFinderAnswers;
  title: string;
  subtitle?: string;
  options: QuestionOption[];
  required: boolean;
}

export const initialAnswers: PlantFinderAnswers = {
  plantGroup: null,
  location: null,
  sunExposure: null,
  waterNeeds: null,
  growthRate: null,
  wowFactor: null,
  hardinessZone: null,
};

export const questions: Question[] = [
  {
    id: 'plantGroup',
    title: '¿Qué tipo de planta buscas?',
    subtitle: 'Elige la categoría que mejor se adapte a tus necesidades',
    required: false,
    options: [
      { value: 'Palmeras', label: 'Palmeras', icon: '🌴' },
      { value: 'Helechos arbóreos', label: 'Helechos arbóreos', icon: '🌿' },
      { value: 'Cícadas', label: 'Cícadas', icon: '🪴' },
      { value: 'Árboles ornamentales', label: 'Árboles', icon: '🌳' },
      { value: 'Arbustos ornamentales', label: 'Arbustos', icon: '🌲' },
      { value: 'Tropical', label: 'Tropical', icon: '🌺' },
      { value: 'easy', label: 'Quiero algo fácil', icon: '✨' },
    ],
  },
  {
    id: 'location',
    title: '¿Dónde la plantarás?',
    subtitle: 'El lugar determina las condiciones de luz y espacio',
    required: false,
    options: [
      { value: 'interior', label: 'Interior', description: 'Dentro de casa', icon: '🏠' },
      { value: 'balcon', label: 'Balcón', description: 'Espacio exterior pequeño', icon: '🏗️' },
      { value: 'jardin', label: 'Jardín', description: 'En tierra exterior', icon: '🏡' },
      { value: 'terraza', label: 'Terraza', description: 'Exterior amplio', icon: '☀️' },
      { value: 'sombra-arboles', label: 'Bajo árboles', description: 'Sombra natural', icon: '🌳' },
      { value: 'invernadero', label: 'Invernadero', description: 'Ambiente controlado', icon: '🏛️' },
    ],
  },
  {
    id: 'sunExposure',
    title: '¿Cuánta luz solar recibe el lugar?',
    subtitle: 'Observa el lugar durante el día para determinarlo',
    required: false,
    options: [
      { value: 'Soleada', label: 'Sol pleno', description: 'Más de 6 horas de sol directo', icon: '☀️' },
      { value: 'Semisol', label: 'Semi-sol', description: '4-6 horas de sol', icon: '🌤️' },
      { value: 'Semisombra', label: 'Semi-sombra', description: '2-4 horas de luz filtrada', icon: '⛅' },
      { value: 'Sombreada', label: 'Sombra', description: 'Luz indirecta o poca luz', icon: '🌥️' },
    ],
  },
  {
    id: 'waterNeeds',
    title: '¿Cuánto quieres regar?',
    subtitle: 'Sé honesto sobre tu disponibilidad de tiempo',
    required: false,
    options: [
      { value: 'Baja', label: 'Muy poco', description: 'Riego ocasional', icon: '💧' },
      { value: 'Moderada', label: 'Moderado', description: 'Riego regular', icon: '💦' },
      { value: 'Alta', label: 'Abundante', description: 'Riego frecuente', icon: '🌊' },
    ],
  },
  {
    id: 'growthRate',
    title: '¿Qué velocidad de crecimiento prefieres?',
    subtitle: 'Las plantas de crecimiento lento suelen requerir menos mantenimiento',
    required: false,
    options: [
      { value: 'Lento', label: 'Lento', description: 'Paciencia recompensada', icon: '🐢' },
      { value: 'Medio', label: 'Medio', description: 'Ritmo equilibrado', icon: '🚶' },
      { value: 'Rápido', label: 'Rápido', description: 'Resultados visibles pronto', icon: '🚀' },
    ],
  },
  {
    id: 'wowFactor',
    title: '¿Buscas una planta espectacular?',
    subtitle: 'Algunas plantas son verdaderas protagonistas del jardín',
    required: false,
    options: [
      { value: 'spectacular', label: 'Sí, algo espectacular', description: 'Quiero impresionar', icon: '🌟' },
      { value: 'discrete', label: 'Prefiero discreto y fácil', description: 'Belleza sutil', icon: '🍃' },
    ],
  },
  {
    id: 'hardinessZone',
    title: 'Zona de rusticidad (Hardiness zone)',
    subtitle: 'Indica la temperatura mínima de tu zona en invierno',
    required: false,
    options: [], // Will be populated dynamically from HARDINESS_ZONES
  },
];

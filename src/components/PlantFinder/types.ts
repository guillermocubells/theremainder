import type { TFunction } from 'i18next';

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

export const getQuestions = (t: TFunction): Question[] => [
  {
    id: 'plantGroup',
    title: t('plantFinder.questions.plantGroup.title'),
    subtitle: t('plantFinder.questions.plantGroup.subtitle'),
    required: false,
    options: [
      { value: 'Palmeras', label: t('plantFinder.questions.plantGroup.palmeras'), icon: '🌴' },
      { value: 'Helechos arbóreos', label: t('plantFinder.questions.plantGroup.helechos'), icon: '🌿' },
      { value: 'Cícadas', label: t('plantFinder.questions.plantGroup.cicadas'), icon: '🪴' },
      { value: 'Árboles ornamentales', label: t('plantFinder.questions.plantGroup.arboles'), icon: '🌳' },
      { value: 'Arbustos ornamentales', label: t('plantFinder.questions.plantGroup.arbustos'), icon: '🌲' },
      { value: 'Tropical', label: t('plantFinder.questions.plantGroup.tropical'), icon: '🌺' },
      { value: 'easy', label: t('plantFinder.questions.plantGroup.easy'), icon: '✨' },
    ],
  },
  {
    id: 'location',
    title: t('plantFinder.questions.location.title'),
    subtitle: t('plantFinder.questions.location.subtitle'),
    required: false,
    options: [
      { value: 'interior', label: t('plantFinder.questions.location.interior'), description: t('plantFinder.questions.location.interiorDesc'), icon: '🏠' },
      { value: 'balcon', label: t('plantFinder.questions.location.balcon'), description: t('plantFinder.questions.location.balconDesc'), icon: '🏗️' },
      { value: 'jardin', label: t('plantFinder.questions.location.jardin'), description: t('plantFinder.questions.location.jardinDesc'), icon: '🏡' },
      { value: 'terraza', label: t('plantFinder.questions.location.terraza'), description: t('plantFinder.questions.location.terrazaDesc'), icon: '☀️' },
      { value: 'sombra-arboles', label: t('plantFinder.questions.location.bajoArboles'), description: t('plantFinder.questions.location.bajoArbolesDesc'), icon: '🌳' },
      { value: 'invernadero', label: t('plantFinder.questions.location.invernadero'), description: t('plantFinder.questions.location.invernaderoDesc'), icon: '🏛️' },
    ],
  },
  {
    id: 'sunExposure',
    title: t('plantFinder.questions.sunExposure.title'),
    subtitle: t('plantFinder.questions.sunExposure.subtitle'),
    required: false,
    options: [
      { value: 'Soleada', label: t('plantFinder.questions.sunExposure.full'), description: t('plantFinder.questions.sunExposure.fullDesc'), icon: '☀️' },
      { value: 'Semisol', label: t('plantFinder.questions.sunExposure.semiSun'), description: t('plantFinder.questions.sunExposure.semiSunDesc'), icon: '🌤️' },
      { value: 'Semisombra', label: t('plantFinder.questions.sunExposure.semiShade'), description: t('plantFinder.questions.sunExposure.semiShadeDesc'), icon: '⛅' },
      { value: 'Sombreada', label: t('plantFinder.questions.sunExposure.shade'), description: t('plantFinder.questions.sunExposure.shadeDesc'), icon: '🌥️' },
    ],
  },
  {
    id: 'waterNeeds',
    title: t('plantFinder.questions.waterNeeds.title'),
    subtitle: t('plantFinder.questions.waterNeeds.subtitle'),
    required: false,
    options: [
      { value: 'Baja', label: t('plantFinder.questions.waterNeeds.low'), description: t('plantFinder.questions.waterNeeds.lowDesc'), icon: '💧' },
      { value: 'Moderada', label: t('plantFinder.questions.waterNeeds.moderate'), description: t('plantFinder.questions.waterNeeds.moderateDesc'), icon: '💦' },
      { value: 'Alta', label: t('plantFinder.questions.waterNeeds.high'), description: t('plantFinder.questions.waterNeeds.highDesc'), icon: '🌊' },
    ],
  },
  {
    id: 'growthRate',
    title: t('plantFinder.questions.growthRate.title'),
    subtitle: t('plantFinder.questions.growthRate.subtitle'),
    required: false,
    options: [
      { value: 'Lento', label: t('plantFinder.questions.growthRate.slow'), description: t('plantFinder.questions.growthRate.slowDesc'), icon: '🐢' },
      { value: 'Medio', label: t('plantFinder.questions.growthRate.medium'), description: t('plantFinder.questions.growthRate.mediumDesc'), icon: '🚶' },
      { value: 'Rápido', label: t('plantFinder.questions.growthRate.fast'), description: t('plantFinder.questions.growthRate.fastDesc'), icon: '🚀' },
    ],
  },
  {
    id: 'wowFactor',
    title: t('plantFinder.questions.wowFactor.title'),
    subtitle: t('plantFinder.questions.wowFactor.subtitle'),
    required: false,
    options: [
      { value: 'spectacular', label: t('plantFinder.questions.wowFactor.spectacular'), description: t('plantFinder.questions.wowFactor.spectacularDesc'), icon: '🌟' },
      { value: 'discrete', label: t('plantFinder.questions.wowFactor.discrete'), description: t('plantFinder.questions.wowFactor.discreteDesc'), icon: '🍃' },
    ],
  },
  {
    id: 'hardinessZone',
    title: t('plantFinder.questions.hardinessZone.title'),
    subtitle: t('plantFinder.questions.hardinessZone.subtitle'),
    required: false,
    options: [], // Populated dynamically from HARDINESS_ZONES
  },
];

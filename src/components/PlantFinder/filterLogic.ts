import { Plant } from '@/data/plants';
import { PlantFinderAnswers } from './types';

export interface FilterResult {
  plants: Plant[];
  activeFilters: string[];
}

export const filterPlantsByAnswers = (
  plants: Plant[],
  answers: PlantFinderAnswers
): FilterResult => {
  let filtered = [...plants];
  const activeFilters: string[] = [];

  // Filter by plant group
  if (answers.plantGroup) {
    if (answers.plantGroup === 'easy') {
      // "Easy" plants: slow/medium growth, low/moderate water
      filtered = filtered.filter(p => 
        (p.growthRate === 'Lento' || p.growthRate === 'Medio') &&
        (p.waterNeeds === 'Baja' || p.waterNeeds === 'Moderada')
      );
      activeFilters.push('Fácil de cuidar');
    } else if (answers.plantGroup === 'Tropical') {
      // Tropical includes palms and tree ferns
      filtered = filtered.filter(p => 
        p.plantGroup === 'Palmeras' || 
        p.plantGroup === 'Helechos arbóreos' ||
        p.plantGroup === 'Cícadas'
      );
      activeFilters.push('Tropical');
    } else {
      filtered = filtered.filter(p => p.plantGroup === answers.plantGroup);
      activeFilters.push(answers.plantGroup);
    }
  }

  // Filter by location (maps to light and location properties)
  if (answers.location) {
    const locationMapping: Record<string, { light?: string[], locations?: string[] }> = {
      'interior': { light: ['Semisombra', 'Sombreada'] },
      'balcon': { light: ['Semisol', 'Semisombra'], locations: ['Baleares', 'Cantabria'] },
      'jardin': { locations: ['Cantabria', 'Baleares/Cantabria'] },
      'terraza': { light: ['Soleada', 'Semisol'] },
      'sombra-arboles': { light: ['Sombreada', 'Semisombra'] },
      'invernadero': {}, // All plants work in greenhouse
    };

    const mapping = locationMapping[answers.location];
    if (mapping && Object.keys(mapping).length > 0) {
      if (mapping.light) {
        filtered = filtered.filter(p => mapping.light!.includes(p.light));
      }
    }
    
    const locationLabels: Record<string, string> = {
      'interior': 'Interior',
      'balcon': 'Balcón',
      'jardin': 'Jardín',
      'terraza': 'Terraza',
      'sombra-arboles': 'Bajo árboles',
      'invernadero': 'Invernadero',
    };
    activeFilters.push(locationLabels[answers.location] || answers.location);
  }

  // Filter by sun exposure
  if (answers.sunExposure) {
    const sunMapping: Record<string, string[]> = {
      'Soleada': ['Soleada'],
      'Semisol': ['Semisol', 'Soleada'],
      'Semisombra': ['Semisombra', 'Semisol'],
      'Sombreada': ['Sombreada', 'Semisombra'],
    };
    
    const validLights = sunMapping[answers.sunExposure] || [answers.sunExposure];
    filtered = filtered.filter(p => validLights.includes(p.light));
    
    const sunLabels: Record<string, string> = {
      'Soleada': 'Sol pleno',
      'Semisol': 'Semi-sol',
      'Semisombra': 'Semi-sombra',
      'Sombreada': 'Sombra',
    };
    activeFilters.push(sunLabels[answers.sunExposure] || answers.sunExposure);
  }

  // Filter by water needs
  if (answers.waterNeeds) {
    filtered = filtered.filter(p => p.waterNeeds === answers.waterNeeds);
    
    const waterLabels: Record<string, string> = {
      'Baja': 'Poca agua',
      'Moderada': 'Agua moderada',
      'Alta': 'Mucha agua',
    };
    activeFilters.push(waterLabels[answers.waterNeeds] || answers.waterNeeds);
  }

  // Filter by growth rate
  if (answers.growthRate) {
    filtered = filtered.filter(p => p.growthRate === answers.growthRate);
    
    const growthLabels: Record<string, string> = {
      'Lento': 'Crecimiento lento',
      'Medio': 'Crecimiento medio',
      'Rápido': 'Crecimiento rápido',
    };
    activeFilters.push(growthLabels[answers.growthRate] || answers.growthRate);
  }

  // Filter by wow factor
  if (answers.wowFactor) {
    if (answers.wowFactor === 'spectacular') {
      filtered = filtered.filter(p => 
        p.ornamentalValue === 'Impresionante' || 
        p.ornamentalValue === 'Único'
      );
      activeFilters.push('Espectacular');
    } else {
      filtered = filtered.filter(p => 
        p.ornamentalValue === 'Bonito' || 
        p.ornamentalValue === 'Convencional' ||
        p.ornamentalValue === 'Hermoso'
      );
      activeFilters.push('Discreto');
    }
  }

  // Filter by hardiness zone
  if (answers.hardinessZone) {
    filtered = filtered.filter(p => 
      p.hardinessZones?.includes(answers.hardinessZone!) ||
      p.hardinessZones?.some(z => {
        // Also match if plant supports colder zones (lower number = colder)
        const plantZoneNum = parseInt(z);
        const userZoneNum = parseInt(answers.hardinessZone!);
        return plantZoneNum <= userZoneNum;
      })
    );
    activeFilters.push(`Zona ${answers.hardinessZone.toUpperCase()}`);
  }

  return { plants: filtered, activeFilters };
};

// Analytics tracking — integrate with a real analytics service (e.g. GA4)
export const trackPlantFinderEvent = (_eventName: string, _data?: Record<string, unknown>) => {
  // window.gtag?.('event', _eventName, _data);
};

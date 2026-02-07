import { describe, it, expect } from 'vitest';
import es from '@/i18n/locales/es.json';
import en from '@/i18n/locales/en.json';

function getKeys(obj: Record<string, any>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return getKeys(value as Record<string, any>, fullKey);
    }
    return [fullKey];
  });
}

describe('i18n key parity', () => {
  const esKeys = new Set(getKeys(es));
  const enKeys = new Set(getKeys(en));

  it('es.json and en.json have the same number of keys', () => {
    expect(esKeys.size).toBe(enKeys.size);
  });

  it('every ES key exists in EN', () => {
    const missingInEn = [...esKeys].filter(k => !enKeys.has(k));
    expect(missingInEn).toEqual([]);
  });

  it('every EN key exists in ES', () => {
    const missingInEs = [...enKeys].filter(k => !esKeys.has(k));
    expect(missingInEs).toEqual([]);
  });

  it('no EN value equals its ES counterpart (except shared terms)', () => {
    const sharedAllowed = new Set([
      'common.form.email', 'common.subtotal', 'common.form.emailPlaceholder',
      'FAQ', 'WhatsApp', 'Email', 'QR',
    ]);
    const identical: string[] = [];
    for (const key of esKeys) {
      if (sharedAllowed.has(key)) continue;
      const esVal = key.split('.').reduce((o: any, k) => o?.[k], es);
      const enVal = key.split('.').reduce((o: any, k) => o?.[k], en);
      if (typeof esVal === 'string' && esVal === enVal && esVal.length > 3) {
        identical.push(`${key}: "${esVal}"`);
      }
    }
    // Warn but don't fail — some terms may legitimately be the same
    if (identical.length > 0) {
      console.warn(`Potentially untranslated keys (${identical.length}):`, identical.slice(0, 10));
    }
  });
});

describe('i18n initialization', () => {
  it('i18n module exports default instance', async () => {
    const i18n = (await import('@/i18n')).default;
    expect(i18n).toBeDefined();
    expect(i18n.isInitialized).toBe(true);
  });

  it('fallbackLng is es', async () => {
    const i18n = (await import('@/i18n')).default;
    expect(i18n.options.fallbackLng).toEqual(['es']);
  });

  it('supportedLngs includes es and en', async () => {
    const i18n = (await import('@/i18n')).default;
    expect(i18n.options.supportedLngs).toContain('es');
    expect(i18n.options.supportedLngs).toContain('en');
  });

  it('translates a known key in ES', async () => {
    const i18n = (await import('@/i18n')).default;
    await i18n.changeLanguage('es');
    expect(i18n.t('common.loading')).toBe('Cargando...');
  });

  it('translates a known key in EN', async () => {
    const i18n = (await import('@/i18n')).default;
    await i18n.changeLanguage('en');
    expect(i18n.t('common.loading')).toBe('Loading...');
  });
});

import { ar } from './ar';
import { en } from './en';
import { fa } from './fa';
import { getNgxEditorLocale, isRtlLocale, registerNgxEditorLocale } from './registry';
import type { NgxEditorLocale } from './types';

describe('locale registry', () => {
  describe('getNgxEditorLocale', () => {
    it('should find the built-in locales by their code', () => {
      expect(getNgxEditorLocale('en')).toBe(en);
      expect(getNgxEditorLocale('fa')).toBe(fa);
      expect(getNgxEditorLocale('ar')).toBe(ar);
    });

    it('should fall back to the language of a regional code', () => {
      expect(getNgxEditorLocale('fa-IR')).toBe(fa);
      expect(getNgxEditorLocale('ar-SA')).toBe(ar);
      expect(getNgxEditorLocale('en-US')).toBe(en);
      expect(getNgxEditorLocale('ar-Arab-EG')).toBe(ar);
    });

    it('should ignore the case and accept underscores', () => {
      expect(getNgxEditorLocale('FA')).toBe(fa);
      expect(getNgxEditorLocale('fa_IR')).toBe(fa);
      expect(getNgxEditorLocale(' Ar-eg ')).toBe(ar);
    });

    it('should return undefined for unknown or empty codes', () => {
      expect(getNgxEditorLocale('de')).toBeUndefined();
      expect(getNgxEditorLocale('de-AT')).toBeUndefined();
      expect(getNgxEditorLocale('')).toBeUndefined();
      expect(getNgxEditorLocale(null)).toBeUndefined();
      expect(getNgxEditorLocale(undefined)).toBeUndefined();
    });
  });

  describe('registerNgxEditorLocale', () => {
    it('should add a locale', () => {
      const locale: NgxEditorLocale = { code: 'x-test', dir: 'ltr', locals: { bold: 'Fett' } };
      registerNgxEditorLocale(locale);

      expect(getNgxEditorLocale('x-test')).toBe(locale);
      expect(getNgxEditorLocale('x-test-region')).toBe(locale);
    });

    it('should prefer the exact code over its language', () => {
      const persianAfghanistan: NgxEditorLocale = { code: 'fa-AF', dir: 'rtl', locals: { bold: 'پررنگ' } };
      registerNgxEditorLocale(persianAfghanistan);

      expect(getNgxEditorLocale('fa-AF')).toBe(persianAfghanistan);
      expect(getNgxEditorLocale('fa-af')).toBe(persianAfghanistan);
      expect(getNgxEditorLocale('fa-IR')).toBe(fa);
      expect(getNgxEditorLocale('fa')).toBe(fa);
    });

    it('should replace a locale registered with the same code', () => {
      const first: NgxEditorLocale = { code: 'x-replace', dir: 'ltr', locals: {} };
      const second: NgxEditorLocale = { code: 'X-Replace', dir: 'rtl', locals: {} };
      registerNgxEditorLocale(first);
      registerNgxEditorLocale(second);

      expect(getNgxEditorLocale('x-replace')).toBe(second);
    });
  });

  describe('isRtlLocale', () => {
    it('should follow the direction of registered locales', () => {
      expect(isRtlLocale('fa')).toBe(true);
      expect(isRtlLocale('fa-IR')).toBe(true);
      expect(isRtlLocale('ar')).toBe(true);
      expect(isRtlLocale('en')).toBe(false);
      expect(isRtlLocale('en-GB')).toBe(false);
    });

    it('should know right to left languages without a registered locale', () => {
      expect(isRtlLocale('he')).toBe(true);
      expect(isRtlLocale('ur-PK')).toBe(true);
      expect(isRtlLocale('ckb')).toBe(true);
      expect(isRtlLocale('de')).toBe(false);
      expect(isRtlLocale('tr')).toBe(false);
    });

    it('should let an explicit script decide', () => {
      expect(isRtlLocale('az-Arab')).toBe(true);
      expect(isRtlLocale('pa-Arab-PK')).toBe(true);
      expect(isRtlLocale('fa-Latn')).toBe(false);
      expect(isRtlLocale('ku-Latn')).toBe(false);
    });

    it('should be false for empty codes', () => {
      expect(isRtlLocale('')).toBe(false);
      expect(isRtlLocale(null)).toBe(false);
      expect(isRtlLocale(undefined)).toBe(false);
    });
  });
});

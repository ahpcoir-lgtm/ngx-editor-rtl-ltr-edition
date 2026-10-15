import { ar } from './ar';
import { en } from './en';
import { fa } from './fa';
import type { NgxEditorLocale } from './types';

const englishKeys = Object.keys(en.locals).sort();

const missingKeys = (locale: NgxEditorLocale): string[] => englishKeys.filter((key) => !locale.locals[key]?.trim());

const unknownKeys = (locale: NgxEditorLocale): string[] => Object.keys(locale.locals)
  .filter((key) => !englishKeys.includes(key));

// every string has letters of the Arabic script; Latin parts such as `URL` are fine
const untranslatedKeys = (locale: NgxEditorLocale): string[] => englishKeys
  .filter((key) => !/[\u{0600}-\u{06FF}]/u.test(locale.locals[key] ?? ''));

const keysMatching = (locale: NgxEditorLocale, pattern: RegExp): string[] => Object.keys(locale.locals)
  .filter((key) => pattern.test(locale.locals[key] ?? ''));

describe('built-in locales', () => {
  it('should describe the English locale', () => {
    expect(en.code).toBe('en');
    expect(en.dir).toBe('ltr');
    expect(englishKeys.length).toBeGreaterThan(0);
  });

  it('should have a non-empty English string for every key', () => {
    expect(missingKeys(en)).toEqual([]);
  });

  it('should keep the English placeholder of ngx-editor', () => {
    expect(en.locals.placeholder).toBe('Type Here...');
  });

  describe.each<[string, NgxEditorLocale]>([
    ['fa', fa],
    ['ar', ar],
  ])('%s', (code, locale) => {
    it('should have its code and a right to left direction', () => {
      expect(locale.code).toBe(code);
      expect(locale.dir).toBe('rtl');
    });

    it('should translate every English key', () => {
      expect(missingKeys(locale)).toEqual([]);
    });

    it('should not have keys unknown to the English locale', () => {
      expect(unknownKeys(locale)).toEqual([]);
    });

    it('should not leave English strings untranslated', () => {
      expect(untranslatedKeys(locale)).toEqual([]);
    });
  });

  it('should use the Persian letters yeh and keheh in the Persian locale', () => {
    // Arabic yeh (U+064A), alef maksura (U+0649) and kaf (U+0643) look alike but break search and sorting
    expect(keysMatching(fa, /[\u{064A}\u{0649}\u{0643}]/u)).toEqual([]);
  });

  it('should use the Arabic letters yeh and kaf in the Arabic locale', () => {
    // Persian yeh (U+06CC) and keheh (U+06A9)
    expect(keysMatching(ar, /[\u{06CC}\u{06A9}]/u)).toEqual([]);
  });
});

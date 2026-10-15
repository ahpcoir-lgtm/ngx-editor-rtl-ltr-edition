import { ar } from './ar';
import { en } from './en';
import { fa } from './fa';
import type { NgxEditorLocale } from './types';

// languages and scripts written right to left, for codes without a registered locale
const RTL_LANGUAGES = new Set([
  'ar', 'arc', 'ckb', 'dv', 'fa', 'glk', 'he', 'iw', 'ji', 'ks', 'lrc', 'mzn', 'nqo', 'pnb', 'prs', 'ps', 'sd',
  'syr', 'ug', 'ur', 'yi',
]);
const RTL_SCRIPTS = new Set(['adlm', 'arab', 'aran', 'hebr', 'mand', 'mend', 'nkoo', 'rohg', 'samr', 'syrc', 'thaa']);

// `fa_IR` and `FA-ir` are the same tag as `fa-IR`
const normalize = (code: string): string => code.trim().replace(/_/g, '-').toLowerCase();

const registry = new Map<string, NgxEditorLocale>(
  [en, fa, ar].map((locale) => [normalize(locale.code), locale]),
);

/** Adds a locale, or replaces the one registered with the same code (built-in ones too). */
export const registerNgxEditorLocale = (locale: NgxEditorLocale): void => {
  registry.set(normalize(locale.code), locale);
};

/**
 * Finds the locale registered for the code, else for its prefixes: `fa-IR` falls back to `fa`.
 * Returns `undefined` for unknown codes.
 */
export const getNgxEditorLocale = (code: string | null | undefined): NgxEditorLocale | undefined => {
  if (!code) {
    return undefined;
  }

  const subtags = normalize(code).split('-');

  while (subtags.length > 0) {
    const locale = registry.get(subtags.join('-'));
    if (locale) {
      return locale;
    }
    subtags.pop();
  }

  return undefined;
};

/** Whether the code is written right to left: by its registered locale, its script subtag or its language. */
export const isRtlLocale = (code: string | null | undefined): boolean => {
  if (!code) {
    return false;
  }

  const subtags = normalize(code).split('-');

  const exact = registry.get(subtags.join('-'));
  if (exact) {
    return exact.dir === 'rtl';
  }

  // an explicit script decides over the language: `az-Arab` is rtl, `ku-Latn` is ltr
  const script = subtags.slice(1).find((subtag) => /^[a-z]{4}$/.test(subtag));
  if (script) {
    return RTL_SCRIPTS.has(script);
  }

  const locale = getNgxEditorLocale(code);
  if (locale) {
    return locale.dir === 'rtl';
  }

  return RTL_LANGUAGES.has(subtags[0]);
};

import { getPrimaryFontFamily } from 'ngx-editor-rtl-ltr-edition/utils';

import { NGX_EDITOR_FONTS } from './built-in';
import type { NgxEditorFont, NgxEditorFontsConfig, NgxEditorResolvedFonts } from './types';

export const DEFAULT_SELF_HOSTED_BASE_URL = '/assets/ngx-editor-fonts/';
export const DEFAULT_GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2';

const toFont = (font: NgxEditorFont | string): NgxEditorFont | undefined => {
  return typeof font === 'string' ? NGX_EDITOR_FONTS.find(({ id }) => id === font) : font;
};

// later fonts replace earlier ones with the same id, in the place of the earlier one
const mergeFonts = (fonts: NgxEditorFont[]): NgxEditorFont[] => {
  const byId = new Map<string, NgxEditorFont>();
  fonts.forEach((font) => byId.set(font.id, font));
  return Array.from(byId.values());
};

/**
 * The fonts of an editor: each option of the `Editor` (`instance`) wins over the global config, which wins over the
 * defaults. The list is the instance's, else the global one, else the built-in fonts; `extend` adds to it (the global
 * `extend` only when the instance has no list of its own).
 */
export const resolveFonts = (
  global?: NgxEditorFontsConfig | null,
  instance?: NgxEditorFontsConfig | null,
): NgxEditorResolvedFonts => {
  const globalConfig = global ?? {};
  const instanceConfig = instance ?? {};
  const pick = <K extends keyof NgxEditorFontsConfig>(key: K): NgxEditorFontsConfig[K] => {
    return instanceConfig[key] ?? globalConfig[key];
  };

  const list = pick('list') ?? NGX_EDITOR_FONTS;
  const extend = instanceConfig.list
    ? instanceConfig.extend ?? []
    : [...(globalConfig.extend ?? []), ...(instanceConfig.extend ?? [])];

  const fonts = mergeFonts([...list, ...extend]
    .map(toFont)
    .filter((font): font is NgxEditorFont => Boolean(font?.id && font.family)));

  return {
    fonts,
    loading: pick('loading') ?? 'google',
    selfHostedBaseUrl: pick('selfHostedBaseUrl') ?? DEFAULT_SELF_HOSTED_BASE_URL,
    googleFontsUrl: pick('googleFontsUrl') ?? DEFAULT_GOOGLE_FONTS_URL,
  };
};

/** the configured font of a `font-family` value, compared by the first family of the stacks */
export const findFont = (fonts: NgxEditorFont[], family: string | null | undefined): NgxEditorFont | undefined => {
  const primary = getPrimaryFontFamily(family);
  return primary ? fonts.find((font) => getPrimaryFontFamily(font.family) === primary) : undefined;
};

/** the label of a font for a locale code: the exact code, its language (`fa-IR` → `fa`), English, then any */
export const getFontLabel = (font: NgxEditorFont, locale?: string | null): string => {
  const { label } = font;

  if (typeof label === 'string') {
    return label;
  }

  const code = (locale ?? '').replace(/_/g, '-').toLowerCase();
  const entries = Object.entries(label).map(([key, value]) => [key.replace(/_/g, '-').toLowerCase(), value]);
  const find = (key: string): string | undefined => entries.find(([entry]) => entry === key)?.[1];

  return find(code) ?? find(code.split('-')[0]) ?? find('en') ?? entries[0]?.[1] ?? font.id;
};

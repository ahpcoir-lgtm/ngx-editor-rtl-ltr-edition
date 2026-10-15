/** how the fonts of the font menu are loaded */
export type NgxEditorFontLoading = 'google' | 'self-hosted' | 'none';

export type NgxEditorFontCategory = 'sans-serif' | 'serif' | 'display' | 'monospace' | 'handwriting';

export interface NgxEditorFontFile {
  /** `400`, or a range such as `'400 700'` for a variable font */
  weight: number | string;
  style?: 'normal' | 'italic';
  /** relative to `selfHostedBaseUrl`, unless it starts with `/` or a scheme */
  path: string;
  unicodeRange?: string;
}

export interface NgxEditorFont {
  id: string;
  /** the CSS `font-family` stack written into the document, e.g. `Vazirmatn, sans-serif` */
  family: string;
  /** the name in the font menu, one string or one per locale code (`en` is the fallback) */
  label: string | Record<string, string>;
  category?: NgxEditorFontCategory;
  /** loaded from Google Fonts with `loading: 'google'` */
  google?: { family: string; weights: number[] };
  /** loaded with `@font-face` rules with `loading: 'self-hosted'` */
  files?: NgxEditorFontFile[];
}

export interface NgxEditorFontsConfig {
  /** replaces the built-in fonts; a string is the id of a built-in font */
  list?: (NgxEditorFont | string)[];
  /** added after the list; a font with the id of a listed one replaces it, a string is the id of a built-in font */
  extend?: (NgxEditorFont | string)[];
  /** `google` (default): one stylesheet from Google Fonts; `self-hosted`: `@font-face` rules for the files of the
   * package; `none`: the app loads the fonts itself */
  loading?: NgxEditorFontLoading;
  /** where the files of the package are served, default `/assets/ngx-editor-fonts/` */
  selfHostedBaseUrl?: string;
  /** the Google Fonts css2 endpoint (or a mirror), default `https://fonts.googleapis.com/css2` */
  googleFontsUrl?: string;
}

/** the fonts configuration with the defaults applied */
export interface NgxEditorResolvedFonts {
  fonts: NgxEditorFont[];
  loading: NgxEditorFontLoading;
  selfHostedBaseUrl: string;
  googleFontsUrl: string;
}

import { NGX_EDITOR_FONTS, NGX_EDITOR_SYSTEM_FONTS, NGX_EDITOR_WEB_FONTS } from './built-in';
import { DEFAULT_GOOGLE_FONTS_URL, DEFAULT_SELF_HOSTED_BASE_URL, findFont, getFontLabel, resolveFonts } from './config';
import { buildFontFaceCss, buildGoogleFontsUrl, loadFonts } from './loader';
import type { NgxEditorFont, NgxEditorResolvedFonts } from './types';

const brand: NgxEditorFont = {
  id: 'brand',
  family: '\'Brand Sans\', sans-serif',
  label: 'Brand',
  google: { family: 'Brand Sans', weights: [700, 400, 400] },
  files: [{ weight: 400, path: 'brand/brand.woff2', unicodeRange: 'U+0000-00FF' }],
};

const ids = (config: NgxEditorResolvedFonts): string[] => config.fonts.map(({ id }) => id);

describe('fonts: built-in fonts', () => {
  it('should list the web fonts, then the system fonts', () => {
    expect(NGX_EDITOR_WEB_FONTS.length).toBe(13);
    expect(NGX_EDITOR_FONTS).toEqual([...NGX_EDITOR_WEB_FONTS, ...NGX_EDITOR_SYSTEM_FONTS]);
    expect(new Set(NGX_EDITOR_FONTS.map(({ id }) => id)).size).toBe(NGX_EDITOR_FONTS.length);
  });

  it('should have an English, Persian and Arabic name for every font', () => {
    NGX_EDITOR_FONTS.forEach((font) => {
      const label = font.label as Record<string, string>;
      expect(Object.keys(label).sort()).toEqual(['ar', 'en', 'fa']);
      // Persian with ی and ک, Arabic with ي and ك
      expect(label['fa']).toMatch(/^[؀-ۿ‌ ]+$/u);
      expect(label['fa']).not.toMatch(/[يك]/u);
      expect(label['ar']).toMatch(/^[؀-ۿ ]+$/u);
      expect(label['ar']).not.toMatch(/[یک]/u);
    });
  });

  it('should load the web fonts and not the system fonts', () => {
    NGX_EDITOR_WEB_FONTS.forEach((font) => {
      expect(font.google?.weights).toEqual([400, 700]);
      expect(font.files?.length).toBeGreaterThanOrEqual(2);
    });
    NGX_EDITOR_SYSTEM_FONTS.forEach((font) => {
      expect(font.google).toBeUndefined();
      expect(font.files).toBeUndefined();
    });
  });

  it('should use one file for both weights of a variable font', () => {
    const vazirmatn = NGX_EDITOR_FONTS.find(({ id }) => id === 'vazirmatn');
    expect(vazirmatn?.files?.map(({ weight, path }) => `${weight} ${path}`)).toEqual([
      '400 700 vazirmatn/vazirmatn-arabic.woff2',
      '400 700 vazirmatn/vazirmatn-latin.woff2',
    ]);

    const amiri = NGX_EDITOR_FONTS.find(({ id }) => id === 'amiri');
    expect(amiri?.files?.map(({ path }) => path)).toContain('amiri/amiri-700-arabic.woff2');
  });
});

describe('fonts: labels', () => {
  const [vazirmatn] = NGX_EDITOR_FONTS;

  it('should pick the label of the locale, its language or English', () => {
    expect(getFontLabel(vazirmatn, 'fa')).toBe('وزیرمتن');
    expect(getFontLabel(vazirmatn, 'fa-IR')).toBe('وزیرمتن');
    expect(getFontLabel(vazirmatn, 'ar_EG')).toBe('فزيرمتن');
    expect(getFontLabel(vazirmatn, 'de')).toBe('Vazirmatn');
    expect(getFontLabel(vazirmatn)).toBe('Vazirmatn');
  });

  it('should accept a plain string or a dictionary without English', () => {
    expect(getFontLabel(brand, 'fa')).toBe('Brand');
    expect(getFontLabel({ ...brand, label: { de: 'Marke' } }, 'fa')).toBe('Marke');
    expect(getFontLabel({ ...brand, label: {} }, 'fa')).toBe('brand');
  });
});

describe('fonts: config', () => {
  it('should default to the built-in fonts loaded from Google', () => {
    const config = resolveFonts();

    expect(config.fonts).toEqual(NGX_EDITOR_FONTS);
    expect(config.loading).toBe('google');
    expect(config.selfHostedBaseUrl).toBe(DEFAULT_SELF_HOSTED_BASE_URL);
    expect(config.googleFontsUrl).toBe(DEFAULT_GOOGLE_FONTS_URL);
  });

  it('should replace the list, with ids of built-in fonts', () => {
    expect(ids(resolveFonts({ list: ['amiri', brand, 'unknown', 'tahoma'] }))).toEqual(['amiri', 'brand', 'tahoma']);
  });

  it('should extend the list and replace a font with the same id', () => {
    const amiri = { ...brand, id: 'amiri', label: 'My Amiri' };
    const config = resolveFonts({ extend: [brand, amiri] });

    expect(ids(config).at(-1)).toBe('brand');
    expect(config.fonts.length).toBe(NGX_EDITOR_FONTS.length + 1);
    expect(config.fonts.find(({ id }) => id === 'amiri')?.label).toBe('My Amiri');
    expect(ids(config).indexOf('amiri')).toBe(3);
  });

  it('should prefer every option of the instance to the global config', () => {
    const config = resolveFonts(
      { list: ['amiri'], loading: 'none', selfHostedBaseUrl: '/global/', googleFontsUrl: 'https://global' },
      { list: ['tahoma'], loading: 'self-hosted', selfHostedBaseUrl: '/fonts/' },
    );

    expect(ids(config)).toEqual(['tahoma']);
    expect(config.loading).toBe('self-hosted');
    expect(config.selfHostedBaseUrl).toBe('/fonts/');
    expect(config.googleFontsUrl).toBe('https://global');
  });

  it('should apply the global extend only when the instance has no list', () => {
    expect(ids(resolveFonts({ list: ['amiri'], extend: [brand] }, { extend: ['tahoma'] })))
      .toEqual(['amiri', 'brand', 'tahoma']);
    expect(ids(resolveFonts({ list: ['amiri'], extend: [brand] }, { loading: 'none' }))).toEqual(['amiri', 'brand']);
    expect(ids(resolveFonts({ extend: [brand] }, { list: ['tahoma'] }))).toEqual(['tahoma']);
    expect(ids(resolveFonts({ list: ['amiri'] }, { extend: [brand] }))).toEqual(['amiri', 'brand']);
  });

  it('should find a configured font by the first family of a stack', () => {
    expect(findFont(NGX_EDITOR_FONTS, '"Noto Naskh Arabic", Georgia')?.id).toBe('noto-naskh-arabic');
    expect(findFont(NGX_EDITOR_FONTS, 'times new roman')?.id).toBe('times-new-roman');
    expect(findFont(NGX_EDITOR_FONTS, 'Calibri, sans-serif')).toBeUndefined();
    expect(findFont(NGX_EDITOR_FONTS, null)).toBeUndefined();
  });
});

describe('fonts: loader', () => {
  let doc: Document;

  const config = (overrides: Partial<NgxEditorResolvedFonts> = {}): NgxEditorResolvedFonts => ({
    ...resolveFonts(),
    ...overrides,
  });

  const injected = (): Element[] => Array.from(doc.head.querySelectorAll('[data-ngx-editor-fonts]'));

  beforeEach(() => {
    doc = document.implementation.createHTMLDocument('fonts');
  });

  it('should add one Google Fonts stylesheet once', () => {
    const link = loadFonts(doc, config()) as HTMLLinkElement;

    expect(link.tagName).toBe('LINK');
    expect(link.rel).toBe('stylesheet');
    expect(link.getAttribute('href')).toBe(`${DEFAULT_GOOGLE_FONTS_URL}?family=Vazirmatn:wght@400;700`
      + '&family=Noto+Sans+Arabic:wght@400;700&family=Noto+Naskh+Arabic:wght@400;700&family=Amiri:wght@400;700'
      + '&family=Cairo:wght@400;700&family=Tajawal:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@400;700'
      + '&family=Almarai:wght@400;700&family=Harmattan:wght@400;700&family=Lateef:wght@400;700'
      + '&family=Scheherazade+New:wght@400;700&family=El+Messiri:wght@400;700&family=Reem+Kufi:wght@400;700'
      + '&display=swap');

    expect(loadFonts(doc, config())).toBeNull();
    expect(injected().length).toBe(1);
  });

  it('should add only the fonts that are not loaded yet', () => {
    loadFonts(doc, config({ fonts: [NGX_EDITOR_FONTS[0]] }));
    const link = loadFonts(doc, config({ fonts: [NGX_EDITOR_FONTS[0], brand] })) as HTMLLinkElement;

    expect(link.getAttribute('href')).toBe(`${DEFAULT_GOOGLE_FONTS_URL}?family=Brand+Sans:wght@400;700&display=swap`);
    expect(injected().length).toBe(2);
  });

  it('should use a configured Google Fonts url and skip fonts without a Google family', () => {
    const link = loadFonts(doc, config({
      fonts: NGX_EDITOR_SYSTEM_FONTS.concat(brand),
      googleFontsUrl: 'https://fonts.example.com/css2?key=1',
    })) as HTMLLinkElement;

    expect(link.getAttribute('href')).toBe('https://fonts.example.com/css2?key=1&family=Brand+Sans:wght@400;700&display=swap');
    expect(buildGoogleFontsUrl(NGX_EDITOR_SYSTEM_FONTS, DEFAULT_GOOGLE_FONTS_URL)).toBeNull();
    expect(loadFonts(doc, config({ fonts: NGX_EDITOR_SYSTEM_FONTS }))).toBeNull();
  });

  it('should add @font-face rules for the self-hosted files once', () => {
    const style = loadFonts(doc, config({ loading: 'self-hosted' })) as HTMLStyleElement;
    const css = style.textContent ?? '';

    expect(style.tagName).toBe('STYLE');
    expect(css.match(/@font-face/g)?.length).toBe(NGX_EDITOR_WEB_FONTS.reduce((n, font) => n + (font.files?.length ?? 0), 0));
    expect(css).toContain([
      '@font-face {',
      '  font-family: "Vazirmatn";',
      '  font-style: normal;',
      '  font-weight: 400 700;',
      '  font-display: swap;',
      '  src: url("/assets/ngx-editor-fonts/vazirmatn/vazirmatn-arabic.woff2") format("woff2");',
      '  unicode-range: U+0600-06FF',
    ].join('\n'));
    expect(css).toContain('font-family: "Noto Naskh Arabic";');
    expect(css).toContain('font-weight: 700;\n  font-display: swap;\n  src: url("/assets/ngx-editor-fonts/amiri/amiri-700-latin.woff2")');
    expect(css).not.toContain('Tahoma');

    expect(loadFonts(doc, config({ loading: 'self-hosted' }))).toBeNull();
    expect(injected().length).toBe(1);
  });

  it('should resolve the file paths against the base url', () => {
    const files = [
      { weight: 400, path: './a.woff2' },
      { weight: 400, path: '/static/b.woff' },
      { weight: 400, path: 'https://cdn.example.com/c.ttf', style: 'italic' as const },
    ];
    const css = buildFontFaceCss([{ ...brand, files }], 'https://example.com/fonts');

    expect(css).toContain('src: url("https://example.com/fonts/a.woff2") format("woff2");');
    expect(css).toContain('src: url("/static/b.woff") format("woff");');
    expect(css).toContain('font-style: italic;');
    expect(css).toContain('src: url("https://cdn.example.com/c.ttf") format("truetype");');
    expect(css).toContain('font-family: "Brand Sans";');
  });

  it('should not write values that could leave the rule', () => {
    const css = buildFontFaceCss([{
      ...brand,
      files: [{ weight: '400"}', path: 'x".woff2', unicodeRange: 'U+0000; } body { color: red' }],
    }], '/');

    expect(css).toContain('font-weight: 400;');
    expect(css).toContain('src: url("/x\\".woff2") format("woff2");');
    expect(css).not.toContain('unicode-range');
  });

  it('should load the fonts again for another base url', () => {
    loadFonts(doc, config({ loading: 'self-hosted' }));
    expect(loadFonts(doc, config({ loading: 'self-hosted', selfHostedBaseUrl: '/other/' }))).not.toBeNull();
    expect(loadFonts(doc, config())).not.toBeNull();
    expect(injected().length).toBe(3);
  });

  it('should take the elements written by the server into account', () => {
    const link = doc.createElement('link');
    link.setAttribute('data-ngx-editor-fonts', NGX_EDITOR_FONTS.map(({ id }) => id).join(' '));
    link.setAttribute('data-ngx-editor-fonts-source', `google ${DEFAULT_GOOGLE_FONTS_URL}`);
    doc.head.appendChild(link);

    expect(loadFonts(doc, config())).toBeNull();
  });

  it('should add nothing with loading none or without a document', () => {
    expect(loadFonts(doc, config({ loading: 'none' }))).toBeNull();
    expect(loadFonts(null, config())).toBeNull();
    expect(injected().length).toBe(0);
  });
});

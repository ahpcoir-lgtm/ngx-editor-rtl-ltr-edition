import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

import { parseFontFamily } from 'ngx-editor-rtl-ltr-edition/utils';

import type { NgxEditorFont, NgxEditorFontFile, NgxEditorResolvedFonts } from './types';

// marks the elements written by the loader: the ids of their fonts, and the mode and url they were loaded with
const FONTS_ATTRIBUTE = 'data-ngx-editor-fonts';
const SOURCE_ATTRIBUTE = 'data-ngx-editor-fonts-source';

const FORMATS: Record<string, string> = {
  woff2: 'woff2',
  woff: 'woff',
  ttf: 'truetype',
  otf: 'opentype',
};

const cssString = (value: string): string => `"${value.replace(/[\\"]/g, '\\$&').replace(/[\n\r\f]/g, '')}"`;

const fileUrl = (baseUrl: string, path: string): string => {
  // an absolute path or a url with a scheme is used as it is
  if (/^(?:[a-z][a-z\d+.-]*:|\/)/i.test(path)) {
    return path;
  }

  return `${baseUrl.replace(/\/*$/, '/')}${path.replace(/^\.?\/+/, '')}`;
};

/** the Google Fonts css2 url for the fonts that have a `google` family, `null` when none has */
export const buildGoogleFontsUrl = (fonts: NgxEditorFont[], googleFontsUrl: string): string | null => {
  const families = fonts.flatMap(({ google }) => {
    if (!google?.family) {
      return [];
    }

    const family = encodeURIComponent(google.family).replace(/%20/g, '+');
    const weights = Array.from(new Set(google.weights ?? [])).sort((a, b) => a - b);
    return [`family=${family}${weights.length ? `:wght@${weights.join(';')}` : ''}`];
  });

  if (!families.length) {
    return null;
  }

  const separator = googleFontsUrl.includes('?') ? '&' : '?';
  return `${googleFontsUrl}${separator}${families.join('&')}&display=swap`;
};

const fontFace = (family: string, file: NgxEditorFontFile, baseUrl: string): string => {
  const url = fileUrl(baseUrl, file.path);
  const extension = /\.(?<extension>[a-z\d]+)(?:[?#].*)?$/i.exec(file.path)?.groups?.['extension']?.toLowerCase() ?? '';
  const format = FORMATS[extension] ? ` format(${cssString(FORMATS[extension])})` : '';
  const weight = String(file.weight).replace(/[^\d\s]/g, '').trim() || '400';

  const rules = [
    `font-family: ${cssString(family)};`,
    `font-style: ${file.style === 'italic' ? 'italic' : 'normal'};`,
    `font-weight: ${weight};`,
    'font-display: swap;',
    `src: url(${cssString(url)})${format};`,
  ];

  if (file.unicodeRange && /^[\sU+\dA-F?,-]+$/i.test(file.unicodeRange)) {
    rules.push(`unicode-range: ${file.unicodeRange};`);
  }

  return `@font-face {\n  ${rules.join('\n  ')}\n}`;
};

/** `@font-face` rules for the files of the fonts, with paths relative to `baseUrl` */
export const buildFontFaceCss = (fonts: NgxEditorFont[], baseUrl: string): string => {
  return fonts
    .flatMap((font) => {
      const [family] = parseFontFamily(font.family);
      return family ? (font.files ?? []).map((file) => fontFace(family, file, baseUrl)) : [];
    })
    .join('\n');
};

const needsLoading = (font: NgxEditorFont, config: NgxEditorResolvedFonts): boolean => {
  return config.loading === 'google' ? Boolean(font.google?.family) : Boolean(font.files?.length);
};

// the fonts already written into the document with the same mode and url, also by the server (SSR)
const loadedFonts = (doc: Document, source: string): Set<string> => {
  const ids = new Set<string>();

  doc.head.querySelectorAll(`[${FONTS_ATTRIBUTE}]`).forEach((element) => {
    if (element.getAttribute(SOURCE_ATTRIBUTE) === source) {
      (element.getAttribute(FONTS_ATTRIBUTE) ?? '').split(' ').filter(Boolean).forEach((id) => ids.add(id));
    }
  });

  return ids;
};

/**
 * Loads the fonts into the document once: `google` appends one `<link rel="stylesheet">`, `self-hosted` one `<style>`
 * with `@font-face` rules, `none` nothing. Fonts loaded before with the same mode and url are left out; the element is
 * returned, or `null` when nothing was added.
 */
export const loadFonts = (doc: Document | null | undefined, config: NgxEditorResolvedFonts): HTMLElement | null => {
  if (!doc?.head || config.loading === 'none') {
    return null;
  }

  const source = `${config.loading} ${config.loading === 'google' ? config.googleFontsUrl : config.selfHostedBaseUrl}`;
  const loaded = loadedFonts(doc, source);
  // a font id may not contain the separator of the attribute
  const fonts = config.fonts.filter((font) => needsLoading(font, config) && !/\s/.test(font.id) && !loaded.has(font.id));

  if (!fonts.length) {
    return null;
  }

  let element: HTMLElement;

  if (config.loading === 'google') {
    const href = buildGoogleFontsUrl(fonts, config.googleFontsUrl);

    if (!href) {
      return null;
    }

    const link = doc.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    element = link;
  } else {
    const style = doc.createElement('style');
    style.textContent = buildFontFaceCss(fonts, config.selfHostedBaseUrl);
    element = style;
  }

  element.setAttribute(FONTS_ATTRIBUTE, fonts.map(({ id }) => id).join(' '));
  element.setAttribute(SOURCE_ATTRIBUTE, source);
  doc.head.appendChild(element);

  return element;
};

/** loads fonts into the document of the app; on the server they are written into the rendered page */
@Injectable({
  providedIn: 'root',
})
export class NgxEditorFontLoader {
  private document = inject(DOCUMENT, { optional: true });

  load(config: NgxEditorResolvedFonts): HTMLElement | null {
    return loadFonts(this.document, config);
  }
}

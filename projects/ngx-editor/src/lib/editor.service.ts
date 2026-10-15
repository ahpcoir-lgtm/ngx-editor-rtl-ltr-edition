import { Injectable, inject } from '@angular/core';
import { take } from 'rxjs/operators';
import { NgxEditorLocale, getNgxEditorLocale } from 'ngx-editor-rtl-ltr-edition/locales';

import { NgxEditorConfig, NgxEditorDirection } from './types';
import Locals from './Locals';
import { NgxEditorServiceConfig } from './editor-config.service';
import Icon from './icons';
import { HTML } from './trustedTypesUtil';
import type Editor from './Editor';
import { resolveFonts } from './fonts/config';
import type { NgxEditorResolvedFonts } from './fonts/types';
import { resolveImageConfig } from './images/config';
import type { NgxEditorResolvedImageConfig } from './images/types';

@Injectable({
  providedIn: 'root',
})
export class NgxEditorService {
  config = inject(NgxEditorServiceConfig, { optional: true });

  /** the configured locale, `undefined` when none is configured or its code is not registered */
  get locale(): NgxEditorLocale | undefined {
    return getNgxEditorLocale(this.config?.locale);
  }

  // English defaults <- the configured locale <- the `locals` overrides
  get locals(): Locals {
    return new Locals({ ...this.locale?.locals, ...this.config?.locals });
  }

  /** the configured direction, else the locale's; `null` leaves the direction to the page */
  get dir(): NgxEditorDirection | null {
    return this.config?.dir ?? this.locale?.dir ?? null;
  }

  /** the fonts of an editor: its `fonts` option over the global config over the built-in fonts */
  getFonts(editor?: Editor | null): NgxEditorResolvedFonts {
    return resolveFonts(this.config?.fonts, editor?.config.fonts);
  }

  /** the image options of an editor: its `image` option over the global config over the defaults */
  getImageConfig(editor?: Editor | null): NgxEditorResolvedImageConfig {
    return resolveImageConfig(this.config?.image, editor?.config.image);
  }

  /** the string of a locale key now (an observable override that has not emitted yet gives the English string) */
  translate(key: string): string {
    let text = '';
    this.locals.get(key).pipe(take(1)).subscribe((value) => {
      text = value;
    }).unsubscribe();

    return text;
  }

  getIcon(icon: string): HTML {
    return this.config.icons[icon] ? this.config.icons[icon] : Icon.get(icon);
  }
}

export const provideMyServiceOptions = (config?: NgxEditorConfig): NgxEditorServiceConfig => {
  return {
    locals: config?.locals ?? {},
    icons: config?.icons ?? {},
    locale: config?.locale,
    dir: config?.dir,
    fonts: config?.fonts,
    image: config?.image,
  };
};

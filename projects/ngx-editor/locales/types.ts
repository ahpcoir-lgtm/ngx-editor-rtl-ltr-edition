import type { NgxEditorLocals } from './en';

export interface NgxEditorLocale {
  /** language tag, such as `fa` or `fa-IR` */
  code: string;
  dir: 'ltr' | 'rtl';
  /** keys missing here fall back to the English strings */
  locals: Partial<NgxEditorLocals> & Record<string, string>;
}

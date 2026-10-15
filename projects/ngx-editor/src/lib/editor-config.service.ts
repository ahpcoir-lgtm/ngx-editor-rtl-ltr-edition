import { Injectable } from '@angular/core';

import type { NgxEditorFontsConfig } from './fonts/types';
import type { NgxEditorImageConfig } from './images/types';
import type { NgxEditorVideoConfig } from './video/types';
import { NgxEditorDirection } from './types';

@Injectable({
  providedIn: 'root',
})
export class NgxEditorServiceConfig {
  public locals = {};
  public icons = {};
  public locale?: string;
  public dir?: NgxEditorDirection;
  public fonts?: NgxEditorFontsConfig;
  public image?: NgxEditorImageConfig;
  public video?: NgxEditorVideoConfig;
}

import { Injectable } from '@angular/core';

import { NgxEditorDirection } from './types';

@Injectable({
  providedIn: 'root',
})
export class NgxEditorServiceConfig {
  public locals = {};
  public icons = {};
  public locale?: string;
  public dir?: NgxEditorDirection;
}

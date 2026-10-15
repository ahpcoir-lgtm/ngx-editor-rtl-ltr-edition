import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';

import { NgxEditorServiceConfig } from './editor-config.service';
import { NgxEditorService, provideMyServiceOptions } from './editor.service';
import { NgxEditorConfig } from './types';

export const NGX_EDITOR_CONFIG_TOKEN = new InjectionToken<NgxEditorConfig>('NgxEditorConfig');

/**
 * Configures the editor in standalone apps, like `NgxEditorModule.forRoot(config)` does for NgModules:
 * `bootstrapApplication(App, { providers: [provideNgxEditorConfig({ locale: 'fa' })] })`.
 * In the `providers` of a route it configures the editors of that route.
 */
export const provideNgxEditorConfig = (config: NgxEditorConfig = {}): EnvironmentProviders => {
  return makeEnvironmentProviders([
    {
      provide: NGX_EDITOR_CONFIG_TOKEN,
      useValue: config,
    },
    {
      provide: NgxEditorServiceConfig,
      useFactory: provideMyServiceOptions,
      deps: [NGX_EDITOR_CONFIG_TOKEN],
    },
    // the root service would read the root config, so a route gets its own instance
    NgxEditorService,
  ]);
};

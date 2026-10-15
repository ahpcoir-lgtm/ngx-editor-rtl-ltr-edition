import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';

import { defaults as defaultLocals } from './Locals';
import { NgxEditorConfig } from './types';

import { NgxEditorServiceConfig } from './editor-config.service';
import { NgxEditorComponent } from './editor.component';
import { NgxEditorService, provideMyServiceOptions } from './editor.service';
import { MenuModule } from './modules/menu/menu.module';
import { NGX_EDITOR_CONFIG_TOKEN } from './provide-config';

import { ImageViewComponent } from './components/image-view/image-view.component';
import { NgxEditorFloatingMenuComponent } from './modules/menu/floating-menu/floating-menu.component';
import { NgxEditorMenuComponent } from './modules/menu/menu.component';

// defined next to `provideNgxEditorConfig`, exported here as before
export { NGX_EDITOR_CONFIG_TOKEN };

const defaultConfig: NgxEditorConfig = {
  locals: defaultLocals,
  icons: {},
};

@NgModule({
  imports: [
    CommonModule,
    MenuModule,
    NgxEditorComponent,
    ImageViewComponent,
  ],
  providers: [],
  exports: [
    NgxEditorComponent,
    NgxEditorMenuComponent,
    NgxEditorFloatingMenuComponent,
  ],
})
export class NgxEditorModule {
  static forRoot(config: NgxEditorConfig = defaultConfig): ModuleWithProviders<NgxEditorModule> {
    return {
      ngModule: NgxEditorModule,
      providers: [
        {
          provide: NGX_EDITOR_CONFIG_TOKEN,
          useValue: config,
        },
        {
          provide: NgxEditorServiceConfig,
          useFactory: provideMyServiceOptions,
          deps: [NGX_EDITOR_CONFIG_TOKEN],
        },
      ],
    };
  }

  static forChild(config: NgxEditorConfig = defaultConfig): ModuleWithProviders<NgxEditorModule> {
    return {
      ngModule: NgxEditorModule,
      providers: [
        {
          provide: NGX_EDITOR_CONFIG_TOKEN,
          useValue: config,
        },
        {
          provide: NgxEditorServiceConfig,
          useFactory: provideMyServiceOptions,
          deps: [NGX_EDITOR_CONFIG_TOKEN],
        },
        NgxEditorService,
      ],
    };
  }
}

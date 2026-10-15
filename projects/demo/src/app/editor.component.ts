import { Component, OnDestroy, OnInit, ViewEncapsulation, isDevMode, ChangeDetectionStrategy, inject } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
  DEFAULT_TOOLBAR,
  Editor,
  NgxEditorComponent,
  NgxEditorFloatingMenuComponent,
  NgxEditorMenuComponent,
  NgxEditorService,
  Toolbar,
  Validators,
} from 'ngx-editor-rtl-ltr-edition';

import { AppCustomMenuComponent } from './components/custom-menu/custom-menu.component';
import jsonDoc from './doc';
import nodeViews from './nodeviews';
import schema from './schema';

// `auto` is the `autoDirection` option: each paragraph follows its first strong character
export type DemoDirection = 'ltr' | 'rtl' | 'auto';
export type DemoLocale = 'en' | 'fa' | 'ar';

const TOOLBAR: Toolbar = [
  ...DEFAULT_TOOLBAR,
  ['align_start', 'align_end'],
  ['dir_ltr', 'dir_rtl', 'dir_auto'],
  ['indent', 'outdent'],
];

@Component({
  selector: 'app-editor',
  templateUrl: 'editor.component.html',
  styleUrls: ['editor.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    NgxEditorComponent,
    NgxEditorMenuComponent,
    NgxEditorFloatingMenuComponent,
    AppCustomMenuComponent,
  ],
})
export class EditorComponent implements OnInit, OnDestroy {
  private ngxeService = inject(NgxEditorService);

  isDevMode = isDevMode();
  editordoc = jsonDoc;
  editor: Editor;
  toolbar: Toolbar = TOOLBAR;

  direction: DemoDirection = 'auto';
  locale: DemoLocale = 'en';

  readonly directions: { value: DemoDirection; label: string }[] = [
    { value: 'ltr', label: 'LTR' },
    { value: 'rtl', label: 'RTL' },
    { value: 'auto', label: 'Auto per paragraph' },
  ];

  readonly locales: { value: DemoLocale; label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'fa', label: 'فارسی' },
    { value: 'ar', label: 'العربية' },
  ];

  form = new FormGroup({
    editorContent: new FormControl({ value: jsonDoc, disabled: false }, Validators.required(schema)),
  });

  get doc(): AbstractControl {
    return this.form.get('editorContent');
  }

  // the `[dir]` of the editor; with `auto` the surface keeps the direction of the locale
  get editorDir(): 'ltr' | 'rtl' | null {
    return this.direction === 'auto' ? null : this.direction;
  }

  toggleDisabled(): void {
    if (this.doc.disabled) {
      this.doc.enable();
    } else {
      this.doc.disable();
    }
  }

  setDirection(direction: DemoDirection): void {
    const autoDirectionChanged = (direction === 'auto') !== (this.direction === 'auto');
    this.direction = direction;

    // `autoDirection` is an option of the editor, so the editor is created again
    if (autoDirectionChanged) {
      this.createEditor();
    }
  }

  setLocale(locale: DemoLocale): void {
    this.locale = locale;

    // apps set the locale once with `provideNgxEditorConfig({ locale })`; the demo switches it at runtime,
    // and creates the editor again for the placeholder
    this.ngxeService.config.locale = locale;
    this.createEditor();
  }

  private createEditor(): void {
    this.editor?.destroy();

    this.editor = new Editor({
      schema,
      nodeViews,
      history: true,
      keyboardShortcuts: true,
      inputRules: true,
      attributes: { enterkeyhint: 'enter' },
      autoDirection: this.direction === 'auto',
      features: {
        linkOnPaste: true,
        resizeImage: true,
        directionShortcuts: true,
      },
    });
  }

  ngOnInit(): void {
    this.createEditor();
  }

  ngOnDestroy(): void {
    this.editor.destroy();
  }
}

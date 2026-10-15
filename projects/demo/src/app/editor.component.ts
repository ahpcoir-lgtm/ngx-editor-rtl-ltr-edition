import {
  Component, OnDestroy, OnInit, ViewEncapsulation, isDevMode, ChangeDetectionStrategy, inject, signal,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { AbstractControl, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
  DEFAULT_TOOLBAR,
  Editor,
  NgxEditorComponent,
  NgxEditorFloatingMenuComponent,
  NgxEditorMenuComponent,
  NgxEditorEvent,
  NgxEditorService,
  NgxEditorUploadContext,
  NgxEditorUploadResult,
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

const describeEvent = (event: NgxEditorEvent): string => {
  switch (event.type) {
    case 'imageUploadProgress':
      return `${event.type}: ${event.file.name} ${event.percent}%`;
    case 'imageUploaded':
      return `${event.type}: ${event.file.name}${event.embedded ? ' (embedded)' : ''}`;
    case 'imageUploadError':
      return `${event.type}: ${event.error.code}, ${event.error.message}`;
    case 'imageUploadWarning':
      return `${event.type}: ${event.warning.message}`;
    default:
      return `${event.type}: ${event.file.name}`;
  }
};

// a stand-in for a real upload: reports progress for a second and resolves to an object url of the file
const simulateUpload = (file: File, ctx: NgxEditorUploadContext, fail: boolean): Promise<NgxEditorUploadResult> => {
  return new Promise((resolve, reject) => {
    let percent = 0;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      percent += 20;
      ctx.onProgress(percent);

      if (percent < 100) {
        timer = setTimeout(tick, 200);
      } else if (fail) {
        reject(new Error('The demo server refused the upload'));
      } else {
        resolve({ src: URL.createObjectURL(file), alt: file.name.replace(/\.[^.]+$/, '') });
      }
    };

    timer = setTimeout(tick, 200);
    ctx.signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('The upload was cancelled', 'AbortError'));
    });
  });
};

const TOOLBAR: Toolbar = [
  ...DEFAULT_TOOLBAR,
  ['align_start', 'align_end'],
  ['dir_ltr', 'dir_rtl', 'dir_auto'],
  ['indent', 'outdent'],
  ['font_family'],
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
  failUploads = false;
  readonly eventLog = signal<string[]>([]);
  private eventsSubscription: Subscription | null = null;
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

  clearEventLog(): void {
    this.eventLog.set([]);
  }

  private createEditor(): void {
    this.eventsSubscription?.unsubscribe();
    this.editor?.destroy();

    this.editor = new Editor({
      schema,
      nodeViews,
      history: true,
      keyboardShortcuts: true,
      inputRules: true,
      attributes: { enterkeyhint: 'enter' },
      autoDirection: this.direction === 'auto',
      // the font files of the package, copied to /assets/ngx-editor-fonts/ by the asset glob in angular.json
      fonts: { loading: 'self-hosted' },
      // uploads are simulated; a real app sends the file to its server and resolves to the url
      image: {
        uploadHandler: (file, ctx) => simulateUpload(file, ctx, this.failUploads),
        maxSize: 5 * 1024 * 1024,
        resize: { maxWidth: 1600, maxHeight: 1600 },
      },
      features: {
        linkOnPaste: true,
        resizeImage: true,
        directionShortcuts: true,
      },
    });

    this.eventsSubscription = this.editor.events.subscribe((event) => {
      this.eventLog.update((log) => [describeEvent(event), ...log].slice(0, 8));
    });
  }

  ngOnInit(): void {
    this.createEditor();
  }

  ngOnDestroy(): void {
    this.eventsSubscription?.unsubscribe();
    this.editor.destroy();
  }
}

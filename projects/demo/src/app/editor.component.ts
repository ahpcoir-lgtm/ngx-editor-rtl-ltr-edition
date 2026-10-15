import {
  Component, OnDestroy, OnInit, ViewEncapsulation, ChangeDetectionStrategy, inject, signal,
} from '@angular/core';
import { PlatformLocation } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { AbstractControl, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
  Editor,
  NgxEditorComponent,
  NgxEditorFloatingMenuComponent,
  NgxEditorMenuComponent,
  NgxEditorEvent,
  NgxEditorService,
  NgxEditorUploadContext,
  NgxEditorUploadResult,
  TABLE_DROPDOWN_ITEMS,
  Toolbar,
  Validators,
  toHTML,
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
    case 'videoUploadProgress':
      return `${event.type}: ${event.file.name} ${event.percent}%`;
    case 'videoUploadError':
      return `${event.type}: ${event.error.code}, ${event.error.message}`;
    default:
      return `${event.type}: ${event.file.name}`;
  }
};

// a stand-in for a real upload: reports progress for a second and resolves to `result` (an object url of the file)
const simulateUpload = <T>(ctx: NgxEditorUploadContext, fail: boolean, result: () => T): Promise<T> => {
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
        resolve(result());
      }
    };

    timer = setTimeout(tick, 200);
    ctx.signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('The upload was cancelled', 'AbortError'));
    });
  });
};

// every toolbar item of the library, the ones added by this fork included
const TOOLBAR: Toolbar = [
  ['undo', 'redo'],
  ['bold', 'italic', 'underline', 'strike'],
  ['code', 'blockquote'],
  ['superscript', 'subscript'],
  ['ordered_list', 'bullet_list', 'task_list'],
  [{ heading: ['paragraph', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }],
  ['font_family'],
  ['link', 'image', 'video'],
  ['table', { table: TABLE_DROPDOWN_ITEMS }],
  ['text_color', 'background_color'],
  ['align_start', 'align_center', 'align_end', 'align_justify'],
  ['align_left', 'align_right'],
  ['dir_ltr', 'dir_rtl', 'dir_auto'],
  ['indent', 'outdent'],
  ['horizontal_rule', 'format_clear'],
];

export const REPOSITORY_URL = 'https://github.com/ahpcoir-lgtm/ngx-editor-rtl-ltr-edition';
export const UPSTREAM_URL = 'https://github.com/sibiraj-s/ngx-editor';

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
  private sanitizer = inject(DomSanitizer);

  // the font files are served from <base href>assets/ngx-editor-fonts/, also on GitHub Pages (a sub path)
  private fontsBaseUrl = `${(inject(PlatformLocation).getBaseHrefFromDOM() || '/').replace(/\/?$/, '/')}assets/ngx-editor-fonts/`;

  readonly repositoryUrl = REPOSITORY_URL;
  readonly upstreamUrl = UPSTREAM_URL;
  editordoc = jsonDoc;
  editor: Editor;
  toolbar: Toolbar = TOOLBAR;

  direction: DemoDirection = 'auto';
  failUploads = false;
  readonly eventLog = signal<string[]>([]);
  private eventsSubscription: Subscription | null = null;
  private valueSubscription: Subscription | null = null;

  /** `toHTML()` of the document, as an app would store it */
  readonly html = signal('');
  /** the same html for the rendered preview (see `updateHtml`) */
  readonly previewHtml = signal<SafeHtml>('');
  readonly outputView = signal<'preview' | 'source'>('preview');
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

  private updateHtml(value: Record<string, unknown> | string | null): void {
    if (!value) {
      this.html.set('');
      this.previewHtml.set('');
      return;
    }

    const html = typeof value === 'string' ? value : toHTML(value, schema, { autoDirection: this.direction === 'auto' });
    this.html.set(html);
    // Angular's [innerHTML] sanitizer removes style attributes and iframes, which carry the alignment, the
    // fonts and the videos. The demo trusts this html because the schema's serializer wrote it, from a document
    // the viewer edited in this tab (every url passed sanitizeUrl). An app that shows html written by other
    // users must sanitize it on the server (and may use a sanitizer such as DOMPurify) before rendering it.
    this.previewHtml.set(this.sanitizer.bypassSecurityTrustHtml(html));
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
      fonts: { loading: 'self-hosted', selfHostedBaseUrl: this.fontsBaseUrl },
      // uploads are simulated; a real app sends the file to its server and resolves to the url
      image: {
        uploadHandler: (file, ctx) => simulateUpload<NgxEditorUploadResult>(ctx, this.failUploads, () => ({
          src: URL.createObjectURL(file),
          alt: file.name.replace(/.[^.]+$/, ''),
        })),
        maxSize: 5 * 1024 * 1024,
        resize: { maxWidth: 1600, maxHeight: 1600 },
      },
      // YouTube (privacy mode), Vimeo and Aparat links are embedded; video files are "uploaded" as object urls
      video: {
        uploadHandler: (file, ctx) => simulateUpload(ctx, this.failUploads, () => URL.createObjectURL(file)),
        maxSize: 200 * 1024 * 1024,
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

    // the form control keeps the document while the editor is created again
    this.updateHtml(this.doc.value);
  }

  ngOnInit(): void {
    this.valueSubscription = this.doc.valueChanges.subscribe((value: Record<string, unknown> | string | null) => this.updateHtml(value));
    this.createEditor();
  }

  ngOnDestroy(): void {
    this.eventsSubscription?.unsubscribe();
    this.valueSubscription?.unsubscribe();
    this.editor.destroy();
  }
}

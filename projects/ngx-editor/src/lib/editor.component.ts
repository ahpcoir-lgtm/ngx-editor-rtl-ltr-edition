import {
  Component,
  HostBinding,
  ElementRef,
  forwardRef,
  Injector,
  OnChanges,
  OnDestroy,
  OnInit,
  Renderer2,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation,
  ChangeDetectionStrategy,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { isNil, NgxEditorError } from 'ngx-editor-rtl-ltr-edition/utils';
import Editor, { configureEditorContext, isFormWrite, writeFormValue } from './Editor';
import { NgxEditorService } from './editor.service';
import { NgxEditorFontLoader } from './fonts/loader';
import { emptyDoc, toHTML } from './parsers';
import * as plugins from './plugins';
import { getEditorDirection, setEditorDirection } from './plugins/direction';
import { normalizeDirection, resolveDirection } from './resolve-direction';
import { HTML, isHtml } from './trustedTypesUtil';
import { NgxEditorDirection } from './types';

@Component({
  selector: 'ngx-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NgxEditorComponent),
      multi: true,
    },
  ],
  // `Default` instead of `Eager`: the Angular 19-21 linker only knows `Default` (both mean check-always)
  changeDetection: ChangeDetectionStrategy.Default,
  encapsulation: ViewEncapsulation.None,
})
export class NgxEditorComponent implements ControlValueAccessor, OnInit, OnChanges, OnDestroy {
  private renderer = inject(Renderer2);
  private injector = inject(Injector);
  private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private ngxeService = inject(NgxEditorService);
  private fontLoader = inject(NgxEditorFontLoader);

  @ViewChild('ngxEditor', { static: true }) private ngxEditor: ElementRef;

  readonly editor = input<Editor>(undefined);
  // when not bound, the `placeholder` string of the locale is shown
  readonly placeholder = input<string | undefined>(undefined);

  // Direction of the editor surface; else the editor's `dir` option, the global `dir` or the locale's direction.
  // `null` writes no `dir`. Accepts any string, like the native `dir` property this input replaced.
  readonly dir = input<NgxEditorDirection | null | undefined, string | null | undefined>(undefined, {
    transform: normalizeDirection,
  });

  // a bound `[dir]` also reaches the host, as the native property did, so projected menus and popups follow it
  @HostBinding('attr.dir') get hostDir(): NgxEditorDirection | null {
    return this.dir() ?? null;
  }

  readonly outputFormat = input<'doc' | 'html'>(undefined);
  // inferred from the first html value when no format is given
  private format = linkedSignal(() => this.outputFormat());

  readonly focusOut = output<void>();
  readonly focusIn = output<void>();

  private unsubscribe = new Subject<void>();
  // once [placeholder] is bound its value wins over the locale's, even when it is undefined (as upstream)
  private placeholderBound = false;
  private localePlaceholder = '';
  private localePlaceholderSubscription: Subscription | null = null;
  private pluginsRegistered = false;
  private fontsLoaded = false;
  private initialValueSet = false;
  private onChange: (value: Record<string, unknown> | string) => void = () => { /** */ };
  private onTouched: () => void = () => { /** */ };

  writeValue(value: Record<string, unknown> | HTML | null): void {
    if (!this.format() && isHtml(value)) {
      this.format.set('html');
    }

    // the initial value should not be undoable, else undo clears the editor.
    // ngModel writes null before the actual value, so the first non-null value is the initial value
    writeFormValue(this.editor(), value ?? emptyDoc, { addToHistory: this.initialValueSet });

    if (!isNil(value)) {
      this.initialValueSet = true;
    }
  }

  registerOnChange(fn: () => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.setMeta('UPDATE_EDITABLE', !isDisabled);
    this.renderer.setProperty(this.elementRef.nativeElement, 'disabled', isDisabled);
  }

  private handleChange(jsonDoc: Record<string, unknown>): void {
    // values written by the form are not reported back as changes, else the control is marked dirty
    if (isFormWrite(jsonDoc)) {
      return;
    }

    if (this.format() === 'html') {
      const editor = this.editor();
      const html = toHTML(jsonDoc, editor.schema, { autoDirection: editor.config.autoDirection });
      this.onChange(html);
      return;
    }

    this.onChange(jsonDoc);
  }

  private setMeta(key: string, value: unknown): void {
    const { dispatch, state: { tr } } = this.editor().view;
    dispatch(tr.setMeta(key, value));
  }

  // writes the resolved direction on the editor surface
  private updateDirection(): void {
    const { state } = this.editor().view;
    const dir = resolveDirection(this.dir(), this.editor(), this.ngxeService);
    const current = getEditorDirection(state);

    if (current && current.dir !== dir) {
      this.editor().view.dispatch(setEditorDirection(state.tr, { dir }));
    }
  }

  private setPlaceholder(placeholder: string): void {
    this.setMeta('UPDATE_PLACEHOLDER', placeholder);
  }

  private get placeholderText(): string {
    return this.placeholderBound ? this.placeholder() ?? '' : this.localePlaceholder;
  }

  // the locale's string can be an observable (a `locals` override), so it is followed until [placeholder] is bound
  private watchLocalePlaceholder(): void {
    this.localePlaceholderSubscription = this.ngxeService.locals.get('placeholder').subscribe((text) => {
      this.localePlaceholder = text;

      // before the plugin is registered, `registerPlugins` reads the value
      if (this.pluginsRegistered) {
        this.setPlaceholder(text);
      }
    });
  }

  private stopWatchingLocalePlaceholder(): void {
    this.localePlaceholderSubscription?.unsubscribe();
    this.localePlaceholderSubscription = null;
  }

  private registerPlugins(): void {
    this.editor().registerPlugin(plugins.editable());
    this.editor().registerPlugin(plugins.placeholder(this.placeholderText));

    this.editor().registerPlugin(plugins.attributes({ class: 'NgxEditor__Content' }));

    this.editor().registerPlugin(plugins.focus(() => {
      this.focusIn.emit();
    }));

    this.editor().registerPlugin(plugins.blur(() => {
      this.focusOut.emit();
      this.onTouched();
    }));

    const editor = this.editor();
    if (editor.features.resizeImage) {
      editor.registerPlugin(plugins.imageResize(this.injector));
    }

    if (editor.schema.nodes['video'] && editor.features.videoView) {
      editor.registerPlugin(plugins.videoView(this.injector));
    }

    if (editor.features.linkOnPaste) {
      editor.registerPlugin(plugins.linkify());
    }

    editor.registerPlugin(plugins.fontFamilyPaste(() => this.ngxeService.getFonts(editor).fonts));
  }

  // the fonts are loaded once the document uses one, also without a font menu
  private loadFontsInUse(): void {
    const { doc, schema } = this.editor().view.state;
    const type = schema.marks['font_family'];

    if (this.fontsLoaded || !type || !doc.rangeHasMark(0, doc.content.size, type)) {
      return;
    }

    this.fontsLoaded = true;
    this.fontLoader.load(this.ngxeService.getFonts(this.editor()));
  }

  ngOnInit(): void {
    const editor = this.editor();
    if (!editor) {
      throw new NgxEditorError('Required editor instance for initializing editor component');
    }

    if (!this.placeholderBound) {
      this.watchLocalePlaceholder();
    }

    configureEditorContext(editor, {
      image: this.ngxeService.config?.image,
      video: this.ngxeService.config?.video,
      translate: (key) => this.ngxeService.translate(key),
    });

    this.registerPlugins();
    this.pluginsRegistered = true;
    this.updateDirection();

    this.renderer.appendChild(this.ngxEditor.nativeElement, editor.view.dom);

    this.loadFontsInUse();

    editor.valueChanges.pipe(takeUntil(this.unsubscribe)).subscribe((jsonDoc) => {
      this.loadFontsInUse();
      this.handleChange(jsonDoc);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dir'] && this.pluginsRegistered) {
      this.updateDirection();
    }

    if (changes['placeholder']) {
      this.placeholderBound = true;
      this.stopWatchingLocalePlaceholder();

      // the value bound before init reaches the plugin when it is registered
      if (this.pluginsRegistered) {
        this.setPlaceholder(this.placeholderText);
      }
    }
  }

  ngOnDestroy(): void {
    this.stopWatchingLocalePlaceholder();
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }
}

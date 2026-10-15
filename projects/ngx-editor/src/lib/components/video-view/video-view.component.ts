import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, ElementRef, HostBinding, ViewChild, computed, inject, input, model, output,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { EditorView } from 'prosemirror-view';
import { Observable, map, of } from 'rxjs';

import { type VideoProvider, getVideoProvider, sanitizeUrl } from 'ngx-editor-rtl-ltr-edition/utils';
import { DEFAULT_VIDEO_RATIO, type ImageAlign, normalizeVideoRatio } from 'ngx-editor-rtl-ltr-edition/schema';

import { NgxEditorService } from '../../editor.service';
import { formatMessage } from '../../images/upload-utils';
import { isMirroredIcon } from '../../modules/menu/mirrored-icons';
import { SanitizeHtmlPipe } from '../../pipes/sanitize/sanitize-html.pipe';
import { HTML } from '../../trustedTypesUtil';
import { getVideoUrlError, resolveVideoConfig } from '../../video/config';
import type { NgxEditorResolvedVideoConfig } from '../../video/types';
import { computeResizeWidth } from '../image-view/image-view.component';

/** what the video toolbar asks the node view to do */
export type VideoViewAction =
  | { type: 'align'; align: ImageAlign | null }
  | { type: 'width'; width: string | null }
  | { type: 'caption'; caption: string | null }
  | { type: 'replaceUrl'; url: string }
  | { type: 'replaceFile'; file: File }
  | { type: 'delete' };

type VideoViewPanel = 'caption' | 'replace';

/** the width presets of the toolbar; 100% is the full width (no `width`) */
export const VIDEO_WIDTH_PRESETS = ['25%', '50%', '75%', '100%'];

const MIN_PERCENT = 10;
const KEYBOARD_STEP = 5;

/** the width in percent of the editor for a width in pixels, between 10 and 100 */
export const toWidthPercent = (width: number, editorWidth: number): number => {
  const percent = editorWidth > 0 ? (width / editorWidth) * 100 : 100;
  return Math.round(Math.max(MIN_PERCENT, Math.min(100, percent)));
};

const PROVIDER_KEYS: Record<VideoProvider, string> = {
  youtube: 'videoProviderYoutube',
  vimeo: 'videoProviderVimeo',
  aparat: 'videoProviderAparat',
  custom: 'videoProviderCustom',
};

interface ToolbarButton {
  key: string;
  label: Observable<string>;
  icon?: string;
  text?: string;
  run: () => void;
  pressed: () => boolean;
  panel?: VideoViewPanel;
}

@Component({
  selector: 'ngx-video-view',
  templateUrl: './video-view.component.html',
  styleUrls: ['../media-toolbar.scss', './video-view.component.scss'],
  // `Default` instead of `Eager`: the Angular 19-21 linker only knows `Default` (both mean check-always)
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [AsyncPipe, SanitizeHtmlPipe],
})
export class VideoViewComponent {
  private ngxeService = inject(NgxEditorService, { optional: true });
  private sanitizer = inject(DomSanitizer);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly view = input<EditorView | undefined>(undefined);
  readonly selected = input(false);
  /** whether the editor is editable; set by the node view, as a change of `view.editable` does not update node views */
  readonly editable = input(true);
  readonly kind = input<'embed' | 'file'>('embed');
  readonly src = input('');
  readonly provider = input<VideoProvider | null>(null);
  readonly poster = input<string | null>(null);
  readonly caption = input('');
  readonly align = input<ImageAlign | null>(null);
  readonly ratio = input(DEFAULT_VIDEO_RATIO);
  /** the editor's video config: the hosts a replacing link may come from, the upload handler and `accept` */
  readonly config = input<NgxEditorResolvedVideoConfig | null>(null);

  /** the CSS width of the video, `''` for the full width */
  readonly outerWidth = model('');

  readonly resizeEnd = output();
  readonly action = output<VideoViewAction>();

  @ViewChild('frame', { static: true }) frame!: ElementRef<HTMLElement>;

  panel: VideoViewPanel | null = null;
  panelValue = '';
  error: string | null = null;

  // a new value for every check would load the player again, so the trusted url is computed once per `src`
  readonly embedSrc = computed<SafeResourceUrl | null>(() => {
    const src = this.src();
    return this.kind() === 'embed' && getVideoProvider(src) ? this.sanitizer.bypassSecurityTrustResourceUrl(src) : null;
  });

  readonly fileSrc = computed(() => (this.kind() === 'file' ? sanitizeUrl(this.src(), 'media') : null));
  readonly posterSrc = computed(() => sanitizeUrl(this.poster(), 'image'));
  readonly aspectRatio = computed(() => (normalizeVideoRatio(this.ratio()) ?? DEFAULT_VIDEO_RATIO).replace('/', ' / '));

  @HostBinding('attr.data-align') get hostAlign(): string | null {
    return this.align() ?? null;
  }

  @HostBinding('attr.data-kind') get hostKind(): string {
    return this.kind();
  }

  @HostBinding('style.width') get hostWidth(): string | null {
    return this.outerWidth() || null;
  }


  get showToolbar(): boolean {
    return this.selected() && this.editable();
  }

  // the player gets the clicks only while the video is selected (or the editor is read only)
  get showOverlay(): boolean {
    return this.editable() && !this.selected();
  }

  get resolvedConfig(): NgxEditorResolvedVideoConfig {
    return this.config() ?? resolveVideoConfig();
  }

  get canUpload(): boolean {
    return Boolean(this.resolvedConfig.uploadHandler);
  }

  get accept(): string {
    return this.resolvedConfig.accept.join(',');
  }

  get widthPercent(): number {
    const match = /^(?<value>\d+(?:\.\d+)?)%$/.exec(this.outerWidth());
    return match ? Math.round(Number(match.groups?.['value'])) : 100;
  }

  get iframeTitle(): string {
    if (this.caption()) {
      return this.caption();
    }

    return this.ngxeService?.translate(PROVIDER_KEYS[this.provider() ?? 'custom']) ?? '';
  }

  readonly alignButtons: ToolbarButton[] = (['start', 'center', 'end'] as const).map((align) => {
    const key = { start: 'videoAlignStart', center: 'videoAlignCenter', end: 'videoAlignEnd' }[align];
    return {
      key,
      label: this.getLabel(key),
      icon: `align_${align}`,
      run: () => this.emit({ type: 'align', align: this.align() === align ? null : align }),
      pressed: () => this.align() === align,
    };
  });

  readonly widthButtons: ToolbarButton[] = VIDEO_WIDTH_PRESETS.map((width) => ({
    key: `width-${width}`,
    label: this.getLabel('videoWidth', { value: width }),
    text: width,
    run: () => this.emit({ type: 'width', width: width === '100%' ? null : width }),
    pressed: () => (this.outerWidth() || '100%') === width,
  }));

  readonly panelButtons: ToolbarButton[] = [
    {
      key: 'videoCaption',
      label: this.getLabel('videoCaption'),
      icon: 'image_caption',
      panel: 'caption',
      run: () => this.togglePanel('caption'),
      pressed: () => Boolean(this.caption()) || this.panel === 'caption',
    },
    {
      key: 'replaceVideo',
      label: this.getLabel('replaceVideo'),
      icon: 'image_replace',
      panel: 'replace',
      run: () => this.togglePanel('replace'),
      pressed: () => this.panel === 'replace',
    },
    {
      key: 'deleteVideo',
      label: this.getLabel('deleteVideo'),
      icon: 'delete',
      run: () => this.emit({ type: 'delete' }),
      pressed: () => false,
    },
  ];

  getLabel(key: string, values?: Record<string, string>): Observable<string> {
    const label = this.ngxeService ? this.ngxeService.locals.get(key) : of(key);
    return values ? label.pipe(map((text) => formatMessage(text, values))) : label;
  }

  getIcon(name: string): HTML {
    return this.ngxeService ? this.ngxeService.getIcon(name) : '';
  }

  isMirrored(name: string | undefined): boolean {
    return Boolean(name && isMirroredIcon(name));
  }

  private emit(action: VideoViewAction): void {
    this.closePanel();
    this.action.emit(action);
  }

  togglePanel(panel: VideoViewPanel): void {
    if (this.panel === panel) {
      this.closePanel();
      return;
    }

    this.panel = panel;
    this.error = null;
    this.panelValue = panel === 'caption' ? this.caption() : '';
  }

  closePanel(): void {
    this.panel = null;
    this.error = null;
  }

  onPanelInput(event: Event): void {
    this.panelValue = (event.target as HTMLInputElement).value;
    this.error = null;
  }

  onPanelKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.applyPanel();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.closePanel();
      this.view()?.focus();
    }
  }

  applyPanel(): void {
    const value = this.panelValue.trim();

    if (this.panel === 'caption') {
      this.emit({ type: 'caption', caption: value || null });
      return;
    }

    if (this.panel === 'replace') {
      const error = getVideoUrlError(value, this.resolvedConfig);
      if (error) {
        this.error = formatMessage(this.ngxeService?.translate(error.key) ?? error.key, { host: error.host });
        return;
      }

      this.emit({ type: 'replaceUrl', url: value });
    }
  }

  removeCaption(): void {
    this.emit({ type: 'caption', caption: null });
  }

  onReplaceFile(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';

    if (file) {
      this.emit({ type: 'replaceFile', file });
    }
  }

  onToolbarKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closePanel();
      this.view()?.focus();
    }
  }

  private get rtl(): boolean {
    const win = this.host.nativeElement.ownerDocument.defaultView;
    return win?.getComputedStyle(this.host.nativeElement).direction === 'rtl';
  }

  // the content width of the block the video is in, which its percentage width is relative to
  private get editorWidth(): number {
    const parent = this.host.nativeElement.parentElement;
    const win = this.host.nativeElement.ownerDocument.defaultView;
    if (!parent || !win) {
      return this.frame.nativeElement.clientWidth;
    }

    const style = win.getComputedStyle(parent);
    const padding = (parseFloat(style.paddingInlineStart) || 0) + (parseFloat(style.paddingInlineEnd) || 0);
    return parent.clientWidth - padding || this.frame.nativeElement.clientWidth;
  }

  // arrow keys on the handle: towards the inline end grows the video (right in ltr, left in rtl), Up/Down too
  onResizeKeydown(event: KeyboardEvent): void {
    const grow = this.rtl ? 'ArrowLeft' : 'ArrowRight';
    const shrink = this.rtl ? 'ArrowRight' : 'ArrowLeft';
    let step = 0;

    if (event.key === grow || event.key === 'ArrowUp') {
      step = KEYBOARD_STEP;
    } else if (event.key === shrink || event.key === 'ArrowDown') {
      step = -KEYBOARD_STEP;
    }

    if (step) {
      event.preventDefault();
      const percent = Math.max(MIN_PERCENT, Math.min(100, this.widthPercent + step));
      this.action.emit({ type: 'width', width: percent === 100 ? null : `${percent}%` });
    }
  }

  startResizing(event: MouseEvent): void {
    event.preventDefault();

    const startX = event.pageX;
    const startWidth = this.frame.nativeElement.clientWidth;
    const doc = this.host.nativeElement.ownerDocument;
    const { rtl, editorWidth } = this;

    const onMouseMove = (e: MouseEvent) => {
      const width = computeResizeWidth({ startWidth, deltaX: e.pageX - startX, rtl, maxWidth: editorWidth });
      const percent = toWidthPercent(width, editorWidth);
      this.outerWidth.set(percent === 100 ? '' : `${percent}%`);
    };

    const onMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      doc.removeEventListener('mousemove', onMouseMove);
      doc.removeEventListener('mouseup', onMouseUp);
      this.resizeEnd.emit();
    };

    doc.addEventListener('mousemove', onMouseMove);
    doc.addEventListener('mouseup', onMouseUp);
  }
}

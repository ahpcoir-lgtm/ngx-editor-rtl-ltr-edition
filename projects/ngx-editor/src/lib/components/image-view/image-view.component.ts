import { AsyncPipe, CommonModule } from '@angular/common';
import {
  Component, ElementRef, HostBinding, ViewChild, ChangeDetectionStrategy, inject, input, model, output,
} from '@angular/core';
import { EditorView } from 'prosemirror-view';
import { Observable, of } from 'rxjs';

import { sanitizeUrl } from 'ngx-editor-rtl-ltr-edition/utils';
import type { ImageAlign } from 'ngx-editor-rtl-ltr-edition/schema';

import { NgxEditorService } from '../../editor.service';
import { isMirroredIcon } from '../../modules/menu/mirrored-icons';
import { SanitizeHtmlPipe } from '../../pipes/sanitize/sanitize-html.pipe';
import { HTML } from '../../trustedTypesUtil';

/** what the image toolbar asks the node view to do */
export type ImageViewAction =
  | { type: 'align'; align: ImageAlign | null }
  | { type: 'alt'; alt: string }
  | { type: 'caption'; caption: string | null }
  | { type: 'link'; href: string | null }
  | { type: 'replaceUrl'; src: string }
  | { type: 'replaceFile'; file: File }
  | { type: 'delete' };

type ImageViewPanel = 'alt' | 'caption' | 'link' | 'replace';

const MIN_WIDTH = 20;

export interface ResizeDrag {
  startWidth: number;
  /** the horizontal distance the mouse moved, in screen pixels (positive is to the right) */
  deltaX: number;
  rtl: boolean;
  maxWidth: number;
  minWidth?: number;
}

/**
 * The width while dragging a resize handle on the inline-end corners: the image grows towards the inline end, which
 * is to the left in right to left text. Clamped to `minWidth` … `maxWidth`; the height follows the aspect ratio.
 */
export const computeResizeWidth = ({ startWidth, deltaX, rtl, maxWidth, minWidth = MIN_WIDTH }: ResizeDrag): number => {
  const width = startWidth + (rtl ? -deltaX : deltaX);
  return Math.round(Math.max(minWidth, Math.min(width, Math.max(minWidth, maxWidth))));
};

interface ToolbarButton {
  key: string;
  icon: string;
  run: () => void;
  pressed: () => boolean;
}

@Component({
  selector: 'ngx-image-view',
  templateUrl: './image-view.component.html',
  styleUrls: ['./image-view.component.scss'],
  // `Default` instead of `Eager`: the Angular 19-21 linker only knows `Default` (both mean check-always)
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, AsyncPipe, SanitizeHtmlPipe],
})
export class ImageViewComponent {
  private ngxeService = inject(NgxEditorService, { optional: true });
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly src = input<string | undefined>(undefined);
  readonly alt = input('');
  readonly title = input('');
  readonly selected = input(false);
  readonly view = input<EditorView | undefined>(undefined);
  /** `image` (inline) or `figure` (captioned block) */
  readonly kind = input<'image' | 'figure'>('image');
  readonly align = input<ImageAlign | null>(null);
  readonly height = input<string | null>(null);
  readonly caption = input<string | null>(null);
  /** the link of the image */
  readonly href = input<string | null>(null);
  /** the `accept` of the file input of "replace" */
  readonly accept = input('');

  readonly outerWidth = model('');

  readonly imageResize = output();
  readonly action = output<ImageViewAction>();

  @ViewChild('imgEl', { static: true }) imgEl!: ElementRef<HTMLImageElement>;

  panel: ImageViewPanel | null = null;
  panelValue = '';
  invalid = false;

  @HostBinding('attr.data-align') get hostAlign(): string | null {
    return this.align() ?? null;
  }

  @HostBinding('attr.data-kind') get hostKind(): string {
    return this.kind();
  }

  // a figure is as wide as its image, so that the caption wraps under it
  @HostBinding('style.width') get hostWidth(): string | null {
    return this.kind() === 'figure' ? this.outerWidth() || null : null;
  }

  get editable(): boolean {
    return Boolean(this.view()?.editable);
  }

  get panelLabelKey(): string {
    return { alt: 'altText', caption: 'imageCaption', link: 'url', replace: 'url' }[this.panel ?? 'alt'];
  }

  get showToolbar(): boolean {
    return this.selected() && this.editable;
  }

  readonly alignButtons: ToolbarButton[] = [
    { key: 'imageAlignNone', icon: 'image_inline', run: () => this.setAlign(null), pressed: () => !this.align() },
    { key: 'imageAlignStart', icon: 'align_start', run: () => this.setAlign('start'), pressed: () => this.align() === 'start' },
    { key: 'imageAlignCenter', icon: 'align_center', run: () => this.setAlign('center'), pressed: () => this.align() === 'center' },
    { key: 'imageAlignEnd', icon: 'align_end', run: () => this.setAlign('end'), pressed: () => this.align() === 'end' },
  ];

  readonly panelButtons: (ToolbarButton & { panel?: ImageViewPanel })[] = [
    { key: 'altText', icon: 'image_alt', panel: 'alt', run: () => this.togglePanel('alt'), pressed: () => this.panel === 'alt' },
    {
      key: 'imageCaption',
      icon: 'image_caption',
      panel: 'caption',
      run: () => this.togglePanel('caption'),
      pressed: () => this.kind() === 'figure' || this.panel === 'caption',
    },
    { key: 'imageLink', icon: 'link', panel: 'link', run: () => this.togglePanel('link'), pressed: () => Boolean(this.href()) },
    {
      key: 'replaceImage',
      icon: 'image_replace',
      panel: 'replace',
      run: () => this.togglePanel('replace'),
      pressed: () => this.panel === 'replace',
    },
    { key: 'deleteImage', icon: 'delete', run: () => this.action.emit({ type: 'delete' }), pressed: () => false },
  ];

  getLabel(key: string): Observable<string> {
    return this.ngxeService ? this.ngxeService.locals.get(key) : of(key);
  }

  getIcon(name: string): HTML {
    return this.ngxeService ? this.ngxeService.getIcon(name) : '';
  }

  isMirrored(name: string): boolean {
    return isMirroredIcon(name);
  }

  private setAlign(align: ImageAlign | null): void {
    this.closePanel();
    this.action.emit({ type: 'align', align });
  }

  togglePanel(panel: ImageViewPanel): void {
    if (this.panel === panel) {
      this.closePanel();
      return;
    }

    this.panel = panel;
    this.invalid = false;
    this.panelValue = {
      alt: this.alt() ?? '',
      caption: this.caption() ?? '',
      link: this.href() ?? '',
      replace: '',
    }[panel];
  }

  closePanel(): void {
    this.panel = null;
    this.invalid = false;
  }

  onPanelInput(event: Event): void {
    this.panelValue = (event.target as HTMLInputElement).value;
    this.invalid = false;
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

    switch (this.panel) {
      case 'alt':
        this.action.emit({ type: 'alt', alt: value });
        break;
      case 'caption':
        this.action.emit({ type: 'caption', caption: value });
        break;
      case 'link':
        if (value && !sanitizeUrl(value, 'link')) {
          this.invalid = true;
          return;
        }
        this.action.emit({ type: 'link', href: value || null });
        break;
      case 'replace':
        if (!sanitizeUrl(value, 'image')) {
          this.invalid = true;
          return;
        }
        this.action.emit({ type: 'replaceUrl', src: value });
        break;
      default:
        return;
    }

    this.closePanel();
  }

  removeLink(): void {
    this.closePanel();
    this.action.emit({ type: 'link', href: null });
  }

  removeCaption(): void {
    this.closePanel();
    this.action.emit({ type: 'caption', caption: null });
  }

  onReplaceFile(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';

    if (file) {
      this.closePanel();
      this.action.emit({ type: 'replaceFile', file });
    }
  }

  onToolbarKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closePanel();
      this.view()?.focus();
    }
  }

  startResizing(e: MouseEvent): void {
    e.preventDefault();
    this.resizeImage(e);
  }

  resizeImage(evt: MouseEvent): void {
    const startX = evt.pageX;
    const startWidth = this.imgEl.nativeElement.clientWidth;
    const doc = this.host.nativeElement.ownerDocument;
    const win = doc.defaultView;

    const rtl = win?.getComputedStyle(this.host.nativeElement).direction === 'rtl';
    const editorDom = this.view()?.dom;
    const { width } = win && editorDom ? win.getComputedStyle(editorDom) : { width: '0' };
    const editorWidth = parseInt(width, 10) || startWidth;

    const onMouseMove = (e: MouseEvent) => {
      const computedWidth = computeResizeWidth({ startWidth, deltaX: e.pageX - startX, rtl, maxWidth: editorWidth });
      this.outerWidth.set(`${computedWidth}px`);
    };

    const onMouseUp = (e: MouseEvent) => {
      e.preventDefault();

      doc.removeEventListener('mousemove', onMouseMove);
      doc.removeEventListener('mouseup', onMouseUp);

      this.imageResize.emit();
    };

    doc.addEventListener('mousemove', onMouseMove);
    doc.addEventListener('mouseup', onMouseUp);
  }
}

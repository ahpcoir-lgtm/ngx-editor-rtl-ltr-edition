import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import {
  AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors,
} from '@angular/forms';
import { NodeSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Observable, Subscription, map } from 'rxjs';

import { type VideoEmbed, type VideoProvider, sanitizeUrl, uniq } from 'ngx-editor-rtl-ltr-edition/utils';

import { NgxEditorService } from '../../../editor.service';
import { formatFileSize, isAcceptedFile } from '../../../images/config';
import { formatMessage } from '../../../images/upload-utils';
import { SanitizeHtmlPipe } from '../../../pipes/sanitize/sanitize-html.pipe';
import { uploadVideoFiles } from '../../../plugins/video-upload';
import { HTML } from '../../../trustedTypesUtil';
import { getVideoUrlError, normalizeConfiguredVideoUrl } from '../../../video/config';
import type { NgxEditorResolvedVideoConfig } from '../../../video/types';
import { MenuService } from '../menu.service';
import { Video as VideoCommand } from '../MenuCommands';
import { outsideClick } from '../outside-click';
import { PopupPositionDirective } from '../popup-position.directive';

type VideoTab = 'embed' | 'upload';

const PROVIDER_KEYS: Record<VideoProvider, string> = {
  youtube: 'videoProviderYoutube',
  vimeo: 'videoProviderVimeo',
  aparat: 'videoProviderAparat',
  custom: 'videoProviderCustom',
};

// the poster of a video file, as sanitizeUrl accepts it
const posterValidator = (control: AbstractControl): ValidationErrors | null => {
  const value: unknown = control.value;
  return !value || sanitizeUrl(value, 'image') ? null : { url: true };
};

@Component({
  selector: 'ngx-video',
  templateUrl: './video.component.html',
  styleUrls: ['../image/image.component.scss', './video.component.scss'],
  // `Default` instead of `Eager`: the Angular 19-21 linker only knows `Default` (both mean check-always)
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [AsyncPipe, SanitizeHtmlPipe, ReactiveFormsModule, PopupPositionDirective],
})
export class VideoComponent implements OnInit, OnDestroy {
  private ngxeService = inject(NgxEditorService);
  private menuService = inject(MenuService);
  private cdr = inject(ChangeDetectorRef);

  private outsideClick = outsideClick(() => this.hideForm());
  private popupOpen = false;
  private componentId = uniq();
  private updateSubscription?: Subscription;
  private editorView!: EditorView;

  get showPopup(): boolean {
    return this.popupOpen;
  }

  set showPopup(value: boolean) {
    this.popupOpen = value;
    this.outsideClick.toggle(value);
  }

  isActive = false;
  readonly tabs: VideoTab[] = ['embed', 'upload'];
  activeTab: VideoTab = 'embed';
  dragOver = false;
  file: File | null = null;
  fileError: string | null = null;

  form = new FormGroup({
    url: new FormControl(''),
    poster: new FormControl('', [posterValidator]),
    caption: new FormControl(''),
  });

  get icon(): HTML {
    return this.ngxeService.getIcon('video');
  }

  get uploadIcon(): HTML {
    return this.ngxeService.getIcon('upload');
  }

  get config(): NgxEditorResolvedVideoConfig {
    return this.ngxeService.getVideoConfig(this.menuService.editor);
  }

  get accept(): string {
    return this.config.accept.join(',');
  }

  get canUpload(): boolean {
    return Boolean(this.config.uploadHandler);
  }

  get poster(): AbstractControl {
    return this.form.controls.poster;
  }

  /** the player of the url in the form, `null` while it is empty or cannot be embedded */
  get embed(): VideoEmbed | null {
    return normalizeConfiguredVideoUrl(this.form.controls.url.value ?? '', this.config);
  }

  /** the localized reason the url cannot be embedded, `null` while it is empty or valid */
  get urlError(): string | null {
    const url = this.form.controls.url.value?.trim() ?? '';
    const error = url ? getVideoUrlError(url, this.config) : null;
    return error ? formatMessage(this.ngxeService.translate(error.key), { host: error.host }) : null;
  }

  get canInsert(): boolean {
    if (this.poster.invalid) {
      return false;
    }

    return this.activeTab === 'embed' ? Boolean(this.embed) : Boolean(this.canUpload && this.file && !this.fileError);
  }

  getId(name: string): string {
    return `${name}-${this.componentId}`;
  }

  getLabel(key: string, values?: Record<string, string>): Observable<string> {
    const label = this.ngxeService.locals.get(key);
    return values ? label.pipe(map((text) => formatMessage(text, values))) : label;
  }

  getProviderLabel(provider: VideoProvider): Observable<string> {
    return this.getLabel(PROVIDER_KEYS[provider]);
  }

  private hideForm(): void {
    this.showPopup = false;
    this.dragOver = false;
    this.file = null;
    this.fileError = null;
    this.form.reset({ url: '', poster: '', caption: '' });
  }

  togglePopup(): void {
    this.showPopup = !this.showPopup;

    if (this.showPopup) {
      this.fillForm();
    }
  }

  onTogglePopupMouseClick(e: MouseEvent): void {
    if (e.button === 0) {
      this.togglePopup();
    }
  }

  onTogglePopupKeydown(): void {
    this.togglePopup();
  }

  selectTab(tab: VideoTab): void {
    this.activeTab = tab;
  }

  // arrow keys move between the tabs (in the reading direction of the popup)
  onTabKeydown(e: KeyboardEvent): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      return;
    }

    e.preventDefault();
    const index = this.tabs.indexOf(this.activeTab);
    const rtl = getComputedStyle(e.target as HTMLElement).direction === 'rtl';
    const forward = (e.key === 'ArrowRight') !== rtl;

    let next = forward ? index + 1 : index - 1;
    if (e.key === 'Home') {
      next = 0;
    } else if (e.key === 'End') {
      next = this.tabs.length - 1;
    }

    this.activeTab = this.tabs[(next + this.tabs.length) % this.tabs.length];
    this.cdr.detectChanges();
    (e.target as HTMLElement).parentElement?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
  }

  // a selected video is edited: an embedded one on the embed tab, a file on the upload tab
  private fillForm(): void {
    const { selection } = this.editorView.state;
    this.activeTab = 'embed';

    if (this.isActive && selection instanceof NodeSelection) {
      const { kind, src, poster, caption } = selection.node.attrs;
      this.activeTab = kind === 'file' ? 'upload' : 'embed';
      this.form.setValue({ url: kind === 'file' ? '' : src ?? '', poster: poster ?? '', caption: caption ?? '' });
    }
  }

  private update = (view: EditorView) => {
    this.isActive = VideoCommand.isActive(view.state);
  };

  setFile(file: File | null | undefined): void {
    const { config } = this;
    this.file = file ?? null;
    this.fileError = null;

    if (!file) {
      return;
    }

    if (!isAcceptedFile(file, config.accept)) {
      this.fileError = formatMessage(this.ngxeService.translate('videoInvalidType'), { name: file.name });
    } else if (config.maxSize !== null && file.size > config.maxSize) {
      this.fileError = formatMessage(this.ngxeService.translate('videoTooLarge'), {
        name: file.name,
        max: formatFileSize(config.maxSize),
      });
    }
  }

  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.setFile(input.files?.[0]);
    input.value = '';
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragOver = this.canUpload;
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragOver = false;

    if (this.canUpload) {
      this.setFile(e.dataTransfer?.files?.[0]);
    }
  }

  insert(e: Event): void {
    e.preventDefault();
    if (!this.canInsert) {
      return;
    }

    const { url, poster, caption } = this.form.getRawValue();
    const { state, dispatch } = this.editorView;

    if (this.activeTab === 'embed') {
      VideoCommand.insert(url ?? '', { caption: caption ?? '' }, this.config)(state, dispatch);
    } else if (this.file) {
      const { selection } = state;
      const replace = this.isActive && selection instanceof NodeSelection;
      uploadVideoFiles(this.editorView, [this.file], {
        pos: selection.from,
        replace,
        attrs: { caption: caption?.trim() ?? '', poster: sanitizeUrl(poster, 'image') },
      });
    }

    this.editorView.focus();
    this.hideForm();
  }

  ngOnInit(): void {
    this.editorView = this.menuService.editor.view;

    this.updateSubscription = this.menuService.editor.update.subscribe((view: EditorView) => {
      this.update(view);
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.updateSubscription?.unsubscribe();
  }
}

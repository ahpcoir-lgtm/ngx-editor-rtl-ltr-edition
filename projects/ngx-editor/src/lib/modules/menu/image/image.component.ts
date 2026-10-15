import { Component, OnDestroy, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, inject } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import {
  AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators,
} from '@angular/forms';
import { sanitizeUrl, uniq } from 'ngx-editor-rtl-ltr-edition/utils';
import { NodeSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Observable, Subscription } from 'rxjs';

import { NgxEditorService } from '../../../editor.service';
import { SanitizeHtmlPipe } from '../../../pipes/sanitize/sanitize-html.pipe';
import { uploadImageFiles } from '../../../plugins/image-upload';
import { HTML } from '../../../trustedTypesUtil';
import { MenuService } from '../menu.service';
import { outsideClick } from '../outside-click';
import { PopupPositionDirective } from '../popup-position.directive';
import { Image as ImageCommand } from '../MenuCommands';

type ImageTab = 'upload' | 'url';

// the url of an image, as sanitizeUrl accepts it
const imageUrlValidator = (control: AbstractControl): ValidationErrors | null => {
  const value: unknown = control.value;
  return !value || sanitizeUrl(value, 'image') ? null : { url: true };
};

@Component({
  selector: 'ngx-image',
  templateUrl: './image.component.html',
  styleUrls: ['./image.component.scss'],
  // `Default` instead of `Eager`: the Angular 19-21 linker only knows `Default` (both mean check-always)
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [AsyncPipe, SanitizeHtmlPipe, ReactiveFormsModule, CommonModule, PopupPositionDirective],
})
export class ImageComponent implements OnInit, OnDestroy {
  private ngxeService = inject(NgxEditorService);
  private menuService = inject(MenuService);
  private cdr = inject(ChangeDetectorRef);

  private outsideClick = outsideClick(() => this.hideForm());
  private popupOpen = false;

  get showPopup(): boolean {
    return this.popupOpen;
  }

  set showPopup(value: boolean) {
    this.popupOpen = value;
    this.outsideClick.toggle(value);
  }

  isActive = false;
  readonly tabs: ImageTab[] = ['upload', 'url'];
  activeTab: ImageTab = 'upload';
  dragOver = false;

  private componentId = uniq();
  private updateSubscription?: Subscription;

  form = new FormGroup({
    src: new FormControl('', [Validators.required, imageUrlValidator]),
    alt: new FormControl(''),
    title: new FormControl(''),
  });

  private editorView!: EditorView;

  get icon(): HTML {
    return this.ngxeService.getIcon('image');
  }

  get uploadIcon(): HTML {
    return this.ngxeService.getIcon('upload');
  }

  get src(): AbstractControl {
    return this.form.controls.src;
  }

  /** the `accept` of the file input, from the `image` config */
  get accept(): string {
    return this.ngxeService.getImageConfig(this.menuService.editor).accept.join(',');
  }

  getId(name: string): string {
    return `${name}-${this.componentId}`;
  }

  getLabel(key: string): Observable<string> {
    return this.ngxeService.locals.get(key);
  }

  private hideForm(): void {
    this.showPopup = false;
    this.dragOver = false;
    this.form.reset({
      src: '',
      alt: '',
      title: '',
    });
  }

  togglePopup(): void {
    this.showPopup = !this.showPopup;

    if (this.showPopup) {
      // a selected image is edited in the url tab
      this.activeTab = this.isActive ? 'url' : 'upload';
      this.fillForm();
    }
  }

  onTogglePopupMouseClick(e: MouseEvent): void {
    if (e.button !== 0) {
      return;
    }

    this.togglePopup();
  }

  onTogglePopupKeydown(): void {
    this.togglePopup();
  }

  selectTab(tab: ImageTab): void {
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

    const tablist = (e.target as HTMLElement).parentElement;
    tablist?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
  }

  private fillForm(): void {
    const { state } = this.editorView;
    const { selection } = state;
    if (selection instanceof NodeSelection && this.isActive) {
      const { src, alt = '', title = '' } = selection.node.attrs;

      this.form.setValue({
        src,
        alt: alt ?? '',
        title: title ?? '',
      });
    }
  }

  private update = (view: EditorView) => {
    const { state } = view;
    this.isActive = ImageCommand.isActive(state);
  };

  // a selected image or figure is replaced by the first file, else every file is inserted at the cursor
  uploadFiles(files: FileList | File[] | null | undefined): void {
    const list = Array.from(files ?? []);
    if (list.length === 0) {
      return;
    }

    const { state } = this.editorView;
    const { selection } = state;
    const replace = this.isActive && selection instanceof NodeSelection;

    uploadImageFiles(this.editorView, list, { pos: selection.from, replace });
    this.editorView.focus();
    this.hideForm();
  }

  onFilesSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    const { files } = input;
    this.uploadFiles(files ? Array.from(files) : []);
    input.value = '';
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragOver = true;
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragOver = false;
    this.uploadFiles(e.dataTransfer?.files);
  }

  insertLink(e: MouseEvent): void {
    e.preventDefault();
    const { src, alt, title } = this.form.getRawValue();
    const { dispatch, state } = this.editorView;

    ImageCommand.insert(src ?? '', { alt: alt ?? '', title: title ?? '' })(state, dispatch);
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

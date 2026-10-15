import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject,
} from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { EditorView } from 'prosemirror-view';
import { Observable, Subscription, of } from 'rxjs';

import { parseFontFamily } from 'ngx-editor-rtl-ltr-edition/utils';

import { NgxEditorService } from '../../../editor.service';
import { findFont, getFontLabel } from '../../../fonts/config';
import { NgxEditorFontLoader } from '../../../fonts/loader';
import type { NgxEditorFont } from '../../../fonts/types';
import { MenuService } from '../menu.service';
import { FontFamily } from '../MenuCommands';
import { outsideClick } from '../outside-click';
import { PopupPositionDirective } from '../popup-position.directive';

@Component({
  selector: 'ngx-font-family',
  templateUrl: './font-family.component.html',
  styleUrls: ['./font-family.component.scss'],
  // `Default` instead of `Eager`: the Angular 19-21 linker only knows `Default` (both mean check-always)
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [AsyncPipe, CommonModule, PopupPositionDirective],
})
export class FontFamilyComponent implements OnInit, OnDestroy {
  private ngxeService = inject(NgxEditorService);
  private menuService = inject(MenuService);
  private fontLoader = inject(NgxEditorFontLoader);
  private cdr = inject(ChangeDetectorRef);

  private editorView!: EditorView;
  private updateSubscription?: Subscription;
  private outsideClick = outsideClick(() => {
    this.isDropdownOpen = false;
  });

  private popupOpen = false;

  /** the font of the selection; `null` for the default font, `undefined` for a font that is not configured */
  activeFont: NgxEditorFont | null | undefined = null;
  /** the family of the selection as written in the document */
  activeFamily: string | null = null;
  canExecute = true;

  get isDropdownOpen(): boolean {
    return this.popupOpen;
  }

  set isDropdownOpen(value: boolean) {
    this.popupOpen = value;
    this.outsideClick.toggle(value);
  }

  get fonts(): NgxEditorFont[] {
    return this.ngxeService.getFonts(this.menuService.editor).fonts;
  }

  // the label of each font follows the configured locale (`fa-IR` falls back to `fa`)
  getLabel(font: NgxEditorFont): string {
    return getFontLabel(font, this.ngxeService.config?.locale);
  }

  getName(key: string): Observable<string> {
    return this.ngxeService.locals.get(key);
  }

  /** the text of the menu button: the font of the selection, else the name of the menu */
  get buttonText(): Observable<string> {
    if (this.activeFont) {
      return of(this.getLabel(this.activeFont));
    }

    // a font that is not in the list is shown by its first family
    return this.activeFamily ? of(parseFontFamily(this.activeFamily)[0] ?? this.activeFamily) : this.getName('font_family');
  }

  isActive(font: NgxEditorFont | null): boolean {
    return this.activeFont === font;
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  onToggleDropdownMouseClick(e: MouseEvent): void {
    e.preventDefault();

    if (e.button !== 0) {
      return;
    }

    this.toggleDropdown();
  }

  onToggleDropdownKeydown(): void {
    this.toggleDropdown();
  }

  /** applies the font, or removes the font of the selection for `null` */
  selectFont(font: NgxEditorFont | null): void {
    const { state, dispatch } = this.editorView;

    if (font) {
      FontFamily.apply(font.family)(state, dispatch);
    } else {
      FontFamily.remove()(state, dispatch);
    }

    if (!this.editorView.hasFocus()) {
      this.editorView.focus();
    }

    this.isDropdownOpen = false;
  }

  onFontMouseClick(e: MouseEvent, font: NgxEditorFont | null): void {
    e.preventDefault();

    if (e.button !== 0) {
      return;
    }

    this.selectFont(font);
  }

  onFontKeydown(event: Event, font: NgxEditorFont | null): void {
    event.preventDefault();
    this.selectFont(font);
  }

  private update = (view: EditorView): void => {
    const { state } = view;
    const [family] = FontFamily.getActiveFamilies(state);

    this.canExecute = FontFamily.canExecute(state);
    this.activeFamily = family ?? null;
    this.activeFont = family ? findFont(this.fonts, family) : null;
  };

  ngOnInit(): void {
    const { editor } = this.menuService;
    this.editorView = editor.view;

    // the labels are drawn in their fonts
    this.fontLoader.load(this.ngxeService.getFonts(editor));

    this.update(this.editorView);
    this.updateSubscription = editor.update.subscribe((view: EditorView) => {
      this.update(view);
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.updateSubscription?.unsubscribe();
  }
}

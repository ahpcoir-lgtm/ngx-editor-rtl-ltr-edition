import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { uniq } from 'ngx-editor-rtl-ltr-edition/utils';
import { EditorView } from 'prosemirror-view';
import { Observable, Subscription, combineLatest, map } from 'rxjs';
import { NgxEditorService } from '../../../editor.service';
import { SanitizeHtmlPipe } from '../../../pipes/sanitize/sanitize-html.pipe';
import { HTML } from '../../../trustedTypesUtil';
import { MenuService } from '../menu.service';
import { outsideClick } from '../outside-click';
import { PopupPositionDirective } from '../popup-position.directive';

import { Table as TableCommand } from '../MenuCommands';

/** rows and columns of the grid picker */
export const TABLE_GRID_SIZE = 10;

// the size the dialog opens with: three rows (the header row included) and three columns, as upstream inserted
const DEFAULT_SIZE = { rows: 3, cols: 3, headerRow: true };

@Component({
  selector: 'ngx-table',
  imports: [AsyncPipe, SanitizeHtmlPipe, ReactiveFormsModule, CommonModule, PopupPositionDirective],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss',
  // `Default` instead of `Eager`: the Angular 19-21 linker only knows `Default` (both mean check-always)
  changeDetection: ChangeDetectionStrategy.Default,
})
export class TableComponent implements OnInit, OnDestroy {
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
  private componentId = uniq();
  private updateSubscription?: Subscription;

  readonly gridRange = Array.from({ length: TABLE_GRID_SIZE }, (_, index) => index + 1);

  // the rows include the header row
  form = new FormGroup({
    rows: new FormControl(DEFAULT_SIZE.rows, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]),
    cols: new FormControl(DEFAULT_SIZE.cols, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]),
    headerRow: new FormControl(DEFAULT_SIZE.headerRow),
  });

  private editorView!: EditorView;

  get icon(): HTML {
    return this.ngxeService.getIcon('table');
  }

  get rows(): number {
    return Number(this.form.controls.rows.value) || 0;
  }

  get cols(): number {
    return Number(this.form.controls.cols.value) || 0;
  }

  /** the size shown under the grid, e.g. `3 × 4` */
  get sizeText(): string {
    return `${this.rows} × ${this.cols}`;
  }

  /** the size for screen readers, e.g. `Number of Rows: 3, Number of Columns: 4` */
  get sizeLabel(): Observable<string> {
    return combineLatest([this.getLabel('rows'), this.getLabel('cols')]).pipe(
      map(([rows, cols]) => `${rows}: ${this.rows}, ${cols}: ${this.cols}`),
    );
  }

  getId(name: string): string {
    return `${name}-${this.componentId}`;
  }

  getLabel(key: string): Observable<string> {
    return this.ngxeService.locals.get(key);
  }

  isGridCellSelected(row: number, col: number): boolean {
    return row <= this.rows && col <= this.cols;
  }

  private hideForm(): void {
    this.showPopup = false;
    this.form.reset(DEFAULT_SIZE);
  }

  togglePopup(): void {
    this.showPopup = !this.showPopup;

    if (this.showPopup) {
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

  private fillForm(): void {
    this.form.setValue(DEFAULT_SIZE);
  }

  private update = (view: EditorView) => {
    const { state } = view;
    this.isActive = TableCommand.isActive(state);
  };

  /** sets the size from the grid picker */
  selectGridSize(rows: number, cols: number): void {
    this.form.patchValue({ rows, cols });
  }

  onGridMouseDown(e: MouseEvent, rows: number, cols: number): void {
    e.preventDefault();

    if (e.button !== 0) {
      return;
    }

    this.selectGridSize(rows, cols);
    this.insert();
  }

  // arrow keys grow or shrink the selection; the grid mirrors in right to left menus, so Left adds a column there
  onGridKeydown(e: KeyboardEvent): void {
    const rtl = getComputedStyle(e.currentTarget as HTMLElement).direction === 'rtl';
    const clampSize = (value: number): number => Math.min(TABLE_GRID_SIZE, Math.max(1, value));

    const moves: Record<string, [number, number]> = {
      ArrowDown: [1, 0],
      ArrowUp: [-1, 0],
      ArrowRight: [0, rtl ? -1 : 1],
      ArrowLeft: [0, rtl ? 1 : -1],
    };

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.insert();
      return;
    }

    const move = moves[e.key];
    if (!move) {
      return;
    }

    e.preventDefault();
    this.selectGridSize(clampSize(this.rows + move[0]), clampSize(this.cols + move[1]));
  }

  /** inserts the table of the form; false when the form is invalid or the table cannot be inserted here */
  insert(): boolean {
    if (!this.form.valid) {
      return false;
    }

    const headerRow = Boolean(this.form.controls.headerRow.value);
    const { dispatch, state } = this.editorView;

    const success = TableCommand.insert(headerRow ? this.rows - 1 : this.rows, this.cols, { headerRow })(state, dispatch);
    if (success) {
      this.editorView.focus();
      this.hideForm();
    }

    return success;
  }

  insertTable(e: Event): void {
    e.preventDefault();
    this.insert();
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

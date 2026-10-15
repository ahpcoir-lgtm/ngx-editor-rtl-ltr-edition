import {
  Component, OnDestroy, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, inject,
  input
} from '@angular/core';
import { EditorView } from 'prosemirror-view';
import { Observable, Subscription } from 'rxjs';

import { AsyncPipe, CommonModule } from '@angular/common';
import { NgxEditorService } from '../../../editor.service';
import { TBHeadingItems, TBTableItems } from '../../../types';
import { MenuService } from '../menu.service';
import { outsideClick } from '../outside-click';
import { PopupPositionDirective } from '../popup-position.directive';
import { ToggleCommands } from '../MenuCommands';
import { TABLE_MENU_COMMANDS, getCellBackgrounds, setCellBackground } from '../../../commands/TableCommands';

@Component({
  selector: 'ngx-dropdown',
  templateUrl: './dropdown.component.html',
  styleUrls: ['./dropdown.component.scss'],
  // `Default` instead of `Eager`: the Angular 19-21 linker only knows `Default` (both mean check-always)
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [AsyncPipe, CommonModule, PopupPositionDirective],
})
export class DropdownComponent implements OnInit, OnDestroy {
  private ngxeService = inject(NgxEditorService);
  private menuService = inject(MenuService);
  private cdr = inject(ChangeDetectorRef);

  private editorView!: EditorView;
  private updateSubscription?: Subscription;

  readonly group = input<string>('');
  readonly items = input<(TBHeadingItems | TBTableItems)[]>([]);
  /** colours of the cell background palette (`setCellBackground`), in rows */
  readonly presets = input<string[][]>([]);

  private outsideClick = outsideClick(() => {
    this.isDropdownOpen = false;
  });
  private popupOpen = false;

  get isDropdownOpen(): boolean {
    return this.popupOpen;
  }

  set isDropdownOpen(value: boolean) {
    this.popupOpen = value;
    this.isPaletteOpen = false;
    this.outsideClick.toggle(value);
  }

  disabledItems: (TBHeadingItems | TBTableItems)[] = [];
  activeItem: TBHeadingItems | TBTableItems | null = null;
  // the table group marks every active item (variant, width, alignment...) and keeps its own name on the button
  activeItems: (TBHeadingItems | TBTableItems)[] = [];
  isPaletteOpen = false;
  activeColors: string[] = [];

  get isSelected(): boolean {
    return Boolean(this.activeItem || this.isDropdownOpen);
  }

  get isDropdownDisabled(): boolean {
    return this.disabledItems.length === this.items().length;
  }

  getName(key: string): Observable<string> {
    return this.ngxeService.locals.get(key);
  }

  getIsDropdownActive(item: TBHeadingItems | TBTableItems): boolean {
    return this.activeItem === item;
  }

  isItemActive(item: TBHeadingItems | TBTableItems): boolean {
    return this.activeItem === item || this.activeItems.includes(item);
  }

  hasPalette(item: TBHeadingItems | TBTableItems): boolean {
    return this.group() === 'table' && item === 'setCellBackground';
  }

  isColorActive(color: string): boolean {
    return this.activeColors.includes(color.toLowerCase());
  }

  // black or white on the swatch, as in the colour picker
  getContrastColor(color: string): string {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return ((r * 299) + (g * 587) + (b * 114)) / 1000 >= 128 ? 'black' : 'white';
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

  selectItem(item: TBHeadingItems | TBTableItems): void {
    if (this.hasPalette(item)) {
      // the palette opens under the item and the dropdown stays open
      this.isPaletteOpen = !this.isPaletteOpen;
      return;
    }

    const { state, dispatch } = this.editorView;

    if (this.group() === 'table') {
      TABLE_MENU_COMMANDS[item as TBTableItems]?.execute(state, dispatch);
    } else {
      const command = ToggleCommands[item as TBHeadingItems];
      command.toggle()(state, dispatch);
    }

    this.isDropdownOpen = false;
  }

  selectCellBackground(color: string | null): void {
    const { state, dispatch } = this.editorView;
    setCellBackground(color)(state, dispatch);
    this.isDropdownOpen = false;
  }

  onDropdownItemMouseClick(e: MouseEvent, item: TBHeadingItems | TBTableItems): void {
    e.preventDefault();

    // consider only left click
    if (e.button !== 0) {
      return;
    }

    this.selectItem(item);
  }

  onDropdownItemKeydown(event: Event, item: TBHeadingItems | TBTableItems): void {
    const e = event as KeyboardEvent;
    e.preventDefault();
    this.selectItem(item);
  }

  onCellBackgroundMouseClick(e: MouseEvent, color: string | null): void {
    e.preventDefault();

    if (e.button !== 0) {
      return;
    }

    this.selectCellBackground(color);
  }

  onCellBackgroundKeydown(event: Event, color: string | null): void {
    event.preventDefault();
    this.selectCellBackground(color);
  }

  private update = (view: EditorView) => {
    const { state } = view;
    const isTable = this.group() === 'table';
    this.disabledItems = [];
    const activeItems: (TBHeadingItems | TBTableItems)[] = [];

    this.items().forEach((item: TBHeadingItems | TBTableItems) => {
      let isActive = false;
      let canExecute = false;

      const command = isTable ? TABLE_MENU_COMMANDS[item as TBTableItems] : ToggleCommands[item as TBHeadingItems];
      if (command) {
        isActive = command.isActive(state);
        canExecute = command.canExecute(state);
      }

      if (isActive) {
        activeItems.push(item);
      }

      if (!canExecute) {
        this.disabledItems.push(item);
      }
    });

    if (isTable) {
      this.activeItem = null;
      this.activeItems = activeItems;
      this.activeColors = getCellBackgrounds(state).map((color) => color.toLowerCase());
    } else if (activeItems.length === 1) {
      [this.activeItem] = activeItems;
    } else {
      this.activeItem = null;
    }
  };

  ngOnInit(): void {
    this.editorView = this.menuService.editor.view;
    this.update(this.editorView);
    this.updateSubscription = this.menuService.editor.update.subscribe((view: EditorView) => {
      this.update(view);
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.updateSubscription?.unsubscribe();
  }
}

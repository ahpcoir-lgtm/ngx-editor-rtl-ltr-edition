import {
  AfterViewChecked, Component, ElementRef, HostListener, OnInit, TemplateRef, ChangeDetectionStrategy, inject, input,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { NgxEditorError } from 'ngx-editor-rtl-ltr-edition/utils';
import Editor from '../../Editor';
import { NgxEditorService } from '../../editor.service';
import { normalizeDirection, resolveDirection } from '../../resolve-direction';
import {
  NgxEditorDirection,
  Toolbar,
  ToolbarDropdown,
  ToolbarItem,
  ToolbarLink,
  ToolbarLinkOptions,
  TBTableItems,
} from '../../types';
import { ColorPickerComponent } from './color-picker/color-picker.component';
import { DropdownComponent } from './dropdown/dropdown.component';
import { FontFamilyComponent } from './font-family/font-family.component';
import { ImageComponent } from './image/image.component';
import { InsertCommandComponent } from './insert-command/insert-command.component';
import { LinkComponent } from './link/link.component';
import { MenuService } from './menu.service';
import { ToggleCommandComponent } from './toggle-command/toggle-command.component';
import { TableComponent } from './table/table.component';
import { VideoComponent } from './video/video.component';

/** the items of the table dropdown in the built-in toolbars */
export const TABLE_DROPDOWN_ITEMS: TBTableItems[] = [
  'addColumnBefore',
  'addColumnAfter',
  'deleteColumn',
  'addRowBefore',
  'addRowAfter',
  'deleteRow',
  'deleteTable',
  'mergeCells',
  'splitCell',
  'toggleHeaderRow',
  'toggleHeaderColumn',
  'toggleHeaderCell',
  'setCellBackground',
  'clearCellBackground',
  'cellAlignStart',
  'cellAlignCenter',
  'cellAlignEnd',
  'cellVAlignTop',
  'cellVAlignMiddle',
  'cellVAlignBottom',
  'tableVariantBordered',
  'tableVariantStriped',
  'tableVariantBorderless',
  'tableWidthAuto',
  'tableWidthFull',
  'tableAlignStart',
  'tableAlignCenter',
  'tableAlignEnd',
];

export const DEFAULT_TOOLBAR: Toolbar = [
  ['bold', 'italic'],
  ['code', 'blockquote'],
  ['underline', 'strike'],
  ['ordered_list', 'bullet_list', 'task_list'],
  [{ heading: ['paragraph', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }],
  ['link', 'image'],
  [
    'table',
    {
      table: TABLE_DROPDOWN_ITEMS,
    },
  ],
  ['text_color', 'background_color'],
  ['align_left', 'align_center', 'align_right', 'align_justify'],
  ['format_clear'],
];

export const TOOLBAR_MINIMAL: Toolbar = [
  ['bold', 'italic'],
  [{ heading: ['paragraph', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }],
  ['link', 'image'],
  [
    'table',
    {
      table: TABLE_DROPDOWN_ITEMS,
    },
  ],
  ['text_color', 'background_color'],
];

export const TOOLBAR_FULL: Toolbar = [
  ['bold', 'italic'],
  ['code', 'blockquote'],
  ['underline', 'strike'],
  ['ordered_list', 'bullet_list', 'task_list'],
  [{ heading: ['paragraph', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }],
  ['link', 'image'],
  [
    'table',
    {
      table: TABLE_DROPDOWN_ITEMS,
    },
  ],
  ['text_color', 'background_color'],
  ['align_left', 'align_center', 'align_right', 'align_justify'],
  ['horizontal_rule', 'format_clear', 'indent', 'outdent'],
  ['superscript', 'subscript'],
  ['undo', 'redo'],
];

const TOOLBAR_ITEM_SELECTOR = 'button, [role="button"]';

// buttons inside popups and dropdown menus are not part of the toolbar navigation
const POPUP_SELECTOR = '.NgxEditor__Popup, .NgxEditor__Dropdown--DropdownMenu';

const DEFAULT_COLOR_PRESETS = [
  '#b60205',
  '#d93f0b',
  '#fbca04',
  '#0e8a16',
  '#006b75',
  '#1d76db',
  '#0052cc',
  '#5319e7',
  '#e99695',
  '#f9d0c4',
  '#fef2c0',
  '#c2e0c6',
  '#bfdadc',
  '#c5def5',
  '#bfd4f2',
  '#d4c5f9',
];

@Component({
  selector: 'ngx-editor-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
  providers: [MenuService],
  // `Default` instead of `Eager`: the Angular 19-21 linker only knows `Default` (both mean check-always)
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [
    CommonModule,
    ColorPickerComponent,
    DropdownComponent,
    FontFamilyComponent,
    ToggleCommandComponent,
    InsertCommandComponent,
    LinkComponent,
    ImageComponent,
    TableComponent,
    VideoComponent,
  ],
})
export class NgxEditorMenuComponent implements OnInit, AfterViewChecked {
  private menuService = inject(MenuService);
  private ngxeService = inject(NgxEditorService);
  private el = inject(ElementRef<HTMLElement>);

  // the toolbar item that is reachable with Tab (roving tabindex)
  private activeButton: HTMLElement | null = null;

  readonly toolbar = input<Toolbar>(TOOLBAR_MINIMAL);
  readonly colorPresets = input<string[]>(DEFAULT_COLOR_PRESETS);
  readonly disabled = input(false);
  readonly editor = input<Editor>(undefined);
  readonly customMenuRef = input<TemplateRef<unknown> | null>(null);
  readonly dropdownPlacement = input<'top' | 'bottom'>('bottom');
  /** direction of the toolbar and its popups; else the editor's `dir` option, the global `dir` or the locale's direction */
  readonly dir = input<NgxEditorDirection | null | undefined, string | null | undefined>(undefined, {
    transform: normalizeDirection,
  });

  toggleCommands: ToolbarItem[] = [
    'bold',
    'italic',
    'underline',
    'strike',
    'code',
    'blockquote',
    'ordered_list',
    'bullet_list',
    'task_list',
    'align_left',
    'align_center',
    'align_right',
    'align_justify',
    'align_start',
    'align_end',
    'dir_ltr',
    'dir_rtl',
    'dir_auto',
    'superscript',
    'subscript',
  ];

  insertCommands: ToolbarItem[] = ['horizontal_rule', 'format_clear', 'indent', 'outdent', 'undo', 'redo'];

  tableCommands: TBTableItems[] = [...TABLE_DROPDOWN_ITEMS, 'setCellBackgroundGreen'];
  iconContainerClass = ['NgxEditor__MenuItem', 'NgxEditor__MenuItem--IconContainer'];
  dropdownContainerClass = ['NgxEditor__Dropdown'];
  seperatorClass = ['NgxEditor__Seperator'];

  get resolvedDir(): NgxEditorDirection | null {
    return resolveDirection(this.dir(), this.editor(), this.ngxeService);
  }

  get presets(): string[][] {
    const col = 8;
    const colors: string[][] = [];

    this.colorPresets().forEach((color, index) => {
      const row = Math.floor(index / col);

      if (!colors[row]) {
        colors.push([]);
      }

      colors[row].push(color);
    });

    return colors;
  }

  isDropDown(item: ToolbarItem): boolean {
    const dropdown = item as ToolbarDropdown;
    if (dropdown?.heading || dropdown?.table) {
      return true;
    }
    return false;
  }

  getDropdownItems(item: ToolbarItem): ToolbarDropdown {
    return item as ToolbarDropdown;
  }

  isLinkItem(item: ToolbarItem): boolean {
    if (item === 'link') {
      return true;
    }

    // NOTE: it is not sufficient to check for a `link` property
    // as String.prototype.link is a valid (although deprecated) method
    return typeof item === 'object' && typeof (item as ToolbarLink)?.link === 'object';
  }

  isLinkWithOptions(item: ToolbarItem): boolean {
    // NOTE: it is not sufficient to check for a `link` property
    // as String.prototype.link is a valid (although deprecated) method
    return typeof item === 'object' && typeof (item as ToolbarLink)?.link === 'object';
  }

  getLinkOptions(item: ToolbarItem): Partial<ToolbarLinkOptions> {
    return (item as ToolbarLink)?.link;
  }

  // a lifecycle hook instead of afterEveryRender, which only exists from Angular 20
  ngAfterViewChecked(): void {
    this.updateTabIndex();
  }

  private getButtons(): HTMLElement[] {
    const buttons: HTMLElement[] = Array.from(this.el.nativeElement.querySelectorAll(TOOLBAR_ITEM_SELECTOR));
    return buttons.filter((button) => !button.closest(POPUP_SELECTOR));
  }

  private isDisabled(button: HTMLElement): boolean {
    return (button as HTMLButtonElement).disabled
      || button.getAttribute('aria-disabled') === 'true'
      || button.classList.contains('NgxEditor--Disabled');
  }

  private getEnabledButtons(): HTMLElement[] {
    return this.getButtons().filter((button) => !this.isDisabled(button));
  }

  private updateTabIndex(): void {
    const buttons = this.getButtons();
    // a disabled toolbar is removed from the tab order entirely
    const enabled = this.disabled() ? [] : this.getEnabledButtons();

    if (!enabled.includes(this.activeButton)) {
      [this.activeButton = null] = enabled;
    }

    buttons.forEach((button) => {
      button.tabIndex = button === this.activeButton ? 0 : -1;
    });
  }

  @HostListener('focusin', ['$event']) onFocusIn(e: FocusEvent): void {
    const target = e.target as HTMLElement;

    if (this.getButtons().includes(target)) {
      this.activeButton = target;
      this.updateTabIndex();
    }
  }

  @HostListener('keydown', ['$event']) onKeydown(e: KeyboardEvent): void {
    if (this.disabled()) {
      return;
    }

    const buttons = this.getButtons();
    const index = buttons.indexOf(e.target as HTMLElement);

    if (index === -1) {
      return;
    }

    // the focused item may have been disabled, so only the destination has to be enabled
    const enabled = this.getEnabledButtons();
    const before = enabled.filter((button) => buttons.indexOf(button) < index);
    const after = enabled.filter((button) => buttons.indexOf(button) > index);

    const nextItem = after[0] ?? enabled[0];
    const previousItem = before.at(-1) ?? enabled.at(-1);

    // in a right to left toolbar the next item is on the left
    const isArrow = e.key === 'ArrowRight' || e.key === 'ArrowLeft';
    const rtl = isArrow && getComputedStyle(e.target as HTMLElement).direction === 'rtl';

    const next: Record<string, HTMLElement | undefined> = {
      ArrowRight: rtl ? previousItem : nextItem,
      ArrowLeft: rtl ? nextItem : previousItem,
      Home: enabled[0],
      End: enabled.at(-1),
    };

    if (!next[e.key]) {
      return;
    }

    e.preventDefault();
    next[e.key].focus();
  }


  ngOnInit(): void {
    const editor = this.editor();
    if (!editor) {
      throw new NgxEditorError('Required editor instance to initialize menu component');
    }

    this.menuService.editor = editor;
  }
}

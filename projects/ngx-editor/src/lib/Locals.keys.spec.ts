import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { en } from 'ngx-editor-rtl-ltr-edition/locales';

import Locals from './Locals';
import { NgxEditorMenuComponent } from './modules/menu/menu.component';
import { TBHeadingItems, TBItems, TBTableItems } from './types';

// The keys each toolbar item looks up. A `Record` over the union types, so that a new toolbar item does not
// compile here until its keys are listed.
const TOOLBAR_KEYS: Record<TBItems, string[]> = {
  bold: ['bold'],
  italic: ['italic'],
  code: ['code'],
  blockquote: ['blockquote'],
  underline: ['underline'],
  strike: ['strike'],
  ordered_list: ['ordered_list'],
  bullet_list: ['bullet_list'],
  task_list: ['task_list'],
  link: ['insertLink', 'removeLink', 'url', 'text', 'openInNewTab', 'insert', 'enterValidUrl', 'required'],
  image: ['insertImage', 'url', 'altText', 'title', 'insert', 'enterValidUrl'],
  table: [
    'insertTable', 'table', 'rows', 'rowsRequired', 'rowsMin', 'cols', 'colsRequired', 'colsMin', 'insert', 'tableSize',
    'headerRow',
  ],
  text_color: ['text_color', 'remove'],
  background_color: ['background_color', 'remove'],
  align_left: ['align_left'],
  align_center: ['align_center'],
  align_right: ['align_right'],
  align_justify: ['align_justify'],
  align_start: ['align_start'],
  align_end: ['align_end'],
  dir_ltr: ['dir_ltr'],
  dir_rtl: ['dir_rtl'],
  dir_auto: ['dir_auto'],
  horizontal_rule: ['horizontal_rule'],
  format_clear: ['format_clear'],
  indent: ['indent'],
  outdent: ['outdent'],
  superscript: ['superscript'],
  subscript: ['subscript'],
  undo: ['undo'],
  redo: ['redo'],
};

const HEADING_KEYS: Record<TBHeadingItems | 'heading', true> = {
  heading: true,
  paragraph: true,
  h1: true,
  h2: true,
  h3: true,
  h4: true,
  h5: true,
  h6: true,
};

const TABLE_KEYS: Record<TBTableItems | 'table', true> = {
  table: true,
  addColumnBefore: true,
  addColumnAfter: true,
  deleteColumn: true,
  addRowBefore: true,
  addRowAfter: true,
  deleteRow: true,
  deleteTable: true,
  mergeCells: true,
  splitCell: true,
  toggleHeaderRow: true,
  toggleHeaderColumn: true,
  toggleHeaderCell: true,
  setCellBackground: true,
  setCellBackgroundGreen: true,
  clearCellBackground: true,
  cellAlignStart: true,
  cellAlignCenter: true,
  cellAlignEnd: true,
  cellVAlignTop: true,
  cellVAlignMiddle: true,
  cellVAlignBottom: true,
  tableVariantBordered: true,
  tableVariantStriped: true,
  tableVariantBorderless: true,
  tableWidthAuto: true,
  tableWidthFull: true,
  tableAlignStart: true,
  tableAlignCenter: true,
  tableAlignEnd: true,
};

const EDITOR_KEYS = ['placeholder'];

const lookupKeys = (): string[] => Array.from(new Set([
  ...Object.values(TOOLBAR_KEYS).flat(),
  ...Object.keys(HEADING_KEYS),
  ...Object.keys(TABLE_KEYS),
  ...EDITOR_KEYS,
]));

describe('locale keys looked up by the library', () => {
  it('should have an English string for every key', () => {
    const missing = lookupKeys().filter((key) => !(key in en.locals));
    expect(missing).toEqual([]);
  });

  it('should list every command and table action of the menu', () => {
    TestBed.configureTestingModule({
      imports: [NgxEditorMenuComponent],
      providers: [provideZonelessChangeDetection()],
    });

    // the constructor sets the lists; no change detection, so no editor is needed
    const menu = TestBed.createComponent(NgxEditorMenuComponent).componentInstance;
    const commands = [...menu.toggleCommands, ...menu.insertCommands].map(String);

    expect(commands.filter((name) => !(name in TOOLBAR_KEYS))).toEqual([]);
    expect(menu.tableCommands.filter((name) => !(name in TABLE_KEYS))).toEqual([]);
  });

  it('should warn in development about a key without a string', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    try {
      const locals = new Locals();
      expect(await firstValueFrom(locals.get('font_size'))).toBe('');
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('"font_size"'));

      warn.mockClear();
      expect(await firstValueFrom(locals.get('bold'))).toBe('Bold');
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('should not warn about a key overridden with an empty string', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    try {
      const locals = new Locals({ bold: '' });
      expect(await firstValueFrom(locals.get('bold'))).toBe('');
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});

import { DOMParser, Node as ProseMirrorNode } from 'prosemirror-model';
import { type Command, EditorState, TextSelection, Transaction } from 'prosemirror-state';
import { CellSelection } from 'prosemirror-tables';
import { schema } from 'ngx-editor-rtl-ltr-edition/schema';

import { TBTableItems } from '../types';
import {
  TABLE_MENU_COMMANDS, getCellBackgrounds, setCellBackground, setCellsAttr, setTableAttr,
} from './TableCommands';

const TABLE = '<table><tbody>'
  + '<tr><th><p>h1</p></th><th><p>h2</p></th></tr>'
  + '<tr><td><p>a</p></td><td><p>b</p></td></tr>'
  + '</tbody></table><p>after</p>';

const createDoc = (html: string): ProseMirrorNode => {
  const element = document.createElement('div');
  element.innerHTML = html;
  return DOMParser.fromSchema(schema).parse(element);
};

// positions of the cells, in document order
const cellPositions = (doc: ProseMirrorNode): number[] => {
  const positions: number[] = [];
  doc.descendants((node, pos) => {
    if (node.type.spec['tableRole'] === 'cell' || node.type.spec['tableRole'] === 'header_cell') {
      positions.push(pos);
    }
  });
  return positions;
};

// a cursor in the text of the cell
const inCell = (html: string, index: number): EditorState => {
  const doc = createDoc(html);
  const pos = cellPositions(doc)[index] + 2;
  return EditorState.create({ doc, selection: TextSelection.create(doc, pos) });
};

const cellSelection = (html: string, from: number, to: number): EditorState => {
  const doc = createDoc(html);
  const cells = cellPositions(doc);
  const state = EditorState.create({ doc });
  return state.apply(state.tr.setSelection(CellSelection.create(doc, cells[from], cells[to])));
};

const outside = (): EditorState => {
  const doc = createDoc(TABLE);
  return EditorState.create({ doc, selection: TextSelection.atEnd(doc) });
};

// the state after the command, which must apply
const apply = (state: EditorState, command: Command): EditorState => {
  let next: EditorState | undefined;
  command(state, (tr: Transaction) => {
    next = state.apply(tr);
  });

  if (!next) {
    throw new Error('the command did not apply');
  }

  return next;
};

const run = (state: EditorState, item: TBTableItems): EditorState => apply(state, TABLE_MENU_COMMANDS[item].execute);

const cellAttrs = (state: EditorState, name: string): unknown[] => {
  return cellPositions(state.doc).map((pos) => state.doc.nodeAt(pos)?.attrs[name]);
};

const tableNodes = (state: EditorState): ProseMirrorNode[] => {
  const tables: ProseMirrorNode[] = [];
  state.doc.descendants((node) => {
    if (node.type.name === 'table') {
      tables.push(node);
    }
  });
  return tables;
};

const widthOf = (table: ProseMirrorNode): unknown => table.attrs['width'];

const tableAttrs = (state: EditorState): Record<string, unknown> => {
  return tableNodes(state)[0]?.attrs ?? {};
};

const NEW_ITEMS: TBTableItems[] = [
  'setCellBackground', 'cellAlignStart', 'cellAlignCenter', 'cellAlignEnd', 'cellVAlignTop', 'cellVAlignMiddle',
  'cellVAlignBottom', 'tableVariantBordered', 'tableVariantStriped', 'tableVariantBorderless', 'tableWidthAuto',
  'tableWidthFull', 'tableAlignStart', 'tableAlignCenter', 'tableAlignEnd',
];

describe('table commands', () => {
  it('should not be executable outside a table', () => {
    const state = outside();

    NEW_ITEMS.forEach((item) => {
      expect(TABLE_MENU_COMMANDS[item].canExecute(state)).toBe(false);
      expect(TABLE_MENU_COMMANDS[item].isActive(state)).toBe(false);
    });

    expect(setCellBackground('#fff')(state)).toBe(false);
    expect(setCellsAttr('align', 'center')(state)).toBe(false);
    expect(setTableAttr('variant', 'striped')(state)).toBe(false);
  });

  it('should keep the commands of prosemirror-tables, including the green background', () => {
    const state = inCell(TABLE, 2);

    expect(TABLE_MENU_COMMANDS.addColumnAfter.canExecute(state)).toBe(true);
    expect(TABLE_MENU_COMMANDS.addColumnAfter.isActive(state)).toBe(false);
    expect(TABLE_MENU_COMMANDS.mergeCells.canExecute(state)).toBe(false);

    const green = run(state, 'setCellBackgroundGreen');
    expect(cellAttrs(green, 'background')).toEqual([null, null, '#dfd', null]);

    const cleared = run(green, 'clearCellBackground');
    expect(cellAttrs(cleared, 'background')).toEqual([null, null, null, null]);
  });

  describe('cell alignment', () => {
    it('should align the cell around the cursor and toggle it back', () => {
      const state = inCell(TABLE, 1);
      expect(TABLE_MENU_COMMANDS.cellAlignCenter.isActive(state)).toBe(false);
      expect(TABLE_MENU_COMMANDS.cellAlignCenter.canExecute(state)).toBe(true);

      const centered = run(state, 'cellAlignCenter');
      expect(cellAttrs(centered, 'align')).toEqual([null, 'center', null, null]);
      expect(TABLE_MENU_COMMANDS.cellAlignCenter.isActive(centered)).toBe(true);
      expect(TABLE_MENU_COMMANDS.cellAlignEnd.isActive(centered)).toBe(false);

      const end = run(centered, 'cellAlignEnd');
      expect(cellAttrs(end, 'align')).toEqual([null, 'end', null, null]);

      const toggled = run(end, 'cellAlignEnd');
      expect(cellAttrs(toggled, 'align')).toEqual([null, null, null, null]);
    });

    it('should align every cell of a cell selection, and toggle only when all of them have the value', () => {
      const state = cellSelection(TABLE, 0, 3);

      const partly = run(inCell(TABLE, 0), 'cellAlignStart');
      expect(cellAttrs(partly, 'align')).toEqual(['start', null, null, null]);

      const all = run(state, 'cellAlignStart');
      expect(cellAttrs(all, 'align')).toEqual(['start', 'start', 'start', 'start']);
      expect(TABLE_MENU_COMMANDS.cellAlignStart.isActive(all)).toBe(true);

      const toggled = run(all, 'cellAlignStart');
      expect(cellAttrs(toggled, 'align')).toEqual([null, null, null, null]);
    });

    it.each<[TBTableItems, string]>([
      ['cellVAlignTop', 'top'],
      ['cellVAlignMiddle', 'middle'],
      ['cellVAlignBottom', 'bottom'],
    ])('should toggle %s', (item, value) => {
      const state = cellSelection(TABLE, 2, 3);

      const aligned = run(state, item);
      expect(cellAttrs(aligned, 'valign')).toEqual([null, null, value, value]);
      expect(TABLE_MENU_COMMANDS[item].isActive(aligned)).toBe(true);

      expect(cellAttrs(run(aligned, item), 'valign')).toEqual([null, null, null, null]);
    });
  });

  describe('cell background', () => {
    it('should set and remove the background of the selected cells', () => {
      const state = cellSelection(TABLE, 0, 1);
      expect(TABLE_MENU_COMMANDS.setCellBackground.canExecute(state)).toBe(true);
      expect(TABLE_MENU_COMMANDS.setCellBackground.isActive(state)).toBe(false);

      const next = apply(state, setCellBackground('#c5def5'));

      expect(cellAttrs(next, 'background')).toEqual(['#c5def5', '#c5def5', null, null]);
      expect(getCellBackgrounds(next)).toEqual(['#c5def5', '#c5def5']);
      expect(TABLE_MENU_COMMANDS.setCellBackground.isActive(next)).toBe(true);

      // nothing changes
      expect(setCellBackground('#c5def5')(next)).toBe(false);

      const removed = apply(next, setCellBackground(null));
      expect(cellAttrs(removed, 'background')).toEqual([null, null, null, null]);
    });

    it('should refuse a value that is not a colour', () => {
      expect(setCellBackground('red; position: fixed')(inCell(TABLE, 0))).toBe(false);
    });
  });

  describe('table attributes', () => {
    it.each<[TBTableItems, string, string]>([
      ['tableVariantStriped', 'variant', 'striped'],
      ['tableVariantBorderless', 'variant', 'borderless'],
      ['tableWidthFull', 'width', 'full'],
      ['tableAlignCenter', 'align', 'center'],
      ['tableAlignEnd', 'align', 'end'],
    ])('should set and toggle %s', (item, name, value) => {
      const state = inCell(TABLE, 2);
      expect(TABLE_MENU_COMMANDS[item].isActive(state)).toBe(false);

      const set = run(state, item);
      expect(tableAttrs(set)[name]).toBe(value);
      expect(TABLE_MENU_COMMANDS[item].isActive(set)).toBe(true);

      // toggling goes back to the default
      const toggled = run(set, item);
      expect(tableAttrs(toggled)[name]).toBe(tableAttrs(state)[name]);
    });

    it.each<[TBTableItems, TBTableItems]>([
      ['tableVariantBordered', 'tableVariantStriped'],
      ['tableWidthAuto', 'tableWidthFull'],
      ['tableAlignStart', 'tableAlignCenter'],
    ])('should show the default %s as active, not executable until another value is set', (item, other) => {
      const state = inCell(TABLE, 0);
      expect(TABLE_MENU_COMMANDS[item].isActive(state)).toBe(true);
      expect(TABLE_MENU_COMMANDS[item].canExecute(state)).toBe(false);

      const changed = run(state, other);
      expect(TABLE_MENU_COMMANDS[item].isActive(changed)).toBe(false);
      expect(TABLE_MENU_COMMANDS[item].canExecute(changed)).toBe(true);

      expect(TABLE_MENU_COMMANDS[item].isActive(run(changed, item))).toBe(true);
    });

    it('should change the table of a cell selection', () => {
      const state = cellSelection(TABLE, 0, 3);
      const striped = run(state, 'tableVariantStriped');

      expect(tableAttrs(striped)['variant']).toBe('striped');
    });

    it('should change the innermost table', () => {
      const nested = '<table><tbody><tr><td><table><tbody><tr><td><p>x</p></td></tr></tbody></table></td></tr></tbody></table>';
      const state = inCell(nested, 1);
      const full = run(state, 'tableWidthFull');

      expect(tableNodes(full).map(widthOf)).toEqual(['auto', 'full']);
    });
  });
});

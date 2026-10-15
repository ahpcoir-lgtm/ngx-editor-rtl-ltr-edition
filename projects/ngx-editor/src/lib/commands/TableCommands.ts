import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { Command, EditorState } from 'prosemirror-state';
import {
  CellSelection, addColumnAfter, addColumnBefore, addRowAfter, addRowBefore, deleteColumn, deleteRow, deleteTable,
  isInTable, mergeCells, selectionCell, setCellAttr, splitCell, toggleHeaderCell, toggleHeaderColumn, toggleHeaderRow,
} from 'prosemirror-tables';
import {
  type CellAlign, type CellVAlign, type TableAlign, type TableVariant, type TableWidth, TABLE_DEFAULTS, isCssColor,
} from 'ngx-editor-rtl-ltr-edition/schema';

import type { TBTableItems } from '../types';

type CellAttr = 'background' | 'align' | 'valign';
type TableAttr = keyof typeof TABLE_DEFAULTS;

/** a command of the table dropdown */
export interface TableMenuCommand {
  execute: Command;
  canExecute: (state: EditorState) => boolean;
  isActive: (state: EditorState) => boolean;
}

interface FoundNode {
  node: ProseMirrorNode;
  pos: number;
}

const isCellNode = (node: ProseMirrorNode): boolean => {
  const role: unknown = node.type.spec['tableRole'];
  return role === 'cell' || role === 'header_cell';
};

// the selected cells: every cell of a cell selection, else the cell around the cursor
const getSelectedCells = (state: EditorState): FoundNode[] => {
  if (!isInTable(state)) {
    return [];
  }

  const { selection } = state;

  if (selection instanceof CellSelection) {
    const cells: FoundNode[] = [];
    selection.forEachCell((node, pos) => {
      cells.push({ node, pos });
    });
    return cells;
  }

  const $cell = selectionCell(state);
  const node = $cell.nodeAfter;
  return node && isCellNode(node) ? [{ node, pos: $cell.pos }] : [];
};

// the innermost table around the selection
const getSelectedTable = (state: EditorState): FoundNode | null => {
  const { $from } = state.selection;

  for (let { depth } = $from; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.spec['tableRole'] === 'table') {
      return { node, pos: $from.before(depth) };
    }
  }

  return null;
};

const hasAttr = (node: ProseMirrorNode, name: string): boolean => {
  return Boolean(node.type.spec.attrs && name in node.type.spec.attrs);
};

/** sets an attribute on every selected cell; false when outside a table or nothing would change */
export const setCellsAttr = (name: CellAttr, value: string | null): Command => {
  return (state, dispatch) => {
    const cells = getSelectedCells(state).filter(({ node }) => hasAttr(node, name) && node.attrs[name] !== value);

    if (!cells.length) {
      return false;
    }

    if (dispatch) {
      const { tr } = state;
      cells.forEach(({ pos }) => tr.setNodeAttribute(pos, name, value));
      dispatch(tr);
    }

    return true;
  };
};

/** sets the background colour of the selected cells, `null` removes it */
export const setCellBackground = (color: string | null): Command => {
  return (state, dispatch) => {
    if (color !== null && !isCssColor(color)) {
      return false;
    }

    return setCellsAttr('background', color)(state, dispatch);
  };
};

/** whether every selected cell has the value */
const cellsHave = (state: EditorState, name: CellAttr, value: string): boolean => {
  const cells = getSelectedCells(state);
  return cells.length > 0 && cells.every(({ node }) => node.attrs[name] === value);
};

// set the value, or clear it when every selected cell already has it
const toggleCellAttr = (name: CellAttr, value: string): TableMenuCommand => {
  const execute: Command = (state, dispatch) => {
    const next = cellsHave(state, name, value) ? null : value;
    return setCellsAttr(name, next)(state, dispatch);
  };

  return {
    execute,
    canExecute: (state) => execute(state),
    isActive: (state) => cellsHave(state, name, value),
  };
};

/** sets an attribute of the table around the selection */
export const setTableAttr = (name: TableAttr, value: string): Command => {
  return (state, dispatch) => {
    const table = getSelectedTable(state);

    if (!table || !hasAttr(table.node, name) || table.node.attrs[name] === value) {
      return false;
    }

    dispatch?.(state.tr.setNodeAttribute(table.pos, name, value));
    return true;
  };
};

// set the value, or go back to the default when the table has it already
const toggleTableAttr = (name: TableAttr, value: string): TableMenuCommand => {
  const isActive = (state: EditorState): boolean => getSelectedTable(state)?.node.attrs[name] === value;

  const execute: Command = (state, dispatch) => {
    const next = isActive(state) ? TABLE_DEFAULTS[name] : value;
    return setTableAttr(name, next)(state, dispatch);
  };

  return {
    execute,
    canExecute: (state) => execute(state),
    isActive,
  };
};

// the commands of prosemirror-tables, which have no active state
const plain = (command: Command): TableMenuCommand => ({
  execute: command,
  canExecute: (state) => command(state),
  isActive: () => false,
});

/** the selected cells have a background */
export const hasCellBackground = (state: EditorState): boolean => {
  const cells = getSelectedCells(state);
  return cells.length > 0 && cells.some(({ node }) => Boolean(node.attrs['background']));
};

/** the background colours of the selected cells */
export const getCellBackgrounds = (state: EditorState): string[] => {
  const colors = getSelectedCells(state).map(({ node }): unknown => node.attrs['background']);
  return colors.filter((color): color is string => typeof color === 'string' && Boolean(color));
};

export const cellAlign = (value: CellAlign): TableMenuCommand => toggleCellAttr('align', value);
export const cellVAlign = (value: CellVAlign): TableMenuCommand => toggleCellAttr('valign', value);
export const tableVariant = (value: TableVariant): TableMenuCommand => toggleTableAttr('variant', value);
export const tableWidth = (value: TableWidth): TableMenuCommand => toggleTableAttr('width', value);
export const tableAlign = (value: TableAlign): TableMenuCommand => toggleTableAttr('align', value);

/** the commands of the table dropdown; `setCellBackground` opens a palette, this entry tells whether it can */
export const TABLE_MENU_COMMANDS: Record<TBTableItems, TableMenuCommand> = {
  addColumnBefore: plain(addColumnBefore),
  addColumnAfter: plain(addColumnAfter),
  deleteColumn: plain(deleteColumn),
  addRowBefore: plain(addRowBefore),
  addRowAfter: plain(addRowAfter),
  deleteRow: plain(deleteRow),
  deleteTable: plain(deleteTable),
  mergeCells: plain(mergeCells),
  splitCell: plain(splitCell),
  toggleHeaderRow: plain(toggleHeaderRow),
  toggleHeaderColumn: plain(toggleHeaderColumn),
  toggleHeaderCell: plain(toggleHeaderCell),
  setCellBackground: {
    execute: () => false,
    canExecute: (state) => getSelectedCells(state).some(({ node }) => hasAttr(node, 'background')),
    isActive: hasCellBackground,
  },
  setCellBackgroundGreen: plain(setCellAttr('background', '#dfd')),
  clearCellBackground: plain(setCellAttr('background', null)),
  cellAlignStart: cellAlign('start'),
  cellAlignCenter: cellAlign('center'),
  cellAlignEnd: cellAlign('end'),
  cellVAlignTop: cellVAlign('top'),
  cellVAlignMiddle: cellVAlign('middle'),
  cellVAlignBottom: cellVAlign('bottom'),
  tableVariantBordered: tableVariant('bordered'),
  tableVariantStriped: tableVariant('striped'),
  tableVariantBorderless: tableVariant('borderless'),
  tableWidthAuto: tableWidth('auto'),
  tableWidthFull: tableWidth('full'),
  tableAlignStart: tableAlign('start'),
  tableAlignCenter: tableAlign('center'),
  tableAlignEnd: tableAlign('end'),
};

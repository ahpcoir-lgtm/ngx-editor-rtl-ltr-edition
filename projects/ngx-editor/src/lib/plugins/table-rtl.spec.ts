import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { TextSelection } from 'prosemirror-state';
import { CellSelection, columnResizingPluginKey } from 'prosemirror-tables';

import Editor from '../Editor';
import { getDraggedWidth, getResizeEdge, tableRtlNavigation } from './table-rtl';

// two columns of 100px: in a right to left table the first column is on the right (200-300)
const RTL_COLUMNS = [{ left: 200, right: 300 }, { left: 100, right: 200 }];
const LTR_COLUMNS = [{ left: 100, right: 200 }, { left: 200, right: 300 }];

const tableHtml = (dir: string): string => `<table dir="${dir}"><tbody>`
  + '<tr><td data-colwidth="100"><p>a</p></td><td data-colwidth="100"><p>b</p></td></tr>'
  + '<tr><td data-colwidth="100"><p>c</p></td><td data-colwidth="100"><p>d</p></td></tr>'
  + '</tbody></table>';

const cellPositions = (doc: ProseMirrorNode): number[] => {
  const positions: number[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === 'table_cell') {
      positions.push(pos);
    }
  });
  return positions;
};

const directionOf = (element: Element): CSSStyleDeclaration => {
  return { direction: element.closest('[dir="rtl"]') ? 'rtl' : 'ltr' } as CSSStyleDeclaration;
};

interface Setup {
  editor: Editor;
  restore: () => void;
}

// jsdom has no layout: the direction comes from the `dir` attribute and the cells get the boxes above
const setup = (dir: 'ltr' | 'rtl'): Setup => {
  const editor = new Editor({ content: tableHtml(dir) });
  const { view } = editor;
  const columns = dir === 'rtl' ? RTL_COLUMNS : LTR_COLUMNS;
  const cells = cellPositions(view.state.doc);

  const style = vi.spyOn(window, 'getComputedStyle').mockImplementation(directionOf);

  for (const row of Array.from(view.dom.querySelectorAll('tr'))) {
    Array.from(row.querySelectorAll('td')).forEach((td, col) => {
      vi.spyOn(td, 'getBoundingClientRect').mockReturnValue(columns[col] as DOMRect);
    });
  }

  // a point inside a column of the first row
  const coords = vi.spyOn(view, 'posAtCoords').mockImplementation(({ left }) => {
    const col = columns.findIndex((column) => left >= column.left && left < column.right);
    return col === -1 ? null : { pos: cells[col] + 2, inside: -1 };
  });

  const restore = (): void => {
    style.mockRestore();
    coords.mockRestore();
    editor.destroy();
  };

  return { editor, restore };
};

const cellDom = (editor: Editor, index: number): HTMLElement => {
  return editor.view.dom.querySelectorAll<HTMLElement>('td')[index];
};

// the active resize handle after moving the mouse over the cell
const hover = (editor: Editor, index: number, clientX: number): number => {
  cellDom(editor, index).dispatchEvent(new MouseEvent('mousemove', { clientX, clientY: 10, bubbles: true }));
  return columnResizingPluginKey.getState(editor.view.state)?.activeHandle ?? -2;
};

const colwidths = (editor: Editor): unknown[] => {
  const { doc } = editor.view.state;
  return cellPositions(doc).map((pos) => doc.nodeAt(pos)?.attrs['colwidth']);
};

describe('table plugins: resize handle logic', () => {
  const rect = { left: 100, right: 200 };

  it('should take the physical right edge as the end of a left to right cell', () => {
    expect(getResizeEdge(rect, 197, 5, false)).toBe('end');
    expect(getResizeEdge(rect, 103, 5, false)).toBe('start');
    expect(getResizeEdge(rect, 150, 5, false)).toBeNull();
  });

  it('should take the physical left edge as the end of a right to left cell', () => {
    expect(getResizeEdge(rect, 103, 5, true)).toBe('end');
    expect(getResizeEdge(rect, 197, 5, true)).toBe('start');
    expect(getResizeEdge(rect, 150, 5, true)).toBeNull();
  });

  it('should grow a left to right column when dragged to the right', () => {
    const dragging = { startX: 500, startWidth: 100 };
    expect(getDraggedWidth(dragging, 530, 25, false)).toBe(130);
    expect(getDraggedWidth(dragging, 470, 25, false)).toBe(70);
  });

  it('should grow a right to left column when dragged to the left, and keep the minimum width', () => {
    const dragging = { startX: 500, startWidth: 100 };
    expect(getDraggedWidth(dragging, 470, 25, true)).toBe(130);
    expect(getDraggedWidth(dragging, 530, 25, true)).toBe(70);
    expect(getDraggedWidth(dragging, 900, 25, true)).toBe(25);
  });
});

describe('table plugins: column resizing in the editor', () => {
  let current: Setup | null = null;

  const start = (dir: 'ltr' | 'rtl'): Editor => {
    current = setup(dir);
    return current.editor;
  };

  afterEach(() => {
    current?.restore();
    current = null;
  });

  it('should take the column whose inline-end edge is under the mouse in a right to left table', () => {
    const editor = start('rtl');
    const [first, second] = cellPositions(editor.view.state.doc);

    // the left edge of the first (right) column is its end
    expect(hover(editor, 0, 203)).toBe(first);
    // its right edge is the start of the table
    expect(hover(editor, 0, 297)).toBe(-1);
    // the right edge of the second column is the end of the first one
    expect(hover(editor, 1, 197)).toBe(first);
    // the left edge of the second column is its end
    expect(hover(editor, 1, 103)).toBe(second);
    // away from the edges
    expect(hover(editor, 1, 150)).toBe(-1);
  });

  it('should leave left to right tables to prosemirror-tables', () => {
    const editor = start('ltr');
    const [first, second] = cellPositions(editor.view.state.doc);

    expect(hover(editor, 0, 197)).toBe(first);
    expect(hover(editor, 0, 103)).toBe(-1);
    expect(hover(editor, 1, 203)).toBe(first);
    expect(hover(editor, 1, 297)).toBe(second);
  });

  it('should widen a right to left column when its handle is dragged to the left', () => {
    const editor = start('rtl');
    expect(hover(editor, 0, 203)).toBe(cellPositions(editor.view.state.doc)[0]);

    cellDom(editor, 0).dispatchEvent(new MouseEvent('mousedown', { clientX: 203, clientY: 10, button: 0, bubbles: true }));
    expect(columnResizingPluginKey.getState(editor.view.state)?.dragging).toEqual({ startX: 203, startWidth: 100 });

    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 183, buttons: 1 }));
    expect(colwidths(editor)).toEqual([[100], [100], [100], [100]]);

    window.dispatchEvent(new MouseEvent('mouseup', { clientX: 173 }));
    expect(colwidths(editor)).toEqual([[130], [100], [130], [100]]);
    expect(columnResizingPluginKey.getState(editor.view.state)?.dragging).toBeNull();
  });

  it('should narrow a left to right column dragged to the left, as before', () => {
    const editor = start('ltr');
    expect(hover(editor, 0, 197)).toBe(cellPositions(editor.view.state.doc)[0]);

    cellDom(editor, 0).dispatchEvent(new MouseEvent('mousedown', { clientX: 197, clientY: 10, button: 0, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: 167 }));

    expect(colwidths(editor)).toEqual([[70], [100], [70], [100]]);
  });
});

describe('table plugins: keyboard in a right to left table', () => {
  let current: Setup;
  let editor: Editor;

  beforeEach(() => {
    current = setup('rtl');
    ({ editor } = current);
    vi.spyOn(editor.view, 'endOfTextblock').mockReturnValue(true);
  });

  afterEach(() => {
    current.restore();
  });

  const select = (cell: number, offset: number): void => {
    const { view } = editor;
    const pos = cellPositions(view.state.doc)[cell] + 2 + offset;
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, pos)));
  };

  const press = (key: string, shiftKey = false): void => {
    editor.view.dom.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }));
  };

  // the index of the cell with the head of the selection
  const headCell = (): number => {
    const { selection, doc } = editor.view.state;
    const head = selection instanceof CellSelection ? selection.$headCell.pos + 1 : selection.head;
    return cellPositions(doc).filter((pos) => pos < head).length - 1;
  };

  it('should move to the cell on the left with ArrowLeft, which is the next cell', () => {
    select(0, 1);
    press('ArrowLeft');
    expect(headCell()).toBe(1);

    select(1, 0);
    press('ArrowRight');
    expect(headCell()).toBe(0);
  });

  it('should extend a cell selection to the left with Shift-ArrowLeft', () => {
    select(0, 1);
    press('ArrowLeft', true);

    expect(editor.view.state.selection).toBeInstanceOf(CellSelection);
    expect(headCell()).toBe(1);
  });

  it('should keep Tab and Shift-Tab in the logical order', () => {
    select(0, 0);
    press('Tab');
    expect(headCell()).toBe(1);

    press('Tab');
    expect(headCell()).toBe(2);

    press('Tab', true);
    expect(headCell()).toBe(1);
  });

  it('should leave the keys in left to right tables to prosemirror-tables', () => {
    const plugin = tableRtlNavigation();
    const handleKeyDown = plugin.props.handleKeyDown as (view: unknown, event: KeyboardEvent) => boolean;
    vi.mocked(window.getComputedStyle).mockReturnValue({ direction: 'ltr' } as CSSStyleDeclaration);

    select(0, 1);
    expect(handleKeyDown.call(plugin, editor.view, new KeyboardEvent('keydown', { key: 'ArrowLeft' }))).toBe(false);
  });
});

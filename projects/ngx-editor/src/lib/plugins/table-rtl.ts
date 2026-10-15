import type { Node as ProseMirrorNode, ResolvedPos } from 'prosemirror-model';
import { type Command, Plugin, PluginKey, Selection, TextSelection } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import {
  CellSelection, type ColumnResizingOptions, type Dragging, TableMap, cellAround, columnResizing,
  columnResizingPluginKey, nextCell, updateColumnsOnResize,
} from 'prosemirror-tables';

// Column resizing and horizontal arrow keys of prosemirror-tables assume that the first column is on the left.
// In a right to left table the plugin takes the column on the wrong side of the edge under the mouse, grows the
// column when dragged towards its start, and the arrow keys move to the cell on the other side. The plugins here
// run before the ones of prosemirror-tables and handle right to left tables themselves; left to right tables are
// left to the original code. The handle is the same decoration (`.column-resize-handle` at the end of the cell),
// placed on the inline-end edge by the stylesheet.

/** the edge of a cell under the mouse: `end` resizes the cell's column, `start` the column before it */
export type ResizeEdge = 'start' | 'end';

interface Rect {
  left: number;
  right: number;
}

const DEFAULTS = {
  handleWidth: 5,
  cellMinWidth: 25,
  defaultCellMinWidth: 100,
  lastColumnResizable: true,
};

export const isRtlElement = (element: Element | null): boolean => {
  if (!element) {
    return false;
  }

  const win = element.ownerDocument.defaultView;
  return win?.getComputedStyle(element).direction === 'rtl';
};

/** the logical edge of the cell within `handleWidth` of the mouse, or null */
export const getResizeEdge = (rect: Rect, clientX: number, handleWidth: number, rtl: boolean): ResizeEdge | null => {
  if (clientX - rect.left <= handleWidth) {
    return rtl ? 'end' : 'start';
  }

  if (rect.right - clientX <= handleWidth) {
    return rtl ? 'start' : 'end';
  }

  return null;
};

/** the width while dragging: in a right to left table the end edge is on the left, so moving left grows it */
export const getDraggedWidth = (dragging: Dragging, clientX: number, minWidth: number, rtl: boolean): number => {
  const offset = (clientX - dragging.startX) * (rtl ? -1 : 1);
  return Math.max(minWidth, dragging.startWidth + offset);
};

const domCellAround = (target: EventTarget | null): HTMLElement | null => {
  let node = target as HTMLElement | null;

  while (node && node.nodeName !== 'TD' && node.nodeName !== 'TH') {
    node = node.classList?.contains('ProseMirror') ? null : node.parentNode as HTMLElement | null;
  }

  return node;
};

interface EdgeOptions {
  handleWidth: number;
  rtl: boolean;
}

/** the position of the cell whose column the edge resizes, -1 when none */
export const getEdgeCell = (view: EditorView, event: MouseEvent, edge: ResizeEdge, options: EdgeOptions): number => {
  const { handleWidth, rtl } = options;

  // a point inside the cell under the mouse, away from the edge
  const inward = (edge === 'end') === rtl ? handleWidth : -handleWidth;
  const found = view.posAtCoords({ left: event.clientX + inward, top: event.clientY });

  if (!found) {
    return -1;
  }

  const $cell = cellAround(view.state.doc.resolve(found.pos));
  if (!$cell) {
    return -1;
  }

  if (edge === 'end') {
    return $cell.pos;
  }

  const map = TableMap.get($cell.node(-1));
  const start = $cell.start(-1);
  const index = map.map.indexOf($cell.pos - start);

  return index % map.width === 0 ? -1 : start + map.map[index - 1];
};

const getLastColumn = ($cell: ResolvedPos): number => {
  const map = TableMap.get($cell.node(-1));
  const attrs = $cell.nodeAfter?.attrs ?? {};
  return map.colCount($cell.pos - $cell.start(-1)) + Number(attrs['colspan'] ?? 1) - 1;
};

const setHandle = (view: EditorView, cell: number): void => {
  view.dispatch(view.state.tr.setMeta(columnResizingPluginKey, { setHandle: cell }));
};

// the plugin functions below follow `currentColWidth`, `updateColumnWidth` and `displayColumnWidth` of
// prosemirror-tables, which are not exported
const currentColWidth = (view: EditorView, cellPos: number, cell: ProseMirrorNode): number => {
  const colwidth = cell.attrs['colwidth'] as number[] | null;
  const colspan = Number(cell.attrs['colspan'] ?? 1);
  const width = colwidth?.[colwidth.length - 1];

  if (width) {
    return width;
  }

  const dom = view.domAtPos(cellPos);
  let domWidth = (dom.node.childNodes[dom.offset] as HTMLElement).offsetWidth;
  let parts = colspan;

  colwidth?.slice(0, colspan).forEach((part) => {
    if (part) {
      domWidth -= part;
      parts--;
    }
  });

  return domWidth / parts;
};

const updateColumnWidth = (view: EditorView, cell: number, width: number): void => {
  const $cell = view.state.doc.resolve(cell);
  const table = $cell.node(-1);
  const map = TableMap.get(table);
  const start = $cell.start(-1);
  const col = getLastColumn($cell);
  const { tr } = view.state;

  for (let row = 0; row < map.height; row++) {
    const mapIndex = row * map.width + col;

    const pos = map.map[mapIndex];
    const { attrs } = table.nodeAt(pos) as ProseMirrorNode;
    const index = attrs['colspan'] === 1 ? 0 : col - map.colCount(pos);
    const current = attrs['colwidth'] as number[] | null;

    // a cell spanning rows is set once
    const spanned = row > 0 && pos === map.map[mapIndex - map.width];

    if (!spanned && current?.[index] !== width) {
      const colwidth = current ? current.slice() : Array<number>(Number(attrs['colspan'])).fill(0);
      colwidth[index] = width;
      tr.setNodeMarkup(start + pos, null, { ...attrs, colwidth });
    }
  }

  if (tr.docChanged) {
    view.dispatch(tr);
  }
};

const displayColumnWidth = (view: EditorView, cell: number, width: number, defaultCellMinWidth: number): void => {
  const $cell = view.state.doc.resolve(cell);
  const table = $cell.node(-1);
  const col = getLastColumn($cell);
  let dom: Node | null = view.domAtPos($cell.start(-1)).node;

  while (dom && dom.nodeName !== 'TABLE') {
    dom = dom.parentNode;
  }

  if (dom) {
    const tableDom = dom as HTMLTableElement;
    updateColumnsOnResize(table, tableDom.firstChild as HTMLTableColElement, tableDom, defaultCellMinWidth, col, width);
  }
};

const handleMouseMove = (view: EditorView, event: MouseEvent, options: typeof DEFAULTS): boolean => {
  const pluginState = columnResizingPluginKey.getState(view.state);
  const target = domCellAround(event.target);

  if (!view.editable || !pluginState || pluginState.dragging || !isRtlElement(target)) {
    return false;
  }

  const edge = getResizeEdge(target!.getBoundingClientRect(), event.clientX, options.handleWidth, true);
  let cell = edge ? getEdgeCell(view, event, edge, { handleWidth: options.handleWidth, rtl: true }) : -1;

  if (cell !== -1 && !options.lastColumnResizable) {
    const $cell = view.state.doc.resolve(cell);
    if (getLastColumn($cell) === TableMap.get($cell.node(-1)).width - 1) {
      cell = -1;
    }
  }

  if (cell !== pluginState.activeHandle) {
    setHandle(view, cell);
  }

  // the original handler would take the column on the other side
  return true;
};

const handleMouseDown = (view: EditorView, event: MouseEvent, options: typeof DEFAULTS): boolean => {
  const pluginState = columnResizingPluginKey.getState(view.state);

  if (!view.editable || !pluginState || pluginState.activeHandle === -1 || pluginState.dragging) {
    return false;
  }

  const cellDom = view.nodeDOM(pluginState.activeHandle);
  const cell = view.state.doc.nodeAt(pluginState.activeHandle);

  if (!cell || !(cellDom instanceof HTMLElement) || !isRtlElement(cellDom)) {
    return false;
  }

  const win = view.dom.ownerDocument.defaultView ?? window;
  const startWidth = currentColWidth(view, pluginState.activeHandle, cell);
  view.dispatch(view.state.tr.setMeta(columnResizingPluginKey, { setDragging: { startX: event.clientX, startWidth } }));

  // one listener for mousemove and mouseup; a move without a pressed button ends the drag too
  const onDrag = (e: MouseEvent): void => {
    const state = columnResizingPluginKey.getState(view.state);
    const width = state?.dragging ? getDraggedWidth(state.dragging, e.clientX, options.cellMinWidth, true) : null;

    if (e.type === 'mousemove' && e.buttons) {
      if (state && width !== null) {
        displayColumnWidth(view, state.activeHandle, width, options.defaultCellMinWidth);
      }
      return;
    }

    win.removeEventListener('mouseup', onDrag);
    win.removeEventListener('mousemove', onDrag);

    if (state && width !== null) {
      updateColumnWidth(view, state.activeHandle, width);
      view.dispatch(view.state.tr.setMeta(columnResizingPluginKey, { setDragging: null }));
    }
  };

  displayColumnWidth(view, pluginState.activeHandle, startWidth, options.defaultCellMinWidth);
  win.addEventListener('mouseup', onDrag);
  win.addEventListener('mousemove', onDrag);
  event.preventDefault();

  return true;
};

export const tableRtlResizingKey = new PluginKey('tableColumnResizingRtl');

/**
 * `columnResizing` of prosemirror-tables that also works in right to left tables: the plugin that handles them,
 * followed by the original plugin. Takes the same options.
 */
export const tableColumnResizing = (options: ColumnResizingOptions = {}): Plugin[] => {
  const resolved = {
    handleWidth: options.handleWidth ?? DEFAULTS.handleWidth,
    cellMinWidth: options.cellMinWidth ?? DEFAULTS.cellMinWidth,
    defaultCellMinWidth: options.defaultCellMinWidth ?? DEFAULTS.defaultCellMinWidth,
    lastColumnResizable: options.lastColumnResizable ?? DEFAULTS.lastColumnResizable,
  };

  const rtlPlugin = new Plugin({
    key: tableRtlResizingKey,
    props: {
      handleDOMEvents: {
        mousemove: (view, event) => handleMouseMove(view, event, resolved),
        mousedown: (view, event) => handleMouseDown(view, event, resolved),
      },
    },
  });

  return [rtlPlugin, columnResizing(options)];
};

// the cell around the head of a text selection, when the selection is at its edge in the logical direction,
// like `atEndOfCell` of prosemirror-tables; `side` is the physical side passed to `endOfTextblock`
const atEndOfCell = (view: EditorView, dir: number, side: 'left' | 'right'): number | null => {
  const { selection } = view.state;

  if (!(selection instanceof TextSelection)) {
    return null;
  }

  const { $head } = selection;

  for (let depth = $head.depth - 1; depth >= 0; depth--) {
    const parent = $head.node(depth);
    const atEdge = dir < 0 ? $head.index(depth) === 0 : $head.indexAfter(depth) === parent.childCount;

    if (!atEdge) {
      return null;
    }

    const role: unknown = parent.type.spec['tableRole'];
    if (role === 'cell' || role === 'header_cell') {
      const cellPos = $head.before(depth);
      return view.endOfTextblock(side) ? cellPos : null;
    }
  }

  return null;
};

// whether the cell at the position is laid out right to left
const isRtlCell = (view: EditorView, cellPos: number): boolean => {
  const dom = view.nodeDOM(cellPos);
  return dom instanceof Element && isRtlElement(dom);
};

const selectionCellPos = (view: EditorView): number | null => {
  const { selection } = view.state;

  if (selection instanceof CellSelection) {
    return selection.$headCell.pos;
  }

  const $cell = cellAround(selection.$head);
  return $cell ? $cell.pos : null;
};

// Left / Right (with Shift: extend the cell selection) in a right to left table: the logical direction is the
// opposite of the key
const rtlArrow = (side: 'left' | 'right', extend: boolean): Command => {
  return (state, dispatch, view) => {
    const cellPos = view ? selectionCellPos(view) : null;

    if (!view || cellPos === null || !isRtlCell(view, cellPos)) {
      return false;
    }

    const dir = side === 'left' ? 1 : -1;
    const sel = state.selection;
    const apply = (selection: Selection): boolean => {
      if (selection.eq(sel)) {
        return false;
      }

      dispatch?.(state.tr.setSelection(selection).scrollIntoView());
      return true;
    };

    if (extend) {
      let cellSel = sel instanceof CellSelection ? sel : null;

      if (!cellSel) {
        const end = atEndOfCell(view, dir, side);
        if (end === null) {
          return false;
        }
        cellSel = new CellSelection(state.doc.resolve(end));
      }

      const $head = nextCell(cellSel.$headCell, 'horiz', dir);
      return $head ? apply(new CellSelection(cellSel.$anchorCell, $head)) : false;
    }

    if (sel instanceof CellSelection) {
      return apply(Selection.near(sel.$headCell, dir));
    }

    if (atEndOfCell(view, dir, side) === null) {
      return false;
    }

    return apply(Selection.near(state.doc.resolve(sel.head + dir), dir));
  };
};

const ARROWS: Record<string, Command> = {
  'ArrowLeft': rtlArrow('left', false),
  'ArrowRight': rtlArrow('right', false),
  'Shift-ArrowLeft': rtlArrow('left', true),
  'Shift-ArrowRight': rtlArrow('right', true),
};

/** the horizontal arrow keys of `tableEditing` for right to left tables; register it before `tableEditing` */
export const tableRtlNavigation = (): Plugin => {
  return new Plugin({
    key: new PluginKey('tableRtlNavigation'),
    props: {
      handleKeyDown(view, event) {
        if (event.altKey || event.ctrlKey || event.metaKey) {
          return false;
        }

        const name = `${event.shiftKey ? 'Shift-' : ''}${event.key}`;
        const command = ARROWS[name];

        return command ? command(view.state, view.dispatch, view) : false;
      },
    },
  });
};

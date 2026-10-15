import { type EditorState, NodeSelection, type Command } from 'prosemirror-state';
import { Attrs, Node as ProseMirrorNode } from 'prosemirror-model';
import { Dispatch } from './types';

export interface TableInsertOptions {
  /** a first row with one header cell per column, above the `rows` body rows; default `true` */
  headerRow?: boolean;
  /** attributes of the new table, e.g. `{ variant: 'striped', width: 'full' }` */
  attrs?: Attrs;
}

const isCount = (value: number, min: number): boolean => Number.isInteger(value) && value >= min;

class Table {
  /** inserts a table with `rows` body rows and `cols` columns, plus a header row unless `headerRow` is false */
  insert(rows: number, cols: number, options: TableInsertOptions = {}): Command {
    return (state: EditorState, dispatch?: Dispatch): boolean => {
      const { schema, tr } = state;
      const tableType = schema.nodes['table'];
      const rowType = schema.nodes['table_row'];
      const cellType = schema.nodes['table_cell'];
      const headerType = schema.nodes['table_header'];
      const headerRow = options.headerRow ?? true;

      if (!tableType || !rowType || !cellType || !headerType) {
        return false;
      }

      // a table needs one row at least, which may be the header row
      if (!isCount(cols, 1) || !isCount(rows, headerRow ? 0 : 1)) {
        return false;
      }

      // createAndFill gives null only for a cell type whose content cannot be filled in
      const createRow = (type: typeof cellType): ProseMirrorNode | null => {
        const cells: ProseMirrorNode[] = [];
        for (let j = 0; j < cols; j++) {
          const cell = type.createAndFill(null);
          if (!cell) {
            return null;
          }
          cells.push(cell);
        }
        return rowType.create(null, cells);
      };

      const rowTypes = [...(headerRow ? [headerType] : []), ...Array<typeof cellType>(rows).fill(cellType)];
      const tableRows = rowTypes.map(createRow).filter((row): row is ProseMirrorNode => row !== null);

      if (tableRows.length !== rowTypes.length) {
        return false;
      }

      const table = tableType.create(options.attrs ?? null, tableRows);
      tr.replaceSelectionWith(table).scrollIntoView();

      if (tr.docChanged) {
        dispatch?.(tr);
        return true;
      }

      return false;
    };
  }

  isActive(state: EditorState): boolean {
    const { selection } = state;
    if (selection instanceof NodeSelection) {
      return selection.node.type.name === 'table';
    }
    return false;
  }
}

export default Table;

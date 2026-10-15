import { Node as ProseMirrorNode } from 'prosemirror-model';
import { TableView } from 'prosemirror-tables';
import { getTableDataAttributes } from 'ngx-editor-rtl-ltr-edition/schema';

import { setOptionalAttribute } from './set-attribute';

const DATA_ATTRIBUTES = ['data-variant', 'data-width', 'data-align'];

// the table view of the column resizing plugin, which renders the table without its `toDOM`,
// so the `dir` and `data-*` attributes are written here (the inline style of `toDOM` is left to the editor CSS,
// as the view sets the width itself)
export class DirectionTableView extends TableView {
  constructor(node: ProseMirrorNode, defaultCellMinWidth: number) {
    super(node, defaultCellMinWidth);
    this.render();
  }

  override update(node: ProseMirrorNode): boolean {
    if (!super.update(node)) {
      return false;
    }

    this.render();
    return true;
  }

  private render(): void {
    setOptionalAttribute(this.table, 'dir', this.node.attrs['dir']);

    const data = getTableDataAttributes(this.node.attrs);
    DATA_ATTRIBUTES.forEach((name) => setOptionalAttribute(this.table, name, data[name]));
  }
}

export default DirectionTableView;

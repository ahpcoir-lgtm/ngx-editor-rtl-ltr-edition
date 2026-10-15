import { Node as ProseMirrorNode } from 'prosemirror-model';
import { TableView } from 'prosemirror-tables';

import { setOptionalAttribute } from './set-attribute';

// the table view of the column resizing plugin, which renders the table without its `toDOM`,
// so the `dir` attribute is written here
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
  }
}

export default DirectionTableView;

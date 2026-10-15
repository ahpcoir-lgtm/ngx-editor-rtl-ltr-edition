import type { EditorState, Command, Transaction } from 'prosemirror-state';

import { getSelectionMarks, isMarkActive } from 'ngx-editor-rtl-ltr-edition/helpers';
import { applyMark, removeMark } from 'ngx-editor-rtl-ltr-edition/commands';
import { normalizeFontFamily } from 'ngx-editor-rtl-ltr-edition/utils';

const NAME = 'font_family';

// like the text colour: no font on a selected atom such as an image
const isAtomSelected = (state: EditorState): boolean => {
  const { from, to, empty } = state.selection;

  if (empty || from + 1 !== to) {
    return false;
  }

  const node = state.doc.nodeAt(from);
  return Boolean(node?.isAtom && !node.isText && node.isLeaf);
};

class FontFamily {
  /** sets the font of the selection (or of the text typed next), replacing another font */
  apply(family: string): Command {
    return (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
      const type = state.schema.marks[NAME];
      const value = normalizeFontFamily(family);

      if (!type || !value || isAtomSelected(state)) {
        return false;
      }

      return applyMark(type, { family: value })(state, dispatch);
    };
  }

  /** removes the font, so the text has the font of the page */
  remove(): Command {
    return (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
      const type = state.schema.marks[NAME];

      if (!type) {
        return false;
      }

      return removeMark(type)(state, dispatch);
    };
  }

  isActive(state: EditorState): boolean {
    const type = state.schema.marks[NAME];
    return Boolean(type) && isMarkActive(state, type);
  }

  /** the fonts of the selection (or the stored font at the cursor) */
  getActiveFamilies(state: EditorState): string[] {
    if (!this.isActive(state)) {
      return [];
    }

    const type = state.schema.marks[NAME];
    const families = getSelectionMarks(state)
      .filter((mark) => mark.type === type)
      .map((mark) => mark.attrs['family'] as string | null)
      .filter((family): family is string => Boolean(family));

    return Array.from(new Set(families));
  }

  canExecute(state: EditorState): boolean {
    return this.apply('serif')(state);
  }
}

export default FontFamily;

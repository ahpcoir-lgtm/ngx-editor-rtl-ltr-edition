import { Fragment, Mark, MarkType, Node as ProseMirrorNode, Slice } from 'prosemirror-model';
import { Plugin, PluginKey } from 'prosemirror-state';

import { findFont } from '../fonts/config';
import type { NgxEditorFont } from '../fonts/types';

// a configured font gets the stack of the config; any other font is dropped
const mapMarks = (marks: readonly Mark[], type: MarkType, fonts: NgxEditorFont[]): readonly Mark[] => {
  return marks.flatMap((mark) => {
    if (mark.type !== type) {
      return [mark];
    }

    const font = findFont(fonts, mark.attrs['family'] as string | null);
    return font ? [type.create({ family: font.family })] : [];
  });
};

const mapFragment = (fragment: Fragment, type: MarkType, fonts: NgxEditorFont[]): Fragment => {
  const children: ProseMirrorNode[] = [];

  fragment.forEach((child) => {
    const node = child.isText || child.isLeaf ? child : child.copy(mapFragment(child.content, type, fonts));
    children.push(node.mark(mapMarks(node.marks, type, fonts)));
  });

  return Fragment.fromArray(children);
};

/**
 * Pasted content keeps only the fonts of the font menu: Word and Google Docs put a font on every run of text
 * (`Calibri`, `Arial`...), which would override the font of the page.
 */
export const fontFamilyPaste = (getFonts: () => NgxEditorFont[]): Plugin => {
  return new Plugin({
    key: new PluginKey('fontFamilyPaste'),
    props: {
      transformPasted(slice, view) {
        const type = view.state.schema.marks['font_family'];

        if (!type) {
          return slice;
        }

        return new Slice(mapFragment(slice.content, type, getFonts()), slice.openStart, slice.openEnd);
      },
    },
  });
};

export default fontFamilyPaste;

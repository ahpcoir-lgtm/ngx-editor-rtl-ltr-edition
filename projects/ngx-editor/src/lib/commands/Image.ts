import { type EditorState, NodeSelection, type Command } from 'prosemirror-state';

import { sanitizeUrl } from 'ngx-editor-rtl-ltr-edition/utils';
import type { ImageAlign } from 'ngx-editor-rtl-ltr-edition/schema';

import { Dispatch } from './types';

export interface ImageAttrs {
  alt?: string;
  title?: string;
  width?: string;
  height?: string;
  align?: ImageAlign | null;
}

class Image {
  // inserts an image, or replaces the selected image; a selected figure keeps its caption and gets the new image.
  // A `src` that sanitizeUrl rejects is not inserted.
  insert(src: string, attrs: ImageAttrs): Command {
    return (state: EditorState, dispatch?: Dispatch): boolean => {
      const { schema, tr, selection } = state;

      const type = schema.nodes['image'];
      const safeSrc = sanitizeUrl(src, 'image');
      if (!type || !safeSrc) {
        return false;
      }

      if (selection instanceof NodeSelection && selection.node.type === schema.nodes['figure']) {
        const { node, from } = selection;
        tr.setNodeMarkup(from, null, { ...node.attrs, ...attrs, src: safeSrc });
        tr.setSelection(NodeSelection.create(tr.doc, from)).scrollIntoView();
        dispatch?.(tr);
        return true;
      }

      const imageAttrs: Record<string, unknown> = {
        width: null,
        ...attrs,
        src: safeSrc,
      };

      if (!imageAttrs['width'] && selection instanceof NodeSelection && selection.node.type === type) {
        imageAttrs['width'] = selection.node.attrs['width'];
      }

      const image = type.createAndFill(imageAttrs);
      if (!image) {
        return false;
      }

      tr.replaceSelectionWith(image);

      const resolvedPos = tr.doc.resolve(
        tr.selection.anchor - (tr.selection.$anchor.nodeBefore?.nodeSize ?? 0),
      );

      tr
        .setSelection(new NodeSelection(resolvedPos))
        .scrollIntoView();

      if (tr.docChanged) {
        dispatch?.(tr);
        return true;
      }

      return false;
    };
  }

  // an image or a captioned image (figure) is selected
  isActive(state: EditorState): boolean {
    const { selection } = state;
    if (selection instanceof NodeSelection) {
      return ['image', 'figure'].includes(selection.node.type.name);
    }

    return false;
  }
}

export default Image;

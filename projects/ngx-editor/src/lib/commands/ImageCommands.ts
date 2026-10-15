import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { type Command, type EditorState, NodeSelection, type Transaction } from 'prosemirror-state';

import { sanitizeUrl } from 'ngx-editor-rtl-ltr-edition/utils';
import { type ImageAlign, isImageAlign } from 'ngx-editor-rtl-ltr-edition/schema';

export interface ImageTarget {
  node: ProseMirrorNode;
  pos: number;
}

const isImageType = (node: ProseMirrorNode | null | undefined): node is ProseMirrorNode => {
  return Boolean(node && (node.type.name === 'image' || node.type.name === 'figure'));
};

/** the image or figure at `pos`, else the selected one */
export const getImageTarget = (state: EditorState, pos?: number): ImageTarget | null => {
  if (pos !== undefined) {
    const node = state.doc.nodeAt(pos);
    return isImageType(node) ? { node, pos } : null;
  }

  const { selection } = state;
  if (selection instanceof NodeSelection && isImageType(selection.node)) {
    return { node: selection.node, pos: selection.from };
  }

  return null;
};

const select = (tr: Transaction, pos: number): Transaction => {
  return tr.setSelection(NodeSelection.create(tr.doc, pos));
};

const withTarget = (pos: number | undefined, fn: (target: ImageTarget, state: EditorState) => Transaction | null): Command => {
  return (state, dispatch) => {
    const target = getImageTarget(state, pos);
    const tr = target ? fn(target, state) : null;

    if (!tr) {
      return false;
    }

    dispatch?.(tr);
    return true;
  };
};

/** sets attributes of the image or figure (only the attributes its type has) */
export const setImageAttrs = (attrs: Record<string, unknown>, pos?: number): Command => {
  return withTarget(pos, ({ node, pos: at }, state) => {
    const allowed = Object.fromEntries(Object.entries(attrs).filter(([name]) => name in (node.type.spec.attrs ?? {})));
    const next = { ...node.attrs, ...allowed };

    if ('src' in allowed) {
      const src = sanitizeUrl(allowed['src'], 'image');
      if (!src) {
        return null;
      }
      next['src'] = src;
    }

    if ('href' in allowed && allowed['href'] !== null) {
      next['href'] = sanitizeUrl(allowed['href'], 'link');
    }

    return select(state.tr.setNodeMarkup(at, null, next, node.marks), at);
  });
};

/** aligns the image or figure: `start`, `center`, `end` or `null` (in the line / not floated) */
export const setImageAlign = (align: ImageAlign | null, pos?: number): Command => {
  return (state, dispatch) => {
    if (align !== null && !isImageAlign(align)) {
      return false;
    }

    const target = getImageTarget(state, pos);
    if (!target || target.node.attrs['align'] === align) {
      return false;
    }

    return setImageAttrs({ align }, pos)(state, dispatch);
  };
};

/** the alignment of the image or figure, `undefined` when none is selected */
export const getImageAlignValue = (state: EditorState, pos?: number): ImageAlign | null | undefined => {
  const target = getImageTarget(state, pos);
  return target ? (target.node.attrs['align'] as ImageAlign | null) : undefined;
};

/** the link of the image (its `link` mark) or of the figure (`href`) */
export const getImageLink = (state: EditorState, pos?: number): string | null => {
  const target = getImageTarget(state, pos);
  if (!target) {
    return null;
  }

  if (target.node.type.name === 'figure') {
    return (target.node.attrs['href'] as string | null) ?? null;
  }

  const link = state.schema.marks['link']?.isInSet(target.node.marks);
  return (link?.attrs['href'] as string | undefined) ?? null;
};

/** links the image or figure; `null` or an empty string removes the link, a url that sanitizeUrl rejects is refused */
export const setImageLink = (href: string | null, pos?: number): Command => {
  return withTarget(pos, ({ node, pos: at }, state) => {
    const value = href?.trim() ? sanitizeUrl(href, 'link') : null;
    if (href?.trim() && !value) {
      return null;
    }

    const { tr, schema } = state;

    if (node.type.name === 'figure') {
      return select(tr.setNodeMarkup(at, null, { ...node.attrs, href: value }), at);
    }

    const type = schema.marks['link'];
    if (!type) {
      return null;
    }

    tr.removeMark(at, at + node.nodeSize, type);
    if (value) {
      tr.addMark(at, at + node.nodeSize, type.create({ href: value, title: null }));
    }

    return select(tr, at);
  });
};

/** turns the inline image into a captioned figure (a block, so the paragraph around it is split) */
export const imageToFigure = (caption = '', pos?: number): Command => {
  return withTarget(pos, ({ node, pos: at }, state) => {
    const figureType = state.schema.nodes['figure'];
    if (node.type.name !== 'image' || !figureType) {
      return null;
    }

    const link = state.schema.marks['link']?.isInSet(node.marks);
    const figure = figureType.create({
      src: node.attrs['src'],
      alt: node.attrs['alt'],
      title: node.attrs['title'],
      width: node.attrs['width'],
      align: node.attrs['align'],
      caption,
      href: link ? sanitizeUrl(link.attrs['href'], 'link') : null,
    });

    const { tr } = state;
    const $pos = state.doc.resolve(at);
    const { parent } = $pos;
    const index = $pos.index(-1);

    // the only content of its paragraph: the figure takes the place of the paragraph
    if ($pos.depth > 0 && parent.childCount === 1 && $pos.node(-1).canReplaceWith(index, index + 1, figureType)) {
      tr.replaceWith($pos.before(), $pos.after(), figure);
    } else {
      tr.replaceRangeWith(at, at + node.nodeSize, figure);
    }

    let figurePos = -1;
    tr.doc.descendants((child, childPos) => {
      if (figurePos >= 0) {
        return false;
      }
      if (child === figure) {
        figurePos = childPos;
      }
      return !child.isAtom;
    });

    if (figurePos < 0) {
      return null;
    }

    return select(tr, figurePos).scrollIntoView();
  });
};

/** turns the figure into an inline image in a paragraph; the caption is dropped */
export const figureToImage = (pos?: number): Command => {
  return withTarget(pos, ({ node, pos: at }, state) => {
    const { schema, tr } = state;
    const imageType = schema.nodes['image'];
    const { paragraph } = schema.nodes;

    if (node.type.name !== 'figure' || !imageType || !paragraph) {
      return null;
    }

    const href = sanitizeUrl(node.attrs['href'], 'link');
    const linkType = schema.marks['link'];
    const marks = href && linkType ? [linkType.create({ href, title: null })] : [];

    const image = imageType.create({
      src: node.attrs['src'],
      alt: node.attrs['alt'],
      title: node.attrs['title'],
      width: node.attrs['width'],
      align: node.attrs['align'],
    }, null, marks);

    const $pos = state.doc.resolve(at);
    const index = $pos.index();
    if (!$pos.parent.canReplaceWith(index, index + 1, paragraph)) {
      return null;
    }

    tr.replaceWith(at, at + node.nodeSize, paragraph.create(null, image));
    return select(tr, at + 1).scrollIntoView();
  });
};

/**
 * Sets the caption: a string on an image makes it a figure, on a figure changes the caption; `null` makes a figure
 * an inline image again.
 */
export const setImageCaption = (caption: string | null, pos?: number): Command => {
  return (state, dispatch) => {
    const target = getImageTarget(state, pos);
    if (!target) {
      return false;
    }

    const isFigure = target.node.type.name === 'figure';

    if (caption === null) {
      return isFigure ? figureToImage(target.pos)(state, dispatch) : false;
    }

    if (!isFigure) {
      return imageToFigure(caption, target.pos)(state, dispatch);
    }

    return setImageAttrs({ caption }, target.pos)(state, dispatch);
  };
};

/** removes the image or figure */
export const deleteImage = (pos?: number): Command => {
  return withTarget(pos, ({ node, pos: at }, state) => state.tr.delete(at, at + node.nodeSize).scrollIntoView());
};

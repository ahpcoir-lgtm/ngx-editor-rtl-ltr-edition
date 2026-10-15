import { DOMOutputSpec, Node as ProseMirrorNode, NodeSpec } from 'prosemirror-model';
import { tableNodes } from 'prosemirror-tables';
import * as sl from 'prosemirror-schema-list';
import { sanitizeUrl } from 'ngx-editor-rtl-ltr-edition/utils';

import { dirAttr, getAlign, getBlockStyle, getDir, getIndent, withDirection } from './block-attrs';
import { tableCellAttributes, withTableAttributes } from './table-attrs';
import { getImageAlign, getImageAlignStyle, getImageDomAttrs, isImageAlign, normalizeCssLength } from './image-attrs';
import { video } from './video';

const doc: NodeSpec = {
  content: 'block+',
};

// :: NodeSpec The text node.
const text: NodeSpec = {
  group: 'inline',
};

// :: NodeSpec A plain paragraph textblock. Represented in the DOM
// as a `<p>` element.
const paragraph: NodeSpec = {
  content: 'inline*',
  group: 'block',
  attrs: {
    align: {
      default: null,
    },
    indent: {
      default: null,
    },
    dir: dirAttr,
  },
  parseDOM: [
    {
      tag: 'p',
      getAttrs(dom: HTMLElement) {
        return {
          align: getAlign(dom),
          indent: getIndent(dom),
          dir: getDir(dom),
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    const { align, indent, dir } = node.attrs;

    const attrs = {
      style: getBlockStyle(align, indent),
      'data-indent': indent ?? null,
      dir,
    };

    return ['p', attrs, 0];
  },
};

// :: NodeSpec A blockquote (`<blockquote>`) wrapping one or more blocks.
const blockquote: NodeSpec = {
  content: 'block+',
  group: 'block',
  defining: true,
  attrs: {
    indent: {
      default: null,
    },
    dir: dirAttr,
  },
  parseDOM: [
    {
      tag: 'blockquote',
      getAttrs(dom: HTMLElement) {
        return {
          indent: getIndent(dom),
          dir: getDir(dom),
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    const { indent, dir } = node.attrs;

    const attrs = {
      style: getBlockStyle(null, indent),
      'data-indent': indent ?? null,
      dir,
    };

    return ['blockquote', attrs, 0];
  },
};

// :: NodeSpec A horizontal rule (`<hr>`).
const horizontalRule: NodeSpec = {
  group: 'block',
  parseDOM: [{ tag: 'hr' }],
  toDOM(): DOMOutputSpec {
    return ['hr'];
  },
};

const headingLevels = [1, 2, 3, 4, 5, 6];

// :: NodeSpec A heading textblock, with a `level` attribute that
// should hold the number 1 to 6. Parsed and serialized as `<h1>` to
// `<h6>` elements.
const heading: NodeSpec = {
  attrs: {
    level: {
      default: 1,
    },
    align: {
      default: null,
    },
    indent: {
      default: null,
    },
    dir: dirAttr,
  },
  content: 'inline*',
  group: 'block',
  defining: true,
  parseDOM: headingLevels.map((level) => ({
    tag: `h${level}`,
    getAttrs(dom: HTMLElement): Record<string, string | number | null> {
      return {
        level,
        align: getAlign(dom),
        indent: getIndent(dom),
        dir: getDir(dom),
      };
    },
  })),
  toDOM(node): DOMOutputSpec {
    const { level, align, indent, dir } = node.attrs;

    const attrs = {
      style: getBlockStyle(align, indent),
      'data-indent': indent ?? null,
      dir,
    };

    return [`h${level}`, attrs, 0];
  },
};

// :: NodeSpec A code listing. Disallows marks or non-text inline
// nodes by default. Represented as a `<pre>` element with a
// `<code>` element inside of it.
const codeBlock: NodeSpec = {
  content: 'text*',
  marks: '',
  group: 'block',
  code: true,
  defining: true,
  attrs: {
    dir: dirAttr,
  },
  parseDOM: [
    {
      tag: 'pre',
      preserveWhitespace: 'full',
      getAttrs(dom: HTMLElement) {
        return {
          dir: getDir(dom),
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    return ['pre', { dir: node.attrs['dir'] }, ['code', 0]];
  },
};

// :: NodeSpec A hard line break, represented in the DOM as `<br>`.
const hardBreak: NodeSpec = {
  inline: true,
  group: 'inline',
  selectable: false,
  parseDOM: [{ tag: 'br' }],
  toDOM(): DOMOutputSpec {
    return ['br'];
  },
};

// :: NodeSpec An inline image (`<img>`) node. Supports `src`, `alt`, `title`, `width`, `height` and `align`
// (`start` | `center` | `end`, written as `data-align` plus an inline style). A link on an image is the `link`
// mark on the node. Images with a `src` that `sanitizeUrl` rejects are dropped.
export const image: NodeSpec = {
  inline: true,
  attrs: {
    src: {},
    alt: { default: null },
    title: { default: null },
    width: { default: null },
    height: { default: null },
    align: { default: null },
  },
  group: 'inline',
  draggable: true,
  parseDOM: [
    {
      tag: 'img[src]',
      getAttrs(dom: HTMLElement) {
        const src = sanitizeUrl(dom.getAttribute('src'), 'image');

        if (!src) {
          return false;
        }

        return {
          src,
          title: dom.getAttribute('title'),
          alt: dom.getAttribute('alt'),
          width: dom.getAttribute('width'),
          height: dom.getAttribute('height'),
          align: getImageAlign(dom),
        };
      },
    },
  ],
  toDOM(node: ProseMirrorNode): DOMOutputSpec {
    return ['img', getImageDomAttrs(node.attrs)];
  },
};

// the image of a figure: the first `<img>`, also inside a link
const getFigureAttrs = (dom: HTMLElement): Record<string, string | null> | false => {
  const type = dom.getAttribute('data-type');
  const img = dom.querySelector('img');

  if ((type && type !== 'image') || !img) {
    return false;
  }

  const src = sanitizeUrl(img.getAttribute('src'), 'image');
  if (!src) {
    return false;
  }

  const link = img.closest('a');
  const caption = dom.querySelector('figcaption')?.textContent ?? '';

  return {
    src,
    alt: img.getAttribute('alt'),
    title: img.getAttribute('title'),
    width: normalizeCssLength(dom.style.width) ?? normalizeCssLength(img.getAttribute('width')),
    align: getImageAlign(dom),
    caption: caption.replace(/\s+/g, ' ').trim(),
    href: link && dom.contains(link) ? sanitizeUrl(link.getAttribute('href'), 'link') : null,
  };
};

// :: NodeSpec A captioned image, a block atom written as
// `<figure data-type="image"><img><figcaption>…</figcaption></figure>`; `href` wraps the image in a link.
// Also read from any `<figure>` with an `<img>` (and no other `data-type`).
export const figure: NodeSpec = {
  group: 'block',
  atom: true,
  draggable: true,
  attrs: {
    src: {},
    alt: { default: null },
    title: { default: null },
    width: { default: null },
    align: { default: null },
    caption: { default: '' },
    href: { default: null },
  },
  parseDOM: [
    {
      tag: 'figure',
      getAttrs: getFigureAttrs,
    },
  ],
  toDOM(node: ProseMirrorNode): DOMOutputSpec {
    const { src, alt, title, align, caption } = node.attrs;
    const width = normalizeCssLength(node.attrs['width']);
    const href = sanitizeUrl(node.attrs['href'], 'link');

    const style = [width ? `width: ${width};` : '', getImageAlignStyle(align, true) ?? ''].filter(Boolean).join(' ');
    const img: DOMOutputSpec = ['img', {
      src: sanitizeUrl(src, 'image'),
      alt,
      title,
      style: width ? 'width: 100%;' : null,
    }];

    const children: DOMOutputSpec[] = [href ? ['a', { href }, img] : img];
    if (caption) {
      children.push(['figcaption', String(caption)]);
    }

    const attrs = {
      'data-type': 'image',
      'data-align': isImageAlign(align) ? align : null,
      style: style || null,
    };

    return ['figure', attrs, ...children];
  },
};

const tableNodeSpecs = tableNodes({
  tableGroup: 'block',
  cellContent: 'block+',
  cellAttributes: tableCellAttributes,
});

const listItem = withDirection({
  ...sl.listItem,
  content: 'paragraph block*',
});

const orderedList = withDirection({
  ...sl.orderedList,
  content: 'list_item+',
  group: 'block',
});

const bulletList = withDirection({
  ...sl.bulletList,
  content: 'list_item+',
  group: 'block',
});

// :: NodeSpec A list of checkable items, represented in the DOM
// as `<ul data-type="task_list">`.
const taskList: NodeSpec = {
  content: 'task_item+',
  group: 'block',
  attrs: {
    dir: dirAttr,
  },
  parseDOM: [
    {
      tag: 'ul[data-type="task_list"]',
      priority: 51, // before the bullet list
      getAttrs(dom: HTMLElement) {
        return {
          dir: getDir(dom),
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    return ['ul', { 'data-type': 'task_list', dir: node.attrs['dir'] }, 0];
  },
};

// :: NodeSpec An item of a task list with a `checked` attribute,
// represented in the DOM as `<li data-type="task_item">`.
const taskItem: NodeSpec = {
  content: 'paragraph block*',
  defining: true,
  attrs: {
    checked: {
      default: false,
    },
    dir: dirAttr,
  },
  parseDOM: [
    {
      tag: 'li[data-type="task_item"]',
      priority: 51, // before the list item
      getAttrs(dom: HTMLElement) {
        return {
          checked: dom.getAttribute('data-checked') === 'true',
          dir: getDir(dom),
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    const attrs = {
      'data-type': 'task_item',
      'data-checked': String(node.attrs['checked']),
      dir: node.attrs['dir'],
    };

    return ['li', attrs, 0];
  },
};

const nodes = {
  doc,
  text,
  paragraph,
  blockquote,
  horizontal_rule: horizontalRule,
  heading,
  hard_break: hardBreak,
  code_block: codeBlock,
  image,
  figure,
  video,
  ...tableNodeSpecs,
  table: withDirection(withTableAttributes(tableNodeSpecs.table)),
  list_item: listItem,
  ordered_list: orderedList,
  bullet_list: bulletList,
  task_list: taskList,
  task_item: taskItem,
};

export default nodes;

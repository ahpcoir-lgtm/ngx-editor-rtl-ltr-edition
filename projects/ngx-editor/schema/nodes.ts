import { DOMOutputSpec, Node as ProseMirrorNode, NodeSpec } from 'prosemirror-model';
import { type MutableAttrs, tableNodes } from 'prosemirror-tables';
import * as sl from 'prosemirror-schema-list';

import { dirAttr, getAlign, getBlockStyle, getDir, getIndent, withDirection } from './block-attrs';

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

// :: NodeSpec An inline image (`<img>`) node. Supports `src`,
// `alt`, and `href` attributes. The latter two default to the empty
// string.
export const image: NodeSpec = {
  inline: true,
  attrs: {
    src: {},
    alt: { default: null },
    title: { default: null },
    width: { default: null },
  },
  group: 'inline',
  draggable: true,
  parseDOM: [
    {
      tag: 'img[src]',
      getAttrs(dom: HTMLElement): Record<string, string> {
        return {
          src: dom.getAttribute('src'),
          title: dom.getAttribute('title'),
          alt: dom.getAttribute('alt'),
          width: dom.getAttribute('width'),
        };
      },
    },
  ],
  toDOM(node: ProseMirrorNode): DOMOutputSpec {
    const { src, alt, title, width } = node.attrs;
    return ['img', { src, alt, title, width }];
  },
};


const tableNodeSpecs = tableNodes({
  tableGroup: 'block',
  cellContent: 'block+',
  cellAttributes: {
    background: {
      default: null,
      getFromDOM(dom: HTMLElement) {
        return (dom.style && dom.style.backgroundColor) || null;
      },
      setDOMAttr(value: unknown, attrs: MutableAttrs) {
        if (typeof value === 'string' && value) {
          attrs['style'] = `${attrs['style'] ?? ''}background-color: ${value};`;
        }
      },
    },
    colwidth: {
      default: null,
      getFromDOM(dom: HTMLElement) {
        return dom.dataset['colwidth'] ? dom.dataset['colwidth'].split(',').map(Number) : null;
      },
      setDOMAttr(value: unknown, attrs: MutableAttrs) {
        if (Array.isArray(value)) {
          attrs['data-colwidth'] = value.join(',');
        }
      },
    },
  },
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
  ...tableNodeSpecs,
  table: withDirection(tableNodeSpecs.table),
  list_item: listItem,
  ordered_list: orderedList,
  bullet_list: bulletList,
  task_list: taskList,
  task_item: taskItem,
};

export default nodes;

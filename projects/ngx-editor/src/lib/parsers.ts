import { DOMSerializer, Schema, DOMParser, Fragment, Node as ProseMirrorNode, ParseOptions } from 'prosemirror-model';

import defaultSchema from './schema';
import { HTML, isHtml, parseHTML } from './trustedTypesUtil';

export const emptyDoc = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
    },
  ],
};

export interface ToHTMLOptions {
  /**
   * writes `dir="auto"` on the paragraphs and headings that have no direction of their own or from their
   * list, quote or table, so the html renders like an editor with the `autoDirection` option
   */
  autoDirection?: boolean;
}

const hasDirAttr = (node: ProseMirrorNode): boolean => Boolean(node.type.spec.attrs && 'dir' in node.type.spec.attrs);

const hasExplicitDir = (node: ProseMirrorNode, inherited: boolean): boolean => {
  return inherited || (hasDirAttr(node) && node.attrs['dir'] !== null);
};

// the textblocks the `autoDirection` option gives `dir="auto"`: paragraphs and headings (not code) with no
// direction of their own or from an ancestor
const isAutoDirectionBlock = (node: ProseMirrorNode, inherited: boolean): boolean => {
  return node.isTextblock && !hasExplicitDir(node, inherited) && hasDirAttr(node) && !node.type.spec.code;
};

/** calls `fn` with each block the `autoDirection` option gives `dir="auto"`, by position in `doc` */
export const forEachAutoDirectionBlock = (
  doc: ProseMirrorNode,
  fn: (node: ProseMirrorNode, pos: number) => void,
): void => {
  const visit = (parent: ProseMirrorNode, start: number, inherited: boolean): void => {
    parent.forEach((child, offset) => {
      const pos = start + offset;

      if (isAutoDirectionBlock(child, inherited)) {
        fn(child, pos);
      } else if (!child.isTextblock && !child.isLeaf) {
        visit(child, pos + 1, hasExplicitDir(child, inherited));
      }
    });
  };

  visit(doc, 0, false);
};

// a copy of the node where the textblocks without an inherited or own direction have `dir: 'auto'`
const withAutoDirection = (node: ProseMirrorNode, inherited = false): ProseMirrorNode => {
  if (node.isLeaf) {
    return node;
  }

  const explicit = hasExplicitDir(node, inherited);

  if (node.isTextblock) {
    return isAutoDirectionBlock(node, inherited)
      ? node.type.create({ ...node.attrs, dir: 'auto' }, node.content, node.marks)
      : node;
  }

  const children: ProseMirrorNode[] = [];
  node.forEach((child) => {
    children.push(withAutoDirection(child, explicit));
  });

  return node.copy(Fragment.from(children));
};

// https://developer.mozilla.org/en-US/docs/Web/API/DocumentFragment
export const toHTML = (json: Record<string, unknown>, inputSchema?: Schema, options: ToHTMLOptions = {}): string => {
  const schema = inputSchema ?? defaultSchema;

  const docNode = schema.nodeFromJSON(json);
  const contentNode = options.autoDirection ? withAutoDirection(docNode) : docNode;
  const html = DOMSerializer.fromSchema(schema).serializeFragment(contentNode.content);

  const div = document.createElement('div');
  div.appendChild(html);
  return div.innerHTML;
};

export const toDoc = (html: HTML, inputSchema?: Schema, options?:ParseOptions): Record<string, unknown> => {
  const schema = inputSchema ?? defaultSchema;

  const el = parseHTML(html);
  return DOMParser.fromSchema(schema).parse(el, options).toJSON();
};

export const parseContent = (
  value: HTML | Record<string, unknown> | null,
  schema: Schema,
  options?: ParseOptions,
): ProseMirrorNode => {
  if (!value) {
    return schema.nodeFromJSON(emptyDoc);
  }

  if (!isHtml(value)) {
    return schema.nodeFromJSON(value);
  }

  const docJson = toDoc(value as HTML, schema, options);
  return schema.nodeFromJSON(docJson);
};

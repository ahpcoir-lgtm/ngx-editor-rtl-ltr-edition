import type { Attrs, AttributeSpec, DOMOutputSpec, NodeSpec, TagParseRule } from 'prosemirror-model';

import { toStyleString } from 'ngx-editor-rtl-ltr-edition/utils';

export type BlockDirection = 'ltr' | 'rtl' | 'auto';

const DIRECTIONS: readonly string[] = ['ltr', 'rtl', 'auto'];

// one indent level, written as `margin-inline-start`
const INDENT_WIDTH = 40;

// `dir` of the blocks that can have their own direction; `null` inherits it
export const dirAttr: AttributeSpec = { default: null };

// from the `dir` attribute, else the `direction` style that some pasted HTML uses instead (`dir=RTL` from Word
// is matched case-insensitively)
export const getDir = (dom: HTMLElement): BlockDirection | null => {
  const dir = (dom.getAttribute('dir') ?? '').trim().toLowerCase();
  if (DIRECTIONS.includes(dir)) {
    return dir as BlockDirection;
  }

  const styleDir = (dom.style?.direction ?? '').trim().toLowerCase();
  return styleDir === 'ltr' || styleDir === 'rtl' ? styleDir : null;
};

// `left | center | right | justify | start | end`, from the `align` attribute or the `text-align` style
export const getAlign = (dom: HTMLElement): string | null => {
  const align = dom.getAttribute('align') || dom.style.textAlign || '';
  return align.trim().toLowerCase() || null;
};

export const getIndent = (dom: HTMLElement): number | null => {
  return parseInt(dom.getAttribute('data-indent') ?? '', 10) || null;
};

// the inline style of a block with the given alignment and indent level
export const getBlockStyle = (align: string | null, indent: number | null): string | null => {
  const styles: Partial<CSSStyleDeclaration> = {
    textAlign: align ?? undefined,
    marginInlineStart: indent !== null ? `${indent * INDENT_WIDTH}px` : undefined,
  };

  return toStyleString(styles) || null;
};

const isAttrs = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && !(typeof Node !== 'undefined' && value instanceof Node);
};

// adds `dir` to the attributes of the outer element of a `toDOM` result
export const withDirAttr = (output: DOMOutputSpec, dir: unknown): DOMOutputSpec => {
  if (typeof dir !== 'string' || !Array.isArray(output)) {
    return output;
  }

  const [tag, ...rest] = output as readonly [string, ...unknown[]];
  const [first, ...children] = rest;

  const result: [string, ...unknown[]] = isAttrs(first)
    ? [tag, { ...first, dir }, ...children]
    : [tag, { dir }, ...rest];

  return result;
};

// adds the `dir` attribute to a node spec defined elsewhere (prosemirror-schema-list, prosemirror-tables),
// keeping its own attributes, parse rules and output
export const withDirection = (spec: NodeSpec): NodeSpec => {
  const { toDOM } = spec;

  const parseDOM = spec.parseDOM?.map((rule): TagParseRule => ({
    ...rule,
    getAttrs(dom: HTMLElement): Attrs | false | null {
      const attrs = rule.getAttrs ? rule.getAttrs(dom) : rule.attrs;

      if (attrs === false) {
        return false;
      }

      return { ...attrs, dir: getDir(dom) };
    },
  }));

  return {
    ...spec,
    attrs: { ...spec.attrs, dir: dirAttr },
    parseDOM,
    toDOM: toDOM && ((node) => withDirAttr(toDOM(node), node.attrs['dir'])),
  };
};

import type { Attrs, DOMOutputSpec, NodeSpec, TagParseRule } from 'prosemirror-model';
import type { CellAttributes, MutableAttrs } from 'prosemirror-tables';

export type TableVariant = 'bordered' | 'striped' | 'borderless';
export type TableWidth = 'auto' | 'full';
export type TableAlign = 'start' | 'center' | 'end';
export type CellAlign = 'start' | 'center' | 'end';
export type CellVAlign = 'top' | 'middle' | 'bottom';

export const TABLE_VARIANTS: readonly TableVariant[] = ['bordered', 'striped', 'borderless'];
export const TABLE_WIDTHS: readonly TableWidth[] = ['auto', 'full'];
export const TABLE_ALIGNS: readonly TableAlign[] = ['start', 'center', 'end'];
export const CELL_ALIGNS: readonly CellAlign[] = ['start', 'center', 'end'];
export const CELL_VALIGNS: readonly CellVAlign[] = ['top', 'middle', 'bottom'];

/** the values a table has when its HTML has no `data-*` attribute; they are not written */
export const TABLE_DEFAULTS = {
  variant: 'bordered',
  width: 'auto',
  align: 'start',
} as const;

const oneOf = <T extends string>(values: readonly T[], value: unknown): T | null => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return (values as readonly string[]).includes(normalized) ? normalized as T : null;
};

// hex, rgb(a), hsl(a) or a named colour; anything else could break out of the style attribute
const COLOR_PATTERN = /^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\([\d\s.,%/+-]+\)|[a-z]+)$/i;

export const isCssColor = (value: unknown): value is string => {
  return typeof value === 'string' && COLOR_PATTERN.test(value.trim());
};

const appendStyle = (attrs: MutableAttrs, style: string): void => {
  const current = attrs['style'];
  attrs['style'] = `${typeof current === 'string' ? current : ''}${style}`;
};

/** the `background`, `colwidth`, `align` and `valign` attributes of `table_cell` and `table_header` */
export const tableCellAttributes: Record<string, CellAttributes> = {
  background: {
    default: null,
    getFromDOM(dom: HTMLElement) {
      return dom.style?.backgroundColor || null;
    },
    setDOMAttr(value: unknown, attrs: MutableAttrs) {
      if (isCssColor(value)) {
        appendStyle(attrs, `background-color: ${value};`);
      }
    },
  },
  colwidth: {
    default: null,
    getFromDOM(dom: HTMLElement) {
      const { colwidth } = dom.dataset;
      return colwidth ? colwidth.split(',').map(Number) : null;
    },
    setDOMAttr(value: unknown, attrs: MutableAttrs) {
      if (Array.isArray(value)) {
        attrs['data-colwidth'] = value.join(',');
      }
    },
  },
  // `data-align`, else the `text-align` style or the legacy `align` attribute (`left`/`right` are not read:
  // they are physical, and the paragraphs keep their own alignment)
  align: {
    default: null,
    getFromDOM(dom: HTMLElement) {
      return oneOf(CELL_ALIGNS, dom.getAttribute('data-align'))
        ?? oneOf(CELL_ALIGNS, dom.style?.textAlign)
        ?? oneOf(CELL_ALIGNS, dom.getAttribute('align'));
    },
    setDOMAttr(value: unknown, attrs: MutableAttrs) {
      const align = oneOf(CELL_ALIGNS, value);
      if (align) {
        attrs['data-align'] = align;
        appendStyle(attrs, `text-align: ${align};`);
      }
    },
  },
  valign: {
    default: null,
    getFromDOM(dom: HTMLElement) {
      return oneOf(CELL_VALIGNS, dom.getAttribute('data-valign'))
        ?? oneOf(CELL_VALIGNS, dom.style?.verticalAlign)
        ?? oneOf(CELL_VALIGNS, dom.getAttribute('valign'));
    },
    setDOMAttr(value: unknown, attrs: MutableAttrs) {
      const valign = oneOf(CELL_VALIGNS, value);
      if (valign) {
        attrs['data-valign'] = valign;
        appendStyle(attrs, `vertical-align: ${valign};`);
      }
    },
  },
};

export interface TableAttrs {
  variant: TableVariant;
  width: TableWidth;
  align: TableAlign;
}

export const getTableAttrs = (dom: HTMLElement): TableAttrs => {
  const fullWidth = dom.style?.width === '100%' || dom.getAttribute('width') === '100%';

  return {
    variant: oneOf(TABLE_VARIANTS, dom.getAttribute('data-variant')) ?? TABLE_DEFAULTS.variant,
    width: oneOf(TABLE_WIDTHS, dom.getAttribute('data-width')) ?? (fullWidth ? 'full' : TABLE_DEFAULTS.width),
    align: oneOf(TABLE_ALIGNS, dom.getAttribute('data-align'))
      ?? (oneOf(['center'], dom.getAttribute('align')) ?? TABLE_DEFAULTS.align),
  };
};

/** the `data-*` attributes of a table; the defaults are not written, so old tables keep their HTML */
export const getTableDataAttributes = (attrs: Attrs): Record<string, string> => {
  const result: Record<string, string> = {};
  const variant = oneOf(TABLE_VARIANTS, attrs['variant']);
  const width = oneOf(TABLE_WIDTHS, attrs['width']);
  const align = oneOf(TABLE_ALIGNS, attrs['align']);

  if (variant && variant !== TABLE_DEFAULTS.variant) {
    result['data-variant'] = variant;
  }

  if (width && width !== TABLE_DEFAULTS.width) {
    result['data-width'] = width;
  }

  if (align && align !== TABLE_DEFAULTS.align) {
    result['data-align'] = align;
  }

  return result;
};

// the inline style that keeps the width and the alignment where the content stylesheet is not loaded
const getTableStyle = (attrs: Attrs): string | null => {
  const styles: string[] = [];

  if (attrs['width'] === 'full') {
    styles.push('width: 100%;');
  }

  if (attrs['align'] === 'center') {
    styles.push('margin-inline: auto;');
  } else if (attrs['align'] === 'end') {
    styles.push('margin-inline-start: auto;');
  }

  return styles.length ? styles.join(' ') : null;
};

// adds attributes to the outer element of a `toDOM` result
const withOuterAttrs = (output: DOMOutputSpec, extra: Record<string, string>): DOMOutputSpec => {
  if (!Array.isArray(output) || !Object.keys(extra).length) {
    return output;
  }

  const [tag, ...rest] = output as readonly [string, ...unknown[]];
  const [first, ...children] = rest;
  const hasAttrs = typeof first === 'object' && first !== null && !Array.isArray(first)
    && !(typeof Node !== 'undefined' && first instanceof Node);

  const result: [string, ...unknown[]] = hasAttrs
    ? [tag, { ...first as Record<string, unknown>, ...extra }, ...children]
    : [tag, extra, ...rest];

  return result;
};

/** adds `variant`, `width` and `align` to the table spec of prosemirror-tables */
export const withTableAttributes = (spec: NodeSpec): NodeSpec => {
  const { toDOM } = spec;

  const parseDOM = spec.parseDOM?.map((rule): TagParseRule => ({
    ...rule,
    getAttrs(dom: HTMLElement): Attrs | false | null {
      const attrs = rule.getAttrs ? rule.getAttrs(dom) : rule.attrs;

      if (attrs === false) {
        return false;
      }

      return { ...attrs, ...getTableAttrs(dom) };
    },
  }));

  return {
    ...spec,
    attrs: {
      ...spec.attrs,
      variant: { default: TABLE_DEFAULTS.variant },
      width: { default: TABLE_DEFAULTS.width },
      align: { default: TABLE_DEFAULTS.align },
    },
    parseDOM,
    toDOM: toDOM && ((node) => {
      const extra = getTableDataAttributes(node.attrs);
      const style = getTableStyle(node.attrs);

      return withOuterAttrs(toDOM(node), style ? { ...extra, style } : extra);
    }),
  };
};

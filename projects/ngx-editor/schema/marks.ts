import { Mark, MarkSpec } from 'prosemirror-model';

import { normalizeFontFamily, sanitizeUrl } from 'ngx-editor-rtl-ltr-edition/utils';

// :: MarkSpec A link. Has `href` and `title` attributes. `title`
// defaults to the empty string. Rendered and parsed as an `<a>`
// element. An `href` that `sanitizeUrl` rejects (`javascript:` …) is not read, so the text stays without the link.
const link: MarkSpec = {
  attrs: {
    href: {},
    title: { default: null },
    target: { default: '_blank' },
  },
  inclusive: false,
  parseDOM: [
    {
      tag: 'a[href]',
      getAttrs(dom) {
        const href = sanitizeUrl(dom.getAttribute('href'), 'link');

        if (!href) {
          return false;
        }

        return {
          href,
          title: dom.getAttribute('title'),
          target: dom.getAttribute('target'),
        };
      },
    },
  ],
  toDOM(node) {
    const { title, target } = node.attrs;
    return ['a', { href: sanitizeUrl(node.attrs['href'], 'link'), title, target }, 0];
  },
};

// :: MarkSpec An emphasis mark. Rendered as an `<em>` element.
// Has parse rules that also match `<i>` and `font-style: italic`.
const em: MarkSpec = {
  parseDOM: [
    { tag: 'i' },
    { tag: 'em' },
    { style: 'font-style=italic' },
  ],
  toDOM() {
    return ['em', 0];
  },
};

// :: MarkSpec A strong mark. Rendered as `<strong>`, parse rules
// also match `<b>` and `font-weight: bold`.
const strong: MarkSpec = {
  parseDOM: [
    { tag: 'strong' },
    // This works around a Google Docs misbehavior where
    // pasted content will be inexplicably wrapped in `<b>`
    // tags with a font-weight normal.
    {
      tag: 'b',
      getAttrs: (dom: HTMLElement) => {
        return dom.style.fontWeight !== 'normal' && null;
      },
    },
    {
      style: 'font-weight',
      getAttrs: (value: string) => {
        return (/^(?:bold(?:er)?|[5-9]\d{2,})$/).test(value) && null;
      },
    },
  ],
  toDOM() {
    return ['strong', 0];
  },
};

// :: MarkSpec Code font mark. Represented as a `<code>` element.
const code: MarkSpec = {
  parseDOM: [
    { tag: 'code' },
  ],
  toDOM() {
    return ['code', 0];
  },
};

// :: MarkSpec An underline mark. Rendered as an `<u>` element.
// Has parse rules that also match `text-decoration: underline`.
const u: MarkSpec = {
  parseDOM: [
    { tag: 'u' },
    {
      style: 'text-decoration=underline',
      consuming: false,
    },
  ],
  toDOM() {
    return ['u', 0];
  },
};

// :: MarkSpec An underline mark. Rendered as an `<s>` element.
// Has parse rules that also match `strike`, `del` tag and css property `text-decoration: line-through`.
const s: MarkSpec = {
  parseDOM: [
    { tag: 's' },
    { tag: 'strike' },
    { style: 'text-decoration=line-through' },
  ],
  toDOM() {
    return ['s', 0];
  },
};

const textColor: MarkSpec = {
  attrs: {
    color: {
      default: null,
    },
  },
  parseDOM: [
    {
      style: 'color',
      getAttrs: (value: string) => {
        return { color: value };
      },
    },
  ],
  toDOM(mark: Mark) {
    const { color } = mark.attrs;
    return ['span', { style: `color:${color};` }, 0];
  },
};

const textBackgroundColor: MarkSpec = {
  attrs: {
    backgroundColor: {
      default: null,
    },
  },
  parseDOM: [
    // the background of a table cell is its `background` attribute, not a highlight of the text in it
    {
      style: 'background-color',
      context: 'table_row/',
      priority: 60,
      clearMark: () => false,
    },
    {
      style: 'background-color',
      getAttrs: (value: string) => {
        return { backgroundColor: value };
      },
    },
  ],
  toDOM(mark: Mark) {
    const { backgroundColor } = mark.attrs;
    return ['span', { style: `background-color:${backgroundColor};` }, 0];
  },
};

// The family is a CSS stack, written as `<span style="font-family: Vazirmatn, sans-serif;">`. Every family is read, so
// stored content keeps fonts that are no longer configured; pasting keeps only the configured ones (plugins/font-family).
const fontFamily: MarkSpec = {
  attrs: {
    family: {
      default: null,
    },
  },
  parseDOM: [
    {
      style: 'font-family',
      getAttrs: (value: string) => {
        const family = normalizeFontFamily(value);
        return family ? { family } : false;
      },
    },
  ],
  toDOM(mark: Mark) {
    const family = normalizeFontFamily(mark.attrs['family'] as string | null);
    return ['span', family ? { style: `font-family: ${family};` } : {}, 0];
  },
};

const sup: MarkSpec = {
  attrs: {},
  parseDOM: [
    { tag: 'sup' },
    { style: 'vertical-align=super' },
  ],
  toDOM() {
    return ['sup', 0];
  },
};

const sub: MarkSpec = {
  attrs: {},
  parseDOM: [
    { tag: 'sub' },
    { style: 'vertical-align=sub' },
  ],
  toDOM() {
    return ['sub', 0];
  },
};

const marks = {
  link,
  // before the other marks, so that code and other marks are rendered inside the font span
  font_family: fontFamily,
  em,
  strong,
  code,
  u,
  s,
  text_color: textColor,
  text_background_color: textBackgroundColor,
  sup,
  sub,
};

export default marks;

import { DOMParser, DOMSerializer, Node as ProseMirrorNode } from 'prosemirror-model';

import schema from './schema';
import { isCssColor } from './table-attrs';

const parse = (html: string): ProseMirrorNode => {
  const element = document.createElement('div');
  element.innerHTML = html;
  return DOMParser.fromSchema(schema).parse(element);
};

const serialize = (doc: ProseMirrorNode): string => {
  const element = document.createElement('div');
  element.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(doc.content));
  return element.innerHTML;
};

const roundTrip = (html: string): string => serialize(parse(html));

const findNode = (doc: ProseMirrorNode, type: string): ProseMirrorNode => {
  let found: ProseMirrorNode | null = null;

  doc.descendants((node) => {
    if (!found && node.type.name === type) {
      found = node;
    }
  });

  if (!found) {
    throw new Error(`no ${type} in the document`);
  }

  return found;
};

const table = (attrs: string, cell = '<td><p>a</p></td>'): string => {
  return `<table${attrs}><tbody><tr>${cell}</tr></tbody></table>`;
};

describe('schema: table attributes', () => {
  it('should read old upstream table HTML with the default attributes and write it unchanged', () => {
    const html = '<table><tbody><tr><th colspan="2"><p>Header</p></th></tr>'
      + '<tr><td style="background-color: rgb(221, 255, 221);"><p>a</p></td><td data-colwidth="80"><p>b</p></td></tr>'
      + '</tbody></table>';
    const doc = parse(html);

    expect(findNode(doc, 'table').attrs).toEqual({ variant: 'bordered', width: 'auto', align: 'start', dir: null });
    expect(findNode(doc, 'table_header').attrs).toEqual({
      colspan: 2, rowspan: 1, colwidth: null, background: null, align: null, valign: null,
    });
    expect(findNode(doc, 'table_cell').attrs['background']).toBe('rgb(221, 255, 221)');
    expect(serialize(doc)).toBe(html);
  });

  it.each<[string, string, Record<string, unknown>]>([
    ['striped', ' data-variant="striped"', { variant: 'striped' }],
    ['borderless', ' data-variant="borderless"', { variant: 'borderless' }],
    ['full width', ' data-width="full" style="width: 100%;"', { width: 'full' }],
    ['centered', ' data-align="center" style="margin-inline: auto;"', { align: 'center' }],
    ['aligned to the end', ' data-align="end" style="margin-inline-start: auto;"', { align: 'end' }],
    [
      'with every attribute',
      ' data-variant="striped" data-width="full" data-align="center" style="width: 100%; margin-inline: auto;" dir="rtl"',
      { variant: 'striped', width: 'full', align: 'center', dir: 'rtl' },
    ],
  ])('should read and write a %s table', (_, attrs, expected) => {
    const html = table(attrs);
    const doc = parse(html);

    expect(findNode(doc, 'table').attrs).toEqual({
      variant: 'bordered', width: 'auto', align: 'start', dir: null, ...expected,
    });
    expect(serialize(doc)).toBe(html);
  });

  it('should not write the default values', () => {
    expect(roundTrip(table(' data-variant="bordered" data-width="auto" data-align="start"'))).toBe(table(''));
  });

  it('should ignore unknown values', () => {
    const doc = parse(table(' data-variant="dotted" data-width="half" data-align="left"'));
    expect(findNode(doc, 'table').attrs).toEqual({ variant: 'bordered', width: 'auto', align: 'start', dir: null });
  });

  it('should read pasted HTML: width 100% and the legacy align attribute', () => {
    expect(findNode(parse(table(' style="width: 100%"')), 'table').attrs['width']).toBe('full');
    expect(findNode(parse(table(' width="100%" align="center"')), 'table').attrs).toMatchObject({
      width: 'full', align: 'center',
    });
  });

  it('should not write unknown values set through JSON', () => {
    const doc = schema.nodeFromJSON({
      type: 'doc',
      content: [{
        type: 'table',
        attrs: { variant: 'x" onclick="y', width: 'full', align: null },
        content: [{ type: 'table_row', content: [{ type: 'table_cell', content: [{ type: 'paragraph' }] }] }],
      }],
    });

    expect(serialize(doc)).toBe('<table data-width="full" style="width: 100%;"><tbody><tr><td><p></p></td></tr></tbody></table>');
  });
});

describe('schema: cell attributes', () => {
  it.each(['start', 'center', 'end'])('should read and write the %s alignment of a cell', (align) => {
    const cell = `<td data-align="${align}" style="text-align: ${align};"><p>a</p></td>`;
    const doc = parse(table('', cell));

    expect(findNode(doc, 'table_cell').attrs['align']).toBe(align);
    expect(serialize(doc)).toBe(table('', cell));
  });

  it.each(['top', 'middle', 'bottom'])('should read and write the %s vertical alignment of a cell', (valign) => {
    const cell = `<th data-valign="${valign}" style="vertical-align: ${valign};"><p>a</p></th>`;
    const doc = parse(table('', cell));

    expect(findNode(doc, 'table_header').attrs['valign']).toBe(valign);
    expect(serialize(doc)).toBe(table('', cell));
  });

  it('should keep the background next to the alignment', () => {
    const cell = '<td style="background-color: red; text-align: center; vertical-align: bottom;" '
      + 'data-align="center" data-valign="bottom"><p>a</p></td>';
    const doc = parse(table('', cell));

    expect(findNode(doc, 'table_cell').attrs).toMatchObject({ background: 'red', align: 'center', valign: 'bottom' });
    expect(serialize(doc)).toBe(table('', cell));
  });

  it('should read the alignment of pasted cells from their style or legacy attributes', () => {
    const fromStyle = parse(table('', '<td style="text-align: center; vertical-align: middle"><p>a</p></td>'));
    expect(findNode(fromStyle, 'table_cell').attrs).toMatchObject({ align: 'center', valign: 'middle' });

    const legacy = parse(table('', '<td align="END" valign="bottom"><p>a</p></td>'));
    expect(findNode(legacy, 'table_cell').attrs).toMatchObject({ align: 'end', valign: 'bottom' });

    // physical alignments are left to the paragraphs
    const physical = parse(table('', '<td style="text-align: left" valign="baseline"><p>a</p></td>'));
    expect(findNode(physical, 'table_cell').attrs).toMatchObject({ align: null, valign: null });
  });

  it('should not write a background that is not a colour', () => {
    const doc = schema.nodeFromJSON({
      type: 'doc',
      content: [{
        type: 'table',
        content: [{
          type: 'table_row',
          content: [{ type: 'table_cell', attrs: { background: 'red; position: fixed' }, content: [{ type: 'paragraph' }] }],
        }],
      }],
    });

    expect(serialize(doc)).toBe('<table><tbody><tr><td><p></p></td></tr></tbody></table>');
  });

  it.each<[string, boolean]>([
    ['#dfd', true],
    ['#D0E0F0', true],
    ['rgb(1, 2, 3)', true],
    ['rgba(1, 2, 3, 0.5)', true],
    ['hsl(120 50% 50% / 0.2)', true],
    ['yellow', true],
    ['red; color: blue', false],
    ['url(x)', false],
    ['', false],
  ])('should tell whether %s is a colour', (value, expected) => {
    expect(isCssColor(value)).toBe(expected);
  });
});

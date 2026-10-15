import { DOMParser, DOMSerializer, Node as ProseMirrorNode } from 'prosemirror-model';

import schema from './schema';

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
  const nodes: ProseMirrorNode[] = [];

  doc.descendants((node) => {
    if (node.type.name === type) {
      nodes.push(node);
    }
  });

  const [found] = nodes;
  if (!found) {
    throw new Error(`no ${type} in the document`);
  }

  return found;
};

describe('schema: block direction', () => {
  it.each<[string, string]>([
    ['paragraph', '<p dir="rtl">a</p>'],
    ['heading', '<h3 dir="rtl">a</h3>'],
    ['blockquote', '<blockquote dir="rtl"><p>a</p></blockquote>'],
    ['code_block', '<pre dir="rtl"><code>a</code></pre>'],
    ['ordered_list', '<ol dir="rtl"><li><p>a</p></li></ol>'],
    ['bullet_list', '<ul dir="rtl"><li><p>a</p></li></ul>'],
    ['list_item', '<ul><li dir="rtl"><p>a</p></li></ul>'],
    ['task_list', '<ul data-type="task_list" dir="rtl"><li data-type="task_item" data-checked="false"><p>a</p></li></ul>'],
    ['task_item', '<ul data-type="task_list"><li data-type="task_item" data-checked="false" dir="rtl"><p>a</p></li></ul>'],
    ['table', '<table dir="rtl"><tbody><tr><td><p>a</p></td></tr></tbody></table>'],
  ])('should parse and write the dir of a %s', (type, html) => {
    const doc = parse(html);
    expect(findNode(doc, type).attrs['dir']).toBe('rtl');
    expect(serialize(doc)).toBe(html);
  });

  it.each(['ltr', 'rtl', 'auto'])('should keep the %s direction', (dir) => {
    expect(roundTrip(`<p dir="${dir}">a</p>`)).toBe(`<p dir="${dir}">a</p>`);
  });

  it('should not write a dir when none is set', () => {
    const doc = parse('<p>a</p><ul><li><p>b</p></li></ul>');
    expect(findNode(doc, 'paragraph').attrs['dir']).toBeNull();
    expect(serialize(doc)).toBe('<p>a</p><ul><li><p>b</p></li></ul>');
  });

  it('should ignore unknown directions and ignore the case of known ones', () => {
    expect(findNode(parse('<p dir="sideways">a</p>'), 'paragraph').attrs['dir']).toBeNull();
    expect(findNode(parse('<p dir=" RTL ">a</p>'), 'paragraph').attrs['dir']).toBe('rtl');
  });

  it('should read the direction style of pasted content without a dir attribute', () => {
    expect(findNode(parse('<p style="direction: rtl">a</p>'), 'paragraph').attrs['dir']).toBe('rtl');
    expect(findNode(parse('<li style="direction:ltr"><p>a</p></li>'), 'list_item').attrs['dir']).toBe('ltr');
    // the attribute wins over the style
    expect(findNode(parse('<p dir="ltr" style="direction: rtl">a</p>'), 'paragraph').attrs['dir']).toBe('ltr');
  });

  it('should keep the other attributes of the nodes', () => {
    expect(roundTrip('<ol start="3" dir="rtl"><li><p>a</p></li></ol>')).toBe('<ol start="3" dir="rtl"><li><p>a</p></li></ol>');

    const taskList = '<ul data-type="task_list"><li data-type="task_item" data-checked="true" dir="ltr"><p>a</p></li></ul>';
    const doc = parse(taskList);
    expect(findNode(doc, 'task_item').attrs).toEqual({ checked: true, dir: 'ltr' });
    expect(serialize(doc)).toBe(taskList);

    const heading = parse('<h2 dir="rtl" style="text-align: center" data-indent="1">a</h2>');
    expect(findNode(heading, 'heading').attrs).toEqual({ level: 2, align: 'center', indent: 1, dir: 'rtl' });

    const cell = parse('<table><tbody><tr><td style="background-color: red" data-colwidth="80"><p>a</p></td></tr></tbody></table>');
    expect(findNode(cell, 'table_cell').attrs).toEqual({ colspan: 1, rowspan: 1, colwidth: [80], background: 'red' });
  });

  it('should still tell task lists from bullet lists', () => {
    const doc = parse('<ul data-type="task_list" dir="rtl"><li data-type="task_item"><p>a</p></li></ul>');
    expect(doc.firstChild?.type.name).toBe('task_list');
  });
});

describe('schema: alignment', () => {
  it.each(['left', 'center', 'right', 'justify', 'start', 'end'])('should parse and write the %s alignment', (align) => {
    const html = `<p style="text-align: ${align};">a</p>`;
    const doc = parse(html);

    expect(findNode(doc, 'paragraph').attrs['align']).toBe(align);
    expect(serialize(doc)).toBe(html);
  });

  it('should write the left alignment, which differs from the default in right to left text', () => {
    const doc = schema.nodeFromJSON({
      type: 'doc',
      content: [{ type: 'paragraph', attrs: { align: 'left', dir: 'rtl' }, content: [{ type: 'text', text: 'a' }] }],
    });

    expect(serialize(doc)).toBe('<p style="text-align: left;" dir="rtl">a</p>');
  });

  it('should read the align attribute', () => {
    expect(findNode(parse('<p align="END">a</p>'), 'paragraph').attrs['align']).toBe('end');
    expect(findNode(parse('<h1 align="start">a</h1>'), 'heading').attrs['align']).toBe('start');
  });
});

describe('schema: indent', () => {
  it('should indent with margin-inline-start', () => {
    expect(roundTrip('<p data-indent="2">a</p>')).toBe('<p style="margin-inline-start: 80px;" data-indent="2">a</p>');
    expect(roundTrip('<blockquote data-indent="1"><p>a</p></blockquote>'))
      .toBe('<blockquote style="margin-inline-start: 40px;" data-indent="1"><p>a</p></blockquote>');
  });

  it('should read content indented with margin-left', () => {
    const html = '<h2 style="text-align: center; margin-left: 80px;" data-indent="2" dir="rtl">a</h2>';
    expect(roundTrip(html)).toBe('<h2 style="text-align: center; margin-inline-start: 80px;" data-indent="2" dir="rtl">a</h2>');
  });
});

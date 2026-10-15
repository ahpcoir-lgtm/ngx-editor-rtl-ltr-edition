import { DOMParser, DOMSerializer, Mark, Node as ProseMirrorNode } from 'prosemirror-model';

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

const fontMarks = (doc: ProseMirrorNode): Mark[] => {
  const marks: Mark[] = [];

  doc.descendants((node) => {
    marks.push(...node.marks.filter((mark) => mark.type.name === 'font_family'));
  });

  return marks;
};

describe('schema: font_family mark', () => {
  it('should parse a font-family style and write it back', () => {
    const doc = parse('<p><span style="font-family: Vazirmatn, sans-serif;">سلام</span></p>');

    expect(fontMarks(doc).map((mark) => mark.attrs['family'])).toEqual(['Vazirmatn, sans-serif']);
    expect(serialize(doc)).toBe('<p><span style="font-family: Vazirmatn, sans-serif;">سلام</span></p>');
  });

  it('should round trip a stack with quoted names', () => {
    const html = '<p><span style="font-family: \'Noto Naskh Arabic\', serif;">a</span></p>';
    const doc = parse(html);

    expect(fontMarks(doc)[0].attrs['family']).toBe('\'Noto Naskh Arabic\', serif');
    expect(serialize(parse(serialize(doc)))).toBe(serialize(doc));
  });

  it('should keep a family that is not configured', () => {
    const doc = parse('<p><span style="font-family: &quot;My Brand Font&quot;">a</span></p>');
    expect(fontMarks(doc)[0].attrs['family']).toBe('\'My Brand Font\'');
  });

  it('should not create the mark for an empty or keyword value', () => {
    expect(fontMarks(parse('<p><span style="font-family: inherit">a</span></p>'))).toEqual([]);
    expect(serialize(parse('<p><span style="font-family: inherit">a</span></p>'))).toBe('<p>a</p>');
  });

  it('should render code inside the font span', () => {
    const doc = parse('<p><code><span style="font-family: Tahoma">x</span></code></p>');
    expect(serialize(doc)).toBe('<p><span style="font-family: Tahoma;"><code>x</code></span></p>');
  });

  it('should write documents without a font as before', () => {
    expect(serialize(parse('<p><span style="color: red">a</span></p>'))).toBe('<p><span style="color: red;">a</span></p>');
  });

  it('should read the mark from JSON and replace a font with another one', () => {
    const vazir = schema.marks.font_family.create({ family: 'Vazirmatn, sans-serif' });
    const amiri = schema.marks.font_family.create({ family: 'Amiri, serif' });

    expect(amiri.addToSet([vazir])).toEqual([amiri]);
    expect(Mark.fromJSON(schema, vazir.toJSON()).eq(vazir)).toBe(true);
  });
});

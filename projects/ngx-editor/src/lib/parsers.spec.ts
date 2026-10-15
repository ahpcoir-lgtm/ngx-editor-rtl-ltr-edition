import { toDoc, toHTML } from './parsers';
import schema from './schema';

const convert = (html: string, autoDirection?: boolean): string => {
  return toHTML(toDoc(html), schema, autoDirection === undefined ? undefined : { autoDirection });
};

describe('toHTML', () => {
  describe('autoDirection', () => {
    it('should not write dir="auto" by default', () => {
      expect(convert('<p>one</p><h2>two</h2>')).toBe('<p>one</p><h2>two</h2>');
      expect(convert('<p>one</p><h2>two</h2>', false)).toBe('<p>one</p><h2>two</h2>');
    });

    it('should write dir="auto" on paragraphs and headings without a direction', () => {
      expect(convert('<p>one</p><h2 style="text-align: center">two</h2>', true))
        .toBe('<p dir="auto">one</p><h2 style="text-align: center;" dir="auto">two</h2>');
    });

    it('should keep the direction of blocks that have one', () => {
      expect(convert('<p dir="rtl">one</p><p dir="ltr">two</p>', true)).toBe('<p dir="rtl">one</p><p dir="ltr">two</p>');
    });

    it('should keep the direction that blocks have from their list, quote or table', () => {
      expect(convert('<ul dir="rtl"><li><p>one</p></li></ul>', true)).toBe('<ul dir="rtl"><li><p>one</p></li></ul>');
      expect(convert('<blockquote dir="ltr"><p>one</p></blockquote>', true)).toBe('<blockquote dir="ltr"><p>one</p></blockquote>');
      expect(convert('<table dir="rtl"><tbody><tr><td><p>one</p></td></tr></tbody></table>', true))
        .toBe('<table dir="rtl"><tbody><tr><td><p>one</p></td></tr></tbody></table>');
    });

    it('should write dir="auto" on the blocks inside containers without a direction', () => {
      expect(convert('<blockquote><p>one</p></blockquote><ol><li><p>two</p></li></ol>', true))
        .toBe('<blockquote><p dir="auto">one</p></blockquote><ol><li><p dir="auto">two</p></li></ol>');
      expect(convert('<table><tbody><tr><td><p>one</p></td></tr></tbody></table>', true))
        .toBe('<table><tbody><tr><td><p dir="auto">one</p></td></tr></tbody></table>');
    });

    it('should leave code blocks left to right', () => {
      expect(convert('<pre><code>a = 1</code></pre>', true)).toBe('<pre><code>a = 1</code></pre>');
    });

    it('should keep the content and marks', () => {
      expect(convert('<p>one <strong>two</strong><br>three</p>', true)).toBe('<p dir="auto">one <strong>two</strong><br>three</p>');
    });

    it('should not change the document it is given', () => {
      const doc = toDoc('<p>one</p>');
      toHTML(doc, schema, { autoDirection: true });
      expect(toHTML(doc)).toBe('<p>one</p>');
    });
  });
});

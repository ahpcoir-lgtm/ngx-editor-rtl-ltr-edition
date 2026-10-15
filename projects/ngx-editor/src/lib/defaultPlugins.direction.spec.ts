import { TextSelection } from 'prosemirror-state';

import Editor from './Editor';
import { toHTML } from './parsers';

describe('Enter and the block direction', () => {
  let editor: Editor;

  const getHTML = (): string => toHTML(editor.view.state.doc.toJSON());

  const posAfter = (text: string): number => {
    let result = -1;

    editor.view.state.doc.descendants((node, pos) => {
      if (result === -1 && node.isText && node.text?.includes(text)) {
        result = pos + node.text.indexOf(text) + text.length;
      }
    });

    return result;
  };

  const pressEnterAt = (pos: number): boolean => {
    const { view } = editor;
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, pos)));

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    return Boolean(view.someProp('handleKeyDown', (f) => f(view, event)));
  };

  const typeText = (text: string): void => {
    const { view } = editor;
    view.dispatch(view.state.tr.insertText(text));
  };

  afterEach(() => {
    editor.destroy();
  });

  it('should keep the direction for the new paragraph at the end of a paragraph', () => {
    editor = new Editor({ content: '<p dir="rtl">one</p>' });

    expect(pressEnterAt(posAfter('one'))).toBe(true);
    typeText('two');
    expect(getHTML()).toBe('<p dir="rtl">one</p><p dir="rtl">two</p>');
  });

  it('should keep the direction for the paragraph after a heading', () => {
    editor = new Editor({ content: '<h1 dir="rtl" style="text-align: center">one</h1>' });

    pressEnterAt(posAfter('one'));
    typeText('two');
    expect(getHTML()).toBe('<h1 style="text-align: center;" dir="rtl">one</h1><p dir="rtl">two</p>');
  });

  it('should keep the direction of both parts of a split paragraph', () => {
    editor = new Editor({ content: '<p dir="ltr">onetwo</p>' });

    pressEnterAt(posAfter('one'));
    expect(getHTML()).toBe('<p dir="ltr">one</p><p dir="ltr">two</p>');
  });

  it('should not add a direction to paragraphs without one', () => {
    editor = new Editor({ content: '<p>one</p>' });

    pressEnterAt(posAfter('one'));
    typeText('two');
    expect(getHTML()).toBe('<p>one</p><p>two</p>');
  });

  it('should keep the direction for the new list item', () => {
    editor = new Editor({ content: '<ul dir="rtl"><li><p dir="rtl">one</p></li></ul>' });

    pressEnterAt(posAfter('one'));
    typeText('two');
    expect(getHTML()).toBe('<ul dir="rtl"><li><p dir="rtl">one</p></li><li><p dir="rtl">two</p></li></ul>');
  });

  it('should keep the direction for the new task item', () => {
    editor = new Editor({
      content: '<ul data-type="task_list"><li data-type="task_item" data-checked="true"><p dir="rtl">one</p></li></ul>',
    });

    pressEnterAt(posAfter('one'));
    typeText('two');
    expect(getHTML()).toBe(
      '<ul data-type="task_list">'
      + '<li data-type="task_item" data-checked="true"><p dir="rtl">one</p></li>'
      + '<li data-type="task_item" data-checked="false"><p dir="rtl">two</p></li>'
      + '</ul>',
    );
  });

  it('should still insert a new line in a code block', () => {
    editor = new Editor({ content: '<pre dir="rtl"><code>one</code></pre>' });

    pressEnterAt(posAfter('one'));
    expect(getHTML()).toBe('<pre dir="rtl"><code>one\n</code></pre>');
  });

  it('should still lift an empty paragraph out of a blockquote', () => {
    editor = new Editor({ content: '<blockquote><p dir="rtl">one</p><p dir="rtl"></p></blockquote>' });

    const { doc } = editor.view.state;
    const emptyParagraphPos = doc.content.size - 2;
    pressEnterAt(emptyParagraphPos);
    expect(getHTML()).toBe('<blockquote><p dir="rtl">one</p></blockquote><p dir="rtl"></p>');
  });
});

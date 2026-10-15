import { Command, TextSelection } from 'prosemirror-state';

import Editor from '../Editor';
import { toHTML } from '../parsers';
import Blockquote from './Blockquote';
import ListItem from './ListItem';
import TaskList from './TaskList';

// a new list or blockquote takes the direction of the blocks it wraps, so that the markers or the border are
// on the side of the text
describe('wrapping keeps the direction', () => {
  let editor: Editor;

  const getHTML = (): string => toHTML(editor.view.state.doc.toJSON());

  const run = (command: Command): boolean => command(editor.view.state, editor.view.dispatch);

  const select = (from: number, to = from): void => {
    const { view } = editor;
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, from, to)));
  };

  // the position after the text
  const endOf = (text: string): number => {
    let result = -1;

    editor.view.state.doc.descendants((node, pos) => {
      if (result === -1 && node.isText && node.text?.includes(text)) {
        result = pos + node.text.indexOf(text) + text.length;
      }
    });

    return result;
  };

  // simulates typing, so that the input rules are applied
  const type = (text: string): void => {
    const { view } = editor;

    for (const char of text) {
      const { from, to } = view.state.selection;
      const getTr = () => view.state.tr;
      const handled = view.someProp('handleTextInput', (f) => f(view, from, to, char, getTr));

      if (!handled) {
        view.dispatch(view.state.tr.insertText(char, from, to));
      }
    }
  };

  afterEach(() => {
    editor.destroy();
  });

  describe('commands', () => {
    it('should give a new bullet list the direction of its paragraph', () => {
      editor = new Editor({ content: '<p dir="rtl">one</p>' });
      select(2);

      run(new ListItem(true).toggle());
      expect(getHTML()).toBe('<ul dir="rtl"><li><p dir="rtl">one</p></li></ul>');
    });

    it('should give a new ordered list the direction shared by its paragraphs', () => {
      editor = new Editor({ content: '<p dir="rtl">one</p><p dir="rtl">two</p>' });
      select(2, endOf('two'));

      run(new ListItem(false).toggle());
      expect(getHTML()).toBe('<ol dir="rtl"><li><p dir="rtl">one</p></li><li><p dir="rtl">two</p></li></ol>');
    });

    it('should give a new task list the direction of its paragraph', () => {
      editor = new Editor({ content: '<p dir="ltr">one</p>' });
      select(2);

      run(new TaskList().toggle());
      expect(getHTML()).toContain('<ul data-type="task_list" dir="ltr">');
    });

    it('should give a new blockquote the direction of its blocks', () => {
      editor = new Editor({ content: '<p dir="rtl">one</p><ul dir="rtl"><li><p>two</p></li></ul>' });
      select(2, endOf('two'));

      run(new Blockquote().toggle());
      expect(getHTML()).toBe('<blockquote dir="rtl"><p dir="rtl">one</p><ul dir="rtl"><li><p>two</p></li></ul></blockquote>');
    });

    it('should not give a direction for mixed or missing directions', () => {
      editor = new Editor({ content: '<p dir="rtl">one</p><p>two</p>' });
      select(2, endOf('two'));

      run(new ListItem(true).toggle());
      expect(getHTML()).toBe('<ul><li><p dir="rtl">one</p></li><li><p>two</p></li></ul>');
    });

    it('should keep the output without directions', () => {
      editor = new Editor({ content: '<p>one</p>' });
      select(2);

      run(new Blockquote().toggle());
      expect(getHTML()).toBe('<blockquote><p>one</p></blockquote>');
    });
  });

  describe('input rules', () => {
    it('should give a list created with "- " the direction of its paragraph', () => {
      editor = new Editor({ content: '<p dir="rtl"></p>' });
      select(1);

      type('- ');
      expect(getHTML()).toBe('<ul dir="rtl"><li><p dir="rtl"></p></li></ul>');
    });

    it('should give a list created with "1. " the direction of its paragraph and keep its order', () => {
      editor = new Editor({ content: '<p dir="rtl"></p>' });
      select(1);

      type('3. ');
      expect(getHTML()).toBe('<ol start="3" dir="rtl"><li><p dir="rtl"></p></li></ol>');
    });

    it('should give a blockquote created with "> " the direction of its paragraph', () => {
      editor = new Editor({ content: '<p dir="rtl"></p>' });
      select(1);

      type('> ');
      expect(getHTML()).toBe('<blockquote dir="rtl"><p dir="rtl"></p></blockquote>');
    });

    it('should create the list without a direction from a paragraph without one', () => {
      editor = new Editor({ content: '<p></p>' });
      select(1);

      type('- ');
      expect(getHTML()).toBe('<ul><li><p></p></li></ul>');
    });
  });
});

import { AllSelection, Command, EditorState, NodeSelection, TextSelection } from 'prosemirror-state';
import { CellSelection } from 'prosemirror-tables';

import Editor from '../Editor';
import { toHTML } from '../parsers';
import TextDirection, { getCommonDirection, setTextDirection } from './TextDirection';

let editor: Editor;

const rtl = new TextDirection('rtl');
const ltr = new TextDirection('ltr');
const auto = new TextDirection('auto');

const state = (): EditorState => editor.view.state;

const run = (command: Command): boolean => command(editor.view.state, editor.view.dispatch);

const getHTML = (): string => toHTML(state().doc.toJSON());

// the position of the text in the document
const posOf = (text: string): number => {
  let result = -1;

  state().doc.descendants((node, pos) => {
    if (result === -1 && node.isText && node.text?.includes(text)) {
      result = pos + node.text.indexOf(text);
    }
  });

  return result;
};

const cursorIn = (text: string): void => {
  const { view } = editor;
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, posOf(text))));
};

const selectBetween = (from: string, to: string): void => {
  const { view } = editor;
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, posOf(from), posOf(to) + 1)));
};

const selectAll = (): void => {
  const { view } = editor;
  view.dispatch(view.state.tr.setSelection(new AllSelection(view.state.doc)));
};

const cellPositions = (): number[] => {
  const positions: number[] = [];

  state().doc.descendants((node, pos) => {
    if (node.type.name === 'table_cell') {
      positions.push(pos);
    }
  });

  return positions;
};

describe('TextDirection', () => {
  afterEach(() => {
    editor.destroy();
  });

  it('should set the direction of a paragraph and clear it when toggled again', () => {
    editor = new Editor({ content: '<p>one</p><p>two</p>' });
    cursorIn('one');

    expect(rtl.isActive(state())).toBe(false);
    expect(rtl.canExecute(state())).toBe(true);

    expect(run(rtl.toggle())).toBe(true);
    expect(getHTML()).toBe('<p dir="rtl">one</p><p>two</p>');
    expect(rtl.isActive(state())).toBe(true);
    expect(ltr.isActive(state())).toBe(false);

    expect(run(rtl.toggle())).toBe(true);
    expect(getHTML()).toBe('<p>one</p><p>two</p>');
    expect(rtl.isActive(state())).toBe(false);
  });

  it('should switch from one direction to another', () => {
    editor = new Editor({ content: '<p dir="rtl">one</p>' });
    cursorIn('one');

    run(ltr.toggle());
    expect(getHTML()).toBe('<p dir="ltr">one</p>');

    run(auto.toggle());
    expect(getHTML()).toBe('<p dir="auto">one</p>');
    expect(auto.isActive(state())).toBe(true);
    expect(rtl.isActive(state())).toBe(false);
  });

  it('should set the direction of every block in the selection', () => {
    editor = new Editor({ content: '<p>one</p><h2>two</h2><pre><code>three</code></pre><p>four</p>' });
    selectBetween('one', 'three');

    run(rtl.toggle());
    expect(getHTML()).toBe('<p dir="rtl">one</p><h2 dir="rtl">two</h2><pre dir="rtl"><code>three</code></pre><p>four</p>');
  });

  it('should be active only when every block in the selection has the direction', () => {
    editor = new Editor({ content: '<p dir="rtl">one</p><p>two</p>' });
    selectBetween('one', 'two');

    expect(rtl.isActive(state())).toBe(false);

    // not active, so the direction is set instead of cleared
    run(rtl.toggle());
    expect(getHTML()).toBe('<p dir="rtl">one</p><p dir="rtl">two</p>');
    expect(rtl.isActive(state())).toBe(true);
  });

  it('should set the direction of all blocks when all is selected', () => {
    editor = new Editor({ content: '<p>one</p><p>two</p>' });
    selectAll();

    run(rtl.toggle());
    expect(getHTML()).toBe('<p dir="rtl">one</p><p dir="rtl">two</p>');
  });

  it('should not run without a block that can have a direction', () => {
    editor = new Editor({ content: '<p>one</p><hr><p>two</p>' });
    const { view } = editor;

    let hrPos = -1;
    view.state.doc.forEach((node, offset) => {
      if (node.type.name === 'horizontal_rule') {
        hrPos = offset;
      }
    });

    view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, hrPos)));

    expect(rtl.canExecute(state())).toBe(false);
    expect(rtl.isActive(state())).toBe(false);
    expect(run(setTextDirection('rtl'))).toBe(false);
  });

  it('should keep the direction when applied again', () => {
    editor = new Editor({ content: '<p>one</p>' });
    cursorIn('one');

    run(rtl.apply());
    run(rtl.apply());
    expect(getHTML()).toBe('<p dir="rtl">one</p>');
  });

  it('should clear the direction with null', () => {
    editor = new Editor({ content: '<ul dir="rtl"><li><p dir="rtl">one</p></li></ul>' });
    cursorIn('one');

    run(setTextDirection(null));
    expect(getHTML()).toBe('<ul><li><p>one</p></li></ul>');
  });

  it('should set the direction with the editor commands', () => {
    editor = new Editor({ content: '<p>one</p>' });
    cursorIn('one');

    editor.commands.setTextDirection('rtl').exec();
    expect(getHTML()).toBe('<p dir="rtl">one</p>');

    editor.commands.toggleTextDirection('rtl').exec();
    expect(getHTML()).toBe('<p>one</p>');

    editor.commands.toggleTextDirection('ltr').exec();
    expect(getHTML()).toBe('<p dir="ltr">one</p>');

    editor.commands.setTextDirection(null).exec();
    expect(getHTML()).toBe('<p>one</p>');
  });
});

describe('TextDirection: lists, quotes and tables', () => {
  afterEach(() => {
    editor.destroy();
  });

  it('should set the direction of the list of the item, so the markers move along', () => {
    editor = new Editor({ content: '<ul><li><p>one</p></li><li><p>two</p></li></ul><p>three</p>' });
    cursorIn('one');

    run(rtl.toggle());
    expect(getHTML()).toBe('<ul dir="rtl"><li><p dir="rtl">one</p></li><li><p>two</p></li></ul><p>three</p>');

    // the other items have the direction of the list
    cursorIn('two');
    expect(rtl.isActive(state())).toBe(true);

    run(ltr.toggle());
    expect(getHTML()).toBe('<ul dir="ltr"><li><p dir="rtl">one</p></li><li><p dir="ltr">two</p></li></ul><p>three</p>');
  });

  it('should set the direction of task lists and ordered lists', () => {
    editor = new Editor({
      content: '<ol start="2"><li><p>one</p></li></ol>'
        + '<ul data-type="task_list"><li data-type="task_item" data-checked="true"><p>two</p></li></ul>',
    });
    selectBetween('one', 'two');

    run(rtl.toggle());
    expect(getHTML()).toBe(
      '<ol start="2" dir="rtl"><li><p dir="rtl">one</p></li></ol>'
      + '<ul data-type="task_list" dir="rtl"><li data-type="task_item" data-checked="true"><p dir="rtl">two</p></li></ul>',
    );
  });

  it('should set the direction of the blockquote of the paragraph', () => {
    editor = new Editor({ content: '<blockquote><p>one</p><p>two</p></blockquote>' });
    cursorIn('one');

    run(rtl.toggle());
    expect(getHTML()).toBe('<blockquote dir="rtl"><p dir="rtl">one</p><p>two</p></blockquote>');

    run(rtl.toggle());
    expect(getHTML()).toBe('<blockquote><p>one</p><p>two</p></blockquote>');
  });

  it('should set only the nearest list or blockquote of a block', () => {
    editor = new Editor({ content: '<blockquote><ul><li><p>one</p></li></ul><p>two</p></blockquote>' });
    cursorIn('one');

    run(rtl.toggle());
    expect(getHTML()).toBe('<blockquote><ul dir="rtl"><li><p dir="rtl">one</p></li></ul><p>two</p></blockquote>');
  });

  it('should set every list and blockquote whose blocks are all selected', () => {
    editor = new Editor({ content: '<blockquote><ul><li><p>one</p></li></ul><p>two</p></blockquote>' });
    selectAll();

    run(rtl.toggle());
    expect(getHTML()).toBe('<blockquote dir="rtl"><ul dir="rtl"><li><p dir="rtl">one</p></li></ul><p dir="rtl">two</p></blockquote>');

    run(rtl.toggle());
    expect(getHTML()).toBe('<blockquote><ul><li><p>one</p></li></ul><p>two</p></blockquote>');
  });

  describe('in tables', () => {
    const table = (first: string, second = '<p>two</p>', attrs = ''): string => {
      return `<table${attrs}><tbody><tr><td>${first}</td><td>${second}</td></tr></tbody></table>`;
    };

    it('should not change the table, and so its column order, for a paragraph in a cell', () => {
      editor = new Editor({ content: table('<p>one</p>') });
      cursorIn('one');

      run(rtl.toggle());
      expect(getHTML()).toBe(table('<p dir="rtl">one</p>'));
    });

    it('should change the list in the cell', () => {
      editor = new Editor({ content: table('<ul><li><p>one</p></li></ul>') });
      cursorIn('one');

      run(rtl.toggle());
      expect(getHTML()).toBe(table('<ul dir="rtl"><li><p dir="rtl">one</p></li></ul>'));
    });

    it('should change the table when all of it is selected', () => {
      editor = new Editor({ content: table('<p>one</p>') });
      selectAll();

      run(rtl.toggle());
      expect(getHTML()).toBe(table('<p dir="rtl">one</p>', '<p dir="rtl">two</p>', ' dir="rtl"'));
    });

    it('should change the table when all of its cells are selected', () => {
      editor = new Editor({ content: table('<p>one</p>') });
      const [first, last] = cellPositions();
      editor.view.dispatch(state().tr.setSelection(CellSelection.create(state().doc, first, last)));

      run(rtl.toggle());
      expect(getHTML()).toBe(table('<p dir="rtl">one</p>', '<p dir="rtl">two</p>', ' dir="rtl"'));
    });

    it('should change only the cells of a cell selection', () => {
      editor = new Editor({ content: table('<p>one</p>') });
      const [first] = cellPositions();
      editor.view.dispatch(state().tr.setSelection(CellSelection.create(state().doc, first)));

      run(rtl.toggle());
      expect(getHTML()).toBe(table('<p dir="rtl">one</p>'));
    });

    it('should not take the direction of the table as the direction of the paragraph', () => {
      editor = new Editor({ content: table('<p>one</p>', '<p>two</p>', ' dir="rtl"') });
      cursorIn('one');

      expect(rtl.isActive(state())).toBe(false);
    });
  });
});

describe('TextDirection: inherited directions', () => {
  afterEach(() => {
    editor.destroy();
  });

  // the command changes the block and its list, not the item that gives the direction
  it('should not be active for a direction of a list item, and set it on the block', () => {
    editor = new Editor({ content: '<ul><li dir="rtl"><p>one</p></li></ul>' });
    cursorIn('one');

    expect(rtl.isActive(state())).toBe(false);
    expect(rtl.canExecute(state())).toBe(true);

    run(rtl.toggle());
    expect(getHTML()).toBe('<ul dir="rtl"><li dir="rtl"><p dir="rtl">one</p></li></ul>');
    expect(rtl.isActive(state())).toBe(true);

    run(rtl.toggle());
    expect(getHTML()).toBe('<ul><li dir="rtl"><p>one</p></li></ul>');
    expect(rtl.isActive(state())).toBe(false);
  });

  it('should not be active for a direction of a task item', () => {
    editor = new Editor({
      content: '<ul data-type="task_list"><li data-type="task_item" data-checked="false" dir="rtl"><p>one</p></li></ul>',
    });
    cursorIn('one');

    expect(rtl.isActive(state())).toBe(false);

    run(rtl.toggle());
    expect(rtl.isActive(state())).toBe(true);
    expect(getHTML()).toContain('<p dir="rtl">one</p>');
  });

  it('should never end in a click that changes nothing for an outer blockquote', () => {
    editor = new Editor({ content: '<blockquote><p>one</p><ul><li><p>two</p></li></ul></blockquote>' });
    selectAll();
    run(rtl.toggle());
    expect(getHTML()).toBe('<blockquote dir="rtl"><p dir="rtl">one</p><ul dir="rtl"><li><p dir="rtl">two</p></li></ul></blockquote>');

    cursorIn('two');
    expect(rtl.isActive(state())).toBe(true);
    run(rtl.toggle());
    expect(getHTML()).toBe('<blockquote dir="rtl"><p dir="rtl">one</p><ul><li><p>two</p></li></ul></blockquote>');

    // the direction now comes from the blockquote, which is not wholly selected
    expect(rtl.isActive(state())).toBe(false);
    run(rtl.toggle());
    expect(getHTML()).toBe('<blockquote dir="rtl"><p dir="rtl">one</p><ul dir="rtl"><li><p dir="rtl">two</p></li></ul></blockquote>');
  });

  it('should not offer a toggle that changes nothing', () => {
    editor = new Editor({ content: '<p dir="rtl">one</p>' });
    cursorIn('one');

    expect(rtl.isActive(state())).toBe(true);
    expect(rtl.canExecute(state())).toBe(true);
    expect(ltr.canExecute(state())).toBe(true);
  });
});

describe('getCommonDirection', () => {
  afterEach(() => {
    editor.destroy();
  });

  const common = (): string | null => getCommonDirection(state().doc, 0, state().doc.content.size);

  it('should give the direction shared by every block', () => {
    editor = new Editor({ content: '<p dir="rtl">one</p><ul dir="rtl"><li><p>two</p></li></ul>' });
    expect(common()).toBe('rtl');
  });

  it('should give null for mixed or missing directions', () => {
    editor = new Editor({ content: '<p dir="rtl">one</p><p>two</p>' });
    expect(common()).toBeNull();
  });
});

import { TextSelection } from 'prosemirror-state';

import Editor from '../Editor';
import { setTextDirection } from '../commands/TextDirection';
import { getEditorDirection, setEditorDirection } from './direction';

describe('editor direction', () => {
  let editor: Editor;

  afterEach(() => {
    editor.destroy();
  });

  it('should not write a direction on the editor surface by default', () => {
    editor = new Editor();

    expect(editor.view.dom.hasAttribute('dir')).toBe(false);
    expect(editor.view.dom.hasAttribute('data-auto-dir')).toBe(false);
    expect(getEditorDirection(editor.view.state)).toEqual({ dir: null, autoDirection: false });
  });

  it('should write the dir option on the editor surface', () => {
    editor = new Editor({ dir: 'rtl' });
    expect(editor.view.dom.getAttribute('dir')).toBe('rtl');
  });

  it('should mark the surface with the autoDirection option', () => {
    editor = new Editor({ autoDirection: true });
    expect(editor.view.dom.hasAttribute('data-auto-dir')).toBe(true);
    expect(editor.view.dom.hasAttribute('dir')).toBe(false);
  });

  it('should update the direction of the surface', () => {
    editor = new Editor({ dir: 'rtl' });
    const { view } = editor;

    view.dispatch(setEditorDirection(view.state.tr, { dir: 'ltr' }));
    expect(view.dom.getAttribute('dir')).toBe('ltr');

    view.dispatch(setEditorDirection(view.state.tr, { dir: null }));
    expect(view.dom.hasAttribute('dir')).toBe(false);

    view.dispatch(setEditorDirection(view.state.tr, { autoDirection: true }));
    expect(view.dom.hasAttribute('data-auto-dir')).toBe(true);
  });

  it('should let the attributes option win over the dir option', () => {
    editor = new Editor({ dir: 'rtl', attributes: { dir: 'ltr' } });
    expect(editor.view.dom.getAttribute('dir')).toBe('ltr');
  });

  it('should expose its options as config', () => {
    editor = new Editor({ dir: 'auto', autoDirection: true });

    expect(editor.config.dir).toBe('auto');
    expect(editor.config.autoDirection).toBe(true);
    expect(editor.config.history).toBe(true);
  });

  describe('autoDirection', () => {
    const select = (pos: number): void => {
      const { view } = editor;
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, pos)));
    };

    const dirs = (): (string | null)[] => {
      return Array.from(editor.view.dom.querySelectorAll('p, h1, pre')).map((el) => el.getAttribute('dir'));
    };

    it('should write dir="auto" on the blocks the html output writes it on', () => {
      editor = new Editor({
        autoDirection: true,
        content: '<p>one</p><h1>two</h1><p dir="ltr">three</p><blockquote dir="rtl"><p>four</p></blockquote><pre><code>five</code></pre>',
      });

      expect(dirs()).toEqual(['auto', 'auto', 'ltr', null, null]);
    });

    // dir="auto" decides one direction for the whole block, `unicode-bidi: plaintext` one per line
    it('should give a paragraph with a hard break one dir="auto", as in the html output', () => {
      editor = new Editor({ autoDirection: true, content: '<p>Hello world<br>سلام دنیا</p>' });

      const paragraph = editor.view.dom.querySelector('p');
      expect(paragraph?.getAttribute('dir')).toBe('auto');
      expect(paragraph?.querySelector('br')).toBeTruthy();
      expect(getComputedStyle(paragraph as Element).unicodeBidi).not.toBe('plaintext');
    });

    it('should follow changes of the document and of the option', () => {
      editor = new Editor({ autoDirection: true, content: '<p>one</p><p>two</p>' });
      const { view } = editor;

      select(1);
      setTextDirection('rtl')(view.state, view.dispatch);
      expect(dirs()).toEqual(['rtl', 'auto']);

      view.dispatch(setEditorDirection(view.state.tr, { autoDirection: false }));
      expect(dirs()).toEqual(['rtl', null]);
    });

    it('should not write dir="auto" without the option', () => {
      editor = new Editor({ content: '<p>one</p>' });
      expect(dirs()).toEqual([null]);
    });

    it('should not put the decoration into the document', () => {
      editor = new Editor({ autoDirection: true, content: '<p>one</p>' });
      expect(editor.view.state.doc.firstChild?.attrs['dir']).toBeNull();
    });

  });

  describe('node views', () => {
    const select = (pos: number): void => {
      const { view } = editor;
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, pos)));
    };

    it('should write the direction of a table', () => {
      editor = new Editor({ content: '<table dir="rtl"><tbody><tr><td><p>one</p></td></tr></tbody></table>' });
      const table = editor.view.dom.querySelector('table');
      expect(table?.getAttribute('dir')).toBe('rtl');

      // a paragraph in the only cell selects all of the table
      select(4);
      setTextDirection('ltr')(editor.view.state, editor.view.dispatch);
      expect(editor.view.dom.querySelector('table')?.getAttribute('dir')).toBe('ltr');

      setTextDirection(null)(editor.view.state, editor.view.dispatch);
      expect(editor.view.dom.querySelector('table')?.hasAttribute('dir')).toBe(false);
    });

    it('should write the direction of a task item', () => {
      editor = new Editor({
        content: '<ul data-type="task_list"><li data-type="task_item" data-checked="false" dir="rtl"><p>one</p></li></ul>',
      });

      const item = editor.view.dom.querySelector('li[data-type="task_item"]');
      expect(item?.getAttribute('dir')).toBe('rtl');
      expect(item?.querySelector('input[type="checkbox"]')).toBeTruthy();
    });
  });
});

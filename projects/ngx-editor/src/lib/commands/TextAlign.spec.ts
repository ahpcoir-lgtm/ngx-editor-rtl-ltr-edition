import { TextSelection } from 'prosemirror-state';

import Editor from '../Editor';
import { toHTML } from '../parsers';
import { ALIGN_END, ALIGN_LEFT, ALIGN_START } from './index';

describe('TextAlign', () => {
  let editor: Editor;

  const getHTML = (): string => toHTML(editor.view.state.doc.toJSON());

  beforeEach(() => {
    editor = new Editor({ content: '<p dir="rtl">one</p>' });
    const { view } = editor;
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1)));
  });

  afterEach(() => {
    editor.destroy();
  });

  it('should align to the start and the end of the line and toggle it off', () => {
    const { view } = editor;

    expect(ALIGN_START.toggle()(view.state, view.dispatch)).toBe(true);
    expect(getHTML()).toBe('<p style="text-align: start;" dir="rtl">one</p>');
    expect(ALIGN_START.isActive(view.state)).toBe(true);
    expect(ALIGN_END.isActive(view.state)).toBe(false);

    ALIGN_END.toggle()(view.state, view.dispatch);
    expect(getHTML()).toBe('<p style="text-align: end;" dir="rtl">one</p>');

    ALIGN_END.toggle()(view.state, view.dispatch);
    expect(getHTML()).toBe('<p dir="rtl">one</p>');
  });

  it('should write the left alignment, so it also works in right to left text', () => {
    const { view } = editor;

    ALIGN_LEFT.toggle()(view.state, view.dispatch);
    expect(getHTML()).toBe('<p style="text-align: left;" dir="rtl">one</p>');
    expect(view.dom.querySelector('p')?.getAttribute('style')).toBe('text-align: left;');
  });

  it('should align with the editor commands', () => {
    editor.commands.align('end').exec();
    expect(getHTML()).toBe('<p style="text-align: end;" dir="rtl">one</p>');
  });
});

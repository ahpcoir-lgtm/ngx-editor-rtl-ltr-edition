import { Command, EditorState, NodeSelection, TextSelection } from 'prosemirror-state';

import Editor from '../Editor';
import { toHTML } from '../parsers';
import FontFamily from './FontFamily';
import FormatClear from './FormatClear';

describe('FontFamily command', () => {
  let editor: Editor;
  const command = new FontFamily();

  const state = (): EditorState => editor.view.state;
  const run = (fn: Command): boolean => fn(editor.view.state, editor.view.dispatch);
  const html = (): string => toHTML(state().doc.toJSON());

  const select = (from: number, to: number): void => {
    const { view } = editor;
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, from, to)));
  };

  beforeEach(() => {
    editor = new Editor({ content: '<p>Hello world</p>' });
  });

  afterEach(() => {
    editor.destroy();
  });

  it('should set the font of the selection and survive toHTML', () => {
    select(1, 6);
    expect(run(command.apply('"Vazirmatn", sans-serif'))).toBe(true);

    expect(html()).toBe('<p><span style="font-family: Vazirmatn, sans-serif;">Hello</span> world</p>');
    expect(command.isActive(state())).toBe(true);
    expect(command.getActiveFamilies(state())).toEqual(['Vazirmatn, sans-serif']);
  });

  it('should replace the font of the selection', () => {
    select(1, 6);
    run(command.apply('Vazirmatn, sans-serif'));
    run(command.apply('Amiri, serif'));

    expect(html()).toBe('<p><span style="font-family: Amiri, serif;">Hello</span> world</p>');
  });

  it('should list each font of a mixed selection once', () => {
    select(1, 3);
    run(command.apply('Amiri, serif'));
    select(4, 6);
    run(command.apply('Tahoma'));
    select(1, 12);

    expect(command.getActiveFamilies(state())).toEqual(['Amiri, serif', 'Tahoma']);
  });

  it('should remove the font', () => {
    select(1, 12);
    run(command.apply('Tahoma'));
    run(command.remove());

    expect(html()).toBe('<p>Hello world</p>');
    expect(command.isActive(state())).toBe(false);
    expect(command.getActiveFamilies(state())).toEqual([]);
  });

  it('should store the font at the cursor for the text typed next', () => {
    select(6, 6);
    expect(run(command.apply('Tahoma'))).toBe(true);
    expect(command.getActiveFamilies(state())).toEqual(['Tahoma']);

    editor.view.dispatch(state().tr.insertText('!'));
    expect(html()).toBe('<p>Hello<span style="font-family: Tahoma;">!</span> world</p>');
  });

  it('should not apply an unsafe value or a font to a selected image', () => {
    select(1, 6);
    expect(run(command.apply('x; color: red'))).toBe(false);

    editor.setContent('<p><img src="a.png"></p>');
    editor.view.dispatch(state().tr.setSelection(NodeSelection.create(state().doc, 1)));
    expect(command.canExecute(state())).toBe(false);
  });

  it('should be available through EditorCommands', () => {
    select(1, 6);
    editor.commands.fontFamily('Tahoma').exec();
    expect(html()).toContain('font-family: Tahoma;');

    select(1, 6);
    editor.commands.removeFontFamily().exec();
    expect(html()).toBe('<p>Hello world</p>');
  });

  it('should be removed by clear formatting', () => {
    select(1, 6);
    run(command.apply('Tahoma'));
    run(new FormatClear().insert());

    expect(html()).toBe('<p>Hello world</p>');
  });
});

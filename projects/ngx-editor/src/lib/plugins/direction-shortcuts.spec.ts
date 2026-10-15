import { TextSelection } from 'prosemirror-state';

import Editor from '../Editor';
import { toHTML } from '../parsers';

type Modifiers = Pick<KeyboardEventInit, 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey'>;

describe('direction shortcuts', () => {
  let editor: Editor;

  const getHTML = (): string => toHTML(editor.view.state.doc.toJSON());

  const dispatchKey = (type: 'keydown' | 'keyup', key: string, code: string, modifiers: Modifiers = {}): KeyboardEvent => {
    const event = new KeyboardEvent(type, { key, code, bubbles: true, cancelable: true, ...modifiers });
    editor.view.dom.dispatchEvent(event);
    return event;
  };

  // Ctrl down, Shift down, Shift up, Ctrl up, with the modifier state of each event as a browser reports it
  const pressCtrlShift = (shiftCode: 'ShiftLeft' | 'ShiftRight'): void => {
    dispatchKey('keydown', 'Control', 'ControlLeft', { ctrlKey: true });
    dispatchKey('keydown', 'Shift', shiftCode, { ctrlKey: true, shiftKey: true });
    dispatchKey('keyup', 'Shift', shiftCode, { ctrlKey: true });
    dispatchKey('keyup', 'Control', 'ControlLeft');
  };

  const create = (options: ConstructorParameters<typeof Editor>[0] = {}): void => {
    editor = new Editor({ content: '<p>one</p><p>two</p>', ...options });
    const { view } = editor;
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1)));
  };

  afterEach(() => {
    editor.destroy();
  });

  it('should make the block right to left with Ctrl + Right Shift', () => {
    create();
    pressCtrlShift('ShiftRight');
    expect(getHTML()).toBe('<p dir="rtl">one</p><p>two</p>');
  });

  it('should make the block left to right with Ctrl + Left Shift', () => {
    create({ content: '<p dir="rtl">one</p>' });
    pressCtrlShift('ShiftLeft');
    expect(getHTML()).toBe('<p dir="ltr">one</p>');
  });

  it('should set the direction of every block in the selection', () => {
    create();
    const { view } = editor;
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1, view.state.doc.content.size - 1)));

    pressCtrlShift('ShiftRight');
    expect(getHTML()).toBe('<p dir="rtl">one</p><p dir="rtl">two</p>');
  });

  it('should not toggle the direction off when pressed again', () => {
    create();
    pressCtrlShift('ShiftRight');
    pressCtrlShift('ShiftRight');
    expect(getHTML()).toBe('<p dir="rtl">one</p><p>two</p>');
  });

  it('should work when Shift is pressed before Ctrl', () => {
    create();
    dispatchKey('keydown', 'Shift', 'ShiftRight', { shiftKey: true });
    dispatchKey('keydown', 'Control', 'ControlRight', { ctrlKey: true, shiftKey: true });
    dispatchKey('keyup', 'Shift', 'ShiftRight', { ctrlKey: true });
    expect(getHTML()).toBe('<p dir="rtl">one</p><p>two</p>');
  });

  it('should use the location of the key without a code', () => {
    create();
    dispatchKey('keydown', 'Control', '', { ctrlKey: true });
    dispatchKey('keydown', 'Shift', '', { ctrlKey: true, shiftKey: true });
    editor.view.dom.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', location: 2, ctrlKey: true, bubbles: true }));
    expect(getHTML()).toBe('<p dir="rtl">one</p><p>two</p>');
  });

  it('should not run when another key was pressed with Ctrl and Shift', () => {
    create();
    dispatchKey('keydown', 'Control', 'ControlLeft', { ctrlKey: true });
    dispatchKey('keydown', 'Shift', 'ShiftRight', { ctrlKey: true, shiftKey: true });
    dispatchKey('keydown', 'Z', 'KeyZ', { ctrlKey: true, shiftKey: true });
    dispatchKey('keyup', 'Z', 'KeyZ', { ctrlKey: true, shiftKey: true });
    dispatchKey('keyup', 'Shift', 'ShiftRight', { ctrlKey: true });
    expect(getHTML()).toBe('<p>one</p><p>two</p>');
  });

  it('should not run with Alt (AltGr) or without Ctrl', () => {
    create();
    dispatchKey('keydown', 'Shift', 'ShiftRight', { ctrlKey: true, altKey: true, shiftKey: true });
    dispatchKey('keyup', 'Shift', 'ShiftRight', { ctrlKey: true, altKey: true });

    dispatchKey('keydown', 'Shift', 'ShiftRight', { shiftKey: true });
    dispatchKey('keyup', 'Shift', 'ShiftRight');

    expect(getHTML()).toBe('<p>one</p><p>two</p>');
  });

  it('should not run when the editor lost the focus in between', () => {
    create();
    dispatchKey('keydown', 'Control', 'ControlLeft', { ctrlKey: true });
    dispatchKey('keydown', 'Shift', 'ShiftRight', { ctrlKey: true, shiftKey: true });
    editor.view.dom.dispatchEvent(new FocusEvent('blur'));
    dispatchKey('keyup', 'Shift', 'ShiftRight', { ctrlKey: true });
    expect(getHTML()).toBe('<p>one</p><p>two</p>');
  });

  it('should apply the native block direction input of the browser to the document', () => {
    create();
    const event = new InputEvent('beforeinput', {
      inputType: 'formatSetBlockTextDirection',
      data: 'rtl',
      bubbles: true,
      cancelable: true,
    });
    editor.view.dom.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(getHTML()).toBe('<p dir="rtl">one</p><p>two</p>');
  });

  it('should be turned off with the directionShortcuts feature', () => {
    create({ features: { directionShortcuts: false } });
    pressCtrlShift('ShiftRight');
    expect(getHTML()).toBe('<p>one</p><p>two</p>');
    expect(editor.features.directionShortcuts).toBe(false);
  });

  it('should be turned off with the keyboard shortcuts', () => {
    create({ keyboardShortcuts: false });
    pressCtrlShift('ShiftRight');
    expect(getHTML()).toBe('<p>one</p><p>two</p>');
  });

  it('should be on by default', () => {
    create();
    expect(editor.features.directionShortcuts).toBe(true);
  });
});

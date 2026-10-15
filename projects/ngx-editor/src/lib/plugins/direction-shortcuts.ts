import { Plugin, PluginKey } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

import { setTextDirection, TextDirectionValue } from '../commands/TextDirection';

const DIRECTIONS: readonly string[] = ['ltr', 'rtl', 'auto'];

// KeyboardEvent.DOM_KEY_LOCATION_LEFT and DOM_KEY_LOCATION_RIGHT
const LOCATION_LEFT = 1;
const LOCATION_RIGHT = 2;

const isModifier = (e: KeyboardEvent): boolean => e.key === 'Control' || e.key === 'Shift';

// the side of the released Shift key, from `code` or else from `location`
const getShiftSide = (e: KeyboardEvent): TextDirectionValue | null => {
  if (e.code === 'ShiftRight' || (!e.code && e.location === LOCATION_RIGHT)) {
    return 'rtl';
  }

  if (e.code === 'ShiftLeft' || (!e.code && e.location === LOCATION_LEFT)) {
    return 'ltr';
  }

  return null;
};

const run = (view: EditorView, dir: TextDirectionValue | null): boolean => {
  if (!view.editable) {
    return false;
  }

  return setTextDirection(dir)(view.state, view.dispatch);
};

// Ctrl + Right Shift makes the blocks in the selection right to left, Ctrl + Left Shift left to right
// (the Windows and Word convention). It runs when Shift is released, only when Ctrl and Shift were
// pressed without any other key, so shortcuts like Ctrl + Shift + Z are not affected.
const directionShortcutsPlugin = (): Plugin => {
  let armed = false;

  return new Plugin({
    key: new PluginKey('directionShortcuts'),
    props: {
      handleDOMEvents: {
        keydown(_, e: KeyboardEvent): boolean {
          armed = isModifier(e) && e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey;
          return false;
        },
        keyup(view: EditorView, e: KeyboardEvent): boolean {
          if (e.key !== 'Shift' || !armed) {
            return false;
          }

          armed = false;
          const dir = getShiftSide(e);
          return dir ? run(view, dir) : false;
        },
        mousedown(): boolean {
          armed = false;
          return false;
        },
        blur(): boolean {
          armed = false;
          return false;
        },
        // the native Ctrl + Shift handling of Chromium on Windows, applied as a document change instead of a DOM change
        beforeinput(view: EditorView, e: InputEvent): boolean {
          if (e.inputType !== 'formatSetBlockTextDirection') {
            return false;
          }

          e.preventDefault();
          const dir = DIRECTIONS.includes(e.data ?? '') ? e.data as TextDirectionValue : null;
          run(view, dir);
          return true;
        },
      },
    },
  });
};

export default directionShortcutsPlugin;

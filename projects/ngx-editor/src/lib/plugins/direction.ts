import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { EditorState, Plugin, PluginKey, Transaction } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

import type { TextDirectionValue } from '../commands/TextDirection';
import { forEachAutoDirectionBlock } from '../parsers';

export interface EditorDirectionState {
  /** written as `dir` on the editor surface; `null` inherits the direction of the page */
  dir: TextDirectionValue | null;
  /** blocks without a `dir` of their own take the direction of their first strong character */
  autoDirection: boolean;
}

export const directionPluginKey = new PluginKey<EditorDirectionState>('direction');

// updates the state, e.g. `tr.setMeta(directionPluginKey, { dir: 'rtl' })`
export const setEditorDirection = (tr: Transaction, value: Partial<EditorDirectionState>): Transaction => {
  return tr.setMeta(directionPluginKey, value);
};

export const getEditorDirection = (state: EditorState): EditorDirectionState | undefined => {
  return directionPluginKey.getState(state);
};

// `dir="auto"` on the blocks that `toHTML(…, { autoDirection: true })` writes it on, so that the editor and the
// html output use the same rule (one direction per block, also across hard breaks); documents are immutable,
// so the set is cached per document
const autoDirectionCache = new WeakMap<ProseMirrorNode, DecorationSet>();

// a letter is a strong character for the bidi algorithm; digits and punctuation are not
const STRONG_CHARACTER = /\p{L}/u;

const getAutoDirectionDecorations = (doc: ProseMirrorNode): DecorationSet => {
  let set = autoDirectionCache.get(doc);

  if (!set) {
    const decorations: Decoration[] = [];
    forEachAutoDirectionBlock(doc, (node, pos) => {
      // `dir="auto"` resolves a block without letters (e.g. the empty first paragraph) to ltr, which put the
      // placeholder and the caret on the left of a right-to-left editor; such blocks inherit the editor's direction
      if (STRONG_CHARACTER.test(node.textContent)) {
        decorations.push(Decoration.node(pos, pos + node.nodeSize, { dir: 'auto' }));
      }
    });

    set = DecorationSet.create(doc, decorations);
    autoDirectionCache.set(doc, set);
  }

  return set;
};

// the `dir` and `data-auto-dir` attributes of the editor surface (`.NgxEditor__Content`)
const directionPlugin = (initial: EditorDirectionState): Plugin<EditorDirectionState> => {
  return new Plugin<EditorDirectionState>({
    key: directionPluginKey,
    state: {
      init(): EditorDirectionState {
        return initial;
      },
      apply(tr: Transaction, value: EditorDirectionState): EditorDirectionState {
        const update = tr.getMeta(directionPluginKey) as Partial<EditorDirectionState> | undefined;
        return update ? { ...value, ...update } : value;
      },
    },
    props: {
      attributes(state: EditorState): Record<string, string> {
        const value = directionPluginKey.getState(state);
        const attrs: Record<string, string> = {};

        if (value?.dir) {
          attrs['dir'] = value.dir;
        }

        if (value?.autoDirection) {
          attrs['data-auto-dir'] = '';
        }

        return attrs;
      },
      decorations(state: EditorState): DecorationSet | null {
        const value = directionPluginKey.getState(state);
        return value?.autoDirection ? getAutoDirectionDecorations(state.doc) : null;
      },
    },
  });
};

export default directionPlugin;

import type { Node as ProseMirrorNode, NodeType } from 'prosemirror-model';
import type { Command, EditorState, Transaction } from 'prosemirror-state';

import { ToggleCommand } from './types';

export type TextDirectionValue = 'ltr' | 'rtl' | 'auto';

// containers that follow the direction of their blocks, so that list markers and the quote border move along
const CONTAINERS = ['bullet_list', 'ordered_list', 'task_list', 'blockquote'];

const hasDirAttr = (type: NodeType): boolean => Boolean(type.spec.attrs && 'dir' in type.spec.attrs);

const isCell = (node: ProseMirrorNode): boolean => {
  const role: unknown = node.type.spec['tableRole'];
  return role === 'cell' || role === 'header_cell';
};

const isTable = (node: ProseMirrorNode): boolean => node.type.spec['tableRole'] === 'table';

const isContainer = (node: ProseMirrorNode): boolean => {
  return hasDirAttr(node.type) && (CONTAINERS.includes(node.type.name) || isTable(node));
};

const getDir = (node: ProseMirrorNode): string | null => {
  const dir: unknown = node.attrs['dir'];
  return typeof dir === 'string' && dir ? dir : null;
};

// the textblocks in the selection that can have a direction, by position
const getTextblocks = (state: EditorState): Map<number, ProseMirrorNode> => {
  const { doc, selection } = state;
  const textblocks = new Map<number, ProseMirrorNode>();

  selection.ranges.forEach(({ $from, $to }) => {
    doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
      if (!node.isTextblock) {
        return true;
      }

      if (hasDirAttr(node.type)) {
        textblocks.set(pos, node);
      }

      return false;
    });
  });

  return textblocks;
};

// whether every textblock in the container is part of the selection
const isCovered = (container: ProseMirrorNode, pos: number, textblocks: Map<number, ProseMirrorNode>): boolean => {
  let covered = true;

  container.descendants((child, offset) => {
    if (!covered) {
      return false;
    }

    if (child.isTextblock) {
      covered = !hasDirAttr(child.type) || textblocks.has(pos + 1 + offset);
      return false;
    }

    return true;
  });

  return covered;
};

// The textblocks in the selection, the nearest list or blockquote of each one (not beyond its table cell),
// and every list, blockquote or table whose textblocks are all selected. A table therefore changes its
// direction (and column order) only when all of it is selected, a paragraph in one cell does not.
export const getDirectionTargets = (state: EditorState): Map<number, ProseMirrorNode> => {
  const { doc } = state;
  const textblocks = getTextblocks(state);
  const targets = new Map(textblocks);
  const candidates = new Map<number, ProseMirrorNode>();

  textblocks.forEach((_, pos) => {
    const $pos = doc.resolve(pos);
    let nearestFound = false;
    let inCell = false;

    for (let d = $pos.depth; d > 0; d--) {
      const ancestor = $pos.node(d);
      const ancestorPos = $pos.before(d);

      if (isCell(ancestor)) {
        inCell = true;
      }

      if (isContainer(ancestor) && !nearestFound && !inCell && !isTable(ancestor)) {
        nearestFound = true;
        targets.set(ancestorPos, ancestor);
      } else if (isContainer(ancestor)) {
        candidates.set(ancestorPos, ancestor);
      }
    }
  });

  candidates.forEach((node, pos) => {
    if (isCovered(node, pos, textblocks)) {
      targets.set(pos, node);
    }
  });

  return targets;
};

// The node that gives the textblock its direction: the textblock itself or the nearest ancestor with a `dir`,
// not beyond its table cell. `null` when there is none.
const getDirSource = (state: EditorState, pos: number, node: ProseMirrorNode): { pos: number; dir: string } | null => {
  const ownDir = getDir(node);
  if (ownDir) {
    return { pos, dir: ownDir };
  }

  const $pos = state.doc.resolve(pos);

  for (let d = $pos.depth; d > 0; d--) {
    const ancestor = $pos.node(d);

    if (isCell(ancestor)) {
      return null;
    }

    const dir = getDir(ancestor);
    if (dir) {
      return { pos: $pos.before(d), dir };
    }
  }

  return null;
};

const isDirection = (value: string | null): value is TextDirectionValue => {
  return value === 'ltr' || value === 'rtl' || value === 'auto';
};

// The direction shared by every textblock in the range, its own or from a node inside the range, else null.
// Used to give a new list or blockquote the direction of the blocks it wraps.
export const getCommonDirection = (doc: ProseMirrorNode, from: number, to: number): TextDirectionValue | null => {
  const dirs = new Set<string | null>();

  const visit = (node: ProseMirrorNode, inherited: string | null): void => {
    const dir = getDir(node) ?? inherited;

    if (node.isTextblock) {
      if (hasDirAttr(node.type)) {
        dirs.add(dir);
      }
      return;
    }

    node.forEach((child) => visit(child, dir));
  };

  doc.nodesBetween(from, to, (node, pos) => {
    // the outermost nodes inside the range; their descendants are visited with the inherited direction
    if (pos >= from && pos + node.nodeSize <= to) {
      visit(node, null);
      return false;
    }

    return true;
  });

  const [dir = null] = dirs.size === 1 ? Array.from(dirs) : [];
  return isDirection(dir) ? dir : null;
};

// The attributes for a list or blockquote of `type` that wraps the selected blocks: their common direction,
// so that the markers or the border are on their side. `null` (no attributes) when they have none.
export const getWrapAttrs = (state: EditorState, type: NodeType): { dir: TextDirectionValue } | null => {
  const { $from, $to } = state.selection;
  const range = $from.blockRange($to);

  if (!range || !hasDirAttr(type)) {
    return null;
  }

  const dir = getCommonDirection(state.doc, range.start, range.end);
  return dir ? { dir } : null;
};

// sets the direction of the blocks in the selection, `null` removes it
export const setTextDirection = (dir: TextDirectionValue | null): Command => {
  return (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
    const targets = getDirectionTargets(state);

    if (targets.size === 0) {
      return false;
    }

    const { tr } = state;

    targets.forEach((node, pos) => {
      if (getDir(node) !== dir) {
        tr.setNodeAttribute(pos, 'dir', dir);
      }
    });

    if (tr.docChanged) {
      dispatch?.(tr);
    }

    return true;
  };
};

class TextDirection implements ToggleCommand {
  dir: TextDirectionValue;

  constructor(dir: TextDirectionValue) {
    this.dir = dir;
  }

  // sets the direction, also when it is the active one
  apply(): Command {
    return setTextDirection(this.dir);
  }

  // sets the direction, or removes it when it is the active one
  toggle(): Command {
    return (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
      const dir = this.isActive(state) ? null : this.dir;
      const targets = Array.from(getDirectionTargets(state).values());

      // a click that would change nothing is not offered
      if (!targets.some((node) => getDir(node) !== dir)) {
        return false;
      }

      return setTextDirection(dir)(state, dispatch);
    };
  }

  // Whether every textblock in the selection has this direction, its own or from an ancestor (not beyond its
  // table cell), and the node it comes from is one the command changes. A direction inherited from a node the
  // command leaves alone (a list item, an outer quote that is not wholly selected) is not active, so toggling
  // the active value always clears it.
  isActive(state: EditorState): boolean {
    const textblocks = getTextblocks(state);

    if (textblocks.size === 0) {
      return false;
    }

    const targets = getDirectionTargets(state);

    return Array.from(textblocks).every(([pos, node]) => {
      const source = getDirSource(state, pos, node);
      return source !== null && source.dir === this.dir && targets.has(source.pos);
    });
  }

  canExecute(state: EditorState): boolean {
    return this.toggle()(state);
  }
}

export default TextDirection;

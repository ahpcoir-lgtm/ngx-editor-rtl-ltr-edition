import { Attrs, MarkType, Node as ProseMirrorNode, NodeType, ResolvedPos, Schema } from 'prosemirror-model';
import { Command, Plugin } from 'prosemirror-state';
import { keymap } from 'prosemirror-keymap';
import {
  toggleMark, baseKeymap, chainCommands, exitCode,
  newlineInCode, createParagraphNear, liftEmptyBlock, splitBlockAs,
} from 'prosemirror-commands';
import { splitListItem, liftListItem, sinkListItem } from 'prosemirror-schema-list';
import { history, undo, redo } from 'prosemirror-history';
import {
  inputRules, wrappingInputRule, textblockTypeInputRule,
  smartQuotes, emDash, ellipsis, InputRule,
} from 'prosemirror-inputrules';
import { tableEditing, goToNextCell } from 'prosemirror-tables';
import { markInputRule } from 'ngx-editor-rtl-ltr-edition/helpers';

import taskList from './plugins/task-list';
import DirectionTableView from './plugins/table-view';
import { tableColumnResizing, tableRtlNavigation } from './plugins/table-rtl';

interface Options {
  history: boolean;
  keyboardShortcuts: boolean;
  inputRules: boolean;
}

interface ShortcutOptions {
  history: boolean;
}

const isMacOs = typeof navigator !== 'undefined'
  ? (/Mac/).test(navigator.platform)
  : false;

const getBlockDir = (node: ProseMirrorNode): string | null => {
  const dir: unknown = node.attrs['dir'];
  return typeof dir === 'string' && dir ? dir : null;
};

// Input rules ref: https://github.com/ProseMirror/prosemirror-example-setup/

// Like wrappingInputRule, but the new list or blockquote gets the `dir` of the block it wraps, so that the
// markers or the border are on the side of its text. The getAttrs of wrappingInputRule only sees the match, so
// a rule with the same pattern runs first, records the direction and returns null to pass the input on.
const wrappingRuleKeepingDir = (
  regexp: RegExp,
  nodeType: NodeType,
  getAttrs?: (match: RegExpMatchArray) => Attrs,
  joinPredicate?: (match: RegExpMatchArray, node: ProseMirrorNode) => boolean,
): InputRule[] => {
  let dir: string | null = null;
  const canHaveDir = Boolean(nodeType.spec.attrs && 'dir' in nodeType.spec.attrs);

  const recordDir = new InputRule(regexp, (state, _match, start) => {
    dir = canHaveDir ? getBlockDir(state.doc.resolve(start).parent) : null;
    return null;
  });

  const wrap = wrappingInputRule(regexp, nodeType, (match) => {
    const attrs = getAttrs ? getAttrs(match) : null;
    return dir ? { ...attrs, dir } : attrs;
  }, joinPredicate);

  return [recordDir, wrap];
};

// : (NodeType) → InputRule[]
// Given a blockquote node type, returns an input rule that turns `"> "`
// at the start of a textblock into a blockquote.
const blockQuoteRule = (nodeType: NodeType): InputRule[] => {
  return wrappingRuleKeepingDir(/^\s*>\s$/, nodeType);
};

// : (NodeType) → InputRule[]
// Given a list node type, returns an input rule that turns a number
// followed by a dot at the start of a textblock into an ordered list.
const orderedListRule = (nodeType: NodeType): InputRule[] => {
  return wrappingRuleKeepingDir(
    /^(?<order>\d{1,9})\.\s$/,
    nodeType,
    (match) => ({ order: Number(match.groups?.['order']) }),
    (match, node) => node.childCount + Number(node.attrs['order']) === Number(match.groups?.['order']),
  );
};

// : (NodeType) → InputRule[]
// Given a list node type, returns an input rule that turns a bullet
// (dash, plush, or asterisk) at the start of a textblock into a
// bullet list.
const bulletListRule = (nodeType: NodeType): InputRule[] => {
  return wrappingRuleKeepingDir(/^\s*(?:[-+*])\s$/, nodeType);
};

// : (NodeType) → InputRule
// Given a code block node type, returns an input rule that turns a
// textblock starting with three backticks into a code block.
const codeBlockRule = (nodeType: NodeType): InputRule => {
  return textblockTypeInputRule(/^```$/, nodeType);
};

// : (NodeType, number) → InputRule
// Given a node type and a maximum level, creates an input rule that
// turns up to that number of `#` characters followed by a space at
// the start of a textblock into a heading whose level corresponds to
// the number of `#` signs.
const headingRule = (nodeType: NodeType, maxLevel: number): InputRule => {
  return textblockTypeInputRule(
    new RegExp(`^(#{1,${maxLevel}})\\s$`),
    nodeType,
    (match) => ({ level: match[1].length }),
  );
};

// : (MarkType) → InputRule
// Wraps matching text with bold mark
const boldRule = (markType: MarkType): InputRule => {
  // eslint-disable-next-line prefer-named-capture-group
  return markInputRule(/(?:^|\s)(?:(\*\*|__)(?:([^*_]+))(\*\*|__))$/, markType);
};

// : (MarkType) → InputRule
// Wraps matching text with em mark
const emRule = (markType: MarkType): InputRule => {
  // eslint-disable-next-line prefer-named-capture-group
  return markInputRule(/(?:^|\s)(?:(\*|_)(?:([^*_]+))(\*|_))$/, markType);
};

// : (Schema) → Plugin
// A set of input rules for creating the basic block quotes, lists,
// code blocks, and heading.
const buildInputRules = (schema: Schema): Plugin => {
  const rules = smartQuotes.concat(ellipsis, emDash);

  rules.push(boldRule(schema.marks['strong']));
  rules.push(emRule(schema.marks['em']));
  rules.push(...blockQuoteRule(schema.nodes['blockquote']));
  rules.push(...orderedListRule(schema.nodes['ordered_list']));
  rules.push(...bulletListRule(schema.nodes['bullet_list']));
  rules.push(codeBlockRule(schema.nodes['code_block']));
  rules.push(headingRule(schema.nodes['heading'], 6));

  return inputRules({ rules });
};

// runs a list item command for each list item type in the schema
const forListItems = (schema: Schema, command: (itemType: NodeType) => Command): Command => {
  const itemTypes = [schema.nodes['list_item'], schema.nodes['task_item']].filter(Boolean);
  return chainCommands(...itemTypes.map(command));
};

// the first textblock type allowed at the position, like `defaultBlockAt` of prosemirror-commands
const defaultTextblockAt = ($pos: ResolvedPos): NodeType | null => {
  const match = $pos.node(-1).contentMatchAt($pos.indexAfter(-1));

  for (let i = 0; i < match.edgeCount; i++) {
    const { type } = match.edge(i);
    if (type.isTextblock && !type.hasRequiredAttrs()) {
      return type;
    }
  }

  return null;
};

// like splitBlock, but the new block at the end of a block keeps its direction (split blocks keep it anyway)
const splitBlockKeepingDir = splitBlockAs((node, atEnd, $from) => {
  const dir = getBlockDir(node);
  const type = atEnd && dir ? defaultTextblockAt($from) : null;

  if (!type?.spec.attrs || !('dir' in type.spec.attrs)) {
    return null;
  }

  return { type, attrs: { dir } };
});

// splitting inside the text of an item copies its attributes to the new item,
// so uncheck the new item when splitting a checked task item
const splitItem = (itemType: NodeType): Command => {
  return (state, dispatch) => {
    const { $from } = state.selection;
    const dir = getBlockDir($from.parent);

    // an empty item is lifted out of the list instead of split
    const isSplit = $from.parent.content.size > 0;

    // at the start of the item, the text moves to the new item below
    // and keeps the checked state, so the empty item above is the new one
    const atStart = $from.parentOffset === 0 && $from.index(-1) === 0;

    return splitListItem(itemType)(state, dispatch && ((tr) => {
      const $pos = tr.selection.$from;
      const depth = $pos.depth - 1;
      const item = $pos.node(depth);

      if (isSplit && item.type === itemType && item.attrs['checked']) {
        const itemPos = $pos.before(depth);
        const newItemPos = atStart ? itemPos - tr.doc.resolve(itemPos).nodeBefore.nodeSize : itemPos;
        tr.setNodeAttribute(newItemPos, 'checked', false);
      }

      // at the end of the item, the new paragraph is created without the direction of the one it was split from
      if (isSplit && dir && $pos.parent.attrs['dir'] === null) {
        tr.setNodeAttribute($pos.before(), 'dir', dir);
      }

      dispatch(tr);
    }));
  };
};

export const getKeyboardShortcuts = (schema: Schema, options: ShortcutOptions) => {
  const historyKeyMap: Record<string, Command> = {};

  historyKeyMap['Mod-z'] = undo;
  if (isMacOs) {
    historyKeyMap['Shift-Mod-z'] = redo;
  } else {
    historyKeyMap['Mod-y'] = redo;
  }

  const plugins = [
    keymap({
      'Mod-b': toggleMark(schema.marks['strong']),
      'Mod-i': toggleMark(schema.marks['em']),
      'Mod-u': toggleMark(schema.marks['u']),
      'Mod-`': toggleMark(schema.marks['code']),
    }),
    keymap({
      'Enter': chainCommands(
        forListItems(schema, splitItem),
        newlineInCode, createParagraphNear, liftEmptyBlock, splitBlockKeepingDir,
      ),
      'Shift-Enter': chainCommands(exitCode, (state, dispatch) => {
        const { tr } = state;
        const br = schema.nodes['hard_break'];
        dispatch(tr.replaceSelectionWith(br.create()).scrollIntoView());
        return true;
      }),
      'Mod-[': forListItems(schema, liftListItem),
      'Mod-]': forListItems(schema, sinkListItem),
      'Tab': forListItems(schema, sinkListItem),
    }),
    keymap(baseKeymap),
  ];

  if (schema.nodes['table']) {
    plugins.push(
      keymap({
        'Tab': goToNextCell(1),
        'Shift-Tab': goToNextCell(-1),
      }),
    );
  }

  if (options.history) {
    plugins.push(keymap(historyKeyMap));
  }

  return plugins;
};

const getDefaultPlugins = (schema: Schema, options: Options): Plugin[] => {
  const plugins: Plugin[] = [];

  if (options.keyboardShortcuts) {
    plugins.push(...getKeyboardShortcuts(schema, { history: options.history }));
  }

  if (options.history) {
    plugins.push(history());
  }

  if (options.inputRules) {
    plugins.push(buildInputRules(schema));
  }
  
  if (schema.nodes['table']) {
    // the right to left handling runs before the plugins of prosemirror-tables
    plugins.push(...tableColumnResizing({ View: DirectionTableView }), tableRtlNavigation(), tableEditing());
  }

  if (schema.nodes['task_item']) {
    plugins.push(taskList());
  }

  return plugins;
};

export default getDefaultPlugins;

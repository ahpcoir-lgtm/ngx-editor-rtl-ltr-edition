import { EditorState, Selection, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import {
  chainCommands, createParagraphNear, liftEmptyBlock,
  newlineInCode, splitBlock,
} from 'prosemirror-commands';
import { DOMParser } from 'prosemirror-model';

import { NgxEditorError } from 'ngx-editor-rtl-ltr-edition/utils';
import MarkCommand from './commands/Mark';
import ListCommand from './commands/ListItem';
import LinkCommand, { LinkAttrs } from './commands/Link';
import HeadingCommand, { HeadingLevels } from './commands/Heading';
import ImageCommand, { ImageAttrs } from './commands/Image';
import TextColorCommand from './commands/TextColor';
import FontFamilyCommand from './commands/FontFamily';
import TextAlignCommand, { Align } from './commands/TextAlign';
import IndentCommand from './commands/Indent';
import TextDirectionCommand, { setTextDirection, TextDirectionValue } from './commands/TextDirection';
import {
  deleteImage, setImageAlign, setImageAttrs, setImageCaption, setImageLink,
} from './commands/ImageCommands';
import {
  type VideoInsertAttrs, deleteVideo, insertVideoUrl, setVideoAlign, setVideoAttrs, setVideoCaption, setVideoWidth,
} from './commands/VideoCommands';
import type { ImageAlign } from 'ngx-editor-rtl-ltr-edition/schema';

import { HTML, parseHTML } from './trustedTypesUtil';
import { isString } from './stringUtil';

const execMark = (name: string, toggle = false) => {
  return (state: EditorState, dispatch: (tr: Transaction) => void) => {
    const command = new MarkCommand(name);

    if (!toggle) {
      return command.apply()(state, dispatch);
    }

    return command.toggle()(state, dispatch);
  };
};

type FocusPosition = 'start' | 'end';

class EditorCommands {
  private view: EditorView;
  private state: EditorState;
  private tr: Transaction;

  constructor(view: EditorView) {
    if (!view) {
      throw new NgxEditorError('Required view to initialize commands.');
    }

    this.view = view;
    this.state = view.state;
    this.tr = this.view.state.tr;
  }

  private applyTrx = (tr?: Transaction) => {
    this.state = this.state.apply(tr ?? this.tr);
    this.tr = this.state.tr;
    this.tr.setMeta('APPLIED_TRX', true);
  };

  private dispatch = (tr: Transaction): void => {
    this.applyTrx(tr);
  };

  exec(): boolean {
    // No changes applied
    if (!this.tr.getMeta('APPLIED_TRX')) {
      return false;
    }

    const forceEmit = !this.view.state.doc.eq(this.state.doc);
    this.view.updateState(this.state);

    const tr = this.tr
      .setMeta('FORCE_EMIT', forceEmit);

    this.view.dispatch(tr);
    return true;
  }

  focus(position: FocusPosition = 'end'): this {
    const selection = position === 'start'
      ? Selection.atStart(this.state.doc)
      : Selection.atEnd(this.state.doc);

    this.tr.setSelection(selection);
    this.applyTrx();

    this.view.focus();
    return this;
  }

  scrollIntoView(): this {
    this.tr.scrollIntoView();
    this.applyTrx();
    return this;
  }

  insertText(text: string): this {
    this.tr.insertText(text);
    this.applyTrx();
    return this;
  }

  insertNewLine(): this {
    const newLineCommands = [newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock];
    chainCommands(...newLineCommands)(this.state, this.dispatch);
    return this;
  }

  applyMark(name: string): this {
    execMark(name, false)(this.state, this.dispatch);
    return this;
  }

  toggleMark(name: string): this {
    execMark(name, true)(this.state, this.dispatch);
    return this;
  }

  bold(): this {
    execMark('strong')(this.state, this.dispatch);
    return this;
  }

  toggleBold(): this {
    execMark('strong', true)(this.state, this.dispatch);
    return this;
  }

  italics(): this {
    execMark('em')(this.state, this.dispatch);
    return this;
  }

  toggleItalics(): this {
    execMark('em', true)(this.state, this.dispatch);
    return this;
  }

  underline(): this {
    execMark('u')(this.state, this.dispatch);
    return this;
  }

  toggleUnderline(): this {
    execMark('u', true)(this.state, this.dispatch);
    return this;
  }

  strike(): this {
    execMark('s')(this.state, this.dispatch);
    return this;
  }

  toggleStrike(): this {
    execMark('s', true)(this.state, this.dispatch);
    return this;
  }

  code(): this {
    execMark('code')(this.state, this.dispatch);
    return this;
  }

  toggleCode(): this {
    execMark('code', true)(this.state, this.dispatch);
    return this;
  }

  superscript(): this {
    execMark('sup')(this.state, this.dispatch);
    return this;
  }

  subscript(): this {
    execMark('sub')(this.state, this.dispatch);
    return this;
  }

  toggleOrderedList(): this {
    const command = new ListCommand(false);
    command.toggle()(this.state, this.dispatch);
    return this;
  }

  toggleBulletList(): this {
    const command = new ListCommand(true);
    command.toggle()(this.state, this.dispatch);
    return this;
  }

  toggleHeading(level: HeadingLevels): this {
    const command = new HeadingCommand(level);
    command.toggle()(this.state, this.dispatch);
    return this;
  }

  insertLink(text: string, attrs: LinkAttrs): this {
    const command = new LinkCommand();
    command.insert(text, attrs)(this.state, this.dispatch);
    return this;
  }

  updateLink(attrs: LinkAttrs): this {
    const command = new LinkCommand();
    command.update(attrs)(this.state, this.dispatch);
    return this;
  }

  insertImage(src: string, attrs: ImageAttrs = {}): this {
    const command = new ImageCommand();
    command.insert(src, attrs)(this.state, this.dispatch);
    return this;
  }

  // the selected image or figure: `start`, `center`, `end` or `null`
  setImageAlign(align: ImageAlign | null): this {
    setImageAlign(align)(this.state, this.dispatch);
    return this;
  }

  // the caption of the selected image: a string makes an image a figure, `null` makes a figure an image
  setImageCaption(caption: string | null): this {
    setImageCaption(caption)(this.state, this.dispatch);
    return this;
  }

  // links the selected image or figure (a sanitized url), `null` removes the link
  setImageLink(href: string | null): this {
    setImageLink(href)(this.state, this.dispatch);
    return this;
  }

  // sets attributes of the selected image or figure, such as `alt` or `width`
  updateImage(attrs: Record<string, unknown>): this {
    setImageAttrs(attrs)(this.state, this.dispatch);
    return this;
  }

  deleteImage(): this {
    deleteImage()(this.state, this.dispatch);
    return this;
  }

  // the video of a YouTube, Vimeo or Aparat link (or another allowed host), checked with the editor's `video` config
  insertVideo(url: string, attrs: VideoInsertAttrs = {}): this {
    insertVideoUrl(url, attrs)(this.state, this.dispatch);
    return this;
  }

  // the selected video: `start`, `center`, `end` or `null`
  setVideoAlign(align: ImageAlign | null): this {
    setVideoAlign(align)(this.state, this.dispatch);
    return this;
  }

  // the width of the selected video (`50%`, `480px`), `null` for the full width
  setVideoWidth(width: string | null): this {
    setVideoWidth(width)(this.state, this.dispatch);
    return this;
  }

  // the caption of the selected video, `null` removes it
  setVideoCaption(caption: string | null): this {
    setVideoCaption(caption)(this.state, this.dispatch);
    return this;
  }

  // sets attributes of the selected video, such as `poster` or `ratio`
  updateVideo(attrs: Record<string, unknown>): this {
    setVideoAttrs(attrs)(this.state, this.dispatch);
    return this;
  }

  deleteVideo(): this {
    deleteVideo()(this.state, this.dispatch);
    return this;
  }

  textColor(color: string): this {
    const command = new TextColorCommand('text_color');
    command.apply({ color })(this.state, this.dispatch);
    return this;
  }

  backgroundColor(color: string): this {
    const command = new TextColorCommand('text_background_color');
    command.apply({ backgroundColor: color })(this.state, this.dispatch);
    return this;
  }

  removeTextColor(): this {
    const command = new TextColorCommand('text_color');
    command.remove()(this.state, this.dispatch);
    return this;
  }

  removeBackgroundColor(): this {
    const command = new TextColorCommand('text_background_color');
    command.remove()(this.state, this.dispatch);
    return this;
  }

  // sets the font of the selection, a CSS font-family stack such as `Vazirmatn, sans-serif`
  fontFamily(family: string): this {
    const command = new FontFamilyCommand();
    command.apply(family)(this.state, this.dispatch);
    return this;
  }

  removeFontFamily(): this {
    const command = new FontFamilyCommand();
    command.remove()(this.state, this.dispatch);
    return this;
  }

  align(p: Align): this {
    const command = new TextAlignCommand(p);
    command.toggle()(this.state, this.dispatch);
    return this;
  }

  // sets the direction of the blocks in the selection, `null` removes it
  setTextDirection(dir: TextDirectionValue | null): this {
    setTextDirection(dir)(this.state, this.dispatch);
    return this;
  }

  // sets the direction of the blocks in the selection, or removes it when it is already set
  toggleTextDirection(dir: TextDirectionValue): this {
    const command = new TextDirectionCommand(dir);
    command.toggle()(this.state, this.dispatch);
    return this;
  }

  insertHTML(html: HTML): this {
    const { selection, schema, tr } = this.state;
    const { from, to } = selection;

    const element = parseHTML(isString(html) ? html.trim() : html);
    const slice = DOMParser.fromSchema(schema).parseSlice(element);

    const transaction = tr.replaceRange(from, to, slice);
    this.applyTrx(transaction);

    return this;
  }

  indent(): this {
    const command = new IndentCommand('increase');
    command.insert()(this.state, this.dispatch);
    return this;
  }

  outdent(): this {
    const command = new IndentCommand('decrease');
    command.insert()(this.state, this.dispatch);
    return this;
  }
}

export default EditorCommands;

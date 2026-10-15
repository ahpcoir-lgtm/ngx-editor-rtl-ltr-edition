import { DOMParser, DOMSerializer, Slice } from 'prosemirror-model';

import Editor from '../Editor';
import { NGX_EDITOR_FONTS } from '../fonts/built-in';
import type { NgxEditorFont } from '../fonts/types';
import { fontFamilyPaste } from './font-family';

describe('fontFamilyPaste plugin', () => {
  let editor: Editor;
  let fonts: NgxEditorFont[];
  const plugin = fontFamilyPaste(() => fonts);

  const paste = (html: string): string => {
    const element = document.createElement('div');
    element.innerHTML = html;
    const slice = DOMParser.fromSchema(editor.schema).parseSlice(element);

    const transformPasted = plugin.props.transformPasted as (slice: Slice, view: Editor['view'], plain: boolean) => Slice;
    const result = transformPasted.call(plugin, slice, editor.view, false);

    const container = document.createElement('div');
    container.appendChild(DOMSerializer.fromSchema(editor.schema).serializeFragment(result.content));
    return container.innerHTML;
  };

  beforeEach(() => {
    fonts = NGX_EDITOR_FONTS;
    editor = new Editor({ plugins: [plugin] });
  });

  afterEach(() => {
    editor.destroy();
  });

  it('should drop the fonts of Word that are not configured', () => {
    const word = '<p class="MsoNormal"><span style="font-family: &quot;Calibri&quot;,sans-serif;mso-bidi-font-family:'
      + 'Arial">Hello <b>world</b></span></p>';

    expect(paste(word)).toBe('<p>Hello <strong>world</strong></p>');
  });

  it('should keep a configured font with the stack of the config', () => {
    expect(paste('<p><span style="font-family: &quot;Vazirmatn&quot;">سلام</span></p>'))
      .toBe('<p><span style="font-family: Vazirmatn, sans-serif;">سلام</span></p>');
    expect(paste('<p><span style="font-family: Arial, Helvetica">a</span></p>'))
      .toBe('<p><span style="font-family: Arial, sans-serif;">a</span></p>');
  });

  it('should keep other marks and nested content', () => {
    const html = '<ul><li><p><span style="font-family: Calibri; color: red">a</span></p></li></ul>';
    expect(paste(html)).toBe('<ul><li><p><span style="color: red;">a</span></p></li></ul>');
  });

  it('should drop every font with an empty list', () => {
    fonts = [];
    expect(paste('<p><span style="font-family: Vazirmatn">a</span></p>')).toBe('<p>a</p>');
  });
});

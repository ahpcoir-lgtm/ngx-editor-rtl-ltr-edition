import { DOMSerializer, Node as ProseMirrorNode } from 'prosemirror-model';
import { Command, EditorState, NodeSelection, TextSelection } from 'prosemirror-state';
import { schema } from 'ngx-editor-rtl-ltr-edition/schema';

import { parseContent } from '../parsers';
import Image from './Image';
import {
  deleteImage, figureToImage, getImageAlignValue, getImageLink, imageToFigure, setImageAlign, setImageAttrs,
  setImageCaption, setImageLink,
} from './ImageCommands';

const SCRIPT_URL = `${'javascript'}:alert(1)`;

const createState = (html: string, select?: number): EditorState => {
  const doc = parseContent(html, schema);
  const state = EditorState.create({ doc, schema });
  return select === undefined ? state : state.apply(state.tr.setSelection(NodeSelection.create(state.doc, select)));
};

const html = (doc: ProseMirrorNode): string => {
  const container = document.createElement('div');
  container.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(doc.content));
  return container.innerHTML;
};

const run = (state: EditorState, command: Command): EditorState => {
  let next = state;
  const done = command(state, (tr) => {
    next = state.apply(tr);
  });

  expect(done).toBe(true);
  return next;
};

const selectedType = (state: EditorState): string | null => {
  return state.selection instanceof NodeSelection ? state.selection.node.type.name : null;
};

describe('image commands', () => {
  it('should align the selected image and back to none', () => {
    let state = createState('<p>a<img src="/a.png">b</p>', 2);

    state = run(state, setImageAlign('center'));
    expect(getImageAlignValue(state)).toBe('center');
    expect(html(state.doc)).toContain('data-align="center"');
    expect(selectedType(state)).toBe('image');

    expect(setImageAlign('center')(state)).toBe(false);

    state = run(state, setImageAlign(null));
    expect(html(state.doc)).toBe('<p>a<img src="/a.png">b</p>');
  });

  it('should refuse an unknown alignment and work without an image only with a position', () => {
    const state = createState('<p>a<img src="/a.png">b</p>', 2);
    expect(setImageAlign('left' as never)(state)).toBe(false);
    expect(setImageAlign('end')(createState('<p>text</p>'))).toBe(false);
    expect(setImageAlign('end', 2)(createState('<p>a<img src="/a.png">b</p>'))).toBe(true);
  });

  it('should set the alt text and sanitize a new src', () => {
    let state = createState('<p><img src="/a.png"></p>', 1);

    state = run(state, setImageAttrs({ alt: 'متن جایگزین', unknown: 'x' }));
    expect(html(state.doc)).toBe('<p><img src="/a.png" alt="متن جایگزین"></p>');

    expect(setImageAttrs({ src: SCRIPT_URL })(state)).toBe(false);
    state = run(state, setImageAttrs({ src: 'https://example.com/b.png' }));
    expect(html(state.doc)).toContain('src="https://example.com/b.png"');
  });

  it('should link and unlink an image with a sanitized href', () => {
    let state = createState('<p>a<img src="/a.png">b</p>', 2);

    expect(setImageLink(SCRIPT_URL)(state)).toBe(false);

    state = run(state, setImageLink('https://example.com'));
    expect(getImageLink(state)).toBe('https://example.com');
    expect(html(state.doc)).toBe('<p>a<a href="https://example.com" target="_blank"><img src="/a.png"></a>b</p>');

    state = run(state, setImageLink(null));
    expect(getImageLink(state)).toBeNull();
    expect(html(state.doc)).toBe('<p>a<img src="/a.png">b</p>');
  });

  it('should turn an image alone in its paragraph into a figure and back', () => {
    let state = createState('<p><a href="https://example.com"><img src="/a.png" alt="a" width="200px"></a></p><p>x</p>', 1);

    state = run(state, setImageCaption('زیرنویس'));
    expect(selectedType(state)).toBe('figure');
    expect(html(state.doc)).toBe('<figure data-type="image" style="width: 200px;"><a href="https://example.com">'
      + '<img src="/a.png" alt="a" style="width: 100%;"></a><figcaption>زیرنویس</figcaption></figure><p>x</p>');

    state = run(state, setImageCaption('new'));
    expect(state.doc.firstChild?.attrs['caption']).toBe('new');

    state = run(state, setImageCaption(null));
    expect(selectedType(state)).toBe('image');
    expect(html(state.doc)).toBe('<p><a href="https://example.com" target="_blank"><img src="/a.png" alt="a" width="200px"></a></p>'
      + '<p>x</p>');
  });

  it('should split the paragraph around an image that becomes a figure', () => {
    let state = createState('<p>before<img src="/a.png">after</p>', 7);

    state = run(state, imageToFigure('c'));
    expect(selectedType(state)).toBe('figure');
    expect(html(state.doc)).toBe('<p>before</p><figure data-type="image"><img src="/a.png"><figcaption>c</figcaption></figure>'
      + '<p>after</p>');
  });

  it('should link a figure', () => {
    let state = createState('<figure data-type="image"><img src="/a.png"></figure>', 0);
    state = run(state, setImageLink('/page'));
    expect(state.doc.firstChild?.attrs['href']).toBe('/page');
    expect(getImageLink(state)).toBe('/page');
    expect(figureToImage()(createState('<p><img src="/a.png"></p>', 1))).toBe(false);
  });

  it('should delete the selected image or figure', () => {
    let state = createState('<p>a<img src="/a.png">b</p>', 2);
    state = run(state, deleteImage());
    expect(html(state.doc)).toBe('<p>ab</p>');

    state = createState('<p>a</p><figure data-type="image"><img src="/a.png"></figure>', 3);
    state = run(state, deleteImage());
    expect(html(state.doc)).toBe('<p>a</p>');
    expect(deleteImage()(state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1))))).toBe(false);
  });

  describe('Image.insert', () => {
    const command = new Image();

    it('should not insert an unsafe src', () => {
      const state = createState('<p>a</p>');
      expect(command.insert(SCRIPT_URL, {})(state)).toBe(false);
      expect(command.insert('data:image/svg+xml;base64,PHN2Zz4=', {})(state)).toBe(false);
    });

    it('should insert an image with an alignment', () => {
      const state = run(createState('<p>a</p>'), command.insert('/a.png', { alt: 'x', align: 'center' }));
      expect(html(state.doc)).toContain('<img src="/a.png" alt="x" data-align="center"');
      expect(command.isActive(state)).toBe(true);
    });

    it('should replace the image of a selected figure and keep its caption', () => {
      let state = createState('<figure data-type="image"><img src="/a.png"><figcaption>c</figcaption></figure>', 0);
      expect(command.isActive(state)).toBe(true);

      state = run(state, command.insert('/b.png', { alt: 'b' }));
      expect(state.doc.firstChild?.attrs).toEqual(expect.objectContaining({ src: '/b.png', alt: 'b', caption: 'c' }));
    });
  });
});

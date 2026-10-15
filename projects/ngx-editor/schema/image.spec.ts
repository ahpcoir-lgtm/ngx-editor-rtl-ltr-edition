import { DOMParser, DOMSerializer, Node as ProseMirrorNode } from 'prosemirror-model';

import { normalizeCssLength } from './image-attrs';
import schema from './schema';

const SCRIPT_URL = `${'javascript'}:alert(1)`;

const parse = (html: string): ProseMirrorNode => {
  const element = document.createElement('div');
  element.innerHTML = html;
  return DOMParser.fromSchema(schema).parse(element);
};

const serialize = (doc: ProseMirrorNode): string => {
  const container = document.createElement('div');
  container.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(doc.content));
  return container.innerHTML;
};

const roundTrip = (html: string): string => serialize(parse(html));

const markNames = (node: ProseMirrorNode | null | undefined): string[] => (node?.marks ?? []).map((mark) => mark.type.name);

const countImages = (doc: ProseMirrorNode): number => {
  let count = 0;
  doc.descendants((node) => {
    count += node.type.name === 'figure' || node.type.name === 'image' ? 1 : 0;
  });
  return count;
};

const PNG = 'data:image/png;base64,iVBORw0KGgo=';

describe('image schema', () => {
  describe('inline image', () => {
    it('should write an image of upstream ngx-editor as before', () => {
      const html = '<p><img src="https://example.com/a.png" alt="a" title="t" width="200px"></p>';
      expect(roundTrip(html)).toBe(html);
      expect(roundTrip('<p><img src="/a.png"></p>')).toBe('<p><img src="/a.png"></p>');
    });

    it('should keep the height and the alignment', () => {
      const html = '<p><img src="/a.png" width="200" height="100" data-align="end"'
        + ' style="float: inline-end; margin-inline-start: 1em;"></p>';
      const doc = parse(html);
      const image = doc.firstChild?.firstChild;

      expect(image?.attrs).toEqual(expect.objectContaining({ height: '100', align: 'end', width: '200' }));
      expect(serialize(doc)).toBe(html);
    });

    it('should write the inline styles of each alignment', () => {
      expect(roundTrip('<p><img src="/a.png" data-align="start"></p>'))
        .toBe('<p><img src="/a.png" data-align="start" style="float: inline-start; margin-inline-end: 1em;"></p>');
      expect(roundTrip('<p><img src="/a.png" data-align="center"></p>'))
        .toBe('<p><img src="/a.png" data-align="center" style="display: block; margin-inline: auto;"></p>');
    });

    it('should ignore unknown alignments', () => {
      expect(roundTrip('<p><img src="/a.png" data-align="left"></p>')).toBe('<p><img src="/a.png"></p>');
    });

    it('should read and write a linked image as a link mark on the image', () => {
      const html = '<p><a href="https://example.com" target="_blank"><img src="/a.png"></a></p>';
      const doc = parse(html);
      const image = doc.firstChild?.firstChild;

      expect(image?.type.name).toBe('image');
      expect(markNames(image)).toEqual(['link']);
      expect(serialize(doc)).toBe(html);
    });

    it('should drop images with an unsafe src', () => {
      expect(roundTrip(`<p>a<img src="${SCRIPT_URL}">b</p>`)).toBe('<p>ab</p>');
      expect(roundTrip('<p><img src="data:image/svg+xml;base64,PHN2Zz4="></p>')).toBe('<p></p>');
      expect(roundTrip('<p><img src="data:text/html;base64,PHNjcmlwdD4="></p>')).toBe('<p></p>');
    });

    it('should keep base64 raster images', () => {
      expect(roundTrip(`<p><img src="${PNG}"></p>`)).toBe(`<p><img src="${PNG}"></p>`);
    });

    it('should not write an unsafe src of a node created from json', () => {
      const doc = schema.nodeFromJSON({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'image', attrs: { src: SCRIPT_URL } }] }],
      });

      expect(serialize(doc)).toBe('<p><img></p>');
    });
  });

  describe('figure', () => {
    it('should round-trip a captioned image', () => {
      const html = '<figure data-type="image" data-align="center" style="width: 300px; margin-inline: auto;">'
        + '<img src="/a.png" alt="a" title="t" style="width: 100%;"><figcaption>کپشن تصویر</figcaption></figure>';
      const doc = parse(html);
      const figure = doc.firstChild;

      expect(figure?.type.name).toBe('figure');
      expect(figure?.attrs).toEqual({
        src: '/a.png', alt: 'a', title: 't', width: '300px', align: 'center', caption: 'کپشن تصویر', href: null,
      });
      expect(serialize(doc)).toBe(html);
    });

    it('should wrap the image of a linked figure in the link', () => {
      const html = '<figure data-type="image"><a href="https://example.com"><img src="/a.png"></a>'
        + '<figcaption>c</figcaption></figure>';
      expect(parse(html).firstChild?.attrs['href']).toBe('https://example.com');
      expect(roundTrip(html)).toBe(html);
    });

    it('should drop an unsafe link of a figure', () => {
      const html = `<figure data-type="image"><a href="${SCRIPT_URL}"><img src="/a.png"></a></figure>`;
      expect(roundTrip(html)).toBe('<figure data-type="image"><img src="/a.png"></figure>');
    });

    it('should read a generic figure with an image and a caption', () => {
      const doc = parse('<figure><img src="/a.png" width="250"><figcaption>  A <b>bold</b>\n caption </figcaption></figure>');
      expect(doc.firstChild?.type.name).toBe('figure');
      expect(doc.firstChild?.attrs['caption']).toBe('A bold caption');
      expect(doc.firstChild?.attrs['width']).toBe('250px');
    });

    it('should not read a figure of another type as an image', () => {
      const doc = parse('<figure data-type="video"><img src="/poster.png"><figcaption>v</figcaption></figure>');
      expect(doc.firstChild?.type.name).not.toBe('figure');
    });

    it('should not read a figure with an unsafe image', () => {
      const doc = parse(`<figure><img src="${SCRIPT_URL}"><figcaption>c</figcaption></figure>`);
      expect(countImages(doc)).toBe(0);
      expect(doc.textContent).toBe('c');
    });

    it('should write the alignment styles of a figure', () => {
      expect(roundTrip('<figure data-type="image" data-align="start"><img src="/a.png"></figure>'))
        .toBe('<figure data-type="image" data-align="start" style="float: inline-start; margin-inline-end: 1em;">'
          + '<img src="/a.png"></figure>');
    });
  });

  describe('links', () => {
    it('should drop the href of an unsafe link and keep its text', () => {
      expect(roundTrip(`<p><a href="${SCRIPT_URL}">click</a></p>`)).toBe('<p>click</p>');
      expect(roundTrip('<p><a href=" JaVaScRiPt:alert(1)">x</a></p>')).toBe('<p>x</p>');
      expect(roundTrip('<p><a href="data:text/html;base64,PHNjcmlwdD4=">x</a></p>')).toBe('<p>x</p>');
    });

    it('should keep safe links', () => {
      expect(roundTrip('<p><a href="mailto:a@example.com">m</a></p>'))
        .toBe('<p><a href="mailto:a@example.com">m</a></p>');
      expect(roundTrip('<p><a href="/page#x" target="_self">p</a></p>')).toBe('<p><a href="/page#x" target="_self">p</a></p>');
    });

    it('should not write an unsafe href of a mark created from json', () => {
      const doc = schema.nodeFromJSON({
        type: 'doc',
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href: SCRIPT_URL } }] }],
        }],
      });

      expect(serialize(doc)).toBe('<p><a target="_blank">x</a></p>');
    });
  });

  it('should normalize css lengths', () => {
    expect(normalizeCssLength('300')).toBe('300px');
    expect(normalizeCssLength('50%')).toBe('50%');
    expect(normalizeCssLength(' 12.5EM ')).toBe('12.5em');
    expect(normalizeCssLength('100px; color: red')).toBeNull();
    expect(normalizeCssLength('0')).toBeNull();
    expect(normalizeCssLength(null)).toBeNull();
  });
});


import { DOMParser, DOMSerializer, Node as ProseMirrorNode } from 'prosemirror-model';

import schema from './schema';
import { normalizeVideoRatio } from './video';

const SCRIPT_URL = `${'javascript'}:alert(1)`;
const ID = 'dQw4w9WgXcQ';
const NOCOOKIE = `https://www.youtube-nocookie.com/embed/${ID}`;

const IFRAME_ATTRS = 'frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; '
  + 'picture-in-picture; web-share" allowfullscreen="" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"';

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

const videos = (doc: ProseMirrorNode): ProseMirrorNode[] => {
  const found: ProseMirrorNode[] = [];
  doc.descendants((node) => {
    if (node.type.name === 'video') {
      found.push(node);
    }
  });
  return found;
};

const embedHtml = (src: string, provider: string, title: string, rest = ''): string => {
  return `<figure data-type="video" data-kind="embed" data-provider="${provider}"${rest}>`
    + '<div class="ngx-video__frame" style="aspect-ratio: 16 / 9;">'
    + `<iframe src="${src}" title="${title}" ${IFRAME_ATTRS}></iframe></div>`;
};

describe('video schema', () => {
  it('should write an embedded video and read it back exactly', () => {
    const html = `${embedHtml(NOCOOKIE, 'youtube', 'YouTube video')}</figure>`;
    const doc = parse(html);

    expect(videos(doc)[0]?.attrs).toEqual({
      kind: 'embed',
      src: NOCOOKIE,
      provider: 'youtube',
      width: null,
      align: null,
      poster: null,
      caption: '',
      ratio: '16/9',
    });
    expect(serialize(doc)).toBe(html);
  });

  it('should keep width, alignment, caption and ratio', () => {
    const html = '<figure data-type="video" data-kind="embed" data-provider="vimeo" data-align="center"'
      + ' style="width: 50%; margin-inline: auto;"><div class="ngx-video__frame" style="aspect-ratio: 4 / 3;">'
      + `<iframe src="https://player.vimeo.com/video/1?h=ab" title="A talk" ${IFRAME_ATTRS}></iframe></div>`
      + '<figcaption>A talk</figcaption></figure>';
    const [video] = videos(parse(html));

    expect(video?.attrs).toEqual(expect.objectContaining({ width: '50%', align: 'center', caption: 'A talk', ratio: '4/3' }));
    expect(roundTrip(html)).toBe(html);
  });

  it('should write the styles of start and end', () => {
    const start = roundTrip(`${embedHtml(NOCOOKIE, 'youtube', 'YouTube video', ' data-align="start"')}</figure>`);
    expect(start).toContain('data-align="start" style="float: inline-start; margin-inline-end: 1em;"');

    const end = roundTrip(`${embedHtml(NOCOOKIE, 'youtube', 'YouTube video', ' data-align="end" style="width: 320px"')}</figure>`);
    expect(end).toContain('data-align="end" style="width: 320px; float: inline-end; margin-inline-start: 1em;"');
  });

  it('should write a video file with its poster and read it back exactly', () => {
    const html = '<figure data-type="video" data-kind="file"><div class="ngx-video__frame" style="aspect-ratio: 16 / 9;">'
      + '<video controls="" preload="metadata" src="/media/a.mp4" poster="/media/a.jpg"></video></div>'
      + '<figcaption>Clip</figcaption></figure>';
    const [video] = videos(parse(html));

    expect(video?.attrs).toEqual(expect.objectContaining({ kind: 'file', src: '/media/a.mp4', poster: '/media/a.jpg', provider: null }));
    expect(roundTrip(html)).toBe(html);
  });

  it('should read <video src> and <video><source src>', () => {
    expect(videos(parse('<video src="https://cdn.example.com/a.webm"></video>'))[0]?.attrs['src']).toBe('https://cdn.example.com/a.webm');

    const [fromSource] = videos(parse('<video poster="p.png" width="640" height="480"><source src="b.mp4" type="video/mp4"></video>'));
    expect(fromSource?.attrs).toEqual(expect.objectContaining({ kind: 'file', src: 'b.mp4', poster: 'p.png', ratio: '4/3' }));
  });

  it('should drop video files with an unsafe url and unsafe posters', () => {
    expect(videos(parse(`<video src="${SCRIPT_URL}"></video>`))).toEqual([]);
    expect(videos(parse('<video src="data:video/mp4;base64,AAAA"></video>'))).toEqual([]);
    expect(videos(parse(`<video src="a.mp4" poster="${SCRIPT_URL}"></video>`))[0]?.attrs['poster']).toBeNull();
  });

  it('should read pasted embed code of an allowed host as a video', () => {
    const doc = parse(`<p>before</p><iframe width="560" height="315" src="https://www.youtube.com/embed/${ID}?si=x"></iframe>`);
    const [video] = videos(doc);

    expect(video?.attrs).toEqual(expect.objectContaining({
      kind: 'embed',
      provider: 'youtube',
      src: `https://www.youtube.com/embed/${ID}`,
      ratio: '16/9',
    }));

    const [nocookie] = videos(parse(`<iframe src="${NOCOOKIE}?start=3"></iframe>`));
    expect(nocookie?.attrs['src']).toBe(`${NOCOOKIE}?start=3`);

    const [aparat] = videos(parse('<iframe src="https://www.aparat.com/video/video/embed/videohash/abc/vt/frame"></iframe>'));
    expect(aparat?.attrs['provider']).toBe('aparat');
  });

  it('should drop iframes of hosts that are not allowed', () => {
    expect(videos(parse('<p>a</p><iframe src="https://evil.example.com/embed/1"></iframe>'))).toEqual([]);
    expect(videos(parse(`<iframe src="${SCRIPT_URL}"></iframe>`))).toEqual([]);
    expect(videos(parse(`<iframe src="http://www.youtube.com.evil.example/embed/${ID}"></iframe>`))).toEqual([]);
    expect(roundTrip('<p>a</p><iframe src="https://evil.example.com/embed/1"></iframe>')).toBe('<p>a</p>');
  });

  it('should drop a video figure whose player is not allowed, with its caption', () => {
    const html = `${embedHtml('https://evil.example.com/embed/1', 'youtube', 'x')}<figcaption>caption</figcaption></figure>`;
    expect(roundTrip(`<p>a</p>${html}`)).toBe('<p>a</p>');
    expect(roundTrip(`${embedHtml(`${SCRIPT_URL}//www.youtube.com/`, 'youtube', 'x')}</figure>`)).toBe('<p></p>');
    expect(roundTrip(`${embedHtml(`http://www.youtube.com/embed/${ID}`, 'youtube', 'x')}</figure>`)).toBe('<p></p>');
  });

  it('should keep a custom video written by an editor with an extra host (https only)', () => {
    const html = `${embedHtml('https://video.example.com/embed/7', 'custom', 'Video')}</figure>`;
    expect(roundTrip(html)).toBe(html);
    expect(roundTrip(`${embedHtml('http://video.example.com/embed/7', 'custom', 'Video')}</figure>`)).toBe('<p></p>');
  });

  it('should not write an unsafe url from JSON content', () => {
    const doc = schema.nodeFromJSON({
      type: 'doc',
      content: [
        { type: 'video', attrs: { kind: 'embed', src: SCRIPT_URL, provider: 'youtube' } },
        { type: 'video', attrs: { kind: 'file', src: SCRIPT_URL, poster: 'data:image/svg+xml;base64,PHN2Zz4=' } },
      ],
    });
    const html = serialize(doc);

    expect(html).not.toContain('javascript');
    expect(html).not.toContain('svg+xml');
    expect(html).toContain('<iframe title="YouTube video"');
  });

  it('should normalize ratios', () => {
    expect(normalizeVideoRatio('16/9')).toBe('16/9');
    expect(normalizeVideoRatio(' 4 : 3 ')).toBe('4/3');
    expect(normalizeVideoRatio('9 / 16')).toBe('9/16');
    expect(normalizeVideoRatio('0/9')).toBeNull();
    expect(normalizeVideoRatio('wide')).toBeNull();
    expect(normalizeVideoRatio(16)).toBeNull();
  });

  it('should leave images in figures alone', () => {
    const html = '<figure data-type="image"><img src="/a.png"><figcaption>c</figcaption></figure>';
    expect(roundTrip(html)).toBe(html);
  });
});

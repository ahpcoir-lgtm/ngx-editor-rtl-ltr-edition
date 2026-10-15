import type { DOMOutputSpec, Node as ProseMirrorNode, NodeSpec, TagParseRule } from 'prosemirror-model';
import {
  type VideoEmbed, type VideoProvider, VIDEO_PROVIDERS, getVideoProvider, isVideoEmbedAllowed, normalizeVideoUrl,
  sanitizeUrl,
} from 'ngx-editor-rtl-ltr-edition/utils';

import { getImageAlign, getImageAlignStyle, isImageAlign, normalizeCssLength } from './image-attrs';

export type VideoKind = 'embed' | 'file';

export interface VideoAttrs {
  kind: VideoKind;
  src: string;
  provider: VideoProvider | null;
  /** a CSS length or percentage; `null` is the full width */
  width: string | null;
  align: 'start' | 'center' | 'end' | null;
  /** the image shown before a video file plays */
  poster: string | null;
  caption: string;
  /** width / height, such as `16/9` */
  ratio: string;
}

export const DEFAULT_VIDEO_RATIO = '16/9';

/** what the player of an embedded video may use */
export const VIDEO_IFRAME_ALLOW = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';

const PROVIDER_TITLES: Record<VideoProvider, string> = {
  youtube: 'YouTube video',
  vimeo: 'Vimeo video',
  aparat: 'Aparat video',
  custom: 'Video',
};

const RATIO = /^\s*(?<w>\d+(?:\.\d+)?)\s*[/:]\s*(?<h>\d+(?:\.\d+)?)\s*$/;

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** `16/9` from `16/9`, `16 / 9` or `16:9`; `null` for anything else (also a zero side) */
export const normalizeVideoRatio = (value: unknown): string | null => {
  const groups = typeof value === 'string' ? RATIO.exec(value)?.groups : undefined;
  if (!groups || !Number(groups['w']) || !Number(groups['h'])) {
    return null;
  }

  return `${Number(groups['w'])}/${Number(groups['h'])}`;
};

// the ratio of a player with `width` and `height` attributes in pixels (560 × 315 is 16/9)
const ratioFromSize = (dom: Element): string | null => {
  const width = Number(dom.getAttribute('width'));
  const height = Number(dom.getAttribute('height'));

  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    return null;
  }

  const divisor = gcd(width, height);
  return `${width / divisor}/${height / divisor}`;
};

// read from the attribute, as not every DOM implementation knows `aspect-ratio`
const ratioFromStyle = (dom: Element | null): string | null => {
  const match = /aspect-ratio\s*:\s*(?<value>[^;]+)/i.exec(dom?.getAttribute('style') ?? '');
  return normalizeVideoRatio(match?.groups?.['value']);
};

const isVideoProvider = (value: unknown): value is VideoProvider => {
  return typeof value === 'string' && (VIDEO_PROVIDERS as readonly string[]).includes(value);
};

/** the `src` of an embedded video when it may be written: an `https:` url that `sanitizeUrl` accepts */
const safeEmbedSrc = (src: unknown): string | null => (getVideoProvider(src) ? String(src).trim() : null);

const getCaption = (dom: HTMLElement): string => {
  return (dom.querySelector('figcaption')?.textContent ?? '').replace(/\s+/g, ' ').trim();
};

// the file of a `<video>`: its `src`, else the first `<source src>`
const getVideoFileSrc = (video: Element): string | null => {
  const src = video.getAttribute('src') ?? video.querySelector('source[src]')?.getAttribute('src');
  return sanitizeUrl(src, 'media');
};

/** how the parse rules of the `video` node check embedded videos; the schema uses the default hosts */
export interface VideoParseOptions {
  /** whether the player url of a `<figure data-type="video">` may stay */
  isEmbedAllowed?: (src: string, provider: VideoProvider) => boolean;
  /** the player of the url of a pasted `<iframe>`, `null` to drop it */
  normalizeEmbed?: (src: string) => VideoEmbed | null;
}

// a `custom` video (an extra host of an editor's `video` config) only needs `https:` here; the editor checks pasted
// videos against its own `allowedHosts`
const isDefaultEmbedAllowed = (src: string, provider: VideoProvider, dom: HTMLElement): boolean => {
  return isVideoEmbedAllowed(src) || (provider === 'custom' && dom.getAttribute('data-provider') === 'custom');
};

const getFigureVideoAttrs = (dom: HTMLElement, options: VideoParseOptions): Partial<VideoAttrs> | false => {
  const iframe = dom.querySelector('iframe');
  const video = dom.querySelector('video');
  const kind: VideoKind = dom.getAttribute('data-kind') === 'file' || (!iframe && video) ? 'file' : 'embed';
  const common = {
    width: normalizeCssLength(dom.style.width),
    align: getImageAlign(dom),
    caption: getCaption(dom),
    ratio: ratioFromStyle(dom.querySelector('.ngx-video__frame')) ?? DEFAULT_VIDEO_RATIO,
  };

  if (kind === 'file') {
    const src = video ? getVideoFileSrc(video) : null;
    return src ? { ...common, kind, src, provider: null, poster: sanitizeUrl(video?.getAttribute('poster'), 'image') } : false;
  }

  const src = iframe?.getAttribute('src')?.trim();
  const provider = getVideoProvider(src);

  if (!src || !provider) {
    return false;
  }

  const allowed = options.isEmbedAllowed ? options.isEmbedAllowed(src, provider) : isDefaultEmbedAllowed(src, provider, dom);
  return allowed ? { ...common, kind, src, provider, poster: null } : false;
};

// pasted embed code: an `<iframe>` of a default host, as the player url of its provider (the YouTube host is kept)
const normalizeDefaultEmbed = (src: string): VideoEmbed | null => {
  const embed = normalizeVideoUrl(src, { youtubeNoCookie: /youtube-nocookie\.com\//i.test(src) });
  return embed && embed.provider !== 'custom' ? embed : null;
};

const getIframeVideoAttrs = (dom: HTMLElement, options: VideoParseOptions): Partial<VideoAttrs> | false => {
  const src = dom.getAttribute('src') ?? '';
  const embed = (options.normalizeEmbed ?? normalizeDefaultEmbed)(src);

  if (!embed) {
    return false;
  }

  return { kind: 'embed', src: embed.src, provider: embed.provider, ratio: ratioFromSize(dom) ?? DEFAULT_VIDEO_RATIO };
};

const getVideoElementAttrs = (dom: HTMLElement): Partial<VideoAttrs> | false => {
  const src = getVideoFileSrc(dom);
  if (!src) {
    return false;
  }

  return {
    kind: 'file',
    src,
    poster: sanitizeUrl(dom.getAttribute('poster'), 'image'),
    ratio: ratioFromSize(dom) ?? DEFAULT_VIDEO_RATIO,
  };
};

/**
 * The parse rules of the `video` node: `<figure data-type="video">` (a figure whose video is not accepted is dropped
 * with its caption), embed code (`<iframe src>`) and `<video src>` / `<video><source src>`.
 */
export const createVideoParseRules = (options: VideoParseOptions = {}): TagParseRule[] => [
  { tag: 'figure[data-type="video"]', priority: 60, getAttrs: (dom: HTMLElement) => getFigureVideoAttrs(dom, options) },
  { tag: 'figure[data-type="video"]', priority: 59, ignore: true },
  { tag: 'iframe[src]', getAttrs: (dom: HTMLElement) => getIframeVideoAttrs(dom, options) },
  { tag: 'video', getAttrs: getVideoElementAttrs },
];


/** the `<figure data-type="video">` of a video node */
export const videoToDOM = (node: ProseMirrorNode): DOMOutputSpec => {
  const { kind, provider, align, caption } = node.attrs;
  const width = normalizeCssLength(node.attrs['width']);
  const [ratioWidth, ratioHeight] = (normalizeVideoRatio(node.attrs['ratio']) ?? DEFAULT_VIDEO_RATIO).split('/');
  const file = kind === 'file';
  const validProvider = !file && isVideoProvider(provider) ? provider : null;

  const media: DOMOutputSpec = file
    ? ['video', {
      controls: '',
      preload: 'metadata',
      src: sanitizeUrl(node.attrs['src'], 'media'),
      poster: sanitizeUrl(node.attrs['poster'], 'image'),
    }]
    : ['iframe', {
      src: safeEmbedSrc(node.attrs['src']),
      title: caption ? String(caption) : PROVIDER_TITLES[validProvider ?? 'custom'],
      frameborder: '0',
      allow: VIDEO_IFRAME_ALLOW,
      allowfullscreen: '',
      loading: 'lazy',
      referrerpolicy: 'strict-origin-when-cross-origin',
    }];

  const style = [width ? `width: ${width};` : '', getImageAlignStyle(align, true) ?? ''].filter(Boolean).join(' ');
  const attrs = {
    'data-type': 'video',
    'data-kind': file ? 'file' : 'embed',
    'data-provider': validProvider,
    'data-align': isImageAlign(align) ? align : null,
    style: style || null,
  };

  const frameStyle = `aspect-ratio: ${ratioWidth} / ${ratioHeight};`;
  const frame: DOMOutputSpec = ['div', { class: 'ngx-video__frame', style: frameStyle }, media];
  return caption ? ['figure', attrs, frame, ['figcaption', String(caption)]] : ['figure', attrs, frame];
};

// :: NodeSpec A video, a block atom written as `<figure data-type="video">` with a player (`kind: 'embed'`, an
// `<iframe>` of YouTube, Vimeo, Aparat or an allowed host) or a `<video>` (`kind: 'file'`) and an optional caption.
// Also read from embed code (`<iframe>` of a default host) and from `<video src>` / `<video><source src>`.
export const video: NodeSpec = {
  group: 'block',
  atom: true,
  draggable: true,
  attrs: {
    kind: { default: 'embed' },
    src: {},
    provider: { default: null },
    width: { default: null },
    align: { default: null },
    poster: { default: null },
    caption: { default: '' },
    ratio: { default: DEFAULT_VIDEO_RATIO },
  },
  parseDOM: createVideoParseRules(),
  toDOM: videoToDOM,
};

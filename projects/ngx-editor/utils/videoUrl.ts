import { sanitizeUrl } from './sanitizeUrl';

/** the service a video is embedded from; `custom` is any other allowed host */
export type VideoProvider = 'youtube' | 'vimeo' | 'aparat' | 'custom';

export const VIDEO_PROVIDERS: readonly VideoProvider[] = ['youtube', 'vimeo', 'aparat', 'custom'];

/** the hosts videos may be embedded from by default */
export const DEFAULT_VIDEO_HOSTS: readonly string[] = [
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtube-nocookie.com',
  'vimeo.com',
  'player.vimeo.com',
  'aparat.com',
  'www.aparat.com',
];

export interface VideoUrlOptions {
  /** host names (`www.example.com`) or `*.example.com` for its subdomains; default `DEFAULT_VIDEO_HOSTS` */
  allowedHosts?: readonly string[] | null;
  /** YouTube videos are embedded from www.youtube-nocookie.com (when that host is allowed); default `true` */
  youtubeNoCookie?: boolean | null;
}

/** an embeddable video url */
export interface VideoEmbed {
  provider: VideoProvider;
  /** the url of the player, for the `src` of an `<iframe>` */
  src: string;
  /** the id of the video (YouTube, Vimeo) or its hash (Aparat); `null` for other hosts */
  id: string | null;
  /** where the video starts, in seconds */
  start: number | null;
}

const YOUTUBE_HOSTS = new Set([
  'youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be',
  'youtube-nocookie.com', 'www.youtube-nocookie.com',
]);
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);
const APARAT_HOSTS = new Set(['aparat.com', 'www.aparat.com']);

const YOUTUBE_ID = /^[\w-]{11}$/;
const YOUTUBE_PATH = /^\/(?:embed|shorts|live|v)\/(?<id>[\w-]{11})\/?$/;
const VIMEO_PATH = /^\/(?:video\/)?(?<id>\d+)(?:\/(?<hash>[\da-f]+))?\/?$/i;
const VIMEO_HASH = /^[\da-f]+$/i;
const APARAT_PATH = /^\/(?:v|embed)\/(?<hash>[a-z\d]+)\/?$/i;
const APARAT_EMBED_PATH = /^\/video\/video\/embed\/videohash\/(?<hash>[a-z\d]+)\/vt\/frame\/?$/i;
const TIME = /^(?:(?<h>\d+)h)?(?:(?<m>\d+)m)?(?:(?<s>\d+)s?)?$/i;
const SCHEME = /^[a-z][a-z\d+.-]*:/i;

const normalizeHost = (host: string): string => host.trim().toLowerCase().replace(/\.$/, '');

/** whether `host` is in the list: an exact name, or a subdomain of a `*.example.com` entry */
export const isVideoHostAllowed = (host: string, allowedHosts: readonly string[] = DEFAULT_VIDEO_HOSTS): boolean => {
  const name = normalizeHost(host);

  return Boolean(name) && allowedHosts.some((entry) => {
    const allowed = normalizeHost(entry);
    return allowed.startsWith('*.') ? name.endsWith(allowed.slice(1)) : name === allowed;
  });
};

/** seconds from `90`, `90s`, `1m30s` or `1h2m3s`; `null` for nothing or zero */
export const parseVideoStart = (value: string | null | undefined): number | null => {
  const groups = TIME.exec((value ?? '').trim())?.groups;
  if (!value?.trim() || !groups) {
    return null;
  }

  const seconds = Number(groups['h'] ?? 0) * 3600 + Number(groups['m'] ?? 0) * 60 + Number(groups['s'] ?? 0);
  return seconds > 0 ? seconds : null;
};

/** the `src` of pasted embed code (`<iframe src="…">`), else the text itself */
export const extractVideoUrl = (input: string): string => {
  const src = /<iframe\b[^>]*\ssrc\s*=\s*(?:"(?<dq>[^"]*)"|'(?<sq>[^']*)'|(?<bare>[^\s>]+))/i.exec(input)?.groups;
  const value = src ? src['dq'] ?? src['sq'] ?? src['bare'] ?? '' : input;
  return value.trim().replace(/&amp;/g, '&');
};

// an absolute url; a url without a scheme is read as `https:` (`youtu.be/…`), a path is not a url
const toUrl = (input: string): URL | null => {
  let value = input;
  if (/^(?:\/(?!\/)|[.?#])/.test(value)) {
    return null;
  }

  if (value.startsWith('//')) {
    value = `https:${value}`;
  } else if (!SCHEME.test(value)) {
    value = `https://${value}`;
  }

  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const hashParam = (url: URL, name: string): string | null => {
  return new URLSearchParams(url.hash.slice(1)).get(name);
};

const youtube = (url: URL, host: string, isAllowed: (host: string) => boolean, noCookie: boolean): VideoEmbed | null => {
  let id: string | null = null;

  if (host === 'youtu.be') {
    id = url.pathname.slice(1).replace(/\/$/, '');
  } else if (url.pathname === '/watch' || url.pathname === '/watch/') {
    id = url.searchParams.get('v');
  } else {
    id = YOUTUBE_PATH.exec(url.pathname)?.groups?.['id'] ?? null;
  }

  if (!id || !YOUTUBE_ID.test(id)) {
    return null;
  }

  const start = parseVideoStart(url.searchParams.get('start') ?? url.searchParams.get('t') ?? hashParam(url, 't'));
  const embedHost = noCookie && isAllowed('www.youtube-nocookie.com') ? 'www.youtube-nocookie.com' : 'www.youtube.com';
  if (!isAllowed(embedHost)) {
    return null;
  }

  return { provider: 'youtube', src: `https://${embedHost}/embed/${id}${start ? `?start=${start}` : ''}`, id, start };
};

const vimeo = (url: URL, host: string, isAllowed: (host: string) => boolean): VideoEmbed | null => {
  const player = host === 'player.vimeo.com';
  const groups = (player ? /^\/video\/(?<id>\d+)\/?$/ : VIMEO_PATH).exec(url.pathname)?.groups;
  const id = groups?.['id'];
  const hash = player ? url.searchParams.get('h') : groups?.['hash'] ?? url.searchParams.get('h');

  if (!id || (hash && !VIMEO_HASH.test(hash)) || !isAllowed('player.vimeo.com')) {
    return null;
  }

  const start = parseVideoStart(hashParam(url, 't'));
  const src = `https://player.vimeo.com/video/${id}${hash ? `?h=${hash}` : ''}${start ? `#t=${start}s` : ''}`;
  return { provider: 'vimeo', src, id, start };
};

const aparat = (url: URL, isAllowed: (host: string) => boolean): VideoEmbed | null => {
  const hash = (APARAT_PATH.exec(url.pathname) ?? APARAT_EMBED_PATH.exec(url.pathname))?.groups?.['hash'];

  if (!hash || !isAllowed('www.aparat.com')) {
    return null;
  }

  return {
    provider: 'aparat',
    src: `https://www.aparat.com/video/video/embed/videohash/${hash}/vt/frame`,
    id: hash,
    start: null,
  };
};

/**
 * The player url of a video link, or `null` when it cannot be embedded.
 *
 * YouTube (`watch?v=`, `youtu.be/ID`, `shorts/`, `embed/`, `live/`, `m.youtube.com`; the start time from `t=` or
 * `start=` becomes `?start=N`), Vimeo (`vimeo.com/ID`, `vimeo.com/ID/HASH`, `player.vimeo.com/video/ID?h=HASH`) and
 * Aparat (`aparat.com/v/HASH`, `aparat.com/embed/HASH` or the player url) links are turned into their player urls, also from `http:`. Any other
 * `https:` url is kept as it is (provider `custom`). The host of the link and of the player must be in `allowedHosts`;
 * urls with credentials, other schemes and anything `sanitizeUrl` rejects give `null`. Embed code (`<iframe src>`) is
 * read too.
 */
export const normalizeVideoUrl = (input: unknown, options: VideoUrlOptions = {}): VideoEmbed | null => {
  const text = typeof input === 'string' ? extractVideoUrl(input) : null;
  const safe = text ? sanitizeUrl(text, 'link') : null;
  const url = safe ? toUrl(safe) : null;

  if (!url || (url.protocol !== 'https:' && url.protocol !== 'http:') || url.username || url.password) {
    return null;
  }

  const allowedHosts = options.allowedHosts ?? DEFAULT_VIDEO_HOSTS;
  const isAllowed = (host: string): boolean => isVideoHostAllowed(host, allowedHosts);
  const host = normalizeHost(url.hostname);

  if (!isAllowed(host)) {
    return null;
  }

  if (YOUTUBE_HOSTS.has(host)) {
    return youtube(url, host, isAllowed, options.youtubeNoCookie ?? true);
  }

  if (VIMEO_HOSTS.has(host)) {
    return vimeo(url, host, isAllowed);
  }

  if (APARAT_HOSTS.has(host)) {
    return aparat(url, isAllowed);
  }

  return url.protocol === 'https:' ? { provider: 'custom', src: url.href, id: null, start: null } : null;
};

/** the provider of a player url by its host (`custom` for other hosts), `null` for a url that is not `https:` */
export const getVideoProvider = (src: unknown): VideoProvider | null => {
  const url = typeof src === 'string' && sanitizeUrl(src, 'link') ? toUrl(src.trim()) : null;
  if (!url || url.protocol !== 'https:') {
    return null;
  }

  const host = normalizeHost(url.hostname);
  if (YOUTUBE_HOSTS.has(host)) {
    return 'youtube';
  }

  if (VIMEO_HOSTS.has(host)) {
    return 'vimeo';
  }

  return APARAT_HOSTS.has(host) ? 'aparat' : 'custom';
};

/**
 * Whether a player url (the `src` of an embedded video) may stay in the document: `https:`, no credentials, safe for
 * `sanitizeUrl` and its host in `allowedHosts`. It is not normalized, so stored urls keep their parameters.
 */
export const isVideoEmbedAllowed = (src: unknown, allowedHosts: readonly string[] = DEFAULT_VIDEO_HOSTS): boolean => {
  if (typeof src !== 'string' || !sanitizeUrl(src, 'link') || !src.trim().toLowerCase().startsWith('https://')) {
    return false;
  }

  const url = toUrl(src.trim());
  return Boolean(url && !url.username && !url.password && isVideoHostAllowed(url.hostname, allowedHosts));
};

/**
 * what the url is used for: `link` allows `mailto:` and `tel:`, `image` allows `blob:` and raster `data:` urls,
 * `media` (the file of a video) allows `blob:` and no `data:` urls
 */
export type SanitizeUrlKind = 'link' | 'image' | 'media';

// tab, line feed and carriage return are removed by the url parser of the browsers ("java\tscript:" runs), so they
// are removed here too; any other control character (C0, DEL, C1) or a bidi override rejects the url
const STRIPPED = /[\t\n\r]/g;
// eslint-disable-next-line no-control-regex
const REJECTED = /[\u0000-\u001F\u007F-\u009F‪-‮⁦-⁩]/;

const SCHEME = /^(?<scheme>[a-z][a-z\d+.-]*):/i;

const DATA_IMAGE = /^data:image\/(?:png|jpe?g|gif|webp|avif|bmp);base64,[a-z\d+/]*={0,2}$/i;

const LINK_SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);
const IMAGE_SCHEMES = new Set(['http', 'https', 'blob']);
const SCHEMES: Record<SanitizeUrlKind, Set<string>> = { link: LINK_SCHEMES, image: IMAGE_SCHEMES, media: IMAGE_SCHEMES };

/**
 * The url when it is safe to write into the document, else `null`.
 *
 * Allowed: `http(s):`, protocol-relative (`//host/…`) and relative urls (paths, `?query`, `#hash`); for links also
 * `mailto:` and `tel:`; for images also `blob:` (while an upload runs) and base64 `data:` urls of raster images
 * (png, jpeg, gif, webp, avif, bmp); for media `blob:`. Everything else is rejected: `javascript:`, `vbscript:`,
 * `data:text/html`, `data:image/svg+xml`, unknown schemes.
 */
export const sanitizeUrl = (url: unknown, kind: SanitizeUrlKind = 'link'): string | null => {
  if (typeof url !== 'string') {
    return null;
  }

  const value = url.trim().replace(STRIPPED, '');

  if (!value || REJECTED.test(value)) {
    return null;
  }

  const scheme = SCHEME.exec(value)?.groups?.['scheme']?.toLowerCase();

  if (!scheme) {
    return value;
  }

  if (kind === 'image' && scheme === 'data') {
    return DATA_IMAGE.test(value) ? value : null;
  }

  return (SCHEMES[kind] ?? LINK_SCHEMES).has(scheme) ? value : null;
};

export default sanitizeUrl;

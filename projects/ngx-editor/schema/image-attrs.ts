import { sanitizeUrl } from 'ngx-editor-rtl-ltr-edition/utils';

export type ImageAlign = 'start' | 'center' | 'end';

export const IMAGE_ALIGNS: readonly ImageAlign[] = ['start', 'center', 'end'];

export const isImageAlign = (value: unknown): value is ImageAlign => {
  return typeof value === 'string' && (IMAGE_ALIGNS as readonly string[]).includes(value);
};

/** the `data-align` of an element, `null` when it is not one of the values */
export const getImageAlign = (dom: HTMLElement): ImageAlign | null => {
  const align = dom.getAttribute('data-align');
  return isImageAlign(align) ? align : null;
};

/** the inline style of an aligned image or figure, so exported HTML keeps the alignment without the content stylesheet */
export const getImageAlignStyle = (align: unknown, block: boolean): string | null => {
  switch (align) {
    case 'start':
      return 'float: inline-start; margin-inline-end: 1em;';
    case 'end':
      return 'float: inline-end; margin-inline-start: 1em;';
    case 'center':
      return block ? 'margin-inline: auto;' : 'display: block; margin-inline: auto;';
    default:
      return null;
  }
};

const LENGTH = /^(?<value>\d+(?:\.\d+)?)(?<unit>px|%|em|rem|vw)?$/i;

/** a width that can be written into a style: a number (px) or a number with a unit, else `null` */
export const normalizeCssLength = (value: unknown): string | null => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const groups = LENGTH.exec(String(value).trim())?.groups;
  if (!groups || Number(groups['value']) === 0) {
    return null;
  }

  return `${groups['value']}${groups['unit']?.toLowerCase() ?? 'px'}`;
};

/** the attributes written on the `<img>` of the `image` node */
export const getImageDomAttrs = (attrs: Record<string, unknown>): Record<string, string | null> => {
  const { src, alt, title, width, height, align } = attrs;

  return {
    src: sanitizeUrl(src, 'image'),
    alt: (alt as string | null) ?? null,
    title: (title as string | null) ?? null,
    width: (width as string | null) ?? null,
    height: (height as string | null) ?? null,
    'data-align': isImageAlign(align) ? align : null,
    style: getImageAlignStyle(align, false),
  };
};

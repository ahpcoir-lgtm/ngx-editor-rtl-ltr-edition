import type { NgxEditorImageConfig, NgxEditorResolvedImageConfig } from './types';

export const DEFAULT_IMAGE_ACCEPT: readonly string[] = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'image/bmp',
];

export const DEFAULT_BASE64_WARN_SIZE = 500 * 1024;

const toList = (accept: string | string[] | undefined): string[] | undefined => {
  if (accept === undefined) {
    return undefined;
  }

  const list = Array.isArray(accept) ? accept : accept.split(',');
  return list.map((item) => item.trim().toLowerCase()).filter(Boolean);
};

/** the image options of an editor: each option of the `Editor` (`instance`) wins over the global config */
export const resolveImageConfig = (
  global?: NgxEditorImageConfig | null,
  instance?: NgxEditorImageConfig | null,
): NgxEditorResolvedImageConfig => {
  const globalConfig = global ?? {};
  const instanceConfig = instance ?? {};
  const pick = <K extends keyof NgxEditorImageConfig>(key: K): NgxEditorImageConfig[K] => {
    return instanceConfig[key] ?? globalConfig[key];
  };

  return {
    uploadHandler: pick('uploadHandler') ?? null,
    maxSize: pick('maxSize') ?? null,
    accept: toList(pick('accept')) ?? [...DEFAULT_IMAGE_ACCEPT],
    resize: pick('resize') ?? null,
    base64WarnSize: pick('base64WarnSize') ?? DEFAULT_BASE64_WARN_SIZE,
    onError: pick('onError') ?? null,
    onWarning: pick('onWarning') ?? null,
  };
};

/** whether a file matches a list of mime types (`image/png`, `image/*`) and extensions (`.png`) */
export const isAcceptedFile = (file: Pick<File, 'name' | 'type'>, accept: readonly string[]): boolean => {
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();

  return accept.some((item) => {
    if (item.startsWith('.')) {
      return name.endsWith(item);
    }

    if (item.endsWith('/*')) {
      return type.startsWith(item.slice(0, -1));
    }

    return type === item;
  });
};

/** a size in bytes for messages: `512 B`, `500 KB`, `1.5 MB` */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }

  return `${Number(value.toFixed(1))} ${units[unit]}`;
};

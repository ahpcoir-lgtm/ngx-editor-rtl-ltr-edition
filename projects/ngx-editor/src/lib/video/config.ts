import {
  DEFAULT_VIDEO_HOSTS, type VideoEmbed, extractVideoUrl, isVideoHostAllowed, normalizeVideoUrl, sanitizeUrl,
} from 'ngx-editor-rtl-ltr-edition/utils';

import type { NgxEditorResolvedVideoConfig, NgxEditorVideoConfig } from './types';

export const DEFAULT_VIDEO_ACCEPT: readonly string[] = ['video/mp4', 'video/webm', 'video/ogg'];

const toList = (value: string | string[] | undefined): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const list = Array.isArray(value) ? value : value.split(',');
  return list.map((item) => item.trim().toLowerCase()).filter(Boolean);
};

/** the video options of an editor: each option of the `Editor` (`instance`) wins over the global config */
export const resolveVideoConfig = (
  global?: NgxEditorVideoConfig | null,
  instance?: NgxEditorVideoConfig | null,
): NgxEditorResolvedVideoConfig => {
  const globalConfig = global ?? {};
  const instanceConfig = instance ?? {};
  const pick = <K extends keyof NgxEditorVideoConfig>(key: K): NgxEditorVideoConfig[K] => {
    return instanceConfig[key] ?? globalConfig[key];
  };

  return {
    allowedHosts: toList(pick('allowedHosts')) ?? [...DEFAULT_VIDEO_HOSTS],
    youtubeNoCookie: pick('youtubeNoCookie') ?? true,
    uploadHandler: pick('uploadHandler') ?? null,
    maxSize: pick('maxSize') ?? null,
    accept: toList(pick('accept')) ?? [...DEFAULT_VIDEO_ACCEPT],
    onError: pick('onError') ?? null,
  };
};

/** the player url of a video link under the config's `allowedHosts` and `youtubeNoCookie` */
export const normalizeConfiguredVideoUrl = (url: unknown, config: NgxEditorResolvedVideoConfig): VideoEmbed | null => {
  return normalizeVideoUrl(url, { allowedHosts: config.allowedHosts, youtubeNoCookie: config.youtubeNoCookie });
};

/** why a link cannot be embedded: its host is not in `allowedHosts`, or it is not a video link; `null` when it can */
export const getVideoUrlError = (
  input: string,
  config: NgxEditorResolvedVideoConfig,
): { key: 'videoHostNotAllowed' | 'videoInvalidUrl'; host: string } | null => {
  if (normalizeConfiguredVideoUrl(input, config)) {
    return null;
  }

  const text = extractVideoUrl(input);
  let host = '';
  try {
    host = sanitizeUrl(text, 'link') ? new URL(/^[a-z][a-z\d+.-]*:/i.test(text) ? text : `https://${text}`).hostname : '';
  } catch {
    host = '';
  }

  return host && !isVideoHostAllowed(host, config.allowedHosts)
    ? { key: 'videoHostNotAllowed', host }
    : { key: 'videoInvalidUrl', host };
};

import { DOMParser, Schema, TagParseRule } from 'prosemirror-model';
import { EditorState, Plugin, PluginKey } from 'prosemirror-state';

import { isVideoEmbedAllowed } from 'ngx-editor-rtl-ltr-edition/utils';
import { createVideoParseRules } from 'ngx-editor-rtl-ltr-edition/schema';

import { normalizeConfiguredVideoUrl } from '../video/config';
import type { NgxEditorResolvedVideoConfig } from '../video/types';

export interface VideoEmbedOptions {
  getConfig: () => NgxEditorResolvedVideoConfig;
}

export const videoEmbedKey = new PluginKey('videoEmbed');

const isVideoRule = (rule: object): boolean => 'node' in rule && rule.node === 'video';

/**
 * A parser for pasted HTML that checks videos against the configured `allowedHosts` instead of the default hosts of
 * the schema: embed code of an extra host is accepted, a video of a host left out of the list is dropped, and pasted
 * `<iframe>` urls follow `youtubeNoCookie`.
 */
export const createVideoClipboardParser = (schema: Schema, getConfig: () => NgxEditorResolvedVideoConfig): DOMParser => {
  const base = DOMParser.fromSchema(schema);
  const rules: TagParseRule[] = createVideoParseRules({
    isEmbedAllowed: (src) => isVideoEmbedAllowed(src, getConfig().allowedHosts),
    normalizeEmbed: (src) => normalizeConfiguredVideoUrl(src, getConfig()),
  }).map((rule) => ({ ...rule, node: 'video' }));

  return new DOMParser(schema, [...rules, ...base.rules.filter((rule) => !isVideoRule(rule))]);
};

/** the resolved video config of the editor of `state`, `null` without the `videoEmbed` plugin */
export const getVideoConfig = (state: EditorState): NgxEditorResolvedVideoConfig | null => {
  const options = videoEmbedKey.get(state)?.spec['videoOptions'] as VideoEmbedOptions | undefined;
  return options?.getConfig() ?? null;
};

/** holds the video config of an editor and applies its `allowedHosts` to pasted HTML */
export const videoEmbed = (schema: Schema, options: VideoEmbedOptions): Plugin => {
  return new Plugin({
    key: videoEmbedKey,
    videoOptions: options,
    props: {
      clipboardParser: createVideoClipboardParser(schema, options.getConfig),
    },
  });
};

export default videoEmbed;

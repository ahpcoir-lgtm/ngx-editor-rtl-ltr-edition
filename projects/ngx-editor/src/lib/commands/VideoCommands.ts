import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { type Command, type EditorState, NodeSelection, type Transaction } from 'prosemirror-state';

import { getVideoProvider, sanitizeUrl } from 'ngx-editor-rtl-ltr-edition/utils';
import { type ImageAlign, type VideoAttrs, isImageAlign, normalizeCssLength, normalizeVideoRatio } from 'ngx-editor-rtl-ltr-edition/schema';

import { getVideoConfig } from '../plugins/video-embed';
import { normalizeConfiguredVideoUrl, resolveVideoConfig } from '../video/config';
import type { NgxEditorResolvedVideoConfig } from '../video/types';

export interface VideoTarget {
  node: ProseMirrorNode;
  pos: number;
}

/** the attributes of a new video besides its url */
export type VideoInsertAttrs = Partial<Pick<VideoAttrs, 'width' | 'align' | 'poster' | 'caption' | 'ratio'>>;

const isVideo = (node: ProseMirrorNode | null | undefined): node is ProseMirrorNode => node?.type.name === 'video';

/** the video at `pos`, else the selected one */
export const getVideoTarget = (state: EditorState, pos?: number): VideoTarget | null => {
  if (pos !== undefined) {
    const node = state.doc.nodeAt(pos);
    return isVideo(node) ? { node, pos } : null;
  }

  const { selection } = state;
  return selection instanceof NodeSelection && isVideo(selection.node) ? { node: selection.node, pos: selection.from } : null;
};

/** the video config of the editor of `state`, else the defaults */
const configOf = (state: EditorState): NgxEditorResolvedVideoConfig => getVideoConfig(state) ?? resolveVideoConfig();

const select = (tr: Transaction, pos: number): Transaction => tr.setSelection(NodeSelection.create(tr.doc, pos));

// the attributes that are safe to write: sanitized urls, a CSS length, a known alignment and ratio, plain text
const cleanAttrs = (attrs: Record<string, unknown>): Record<string, unknown> | null => {
  const next = { ...attrs };

  if ('poster' in next) {
    next['poster'] = next['poster'] ? sanitizeUrl(next['poster'], 'image') : null;
  }

  if ('width' in next) {
    next['width'] = normalizeCssLength(next['width']);
  }

  if ('align' in next && !isImageAlign(next['align'])) {
    next['align'] = null;
  }

  if ('ratio' in next) {
    next['ratio'] = normalizeVideoRatio(next['ratio']) ?? '16/9';
  }

  if ('caption' in next) {
    next['caption'] = String(next['caption'] ?? '').replace(/\s+/g, ' ').trim();
  }

  if ('src' in next) {
    const file = next['kind'] === 'file';
    const src = file ? sanitizeUrl(next['src'], 'media') : next['src'];
    const provider = file ? null : getVideoProvider(src);

    if (!src || (!file && !provider)) {
      return null;
    }

    next['src'] = src;
    next['provider'] = file ? null : next['provider'] ?? provider;
  }

  return next;
};

/**
 * Inserts a video, or replaces the selected node, and selects it. `kind: 'embed'` needs an `https:` player url (use
 * `insertVideoUrl` for links of YouTube, Vimeo or Aparat), `kind: 'file'` a url that `sanitizeUrl` accepts.
 */
export const insertVideo = (attrs: VideoInsertAttrs & { src: string; kind?: VideoAttrs['kind']; provider?: VideoAttrs['provider'] }): Command => {
  return (state, dispatch) => {
    const type = state.schema.nodes['video'];
    const clean = cleanAttrs({ kind: 'embed', ...attrs });

    if (!type || !clean) {
      return false;
    }

    const { tr, selection: { from, to } } = state;
    const video = type.create(clean);
    tr.replaceRangeWith(from, to, video);

    // the video may have been placed before or after the paragraph around the cursor, or split it
    let pos = -1;
    tr.doc.descendants((node, at) => {
      if (node === video) {
        pos = at;
      }
      return pos < 0 && !node.isTextblock;
    });

    if (pos >= 0) {
      select(tr, pos);
    }

    dispatch?.(tr.scrollIntoView());
    return true;
  };
};

/**
 * Inserts (or replaces the selected node with) the video of a link or embed code, normalized with the editor's
 * `video` config (or `config`); refused for a host that is not allowed.
 */
export const insertVideoUrl = (url: string, attrs: VideoInsertAttrs = {}, config?: NgxEditorResolvedVideoConfig): Command => {
  return (state, dispatch) => {
    const embed = normalizeConfiguredVideoUrl(url, config ?? configOf(state));
    return embed ? insertVideo({ ...attrs, kind: 'embed', src: embed.src, provider: embed.provider })(state, dispatch) : false;
  };
};

const withTarget = (pos: number | undefined, fn: (target: VideoTarget, state: EditorState) => Transaction | null): Command => {
  return (state, dispatch) => {
    const target = getVideoTarget(state, pos);
    const tr = target ? fn(target, state) : null;

    if (!tr) {
      return false;
    }

    dispatch?.(tr);
    return true;
  };
};

/** sets attributes of the video; urls, width, alignment and ratio are checked as on insert */
export const setVideoAttrs = (attrs: Record<string, unknown>, pos?: number): Command => {
  return withTarget(pos, ({ node, pos: at }, state) => {
    const known = Object.fromEntries(Object.entries(attrs).filter(([name]) => name in (node.type.spec.attrs ?? {})));
    const kind = known['kind'] ?? node.attrs['kind'];
    const clean = cleanAttrs('src' in known ? { ...known, kind } : known);

    if (!clean) {
      return null;
    }

    return select(state.tr.setNodeMarkup(at, null, { ...node.attrs, ...clean }), at);
  });
};

/** aligns the video: `start`, `center`, `end` or `null` (full width block) */
export const setVideoAlign = (align: ImageAlign | null, pos?: number): Command => {
  return (state, dispatch) => {
    const target = getVideoTarget(state, pos);
    if ((align !== null && !isImageAlign(align)) || !target || target.node.attrs['align'] === align) {
      return false;
    }

    return setVideoAttrs({ align }, pos)(state, dispatch);
  };
};

/** the width of the video, such as `50%` or `480px`; `null` is the full width */
export const setVideoWidth = (width: string | null, pos?: number): Command => {
  return (state, dispatch) => {
    const value = width === null ? null : normalizeCssLength(width);
    const target = getVideoTarget(state, pos);

    if ((width !== null && !value) || !target || target.node.attrs['width'] === value) {
      return false;
    }

    return setVideoAttrs({ width: value }, pos)(state, dispatch);
  };
};

/** the caption of the video; `null` or an empty string removes it */
export const setVideoCaption = (caption: string | null, pos?: number): Command => setVideoAttrs({ caption: caption ?? '' }, pos);

/** replaces the player of the video with the video of a link, normalized with the editor's config */
export const setVideoUrl = (url: string, pos?: number, config?: NgxEditorResolvedVideoConfig): Command => {
  return (state, dispatch) => {
    const embed = normalizeConfiguredVideoUrl(url, config ?? configOf(state));
    if (!embed || !getVideoTarget(state, pos)) {
      return false;
    }

    return setVideoAttrs({ kind: 'embed', src: embed.src, provider: embed.provider, poster: null }, pos)(state, dispatch);
  };
};

/** removes the video */
export const deleteVideo = (pos?: number): Command => {
  return withTarget(pos, ({ node, pos: at }, state) => state.tr.delete(at, at + node.nodeSize).scrollIntoView());
};

/** whether a video is selected */
export const isVideoSelected = (state: EditorState): boolean => getVideoTarget(state) !== null;

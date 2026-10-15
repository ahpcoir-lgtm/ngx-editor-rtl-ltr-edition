import { EditorState, NodeSelection, Plugin, PluginKey, Transaction } from 'prosemirror-state';
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';

import { sanitizeUrl } from 'ngx-editor-rtl-ltr-edition/utils';

import type { NgxEditorEvent } from '../events';
import { formatFileSize, isAcceptedFile } from '../images/config';
import { renderUploadError, renderUploadPlaceholder, setUploadProgress } from '../images/placeholder-dom';
import { formatMessage } from '../images/upload-utils';
import type { NgxEditorResolvedVideoConfig, NgxEditorVideoError, NgxEditorVideoErrorCode } from '../video/types';
import { VideoUploadFailure } from '../video/upload-failure';

export interface VideoUploadOptions {
  getConfig: () => NgxEditorResolvedVideoConfig;
  /** the localized string of a locale key */
  translate: (key: string) => string;
  emit?: (event: NgxEditorEvent) => void;
  /** how long an error message stays in the document, in ms (default 4000) */
  errorTimeout?: number;
}

/** where an uploaded video goes: a position to insert it at, or the position of a video whose file is replaced */
export interface VideoUploadTarget {
  pos: number;
  replace?: boolean;
  /** attributes of the new video, such as `caption` and `poster` */
  attrs?: Record<string, unknown>;
}

interface Placeholder {
  id: string;
  pos: number;
  kind: 'upload' | 'replace' | 'error';
  message?: string;
}

interface UploadState {
  placeholders: Placeholder[];
  decorations: DecorationSet;
}

interface UploadMeta {
  add?: Placeholder[];
  remove?: string[];
}

interface Upload {
  file: File;
  attrs: Record<string, unknown>;
  controller: AbortController;
  progress: number;
  aborted: boolean;
  element: HTMLElement | null;
}


export const videoUploadKey = new PluginKey<UploadState>('videoUpload');

const ERROR_KEYS: Record<NgxEditorVideoErrorCode, string> = {
  tooLarge: 'videoTooLarge',
  invalidType: 'videoInvalidType',
  uploadFailed: 'videoUploadFailed',
  invalidResult: 'videoUploadFailed',
  noHandler: 'videoUploadUnavailable',
};

let nextId = 0;

const getOptions = (state: EditorState): VideoUploadOptions | null => {
  return (videoUploadKey.get(state)?.spec['uploadOptions'] as VideoUploadOptions | undefined) ?? null;
};

class VideoUploader {
  private uploads = new Map<string, Upload>();
  private timers = new Set<ReturnType<typeof setTimeout>>();

  constructor(private view: EditorView, private options: VideoUploadOptions) {}

  get config(): NgxEditorResolvedVideoConfig {
    return this.options.getConfig();
  }

  private t(key: string, values: Record<string, string> = {}): string {
    return formatMessage(this.options.translate(key), values);
  }

  private dispatchMeta(meta: UploadMeta, tr: Transaction = this.view.state.tr): void {
    if (!this.view.isDestroyed) {
      this.view.dispatch(tr.setMeta(videoUploadKey, meta));
    }
  }

  private findPlaceholder(id: string): Placeholder | undefined {
    return videoUploadKey.getState(this.view.state)?.placeholders.find((placeholder) => placeholder.id === id);
  }

  upload(files: File[], target: VideoUploadTarget): Promise<void> {
    const { config } = this;
    const placeholders: Placeholder[] = [];

    for (const file of target.replace ? files.slice(0, 1) : files) {
      if (!config.uploadHandler) {
        this.fail({ pos: target.pos, code: 'noHandler', file });
      } else if (!isAcceptedFile(file, config.accept)) {
        this.fail({ pos: target.pos, code: 'invalidType', file });
      } else if (config.maxSize !== null && file.size > config.maxSize) {
        this.fail({ pos: target.pos, code: 'tooLarge', file });
      } else {
        const id = `ngx-video-upload-${++nextId}`;
        placeholders.push({ id, pos: target.pos, kind: target.replace ? 'replace' : 'upload' });
        this.uploads.set(id, {
          file,
          attrs: target.attrs ?? {},
          controller: new AbortController(),
          progress: 0,
          aborted: false,
          element: null,
        });
      }
    }

    if (placeholders.length > 0) {
      this.dispatchMeta({ add: placeholders });
    }

    return Promise.all(placeholders.map((placeholder) => this.run(placeholder.id))).then(() => undefined);
  }

  private async run(id: string): Promise<void> {
    const upload = this.uploads.get(id);
    const handler = this.config.uploadHandler;
    if (!upload || !handler) {
      return;
    }

    const { file } = upload;
    this.options.emit?.({ type: 'videoUploadStart', id, file });

    try {
      const result = await handler(file, {
        kind: 'video',
        onProgress: (percent) => this.setProgress(id, percent),
        signal: upload.controller.signal,
      });

      if (upload.aborted) {
        return;
      }

      const src = sanitizeUrl(typeof result === 'string' ? result : result?.src, 'media');
      if (!src) {
        throw new VideoUploadFailure('invalidResult');
      }

      const poster = typeof result === 'string' ? null : sanitizeUrl(result?.poster, 'image');
      if (this.insert(id, src, poster)) {
        this.options.emit?.({ type: 'videoUploaded', id, file, src });
      } else {
        this.abort(id);
      }
    } catch (error) {
      if (!upload.aborted) {
        const failure = error instanceof VideoUploadFailure ? error : null;
        const pos = this.findPlaceholder(id)?.pos ?? null;
        this.fail({ id, pos, code: failure?.code ?? 'uploadFailed', file, cause: failure ? failure.reason : error });
      }
    } finally {
      this.uploads.delete(id);
    }
  }

  // inserts the video at the placeholder (or sets the file of the replaced video); false when the placeholder is gone
  private insert(id: string, src: string, poster: string | null): boolean {
    const placeholder = this.findPlaceholder(id);
    const upload = this.uploads.get(id);
    const type = this.view.state.schema.nodes['video'];

    if (!placeholder || !upload || !type || this.view.isDestroyed) {
      return false;
    }

    const { tr } = this.view.state;
    const { pos } = placeholder;
    const current = tr.doc.nodeAt(pos);
    const file = { kind: 'file', src, provider: null, poster: poster ?? upload.attrs['poster'] ?? null };

    if (placeholder.kind === 'replace' && current?.type === type) {
      tr.setNodeMarkup(pos, null, { ...current.attrs, ...upload.attrs, ...file, poster: file.poster ?? current.attrs['poster'] });
      tr.setSelection(NodeSelection.create(tr.doc, pos));
    } else {
      const node = type.create({ ...upload.attrs, ...file });
      tr.replaceRangeWith(pos, pos, node);
    }

    this.uploads.delete(id);
    this.dispatchMeta({ remove: [id] }, tr);
    return true;
  }

  private setProgress(id: string, percent: number): void {
    const upload = this.uploads.get(id);
    if (!upload || upload.aborted) {
      return;
    }

    upload.progress = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
    setUploadProgress(upload.element, upload.progress);
    this.options.emit?.({ type: 'videoUploadProgress', id, file: upload.file, percent: upload.progress });
  }

  /** reports an error and shows its message for a moment at `pos` (in place of the placeholder `id`) */
  fail({ id, pos, code, file, cause }: { id?: string; pos: number | null; code: NgxEditorVideoErrorCode; file?: File; cause?: unknown }): void {
    const { maxSize } = this.config;
    const error: NgxEditorVideoError = {
      code,
      message: this.t(ERROR_KEYS[code], { name: file?.name || 'video', max: maxSize !== null ? formatFileSize(maxSize) : '' }),
      file,
      cause,
    };

    if (id) {
      this.uploads.delete(id);
    }

    this.config.onError?.(error);
    this.options.emit?.({ type: 'videoUploadError', id, file, error });

    const meta: UploadMeta = { remove: id ? [id] : [] };

    if (pos !== null && !this.view.isDestroyed) {
      const errorId = `ngx-video-error-${++nextId}`;
      meta.add = [{ id: errorId, pos, kind: 'error', message: error.message }];

      const timer = setTimeout(() => {
        this.timers.delete(timer);
        this.dispatchMeta({ remove: [errorId] });
      }, this.options.errorTimeout ?? 4000);
      this.timers.add(timer);
    }

    if (meta.add || meta.remove?.length) {
      this.dispatchMeta(meta);
    }
  }

  /** stops an upload: its handler gets an aborted signal and no video is inserted */
  abort(id: string): void {
    const upload = this.uploads.get(id);
    if (!upload || upload.aborted) {
      return;
    }

    upload.aborted = true;
    upload.controller.abort();
    this.options.emit?.({ type: 'videoUploadCancelled', id, file: upload.file });
  }

  cancel(id: string): void {
    this.abort(id);
    this.dispatchMeta({ remove: [id] });
  }

  // uploads whose placeholder left the document are aborted
  sync(placeholders: Placeholder[]): void {
    const ids = new Set(placeholders.map((placeholder) => placeholder.id));
    Array.from(this.uploads.keys()).filter((id) => !ids.has(id)).forEach((id) => this.abort(id));
  }

  render(placeholder: Placeholder): HTMLElement {
    const doc = this.view.dom.ownerDocument;

    if (placeholder.kind === 'error') {
      return renderUploadError(doc, placeholder.message ?? '');
    }

    const element = renderUploadPlaceholder(doc, {
      label: this.t('uploadingVideo'),
      cancelLabel: this.t('cancelUpload'),
      preview: null,
      onCancel: () => this.cancel(placeholder.id),
    });

    const upload = this.uploads.get(placeholder.id);
    if (upload) {
      upload.element = element;
      setUploadProgress(element, upload.progress);
    }

    return element;
  }

  destroy(): void {
    Array.from(this.uploads.keys()).forEach((id) => this.abort(id));
    this.uploads.clear();
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
  }
}

const uploaders = new WeakMap<EditorView, VideoUploader>();

const getUploader = (view: EditorView): VideoUploader | null => {
  const existing = uploaders.get(view);
  if (existing) {
    return existing;
  }

  const options = getOptions(view.state);
  if (!options) {
    return null;
  }

  const uploader = new VideoUploader(view, options);
  uploaders.set(view, uploader);
  return uploader;
};

const buildDecorations = (state: EditorState, placeholders: Placeholder[]): DecorationSet => {
  if (placeholders.length === 0) {
    return DecorationSet.empty;
  }

  return DecorationSet.create(state.doc, placeholders.map((placeholder) => {
    return Decoration.widget(placeholder.pos, (view) => {
      const uploader = getUploader(view);
      return uploader ? uploader.render(placeholder) : view.dom.ownerDocument.createElement('span');
    }, {
      key: placeholder.id,
      side: placeholder.kind === 'replace' ? 1 : -1,
      ignoreSelection: true,
      stopEvent: () => true,
    });
  }));
};

const mapPlaceholders = (placeholders: Placeholder[], tr: Transaction): Placeholder[] => {
  return placeholders.flatMap((placeholder) => {
    // a replace placeholder stays with the video after it; an upload stays before text typed at its position
    const replace = placeholder.kind === 'replace';
    const result = tr.mapping.mapResult(placeholder.pos, replace ? 1 : -1);
    return (replace ? result.deletedAfter : result.deletedAcross) ? [] : [{ ...placeholder, pos: result.pos }];
  });
};

const applyMeta = (value: UploadState, tr: Transaction, state: EditorState): UploadState => {
  const meta = tr.getMeta(videoUploadKey) as UploadMeta | undefined;

  if (!tr.docChanged && !meta) {
    return value;
  }

  let placeholders = tr.docChanged ? mapPlaceholders(value.placeholders, tr) : value.placeholders;

  if (meta?.remove?.length) {
    placeholders = placeholders.filter((placeholder) => !meta.remove?.includes(placeholder.id));
  }

  if (meta?.add?.length) {
    placeholders = [...placeholders, ...meta.add];
  }

  return { placeholders, decorations: buildDecorations(state, placeholders) };
};

const videoFiles = (list: FileList | File[] | null | undefined): File[] => {
  return Array.from(list ?? []).filter((file) => file.type.startsWith('video/'));
};

/**
 * Uploads video files with the `uploadHandler` of the `video` config: a placeholder with a progress bar at
 * `target.pos`, replaced by the video when the upload succeeds; with `replace`, the file of the video at `pos` is
 * replaced. Without a handler, an unaccepted type or a file above `maxSize` a localized error is shown instead.
 * Resolves when every file is done. Without the `videoUpload` plugin nothing happens.
 */
export const uploadVideoFiles = (view: EditorView, files: File[] | FileList, target?: VideoUploadTarget): Promise<void> => {
  const uploader = getUploader(view);
  if (!uploader) {
    return Promise.resolve();
  }

  return uploader.upload(Array.from(files), target ?? { pos: view.state.selection.from });
};

/** cancels an upload started by `uploadVideoFiles`, paste or drop */
export const cancelVideoUpload = (view: EditorView, id: string): void => {
  getUploader(view)?.cancel(id);
};

/** the ids and positions of the video upload placeholders in the document */
export const getVideoUploadPlaceholders = (state: EditorState): { id: string; pos: number; kind: string }[] => {
  return (videoUploadKey.getState(state)?.placeholders ?? []).map(({ id, pos, kind }) => ({ id, pos, kind }));
};

/** paste and drop of video files go through `uploadVideoFiles` */
export const videoUpload = (options: VideoUploadOptions): Plugin<UploadState> => {
  return new Plugin<UploadState>({
    key: videoUploadKey,
    uploadOptions: options,
    state: {
      init: () => ({ placeholders: [], decorations: DecorationSet.empty }),
      apply: (tr, value, _oldState, newState) => applyMeta(value, tr, newState),
    },
    props: {
      decorations(state) {
        return videoUploadKey.getState(state)?.decorations ?? DecorationSet.empty;
      },
      handlePaste(view, event) {
        const files = videoFiles(event?.clipboardData?.files);

        if (files.length === 0 || event?.clipboardData?.getData('text/html')) {
          return false;
        }

        if (!view.state.selection.empty) {
          view.dispatch(view.state.tr.deleteSelection());
        }

        uploadVideoFiles(view, files, { pos: view.state.selection.from });
        return true;
      },
      handleDrop(view, event, _slice, moved) {
        const files = videoFiles(event?.dataTransfer?.files);

        if (moved || files.length === 0) {
          return false;
        }

        let pos = view.state.selection.from;
        try {
          pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? pos;
        } catch {
          // no layout (tests, a detached editor): the files go to the cursor
        }

        event.preventDefault();
        uploadVideoFiles(view, files, { pos });
        return true;
      },
    },
    view(editorView) {
      return {
        update(view) {
          uploaders.get(view)?.sync(videoUploadKey.getState(view.state)?.placeholders ?? []);
        },
        destroy() {
          // plugin views are also destroyed when plugins are registered; only a destroyed editor stops the uploads
          queueMicrotask(() => {
            if (editorView.isDestroyed) {
              uploaders.get(editorView)?.destroy();
              uploaders.delete(editorView);
            }
          });
        },
      };
    },
  });
};

export default videoUpload;

import { Fragment, Node as ProseMirrorNode, Slice } from 'prosemirror-model';
import { EditorState, Plugin, PluginKey, Transaction } from 'prosemirror-state';
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';

import { sanitizeUrl } from 'ngx-editor-rtl-ltr-edition/utils';

import type { NgxEditorEvent } from '../events';
import { formatFileSize, isAcceptedFile } from '../images/config';
import { renderUploadError, renderUploadPlaceholder, setUploadProgress } from '../images/placeholder-dom';
import { ImageResizeEnvironment, browserResizeEnvironment, resizeImageFile } from '../images/resize';
import type {
  NgxEditorImageError, NgxEditorImageErrorCode, NgxEditorImageWarning, NgxEditorResolvedImageConfig,
} from '../images/types';
import { ImageUploadFailure, dataUrlSize, formatMessage, readAsDataUrl } from '../images/upload-utils';

export interface ImageUploadOptions {
  getConfig: () => NgxEditorResolvedImageConfig;
  /** the localized string of a locale key */
  translate: (key: string) => string;
  emit?: (event: NgxEditorEvent) => void;
  /** how long an error message stays in the document, in ms (default 4000) */
  errorTimeout?: number;
  resizeEnvironment?: ImageResizeEnvironment;
}

/** where uploaded images go: a position to insert them at, or the position of an image whose `src` is replaced */
export interface ImageUploadTarget {
  pos: number;
  replace?: boolean;
}

interface Placeholder {
  id: string;
  pos: number;
  kind: 'upload' | 'replace' | 'error';
  batch: number;
  order: number;
  message?: string;
}

interface UploadState {
  placeholders: Placeholder[];
  decorations: DecorationSet;
}

interface UploadMeta {
  add?: Placeholder[];
  remove?: string[];
  // the placeholder an image was inserted for; later files of its batch at the same position stay after the image
  done?: Placeholder;
}

interface Upload {
  file: File;
  controller: AbortController;
  progress: number;
  aborted: boolean;
  preview: string | null;
  element: HTMLElement | null;
}

interface UploadedImage {
  src: unknown;
  alt: string | null;
  width: string | null;
}

interface Failure {
  id?: string;
  pos: number | null;
  code: NgxEditorImageErrorCode;
  file?: File;
  cause?: unknown;
}

export const imageUploadKey = new PluginKey<UploadState>('imageUpload');

const ERROR_KEYS: Record<NgxEditorImageErrorCode, string> = {
  tooLarge: 'imageTooLarge',
  invalidType: 'imageInvalidType',
  uploadFailed: 'imageUploadFailed',
  invalidResult: 'imageUploadFailed',
  readFailed: 'imageUploadFailed',
};

let nextId = 0;
let nextBatch = 0;

const isImageNode = (node: ProseMirrorNode | null | undefined): node is ProseMirrorNode => {
  return Boolean(node && (node.type.name === 'image' || node.type.name === 'figure'));
};

const getOptions = (state: EditorState): ImageUploadOptions | null => {
  const plugin = imageUploadKey.get(state);
  return (plugin?.spec['uploadOptions'] as ImageUploadOptions | undefined) ?? null;
};

class ImageUploader {
  private uploads = new Map<string, Upload>();
  private timers = new Set<ReturnType<typeof setTimeout>>();

  constructor(private view: EditorView, private options: ImageUploadOptions) {}

  get config(): NgxEditorResolvedImageConfig {
    return this.options.getConfig();
  }

  private t(key: string, values: Record<string, string> = {}): string {
    return formatMessage(this.options.translate(key), values);
  }

  private emit(event: NgxEditorEvent): void {
    this.options.emit?.(event);
  }

  private dispatchMeta(meta: UploadMeta, tr: Transaction = this.view.state.tr): void {
    if (!this.view.isDestroyed) {
      this.view.dispatch(tr.setMeta(imageUploadKey, meta));
    }
  }

  private findPlaceholder(id: string): Placeholder | undefined {
    return imageUploadKey.getState(this.view.state)?.placeholders.find((placeholder) => placeholder.id === id);
  }

  upload(files: File[], target: ImageUploadTarget): Promise<void> {
    const { config } = this;
    const batch = ++nextBatch;
    const placeholders: Placeholder[] = [];
    const rejected: File[] = [];

    files.forEach((file, order) => {
      // a replace takes one file
      if (target.replace && placeholders.length > 0) {
        return;
      }

      if (!isAcceptedFile(file, config.accept)) {
        rejected.push(file);
        return;
      }

      const id = `ngx-image-upload-${++nextId}`;
      placeholders.push({ id, pos: target.pos, kind: target.replace ? 'replace' : 'upload', batch, order });
      this.uploads.set(id, {
        file,
        controller: new AbortController(),
        progress: 0,
        aborted: false,
        preview: typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null,
        element: null,
      });
    });

    if (placeholders.length > 0) {
      this.dispatchMeta({ add: placeholders });
    }

    rejected.forEach((file) => this.fail({ pos: target.pos, code: 'invalidType', file }));

    return Promise.all(placeholders.map((placeholder) => this.run(placeholder.id))).then(() => undefined);
  }

  // the url of the file: from the upload handler, else a data url
  private async obtain(id: string, upload: Upload, file: File): Promise<UploadedImage> {
    const { config } = this;

    if (!config.uploadHandler) {
      const src = await readAsDataUrl(file);

      if (file.size > config.base64WarnSize) {
        this.warn(file.size, upload.file, id);
      }

      return { src, alt: null, width: null };
    }

    const result = await config.uploadHandler(file, {
      kind: 'image',
      onProgress: (percent) => this.setProgress(id, percent),
      signal: upload.controller.signal,
    });

    if (typeof result === 'string') {
      return { src: result, alt: null, width: null };
    }

    return { src: result?.src, alt: result?.alt ?? null, width: result?.width ?? null };
  }

  private async run(id: string): Promise<void> {
    const upload = this.uploads.get(id);
    if (!upload) {
      return;
    }

    const { file } = upload;
    const { config } = this;
    this.emit({ type: 'imageUploadStart', id, file });

    try {
      const resized = await resizeImageFile(file, config.resize, this.options.resizeEnvironment ?? browserResizeEnvironment);

      if (config.maxSize !== null && resized.size > config.maxSize) {
        throw new ImageUploadFailure('tooLarge');
      }

      const image = await this.obtain(id, upload, resized);
      if (upload.aborted) {
        return;
      }

      const src = sanitizeUrl(image.src, 'image');
      if (!src) {
        throw new ImageUploadFailure('invalidResult');
      }

      if (this.insert(id, { ...image, src })) {
        this.emit({ type: 'imageUploaded', id, file, src, embedded: !config.uploadHandler });
      } else {
        this.abort(id);
      }
    } catch (error) {
      if (!upload.aborted) {
        const failure = error instanceof ImageUploadFailure ? error : null;
        const pos = this.findPlaceholder(id)?.pos ?? null;
        this.fail({ id, pos, code: failure?.code ?? 'uploadFailed', file, cause: failure ? failure.reason : error });
      }
    } finally {
      this.release(id);
    }
  }

  private release(id: string): void {
    const upload = this.uploads.get(id);

    if (upload?.preview && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(upload.preview);
    }

    this.uploads.delete(id);
  }

  // inserts the image at the placeholder (or sets the `src` of the replaced image); false when the placeholder is gone
  private insert(id: string, image: UploadedImage & { src: string }): boolean {
    const placeholder = this.findPlaceholder(id);
    const { schema } = this.view.state;
    const imageType = schema.nodes['image'];

    if (!placeholder || !imageType || this.view.isDestroyed) {
      return false;
    }

    const { tr } = this.view.state;
    const { pos } = placeholder;
    const current = tr.doc.nodeAt(pos);

    if (placeholder.kind === 'replace' && isImageNode(current)) {
      tr.setNodeMarkup(pos, null, { ...current.attrs, src: image.src, alt: image.alt ?? current.attrs['alt'] });
    } else {
      const node = imageType.create({ src: image.src, alt: image.alt, width: image.width });
      const { paragraph } = schema.nodes;
      const inline = tr.doc.resolve(pos).parent.inlineContent;
      tr.insert(pos, inline || !paragraph ? node : paragraph.create(null, node));
    }

    // done before the dispatch, so that the removed placeholder does not abort it
    this.release(id);
    this.dispatchMeta({ remove: [id], done: placeholder }, tr);
    return true;
  }

  private setProgress(id: string, percent: number): void {
    const upload = this.uploads.get(id);
    if (!upload || upload.aborted) {
      return;
    }

    upload.progress = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
    setUploadProgress(upload.element, upload.progress);
    this.emit({ type: 'imageUploadProgress', id, file: upload.file, percent: upload.progress });
  }

  /** reports an embedded data url larger than `base64WarnSize` */
  warn(size: number, file?: File, id?: string): void {
    const warning: NgxEditorImageWarning = {
      code: 'base64Size',
      message: this.t('imageEmbeddedWarning', { name: file?.name || 'image', size: formatFileSize(size) }),
      size,
      file,
    };

    // eslint-disable-next-line no-console
    console.warn(`ngx-editor: ${warning.message}`);
    this.config.onWarning?.(warning);
    this.emit({ type: 'imageUploadWarning', id, file, warning });
  }

  /** reports an error and shows its message for a moment at `pos` (in place of the placeholder `id`) */
  fail({ id, pos, code, file, cause }: Failure): void {
    const { maxSize } = this.config;
    const error: NgxEditorImageError = {
      code,
      message: this.t(ERROR_KEYS[code], {
        name: file?.name || 'image',
        max: maxSize !== null ? formatFileSize(maxSize) : '',
      }),
      file,
      cause,
    };

    if (id) {
      this.release(id);
    }

    this.config.onError?.(error);
    this.emit({ type: 'imageUploadError', id, file, error });

    const meta: UploadMeta = { remove: id ? [id] : [] };

    if (pos !== null && !this.view.isDestroyed) {
      const errorId = `ngx-image-error-${++nextId}`;
      meta.add = [{ id: errorId, pos, kind: 'error', batch: 0, order: 0, message: error.message }];

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

  /** stops an upload: its handler gets an aborted signal and no image is inserted */
  abort(id: string): void {
    const upload = this.uploads.get(id);
    if (!upload || upload.aborted) {
      return;
    }

    upload.aborted = true;
    upload.controller.abort();
    this.emit({ type: 'imageUploadCancelled', id, file: upload.file });
  }

  cancel(id: string): void {
    this.abort(id);
    this.dispatchMeta({ remove: [id] });
  }

  // uploads whose placeholder left the document (deleted with the content around it) are aborted
  sync(placeholders: Placeholder[]): void {
    const ids = new Set(placeholders.map((placeholder) => placeholder.id));
    Array.from(this.uploads.keys()).filter((id) => !ids.has(id)).forEach((id) => this.abort(id));
  }

  render(placeholder: Placeholder): HTMLElement {
    const doc = this.view.dom.ownerDocument;

    if (placeholder.kind === 'error') {
      return renderUploadError(doc, placeholder.message ?? '');
    }

    const upload = this.uploads.get(placeholder.id);
    const element = renderUploadPlaceholder(doc, {
      label: this.t('uploadingImage'),
      cancelLabel: this.t('cancelUpload'),
      preview: upload?.preview ?? null,
      onCancel: () => this.cancel(placeholder.id),
    });

    if (upload) {
      upload.element = element;
      setUploadProgress(element, upload.progress);
    }

    return element;
  }

  destroy(): void {
    Array.from(this.uploads.keys()).forEach((id) => {
      this.abort(id);
      this.release(id);
    });
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
  }
}

const uploaders = new WeakMap<EditorView, ImageUploader>();

const getUploader = (view: EditorView): ImageUploader | null => {
  const existing = uploaders.get(view);
  if (existing) {
    return existing;
  }

  const options = getOptions(view.state);
  if (!options) {
    return null;
  }

  const uploader = new ImageUploader(view, options);
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

const mapPlaceholders = (placeholders: Placeholder[], tr: Transaction, done?: Placeholder): Placeholder[] => {
  return placeholders.flatMap((placeholder) => {
    // a replace placeholder stays with the image after it; an upload stays before text typed at its position
    const after = placeholder.kind === 'replace'
      || (done && placeholder.batch === done.batch && placeholder.order > done.order && placeholder.pos === done.pos);
    const result = tr.mapping.mapResult(placeholder.pos, after ? 1 : -1);
    const deleted = placeholder.kind === 'replace' ? result.deletedAfter : result.deletedAcross;

    return deleted ? [] : [{ ...placeholder, pos: result.pos }];
  });
};

// drops pasted data urls above `maxSize` and reports the ones above `base64WarnSize`
const checkPastedDataUrls = (fragment: Fragment, uploader: ImageUploader): Fragment => {
  const { maxSize, base64WarnSize } = uploader.config;
  const children: ProseMirrorNode[] = [];

  fragment.forEach((child) => {
    const src: unknown = isImageNode(child) ? child.attrs['src'] : null;

    if (typeof src === 'string' && src.startsWith('data:')) {
      const size = dataUrlSize(src);

      if (maxSize !== null && size > maxSize) {
        uploader.fail({ pos: null, code: 'tooLarge' });
        return;
      }

      if (size > base64WarnSize) {
        uploader.warn(size);
      }
    }

    children.push(child.isLeaf ? child : child.copy(checkPastedDataUrls(child.content, uploader)));
  });

  return Fragment.fromArray(children);
};

const imageFiles = (list: FileList | File[] | null | undefined): File[] => {
  return Array.from(list ?? []).filter((file) => file.type.startsWith('image/'));
};

/**
 * Uploads (or embeds) image files through the pipeline of the `imageUpload` plugin: a placeholder with a progress bar
 * at `target.pos`, replaced by the image when the upload succeeds; with `replace`, the `src` of the image at `pos` is
 * replaced. Resolves when every file is done. Without the plugin nothing happens.
 */
export const uploadImageFiles = (view: EditorView, files: File[] | FileList, target?: ImageUploadTarget): Promise<void> => {
  const uploader = getUploader(view);
  if (!uploader) {
    return Promise.resolve();
  }

  return uploader.upload(Array.from(files), target ?? { pos: view.state.selection.from });
};

/** the resolved image config of the editor of `state`, `null` without the `imageUpload` plugin */
export const getImageUploadConfig = (state: EditorState): NgxEditorResolvedImageConfig | null => {
  return getOptions(state)?.getConfig() ?? null;
};

/** cancels an upload started by `uploadImageFiles`, paste or drop */
export const cancelImageUpload = (view: EditorView, id: string): void => {
  getUploader(view)?.cancel(id);
};

/** the ids and positions of the upload placeholders in the document */
export const getImageUploadPlaceholders = (state: EditorState): { id: string; pos: number; kind: string }[] => {
  return (imageUploadKey.getState(state)?.placeholders ?? []).map(({ id, pos, kind }) => ({ id, pos, kind }));
};

const applyMeta = (value: UploadState, tr: Transaction, state: EditorState): UploadState => {
  const meta = tr.getMeta(imageUploadKey) as UploadMeta | undefined;

  if (!tr.docChanged && !meta) {
    return value;
  }

  let placeholders = tr.docChanged ? mapPlaceholders(value.placeholders, tr, meta?.done) : value.placeholders;

  if (meta?.remove?.length) {
    placeholders = placeholders.filter((placeholder) => !meta.remove?.includes(placeholder.id));
  }

  if (meta?.add?.length) {
    placeholders = [...placeholders, ...meta.add];
  }

  return { placeholders, decorations: buildDecorations(state, placeholders) };
};

/**
 * Paste and drop of image files go through `uploadImageFiles`. Pasted HTML is pasted as HTML (its `<img>` follow the
 * url rules of the schema); pasted data urls larger than `maxSize` are dropped, larger than `base64WarnSize` reported.
 */
export const imageUpload = (options: ImageUploadOptions): Plugin<UploadState> => {
  return new Plugin<UploadState>({
    key: imageUploadKey,
    uploadOptions: options,
    state: {
      init: () => ({ placeholders: [], decorations: DecorationSet.empty }),
      apply: (tr, value, _oldState, newState) => applyMeta(value, tr, newState),
    },
    props: {
      decorations(state) {
        return imageUploadKey.getState(state)?.decorations ?? DecorationSet.empty;
      },
      handlePaste(view, event) {
        const files = imageFiles(event?.clipboardData?.files);

        // html with an image (copied from a page or Word) is pasted as html
        if (files.length === 0 || event?.clipboardData?.getData('text/html')) {
          return false;
        }

        if (!view.state.selection.empty) {
          view.dispatch(view.state.tr.deleteSelection());
        }

        uploadImageFiles(view, files, { pos: view.state.selection.from });
        return true;
      },
      handleDrop(view, event, _slice, moved) {
        const files = imageFiles(event?.dataTransfer?.files);

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
        uploadImageFiles(view, files, { pos });
        return true;
      },
      transformPasted(slice, view) {
        const uploader = getUploader(view);
        return uploader ? new Slice(checkPastedDataUrls(slice.content, uploader), slice.openStart, slice.openEnd) : slice;
      },
    },
    view(editorView) {
      return {
        update(view) {
          uploaders.get(view)?.sync(imageUploadKey.getState(view.state)?.placeholders ?? []);
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

export default imageUpload;

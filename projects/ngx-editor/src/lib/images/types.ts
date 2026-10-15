/** what the upload handler gets with each file */
export interface NgxEditorUploadContext {
  kind: 'image';
  /** reports the progress of the upload, 0 – 100; the placeholder shows it */
  onProgress: (percent: number) => void;
  /** aborted when the placeholder is removed from the document, the upload is cancelled or the editor destroyed */
  signal?: AbortSignal;
}

/** the url of the uploaded file, or the url with attributes of the image */
export type NgxEditorUploadResult = string | { src: string; alt?: string | null; width?: string | null };

export type NgxEditorImageUploadHandler = (file: File, ctx: NgxEditorUploadContext) => Promise<NgxEditorUploadResult>;

/** downscales images in the browser before they are uploaded or embedded (not GIF or SVG), keeping the aspect ratio */
export interface NgxEditorImageResizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  /** 0 – 1, for JPEG and WebP; default 0.9 */
  quality?: number;
  /** the type of the resized file, default the type of the file (PNG for types a canvas cannot write) */
  mimeType?: string;
}

export type NgxEditorImageErrorCode = 'tooLarge' | 'invalidType' | 'uploadFailed' | 'invalidResult' | 'readFailed';

export interface NgxEditorImageError {
  code: NgxEditorImageErrorCode;
  /** the localized message, as shown in the editor */
  message: string;
  file?: File;
  /** the rejection of the upload handler, or the error that caused this one */
  cause?: unknown;
}

export type NgxEditorImageWarningCode = 'base64Size';

export interface NgxEditorImageWarning {
  code: NgxEditorImageWarningCode;
  /** the localized message */
  message: string;
  /** the size of the embedded data, in bytes */
  size: number;
  file?: File;
}

export interface NgxEditorImageConfig {
  /** uploads a file and resolves to its url; without one, images are embedded as data urls */
  uploadHandler?: NgxEditorImageUploadHandler;
  /** the largest file in bytes (after resizing); no limit by default */
  maxSize?: number;
  /** mime types (`image/png`, `image/*`) or extensions (`.png`); default the common raster types */
  accept?: string | string[];
  resize?: NgxEditorImageResizeOptions;
  /** embedding a file larger than this (bytes) reports a warning; default 500 KB */
  base64WarnSize?: number;
  onError?: (error: NgxEditorImageError) => void;
  onWarning?: (warning: NgxEditorImageWarning) => void;
}

/** the image configuration with the defaults applied */
export interface NgxEditorResolvedImageConfig {
  uploadHandler: NgxEditorImageUploadHandler | null;
  maxSize: number | null;
  accept: string[];
  resize: NgxEditorImageResizeOptions | null;
  base64WarnSize: number;
  onError: ((error: NgxEditorImageError) => void) | null;
  onWarning: ((warning: NgxEditorImageWarning) => void) | null;
}

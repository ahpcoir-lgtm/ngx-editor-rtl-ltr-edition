import type { NgxEditorImageError, NgxEditorImageWarning } from './images/types';

/** the events of `editor.events` */
export type NgxEditorEvent =
  | { type: 'imageUploadStart'; id: string; file: File }
  | { type: 'imageUploadProgress'; id: string; file: File; percent: number }
  /** `embedded` when the image was written as a data url (no upload handler) */
  | { type: 'imageUploaded'; id: string; file: File; src: string; embedded: boolean }
  | { type: 'imageUploadCancelled'; id: string; file: File }
  | { type: 'imageUploadError'; id?: string; file?: File; error: NgxEditorImageError }
  | { type: 'imageUploadWarning'; id?: string; file?: File; warning: NgxEditorImageWarning };

export type NgxEditorEventType = NgxEditorEvent['type'];

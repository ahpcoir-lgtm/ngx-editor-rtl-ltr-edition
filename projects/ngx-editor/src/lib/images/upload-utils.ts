import type { NgxEditorImageErrorCode } from './types';

/** a failed step of an upload, with the code of the error reported for it */
export class ImageUploadFailure extends Error {
  constructor(readonly code: NgxEditorImageErrorCode, readonly reason?: unknown) {
    super(code);
  }
}

/** replaces `{name}` in a localized string */
export const formatMessage = (template: string, values: Record<string, string>): string => {
  return template.replace(/\{(?<name>\w+)\}/g, (match: string, name: string) => values[name] ?? match);
};

export const readAsDataUrl = (file: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new ImageUploadFailure('readFailed', reader.error));
    reader.readAsDataURL(file);
  });
};

/** the size of the data of a base64 data url, in bytes */
export const dataUrlSize = (src: string): number => {
  const data = src.slice(src.indexOf(',') + 1);
  const padding = data.endsWith('==') ? 2 : Number(data.endsWith('='));
  return Math.floor((data.length * 3) / 4) - padding;
};

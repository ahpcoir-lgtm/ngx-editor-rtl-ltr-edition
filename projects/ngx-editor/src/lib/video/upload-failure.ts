import type { NgxEditorVideoErrorCode } from './types';

/** a failed step of a video upload, with the code of the error reported for it */
export class VideoUploadFailure extends Error {
  constructor(readonly code: NgxEditorVideoErrorCode, readonly reason?: unknown) {
    super(code);
  }
}

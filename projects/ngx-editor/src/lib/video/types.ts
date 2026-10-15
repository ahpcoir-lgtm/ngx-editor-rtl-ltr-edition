import type { NgxEditorUploadContext } from '../images/types';

/** the url of the uploaded video, or the url with a poster image */
export type NgxEditorVideoUploadResult = string | { src: string; poster?: string | null };

/** like the image upload handler; `ctx.kind` is `'video'` */
export type NgxEditorVideoUploadHandler = (file: File, ctx: NgxEditorUploadContext) => Promise<NgxEditorVideoUploadResult>;

export type NgxEditorVideoErrorCode = 'tooLarge' | 'invalidType' | 'uploadFailed' | 'invalidResult' | 'noHandler';

export interface NgxEditorVideoError {
  code: NgxEditorVideoErrorCode;
  /** the localized message, as shown in the editor */
  message: string;
  file?: File;
  /** the rejection of the upload handler */
  cause?: unknown;
}

export interface NgxEditorVideoConfig {
  /**
   * hosts videos may be embedded from: names (`www.example.com`) or `*.example.com` for subdomains; replaces the default
   * list (`DEFAULT_VIDEO_HOSTS`: YouTube, Vimeo, Aparat), so spread it to add a host
   */
  allowedHosts?: string[];
  /** embed YouTube videos from www.youtube-nocookie.com; default `true` */
  youtubeNoCookie?: boolean;
  /** uploads a video file and resolves to its url; without one, video files cannot be added (no data url fallback) */
  uploadHandler?: NgxEditorVideoUploadHandler;
  /** the largest file in bytes; no limit by default */
  maxSize?: number;
  /** mime types (`video/mp4`, `video/*`) or extensions (`.mp4`); default mp4, webm and ogg */
  accept?: string | string[];
  onError?: (error: NgxEditorVideoError) => void;
}

/** the video configuration with the defaults applied */
export interface NgxEditorResolvedVideoConfig {
  allowedHosts: string[];
  youtubeNoCookie: boolean;
  uploadHandler: NgxEditorVideoUploadHandler | null;
  maxSize: number | null;
  accept: string[];
  onError: ((error: NgxEditorVideoError) => void) | null;
}

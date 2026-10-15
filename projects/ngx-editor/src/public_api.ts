/*
 * Public API Surface of ngx-editor
 */

export * from './lib/editor.component';
export * from './lib/modules/menu/menu.component';
export * from './lib/modules/menu/floating-menu/floating-menu.component';
export * from './lib/editor.module';
export * from './lib/editor.service';
export { provideNgxEditorConfig } from './lib/provide-config';
// the resolved configuration, for apps that provide it with a factory (e.g. a locale that follows the app language)
export { NgxEditorServiceConfig } from './lib/editor-config.service';

export * from './lib/schema';
export * from './lib/validators';

export * from './lib/types';
export * from './lib/parsers';
export { default as Editor } from './lib/Editor';
export type { EditorOptions } from './lib/Editor';
export * from './lib/defaultPlugins';

// other exports for convenience
export { ImageViewComponent } from './lib/components/image-view/image-view.component';

// tables
export {
  setCellBackground, setCellsAttr, setTableAttr, cellAlign, cellVAlign, tableVariant, tableWidth, tableAlign,
} from './lib/commands/TableCommands';
export type { TableMenuCommand } from './lib/commands/TableCommands';
export type { TableInsertOptions } from './lib/commands/table';
export { tableColumnResizing, tableRtlNavigation } from './lib/plugins/table-rtl';

// fonts
export type {
  NgxEditorFont, NgxEditorFontCategory, NgxEditorFontFile, NgxEditorFontLoading, NgxEditorFontsConfig,
  NgxEditorResolvedFonts,
} from './lib/fonts/types';
export { NGX_EDITOR_FONTS, NGX_EDITOR_SYSTEM_FONTS, NGX_EDITOR_WEB_FONTS } from './lib/fonts/built-in';
export {
  DEFAULT_GOOGLE_FONTS_URL, DEFAULT_SELF_HOSTED_BASE_URL, findFont, getFontLabel, resolveFonts,
} from './lib/fonts/config';
export { NgxEditorFontLoader, buildFontFaceCss, buildGoogleFontsUrl, loadFonts } from './lib/fonts/loader';
export { fontFamilyPaste } from './lib/plugins/font-family';

// images
export type {
  NgxEditorImageConfig, NgxEditorImageError, NgxEditorImageErrorCode, NgxEditorImageResizeOptions,
  NgxEditorImageUploadHandler, NgxEditorImageWarning, NgxEditorImageWarningCode, NgxEditorResolvedImageConfig,
  NgxEditorUploadContext, NgxEditorUploadResult,
} from './lib/images/types';
export type { NgxEditorEvent, NgxEditorEventType } from './lib/events';
export {
  DEFAULT_BASE64_WARN_SIZE, DEFAULT_IMAGE_ACCEPT, formatFileSize, isAcceptedFile, resolveImageConfig,
} from './lib/images/config';
export { computeResizedSize, resizeImageFile } from './lib/images/resize';
export type { ImageResizeEnvironment } from './lib/images/resize';
export {
  cancelImageUpload, getImageUploadConfig, getImageUploadPlaceholders, imageUpload, imageUploadKey, uploadImageFiles,
} from './lib/plugins/image-upload';
export type { ImageUploadOptions, ImageUploadTarget } from './lib/plugins/image-upload';
export {
  deleteImage, figureToImage, getImageAlignValue, getImageLink, getImageTarget, imageToFigure, setImageAlign,
  setImageAttrs, setImageCaption, setImageLink,
} from './lib/commands/ImageCommands';
export type { ImageTarget } from './lib/commands/ImageCommands';
export type { ImageAttrs } from './lib/commands/Image';
export { computeResizeWidth } from './lib/components/image-view/image-view.component';
export type { ImageViewAction, ResizeDrag } from './lib/components/image-view/image-view.component';

// videos
export type {
  NgxEditorResolvedVideoConfig, NgxEditorVideoConfig, NgxEditorVideoError, NgxEditorVideoErrorCode,
  NgxEditorVideoUploadHandler, NgxEditorVideoUploadResult,
} from './lib/video/types';
export {
  DEFAULT_VIDEO_ACCEPT, getVideoUrlError, normalizeConfiguredVideoUrl, resolveVideoConfig,
} from './lib/video/config';
export {
  cancelVideoUpload, getVideoUploadPlaceholders, uploadVideoFiles, videoUpload, videoUploadKey,
} from './lib/plugins/video-upload';
export type { VideoUploadOptions, VideoUploadTarget } from './lib/plugins/video-upload';
export { createVideoClipboardParser, getVideoConfig, videoEmbed, videoEmbedKey } from './lib/plugins/video-embed';
export type { VideoEmbedOptions } from './lib/plugins/video-embed';
export {
  deleteVideo, getVideoTarget, insertVideo, insertVideoUrl, isVideoSelected, setVideoAlign, setVideoAttrs,
  setVideoCaption, setVideoUrl, setVideoWidth,
} from './lib/commands/VideoCommands';
export type { VideoInsertAttrs, VideoTarget } from './lib/commands/VideoCommands';
export { VideoViewComponent, VIDEO_WIDTH_PRESETS, toWidthPercent } from './lib/components/video-view/video-view.component';
export type { VideoViewAction } from './lib/components/video-view/video-view.component';
export { default as videoView } from './lib/plugins/video-view';

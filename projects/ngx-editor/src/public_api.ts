/*
 * Public API Surface of ngx-editor
 */

export * from './lib/editor.component';
export * from './lib/modules/menu/menu.component';
export * from './lib/modules/menu/floating-menu/floating-menu.component';
export * from './lib/editor.module';
export * from './lib/editor.service';
export { provideNgxEditorConfig } from './lib/provide-config';

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

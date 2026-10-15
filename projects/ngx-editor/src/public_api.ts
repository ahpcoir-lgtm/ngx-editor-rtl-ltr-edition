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

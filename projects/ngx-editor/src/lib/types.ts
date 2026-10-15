/* eslint-disable @typescript-eslint/consistent-type-definitions */
import { IconsKeys } from './icons';
import { LocalsKeys } from './Locals';
import { Observable } from 'rxjs';
import { LinkOptions } from './modules/menu/link/link.component';

export type TBHeadingItems = 'paragraph' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
export type TBTableItems='addColumnBefore'
| 'addColumnAfter'
| 'deleteColumn'
| 'addRowBefore'
| 'addRowAfter'
| 'deleteRow'
| 'deleteTable'
| 'mergeCells'
| 'splitCell'
| 'toggleHeaderRow'
| 'toggleHeaderColumn'
| 'toggleHeaderCell'
| 'setCellBackgroundGreen'
| 'clearCellBackground';
export type TBItems = 'bold'
| 'italic'
| 'code'
| 'blockquote'
| 'underline'
| 'strike'
| 'ordered_list'
| 'bullet_list'
| 'task_list'
| 'link'
| 'image'
| 'table'
| 'text_color'
| 'background_color'
| 'align_left'
| 'align_center'
| 'align_right'
| 'align_justify'
| 'align_start'
| 'align_end'
| 'dir_ltr'
| 'dir_rtl'
| 'dir_auto'
| 'horizontal_rule'
| 'format_clear'
| 'indent'
| 'outdent'
| 'superscript'
| 'subscript'
| 'undo'
| 'redo';

export type ToolbarDropdown = { heading?: TBHeadingItems[]; table?: TBTableItems[] };
export type ToolbarLinkOptions = Partial<LinkOptions>;
export type ToolbarLink = { link: ToolbarLinkOptions };
export type ToolbarDropdownGroupKeys = keyof ToolbarDropdown;
export type ToolbarDropdownGroupValues = ToolbarDropdown[ToolbarDropdownGroupKeys];
export type ToolbarItem = TBItems | ToolbarDropdown | ToolbarLink;
export type Toolbar = ToolbarItem[][];

export type NgxEditorDirection = 'ltr' | 'rtl' | 'auto';

export interface NgxEditorConfig {
  /** overrides single strings of the locale */
  locals?: Partial<Record<LocalsKeys, string | Observable<string>>>;
  icons?: Partial<Record<IconsKeys, string>>;
  /** `en`, `fa`, `ar` or the code of a registered locale; `fa-IR` falls back to `fa` */
  locale?: string;
  /** direction of the editor and its menus, the locale's direction when not set */
  dir?: NgxEditorDirection;
}

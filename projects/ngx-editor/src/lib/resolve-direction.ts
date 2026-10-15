import type Editor from './Editor';
import type { NgxEditorService } from './editor.service';
import type { NgxEditorDirection } from './types';

/**
 * Transform of the `[dir]` inputs. They accept any string, like the native `dir` property they replace:
 * `ltr`, `rtl` and `auto` (in any case) are directions, `null` means "write no `dir`", and `undefined` or
 * any other string means "not set".
 */
export const normalizeDirection = (value: string | null | undefined): NgxEditorDirection | null | undefined => {
  if (value === null) {
    return null;
  }

  const dir = typeof value === 'string' ? value.trim().toLowerCase() : undefined;
  return dir === 'ltr' || dir === 'rtl' || dir === 'auto' ? dir : undefined;
};

/**
 * The direction of the editor surface or a menu: the `[dir]` input of the component, else the `dir` option
 * of the editor, else the global `dir`, else the direction of the configured locale.
 * An input bound to `null` and the end of the chain write no `dir` attribute, so the direction is inherited
 * from the page; an `undefined` input is "not set".
 */
export const resolveDirection = (
  input: NgxEditorDirection | null | undefined,
  editor: Editor | null | undefined,
  service: NgxEditorService,
): NgxEditorDirection | null => {
  if (input !== undefined) {
    return input;
  }

  return editor?.config.dir ?? service.dir ?? null;
};

export default resolveDirection;

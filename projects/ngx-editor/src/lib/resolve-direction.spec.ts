import Editor from './Editor';
import type { NgxEditorService } from './editor.service';
import { normalizeDirection, resolveDirection } from './resolve-direction';

describe('resolveDirection', () => {
  // the direction of a configured Persian locale
  const service = { dir: 'rtl' } as NgxEditorService;
  let editor: Editor;

  afterEach(() => {
    editor?.destroy();
  });

  it('should take the input, also when it is null', () => {
    editor = new Editor({ dir: 'ltr' });

    expect(resolveDirection('auto', editor, service)).toBe('auto');
    expect(resolveDirection(null, editor, service)).toBeNull();
  });

  it('should fall back to the editor option, then the global config and the locale for undefined', () => {
    editor = new Editor({ dir: 'ltr' });
    expect(resolveDirection(undefined, editor, service)).toBe('ltr');
    expect(resolveDirection(undefined, null, service)).toBe('rtl');
    expect(resolveDirection(undefined, null, { dir: null } as NgxEditorService)).toBeNull();
  });
});

describe('normalizeDirection', () => {
  it('should accept the directions in any case', () => {
    expect(normalizeDirection('rtl')).toBe('rtl');
    expect(normalizeDirection(' LTR ')).toBe('ltr');
    expect(normalizeDirection('Auto')).toBe('auto');
  });

  it('should keep null and treat other values as not set', () => {
    expect(normalizeDirection(null)).toBeNull();
    expect(normalizeDirection(undefined)).toBeUndefined();
    expect(normalizeDirection('')).toBeUndefined();
    expect(normalizeDirection('sideways')).toBeUndefined();
  });
});

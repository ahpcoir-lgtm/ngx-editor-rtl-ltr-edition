import { getPrimaryFontFamily, normalizeFontFamily, parseFontFamily } from './fontFamily';

describe('font-family values', () => {
  it('should split a stack and remove the quotes', () => {
    expect(parseFontFamily('"Noto Sans Arabic", \'Times New Roman\' ,serif')).toEqual([
      'Noto Sans Arabic', 'Times New Roman', 'serif',
    ]);
    expect(parseFontFamily('"a, b", c')).toEqual(['a, b', 'c']);
    expect(parseFontFamily('')).toEqual([]);
    expect(parseFontFamily(null)).toEqual([]);
  });

  it('should quote names that are not one identifier and keep generic families unquoted', () => {
    expect(normalizeFontFamily('"Vazirmatn", SANS-SERIF')).toBe('Vazirmatn, sans-serif');
    expect(normalizeFontFamily('Times   New Roman, serif')).toBe('\'Times New Roman\', serif');
    expect(normalizeFontFamily('"Noto Sans Arabic"')).toBe('\'Noto Sans Arabic\'');
  });

  it('should drop names that could leave the declaration', () => {
    expect(normalizeFontFamily('Arial; background: url(x)')).toBeNull();
    expect(normalizeFontFamily('Arial, x;color:red, serif')).toBe('Arial, serif');
    expect(normalizeFontFamily('"a\'b", serif')).toBe('serif');
    expect(normalizeFontFamily('expression(alert(1))')).toBeNull();
  });

  it('should not keep CSS-wide keywords', () => {
    expect(normalizeFontFamily('inherit')).toBeNull();
    expect(normalizeFontFamily('initial, Tahoma')).toBe('Tahoma');
    expect(getPrimaryFontFamily('inherit, Tahoma')).toBe('tahoma');
  });

  it('should compare stacks by their first family', () => {
    expect(getPrimaryFontFamily('"Vazirmatn", Tahoma, sans-serif')).toBe('vazirmatn');
    expect(getPrimaryFontFamily('\'Noto Naskh Arabic\', serif')).toBe('noto naskh arabic');
    expect(getPrimaryFontFamily('')).toBeNull();
  });
});

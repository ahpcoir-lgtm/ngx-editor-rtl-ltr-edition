const GENERIC_FAMILIES = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif',
  'ui-monospace', 'ui-rounded', 'math', 'emoji', 'fangsong',
]);

// characters that could end the declaration or start a function such as url(), and control characters
const UNSAFE_CHARACTERS = /[;:{}()<>\\[\]@!*/=`]/u;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/u;

const isUnsafe = (name: string): boolean => UNSAFE_CHARACTERS.test(name) || CONTROL_CHARACTERS.test(name);

const splitFamilies = (value: string): string[] => {
  const names: string[] = [];
  let current = '';
  let quote: string | null = null;

  for (const char of value) {
    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
    } else if (char === '"' || char === '\'') {
      quote = char;
    } else if (char === ',') {
      names.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  names.push(current);
  return names.map((name) => name.trim().replace(/\s+/g, ' ')).filter(Boolean);
};

const isIdentifier = (name: string): boolean => /^-?[a-z_][\w-]*$/iu.test(name);

// CSS-wide keywords are not family names (`font-family: inherit`)
const KEYWORDS = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer', 'default']);

/**
 * The family names of a CSS `font-family` value, without quotes; names that could break out of the declaration
 * are dropped. `'"Noto Sans Arabic", serif'` → `['Noto Sans Arabic', 'serif']`.
 */
export const parseFontFamily = (value: string | null | undefined): string[] => {
  if (!value) {
    return [];
  }

  return splitFamilies(value).filter((name) => !isUnsafe(name) &&!name.includes('"') && !name.includes('\''));
};

/**
 * A `font-family` value that is safe in a style attribute: names with anything but letters, digits and hyphens in
 * single quotes, generic families unquoted. `null` when no valid name is left.
 */
export const normalizeFontFamily = (value: string | null | undefined): string | null => {
  const names = parseFontFamily(value).filter((name) => !KEYWORDS.has(name.toLowerCase())).map((name) => {
    const lower = name.toLowerCase();

    if (GENERIC_FAMILIES.has(lower)) {
      return lower;
    }

    // a single word is written as it is, `Times New Roman` in quotes
    return isIdentifier(name) ? name : `'${name}'`;
  });

  return names.length ? names.join(', ') : null;
};

/** the first family of a `font-family` value, lowercased, to compare stacks: `'Vazirmatn', Tahoma` → `vazirmatn` */
export const getPrimaryFontFamily = (value: string | null | undefined): string | null => {
  const primary = parseFontFamily(value).find((name) => !KEYWORDS.has(name.toLowerCase()));
  return primary ? primary.toLowerCase() : null;
};

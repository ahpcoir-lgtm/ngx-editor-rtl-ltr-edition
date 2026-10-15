import { sanitizeUrl } from './sanitizeUrl';

const SCRIPT_URL = `${'javascript'}:alert(1)`;

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('sanitizeUrl', () => {
  const cases: [string, unknown, 'link' | 'image', string | null][] = [
    // allowed everywhere
    ['https', 'https://example.com/a.png', 'image', 'https://example.com/a.png'],
    ['http', 'http://example.com', 'link', 'http://example.com'],
    ['upper case scheme', 'HTTPS://example.com', 'link', 'HTTPS://example.com'],
    ['protocol-relative', '//cdn.example.com/a.png', 'image', '//cdn.example.com/a.png'],
    ['absolute path', '/assets/a.png', 'image', '/assets/a.png'],
    ['relative path', 'images/a.png', 'image', 'images/a.png'],
    ['dot path', './a:b.png', 'image', './a:b.png'],
    ['domain without scheme', 'example.com/page', 'link', 'example.com/page'],
    ['hash', '#section', 'link', '#section'],
    ['query', '?a=1', 'link', '?a=1'],
    ['persian path with zwnj', 'https://example.com/نیم‌فاصله', 'link', 'https://example.com/نیم‌فاصله'],
    // links only
    ['mailto link', 'mailto:a@example.com', 'link', 'mailto:a@example.com'],
    ['tel link', 'tel:+98 21 1234', 'link', 'tel:+98 21 1234'],
    ['mailto image', 'mailto:a@example.com', 'image', null],
    ['tel image', 'tel:123', 'image', null],
    // images only
    ['blob image', 'blob:https://example.com/0c5d', 'image', 'blob:https://example.com/0c5d'],
    ['blob link', 'blob:https://example.com/0c5d', 'link', null],
    ['png data image', PNG, 'image', PNG],
    ['jpeg data image', 'data:image/jpeg;base64,/9j/4AAQ', 'image', 'data:image/jpeg;base64,/9j/4AAQ'],
    ['gif data image', 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', 'image', 'data:image/gif;base64,R0lGODlhAQABAAAAACw='],
    ['webp data image', 'data:image/webp;base64,UklGR', 'image', 'data:image/webp;base64,UklGR'],
    ['avif data image', 'data:image/avif;base64,AAAA', 'image', 'data:image/avif;base64,AAAA'],
    ['bmp data image', 'data:image/bmp;base64,Qk0=', 'image', 'data:image/bmp;base64,Qk0='],
    ['data image as link', PNG, 'link', null],
    // rejected
    ['javascript', SCRIPT_URL, 'link', null],
    ['javascript image', SCRIPT_URL, 'image', null],
    ['javascript mixed case', `${'JaVa'}ScRiPt:alert(1)`, 'link', null],
    ['javascript with spaces', '  javascript:alert(1)  ', 'link', null],
    ['javascript with a tab', 'java\tscript:alert(1)', 'link', null],
    ['javascript with a newline', 'java\nscript:alert(1)', 'link', null],
    ['javascript with a null char', '\u0000javascript:alert(1)', 'link', null],
    ['vbscript', 'vbscript:msgbox(1)', 'link', null],
    ['data text html', 'data:text/html;base64,PHNjcmlwdD4=', 'image', null],
    ['data text plain', 'data:text/plain,hello', 'link', null],
    ['data svg', 'data:image/svg+xml;base64,PHN2Zz4=', 'image', null],
    ['data image without base64', 'data:image/png,abc', 'image', null],
    ['data image with markup', 'data:image/png;base64,"><script>', 'image', null],
    ['file scheme', 'file:///etc/passwd', 'image', null],
    ['unknown scheme', 'foo:bar', 'link', null],
    ['ftp', 'ftp://example.com', 'link', null],
    ['bidi override', 'https://example.com/‮gnp.exe', 'link', null],
    ['C1 control', 'https://example.com/\u0085', 'link', null],
    ['empty', '', 'link', null],
    ['blank', '   ', 'image', null],
    ['null', null, 'link', null],
    ['number', 42, 'link', null],
  ];

  cases.forEach(([name, url, kind, expected]) => {
    it(`should handle ${name} (${kind})`, () => {
      expect(sanitizeUrl(url, kind)).toBe(expected);
    });
  });

  it('should trim the url and remove tabs and newlines', () => {
    expect(sanitizeUrl('  https://exa\nmple.com/a\t.png ')).toBe('https://example.com/a.png');
  });

  it('should treat urls as links by default', () => {
    expect(sanitizeUrl('mailto:a@example.com')).toBe('mailto:a@example.com');
    expect(sanitizeUrl(PNG)).toBeNull();
  });
});

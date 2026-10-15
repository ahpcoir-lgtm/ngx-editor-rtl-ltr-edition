import {
  DEFAULT_VIDEO_HOSTS, extractVideoUrl, getVideoProvider, isVideoEmbedAllowed, isVideoHostAllowed, normalizeVideoUrl,
  parseVideoStart,
} from './videoUrl';

const SCRIPT_URL = `${'javascript'}:alert(1)`;
const ID = 'dQw4w9WgXcQ';
const NOCOOKIE = `https://www.youtube-nocookie.com/embed/${ID}`;

describe('normalizeVideoUrl', () => {
  const cases: [string, string, string | null, string | null][] = [
    // YouTube
    ['watch', `https://www.youtube.com/watch?v=${ID}`, 'youtube', NOCOOKIE],
    ['watch with more parameters', `https://www.youtube.com/watch?feature=share&v=${ID}&list=PL1`, 'youtube', NOCOOKIE],
    ['watch without www', `https://youtube.com/watch?v=${ID}`, 'youtube', NOCOOKIE],
    ['mobile', `https://m.youtube.com/watch?v=${ID}`, 'youtube', NOCOOKIE],
    ['youtu.be', `https://youtu.be/${ID}`, 'youtube', NOCOOKIE],
    ['youtu.be with si', `https://youtu.be/${ID}?si=abc`, 'youtube', NOCOOKIE],
    ['shorts', `https://www.youtube.com/shorts/${ID}`, 'youtube', NOCOOKIE],
    ['embed', `https://www.youtube.com/embed/${ID}`, 'youtube', NOCOOKIE],
    ['live', `https://www.youtube.com/live/${ID}?feature=share`, 'youtube', NOCOOKIE],
    ['nocookie embed', NOCOOKIE, 'youtube', NOCOOKIE],
    ['without a scheme', `youtu.be/${ID}`, 'youtube', NOCOOKIE],
    ['protocol-relative', `//www.youtube.com/embed/${ID}`, 'youtube', NOCOOKIE],
    ['http', `http://www.youtube.com/watch?v=${ID}`, 'youtube', NOCOOKIE],
    ['t in seconds', `https://youtu.be/${ID}?t=90`, 'youtube', `${NOCOOKIE}?start=90`],
    ['t with units', `https://www.youtube.com/watch?v=${ID}&t=1m30s`, 'youtube', `${NOCOOKIE}?start=90`],
    ['t with hours', `https://www.youtube.com/watch?v=${ID}&t=1h2m3s`, 'youtube', `${NOCOOKIE}?start=3723`],
    ['start', `https://www.youtube.com/embed/${ID}?start=42`, 'youtube', `${NOCOOKIE}?start=42`],
    ['t in the hash', `https://www.youtube.com/watch?v=${ID}#t=15`, 'youtube', `${NOCOOKIE}?start=15`],
    ['zero start', `https://youtu.be/${ID}?t=0`, 'youtube', NOCOOKIE],
    ['invalid start', `https://youtu.be/${ID}?t=abc`, 'youtube', NOCOOKIE],
    ['short id', 'https://www.youtube.com/watch?v=abc', null, null],
    ['channel page', 'https://www.youtube.com/@channel', null, null],
    ['upper case host', `https://WWW.YOUTUBE.COM/watch?v=${ID}`, 'youtube', NOCOOKIE],
    // Vimeo
    ['vimeo', 'https://vimeo.com/76979871', 'vimeo', 'https://player.vimeo.com/video/76979871'],
    ['vimeo with hash', 'https://vimeo.com/76979871/8a2b3c4d5e', 'vimeo', 'https://player.vimeo.com/video/76979871?h=8a2b3c4d5e'],
    ['vimeo player', 'https://player.vimeo.com/video/76979871?h=8a2b3c4d5e&badge=0', 'vimeo', 'https://player.vimeo.com/video/76979871?h=8a2b3c4d5e'],
    ['vimeo start', 'https://vimeo.com/76979871#t=30s', 'vimeo', 'https://player.vimeo.com/video/76979871#t=30s'],
    ['vimeo http', 'http://vimeo.com/76979871', 'vimeo', 'https://player.vimeo.com/video/76979871'],
    ['vimeo page', 'https://vimeo.com/channels/staffpicks', null, null],
    // Aparat
    ['aparat', 'https://www.aparat.com/v/a1B2c', 'aparat', 'https://www.aparat.com/video/video/embed/videohash/a1B2c/vt/frame'],
    ['aparat without www', 'https://aparat.com/v/a1B2c/', 'aparat', 'https://www.aparat.com/video/video/embed/videohash/a1B2c/vt/frame'],
    [
      'aparat embed',
      'https://www.aparat.com/video/video/embed/videohash/a1B2c/vt/frame',
      'aparat',
      'https://www.aparat.com/video/video/embed/videohash/a1B2c/vt/frame',
    ],
    ['aparat embed path', 'https://www.aparat.com/embed/ytf50k5', 'aparat', 'https://www.aparat.com/video/video/embed/videohash/ytf50k5/vt/frame'],
    ['aparat page', 'https://www.aparat.com/about', null, null],
    // rejected
    ['other host', 'https://evil.example.com/embed/1', null, null],
    ['javascript', SCRIPT_URL, null, null],
    ['javascript in a youtube path', `${SCRIPT_URL}//www.youtube.com/embed/${ID}`, null, null],
    ['data', 'data:text/html;base64,PHNjcmlwdD4=', null, null],
    ['credentials', `https://user:pass@www.youtube.com/embed/${ID}`, null, null],
    ['look-alike host', `https://www.youtube.com.evil.example/embed/${ID}`, null, null],
    ['relative path', '/videos/a.mp4', null, null],
    ['empty', '', null, null],
  ];

  cases.forEach(([name, url, provider, src]) => {
    it(`should handle ${name}`, () => {
      const embed = normalizeVideoUrl(url);
      expect(embed?.provider ?? null).toBe(provider);
      expect(embed?.src ?? null).toBe(src);
    });
  });

  it('should give the id and the start time', () => {
    expect(normalizeVideoUrl(`https://youtu.be/${ID}?t=1m`)).toEqual({ provider: 'youtube', src: `${NOCOOKIE}?start=60`, id: ID, start: 60 });
  });

  it('should use www.youtube.com without youtubeNoCookie or when the nocookie host is not allowed', () => {
    expect(normalizeVideoUrl(`https://youtu.be/${ID}`, { youtubeNoCookie: false })?.src).toBe(`https://www.youtube.com/embed/${ID}`);
    expect(normalizeVideoUrl(NOCOOKIE, { youtubeNoCookie: false })?.src).toBe(`https://www.youtube.com/embed/${ID}`);
    expect(normalizeVideoUrl(`https://youtu.be/${ID}`, { allowedHosts: ['youtu.be', 'www.youtube.com'] })?.src)
      .toBe(`https://www.youtube.com/embed/${ID}`);
  });

  it('should need the host of the link and of the player in the list', () => {
    expect(normalizeVideoUrl(`https://youtu.be/${ID}`, { allowedHosts: ['www.youtube.com'] })).toBeNull();
    expect(normalizeVideoUrl(`https://youtu.be/${ID}`, { allowedHosts: ['youtu.be'] })).toBeNull();
    expect(normalizeVideoUrl('https://vimeo.com/1', { allowedHosts: ['vimeo.com'] })).toBeNull();
    expect(normalizeVideoUrl('https://www.aparat.com/v/abc', { allowedHosts: ['vimeo.com', 'player.vimeo.com'] })).toBeNull();
  });

  it('should keep https urls of other allowed hosts as they are and refuse them over http', () => {
    const allowedHosts = [...DEFAULT_VIDEO_HOSTS, 'video.example.com', '*.cdn.example.org'];

    expect(normalizeVideoUrl('https://video.example.com/embed/7?autoplay=0', { allowedHosts }))
      .toEqual({ provider: 'custom', src: 'https://video.example.com/embed/7?autoplay=0', id: null, start: null });
    expect(normalizeVideoUrl('https://a.cdn.example.org/player/1', { allowedHosts })?.provider).toBe('custom');
    expect(normalizeVideoUrl('https://cdn.example.org/player/1', { allowedHosts })).toBeNull();
    expect(normalizeVideoUrl('http://video.example.com/embed/7', { allowedHosts })).toBeNull();
  });

  it('should read the url of pasted embed code', () => {
    const code = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${ID}?si=x&amp;start=5" title="YouTube"></iframe>`;
    expect(extractVideoUrl(code)).toBe(`https://www.youtube.com/embed/${ID}?si=x&start=5`);
    expect(normalizeVideoUrl(code)?.src).toBe(`${NOCOOKIE}?start=5`);
    expect(extractVideoUrl('  https://vimeo.com/1  ')).toBe('https://vimeo.com/1');
  });
});

describe('video url helpers', () => {
  it('should parse start times', () => {
    expect(parseVideoStart('90')).toBe(90);
    expect(parseVideoStart('90s')).toBe(90);
    expect(parseVideoStart('2m')).toBe(120);
    expect(parseVideoStart('1h1s')).toBe(3601);
    expect(parseVideoStart('')).toBeNull();
    expect(parseVideoStart('0')).toBeNull();
    expect(parseVideoStart('1.5')).toBeNull();
    expect(parseVideoStart(null)).toBeNull();
  });

  it('should match hosts exactly or as subdomains of a wildcard', () => {
    expect(isVideoHostAllowed('www.youtube.com')).toBe(true);
    expect(isVideoHostAllowed('WWW.YouTube.com.')).toBe(true);
    expect(isVideoHostAllowed('music.youtube.com')).toBe(false);
    expect(isVideoHostAllowed('a.b.example.com', ['*.example.com'])).toBe(true);
    expect(isVideoHostAllowed('example.com', ['*.example.com'])).toBe(false);
    expect(isVideoHostAllowed('evilexample.com', ['*.example.com'])).toBe(false);
    expect(isVideoHostAllowed('', ['*.example.com'])).toBe(false);
  });

  it('should tell the provider of a player url', () => {
    expect(getVideoProvider(NOCOOKIE)).toBe('youtube');
    expect(getVideoProvider('https://player.vimeo.com/video/1')).toBe('vimeo');
    expect(getVideoProvider('https://www.aparat.com/video/video/embed/videohash/a/vt/frame')).toBe('aparat');
    expect(getVideoProvider('https://video.example.com/1')).toBe('custom');
    expect(getVideoProvider('http://video.example.com/1')).toBeNull();
    expect(getVideoProvider(SCRIPT_URL)).toBeNull();
  });

  it('should allow stored player urls of allowed https hosts only', () => {
    expect(isVideoEmbedAllowed(`${NOCOOKIE}?start=5&rel=0`)).toBe(true);
    expect(isVideoEmbedAllowed('https://video.example.com/1')).toBe(false);
    expect(isVideoEmbedAllowed('https://video.example.com/1', ['video.example.com'])).toBe(true);
    expect(isVideoEmbedAllowed(`http://www.youtube.com/embed/${ID}`)).toBe(false);
    expect(isVideoEmbedAllowed(`https://a:b@www.youtube.com/embed/${ID}`)).toBe(false);
    expect(isVideoEmbedAllowed(SCRIPT_URL)).toBe(false);
    expect(isVideoEmbedAllowed(null)).toBe(false);
  });
});

import { Slice } from 'prosemirror-model';
import { NodeSelection, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

import Editor, { EditorOptions } from '../Editor';
import type { NgxEditorEvent } from '../events';
import type { NgxEditorUploadContext } from '../images/types';
import { toHTML } from '../parsers';
import type { NgxEditorVideoConfig } from '../video/types';
import { getVideoConfig } from './video-embed';
import { getVideoUploadPlaceholders, uploadVideoFiles, videoUploadKey } from './video-upload';

const SCRIPT_URL = `${'javascript'}:alert(1)`;
const ID = 'dQw4w9WgXcQ';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

const wait = (ms = 0): Promise<void> => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const mp4 = (size = 3, name = 'clip.mp4', type = 'video/mp4'): File => new File([new Uint8Array(size)], name, { type });

describe('videoUpload plugin', () => {
  let editor: Editor;
  let view: EditorView;
  let events: NgxEditorEvent[];

  const create = (video: NgxEditorVideoConfig = {}, content = '<p>abcd</p>', options: EditorOptions = {}): void => {
    editor?.destroy();
    editor = new Editor({ content, video, ...options });
    ({ view } = editor);
    events = [];
    editor.events.subscribe((event) => events.push(event));
  };

  const output = (): string => toHTML(view.state.doc.toJSON(), editor.schema);
  const types = (): string[] => events.map((event) => event.type);

  afterEach(() => {
    editor.destroy();
  });

  it('should upload through the handler with progress and insert a video file', async () => {
    const upload = deferred<string>();
    let handlerCtx: NgxEditorUploadContext | undefined;
    create({ uploadHandler: (_file, ctx) => {
      handlerCtx = ctx;
      return upload.promise;
    } });

    const done = uploadVideoFiles(view, [mp4()], { pos: 3, attrs: { caption: 'Clip', poster: '/p.jpg' } });
    await wait();

    expect(getVideoUploadPlaceholders(view.state)).toEqual([expect.objectContaining({ pos: 3, kind: 'upload' })]);
    const placeholder = view.dom.querySelector('.NgxEditor__ImageUpload');
    expect(placeholder?.getAttribute('aria-label')).toBe('Uploading video…');
    expect(handlerCtx?.kind).toBe('video');

    handlerCtx?.onProgress(60);
    expect(placeholder?.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('60');

    upload.resolve('https://cdn.example.com/clip.mp4');
    await done;

    expect(output()).toBe('<p>ab</p><figure data-type="video" data-kind="file"><div class="ngx-video__frame" style="aspect-ratio: 16 / 9;">'
      + '<video controls="" preload="metadata" src="https://cdn.example.com/clip.mp4" poster="/p.jpg"></video></div>'
      + '<figcaption>Clip</figcaption></figure><p>cd</p>');
    expect(getVideoUploadPlaceholders(view.state)).toEqual([]);
    expect(types()).toEqual(['videoUploadStart', 'videoUploadProgress', 'videoUploaded']);
  });

  it('should take the poster of an object result and refuse an unsafe url', async () => {
    create({ uploadHandler: () => Promise.resolve({ src: '/v.webm', poster: '/v.jpg' }) });
    await uploadVideoFiles(view, [mp4(3, 'a.webm', 'video/webm')], { pos: 1 });
    expect(output()).toContain('src="/v.webm" poster="/v.jpg"');

    create({ uploadHandler: () => Promise.resolve(SCRIPT_URL) });
    await uploadVideoFiles(view, [mp4()], { pos: 1 });
    expect(output()).toBe('<p>abcd</p>');
    expect(events.at(-1)).toEqual(expect.objectContaining({ type: 'videoUploadError', error: expect.objectContaining({ code: 'invalidResult' }) }));
  });

  it('should report a missing handler, a type that is not accepted and a file that is too large', async () => {
    const onError = vi.fn();
    create({ onError });
    await uploadVideoFiles(view, [mp4()], { pos: 1 });
    expect(onError).toHaveBeenLastCalledWith(expect.objectContaining({
      code: 'noHandler',
      message: 'Video upload is not available: no upload handler is configured.',
    }));
    expect(view.dom.querySelector('.NgxEditor__ImageUploadError')?.getAttribute('role')).toBe('alert');

    const handler = vi.fn(() => Promise.resolve('/x.mp4'));
    create({ uploadHandler: handler, maxSize: 2, onError });
    await uploadVideoFiles(view, [mp4(3, 'big.mp4')], { pos: 1 });
    expect(onError).toHaveBeenLastCalledWith(expect.objectContaining({ code: 'tooLarge', message: 'The video “big.mp4” is larger than 2 B.' }));

    await uploadVideoFiles(view, [mp4(1, 'a.mov', 'video/quicktime')], { pos: 1 });
    expect(onError).toHaveBeenLastCalledWith(expect.objectContaining({ code: 'invalidType' }));
    expect(handler).not.toHaveBeenCalled();
    expect(output()).toBe('<p>abcd</p>');
  });

  it('should not fall back to the image handler', async () => {
    const imageHandler = vi.fn(() => Promise.resolve('/x.png'));
    create({}, '<p>abcd</p>', { image: { uploadHandler: imageHandler } });
    await uploadVideoFiles(view, [mp4()], { pos: 1 });
    expect(imageHandler).not.toHaveBeenCalled();
    expect(types()).toEqual(['videoUploadError']);
  });

  it('should report a failed upload and abort when the placeholder is deleted', async () => {
    create({ uploadHandler: () => Promise.reject(new Error('offline')) });
    await uploadVideoFiles(view, [mp4()], { pos: 1 });
    expect(types()).toEqual(['videoUploadStart', 'videoUploadError']);
    expect(view.dom.querySelector('.NgxEditor__ImageUploadError')?.textContent).toBe('The video “clip.mp4” could not be uploaded.');

    let signal: AbortSignal | undefined;
    const upload = deferred<string>();
    create({ uploadHandler: (_file, ctx) => {
      ({ signal } = ctx);
      return upload.promise;
    } });

    const done = uploadVideoFiles(view, [mp4()], { pos: 3 });
    await wait();
    view.dispatch(view.state.tr.delete(1, 5));
    expect(signal?.aborted).toBe(true);

    upload.resolve('/late.mp4');
    await done;
    expect(output()).toBe('<p></p>');
    expect(types()).toContain('videoUploadCancelled');
  });

  it('should replace the file of a video and keep its caption', async () => {
    create({ uploadHandler: () => Promise.resolve('/new.mp4') }, '<p>a</p><figure data-type="video" data-kind="file">'
      + '<div class="ngx-video__frame"><video src="/old.mp4"></video></div><figcaption>Old</figcaption></figure>');

    await uploadVideoFiles(view, [mp4()], { pos: 3, replace: true });
    expect(output()).toContain('src="/new.mp4"');
    expect(output()).toContain('<figcaption>Old</figcaption>');
    expect(view.state.selection instanceof NodeSelection).toBe(true);
  });

  it('should upload pasted and dropped video files', async () => {
    create({ uploadHandler: (file) => Promise.resolve(`/${file.name}`) });
    const props = videoUploadKey.get(view.state)?.props;
    const handlePaste = props?.handlePaste as (view: EditorView, event: unknown) => boolean;
    const handleDrop = props?.handleDrop as (view: EditorView, event: unknown, slice: Slice, moved: boolean) => boolean;

    expect(handlePaste(view, { clipboardData: { files: [mp4()], getData: () => '<p>x</p>' } })).toBe(false);
    expect(handlePaste(view, { clipboardData: { files: [new File([''], 'a.png', { type: 'image/png' })], getData: () => '' } })).toBe(false);

    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 3)));
    expect(handlePaste(view, { clipboardData: { files: [mp4(3, 'pasted.mp4')], getData: () => '' } })).toBe(true);
    await wait();
    expect(output()).toContain('src="/pasted.mp4"');

    const event = { dataTransfer: { files: [mp4(3, 'dropped.mp4')] }, clientX: 0, clientY: 0, preventDefault: vi.fn() };
    expect(handleDrop(view, event, Slice.empty, true)).toBe(false);
    expect(handleDrop(view, event, Slice.empty, false)).toBe(true);
    await wait();
    expect(output()).toContain('src="/dropped.mp4"');
  });

  it('should not be registered with features.videoUpload false', () => {
    create({}, '<p>a</p>', { features: { videoUpload: false } });
    expect(videoUploadKey.get(view.state)).toBeUndefined();
    expect(getVideoConfig(view.state)?.accept).toEqual(['video/mp4', 'video/webm', 'video/ogg']);
  });
});

describe('videoEmbed plugin: pasted html', () => {
  let editor: Editor;

  const paste = (html: string, video: NgxEditorVideoConfig = {}): string => {
    editor = new Editor({ content: '<p></p>', video });
    editor.view.pasteHTML(html, { clipboardData: null } as unknown as ClipboardEvent);
    return toHTML(editor.view.state.doc.toJSON(), editor.schema);
  };

  afterEach(() => {
    editor.destroy();
  });

  it('should paste embed code of an allowed host as a video with the configured YouTube host', () => {
    const html = paste(`<iframe width="560" height="315" src="https://www.youtube.com/embed/${ID}?si=x&amp;start=7"></iframe>`);
    expect(html).toContain(`src="https://www.youtube-nocookie.com/embed/${ID}?start=7"`);

    const plain = paste(`<iframe src="https://www.youtube.com/embed/${ID}"></iframe>`, { youtubeNoCookie: false });
    expect(plain).toContain(`src="https://www.youtube.com/embed/${ID}"`);
  });

  it('should drop pasted iframes and video figures of hosts that are not allowed', () => {
    expect(paste('<p>a</p><iframe src="https://evil.example.com/embed/1"></iframe>')).toBe('<p>a</p>');

    const figure = '<figure data-type="video" data-kind="embed" data-provider="custom"><div class="ngx-video__frame">'
      + '<iframe src="https://evil.example.com/embed/1"></iframe></div><figcaption>bad</figcaption></figure>';
    expect(paste(`<p>a</p>${figure}`)).toBe('<p>a</p>');

    // a host removed from the list
    const vimeo = '<figure data-type="video" data-kind="embed" data-provider="vimeo"><div class="ngx-video__frame">'
      + '<iframe src="https://player.vimeo.com/video/1"></iframe></div></figure>';
    expect(paste(`<p>a</p>${vimeo}`, { allowedHosts: ['youtu.be', 'www.youtube-nocookie.com'] })).toBe('<p>a</p>');
    expect(paste(`<p>a</p>${vimeo}`)).toContain('src="https://player.vimeo.com/video/1"');
  });

  it('should accept embed code of an extra configured host', () => {
    const html = paste('<iframe src="https://video.example.com/embed/7"></iframe>', { allowedHosts: ['video.example.com'] });
    expect(html).toContain('data-provider="custom"');
    expect(html).toContain('src="https://video.example.com/embed/7"');
  });

  it('should keep pasted video files and other content', () => {
    const html = paste('<p><strong>b</strong></p><video src="/a.mp4"></video>');
    expect(html).toContain('<strong>b</strong>');
    expect(html).toContain('<video controls="" preload="metadata" src="/a.mp4"></video>');
  });
});

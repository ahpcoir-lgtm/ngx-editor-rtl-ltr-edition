import { DOMParser, Slice } from 'prosemirror-model';
import { TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

import Editor from '../Editor';
import type { NgxEditorEvent } from '../events';
import { resolveImageConfig } from '../images/config';
import { ImageResizeEnvironment, computeResizedSize, resizeImageFile } from '../images/resize';
import type { NgxEditorImageConfig, NgxEditorUploadContext } from '../images/types';
import { toHTML } from '../parsers';
import { getImageUploadPlaceholders, imageUpload, imageUploadKey, uploadImageFiles } from './image-upload';

const SCRIPT_URL = `${'javascript'}:alert(1)`;

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

const pngFile = (size = 3, name = 'photo.png', type = 'image/png'): File => {
  return new File([new Uint8Array(size)], name, { type });
};

const STRINGS: Record<string, string> = {
  uploadingImage: 'در حال بارگذاری تصویر…',
  cancelUpload: 'لغو بارگذاری',
  imageTooLarge: 'حجم تصویر «{name}» بیشتر از {max} است.',
  imageInvalidType: 'نوع فایل «{name}» پشتیبانی نمی‌شود.',
  imageUploadFailed: 'بارگذاری تصویر «{name}» انجام نشد.',
  imageEmbeddedWarning: 'تصویر «{name}» ({size}) درون محتوا جاسازی شد.',
};

interface UploadContext {
  editor: Editor;
  view: EditorView;
  events: NgxEditorEvent[];
  config: NgxEditorImageConfig;
  resizeEnvironment?: ImageResizeEnvironment;
  create: (content?: string) => void;
  types: () => string[];
  output: () => string;
}

// an editor with its own imageUpload plugin, created before and destroyed after each test
const useUploadEditor = (): UploadContext => {
  const ctx = { events: [], config: {} } as unknown as UploadContext;

  ctx.create = (content = '<p>abcd</p>') => {
    ctx.editor?.destroy();
    ctx.editor = new Editor({
      content,
      features: { imageUpload: false },
      plugins: [imageUpload({
        getConfig: () => resolveImageConfig(null, ctx.config),
        translate: (key) => STRINGS[key] ?? key,
        emit: (event) => ctx.events.push(event),
        errorTimeout: 20,
        get resizeEnvironment() {
          return ctx.resizeEnvironment;
        },
      })],
    });
    ctx.view = ctx.editor.view;
  };

  ctx.types = () => ctx.events.map((event) => event.type);
  ctx.output = () => toHTML(ctx.view.state.doc.toJSON(), ctx.editor.schema);

  beforeEach(() => {
    ctx.events = [];
    ctx.config = {};
    ctx.resizeEnvironment = undefined;
    ctx.create();
  });

  afterEach(() => {
    ctx.editor.destroy();
  });

  return ctx;
};

describe('imageUpload plugin: uploads', () => {
  const ctx = useUploadEditor();

  it('should show a placeholder with the progress and insert the uploaded image', async () => {
    const upload = deferred<string>();
    let handlerCtx: NgxEditorUploadContext | undefined;
    ctx.config.uploadHandler = (_file, context) => {
      handlerCtx = context;
      return upload.promise;
    };

    const done = uploadImageFiles(ctx.view, [pngFile()], { pos: 3 });
    await wait();

    expect(getImageUploadPlaceholders(ctx.view.state)).toEqual([expect.objectContaining({ pos: 3, kind: 'upload' })]);
    const placeholder = ctx.view.dom.querySelector('.NgxEditor__ImageUpload');
    expect(placeholder?.getAttribute('aria-label')).toBe('در حال بارگذاری تصویر…');
    expect(handlerCtx?.kind).toBe('image');
    expect(handlerCtx?.signal?.aborted).toBe(false);

    handlerCtx?.onProgress(42.4);
    expect(placeholder?.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('42');

    upload.resolve('https://cdn.example.com/photo.png');
    await done;

    expect(ctx.output()).toBe('<p>ab<img src="https://cdn.example.com/photo.png">cd</p>');
    expect(getImageUploadPlaceholders(ctx.view.state)).toEqual([]);
    expect(ctx.view.dom.querySelector('.NgxEditor__ImageUpload')).toBeNull();
    expect(ctx.types()).toEqual(['imageUploadStart', 'imageUploadProgress', 'imageUploaded']);
    expect(ctx.events[2]).toEqual(expect.objectContaining({ src: 'https://cdn.example.com/photo.png', embedded: false }));
  });

  it('should take the alt and width of an object result', async () => {
    ctx.config.uploadHandler = () => Promise.resolve({ src: '/uploads/a.png', alt: 'a', width: '120px' });

    await uploadImageFiles(ctx.view, [pngFile()], { pos: 1 });
    expect(ctx.output()).toBe('<p><img src="/uploads/a.png" alt="a" width="120px">abcd</p>');
  });

  it('should map the placeholder when text is inserted before it', async () => {
    const upload = deferred<string>();
    ctx.config.uploadHandler = () => upload.promise;

    const done = uploadImageFiles(ctx.view, [pngFile()], { pos: 3 });
    await wait();

    ctx.view.dispatch(ctx.view.state.tr.insertText('XYZ', 1));
    expect(getImageUploadPlaceholders(ctx.view.state)[0].pos).toBe(6);

    // text typed at the position of the placeholder goes after the image
    ctx.view.dispatch(ctx.view.state.tr.insertText('-', 6));
    expect(getImageUploadPlaceholders(ctx.view.state)[0].pos).toBe(6);

    upload.resolve('/a.png');
    await done;
    expect(ctx.output()).toBe('<p>XYZab<img src="/a.png">-cd</p>');
  });

  it('should insert several files in their order', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const pending = [first, second];
    ctx.config.uploadHandler = () => (pending.shift() as Deferred<string>).promise;

    const done = uploadImageFiles(ctx.view, [pngFile(3, 'a.png'), pngFile(3, 'b.png')], { pos: 1 });
    await wait();

    first.resolve('/1.png');
    await wait();
    second.resolve('/2.png');
    await done;

    expect(ctx.output()).toBe('<p><img src="/1.png"><img src="/2.png">abcd</p>');
  });

  it('should replace the src of an image', async () => {
    ctx.create('<p>a<img src="/old.png" alt="old" width="50px">b</p>');
    ctx.config.uploadHandler = () => Promise.resolve('/new.png');

    await uploadImageFiles(ctx.view, [pngFile()], { pos: 2, replace: true });
    expect(ctx.output()).toBe('<p>a<img src="/new.png" alt="old" width="50px">b</p>');
  });

  it('should resize before the size check and the upload', async () => {
    const drawn: number[][] = [];
    ctx.resizeEnvironment = {
      loadImage: () => Promise.resolve({ width: 4000, height: 3000, source: {} as CanvasImageSource }),
      createCanvas: (width, height) => ({
        draw: () => drawn.push([width, height]),
        toBlob: (type) => Promise.resolve(new Blob([new Uint8Array(10)], { type })),
      }),
    };

    const handler = vi.fn((file: File) => Promise.resolve(`/${file.name}`));
    ctx.config = { uploadHandler: handler, maxSize: 100, resize: { maxWidth: 1000, mimeType: 'image/webp' } };

    await uploadImageFiles(ctx.view, [pngFile(5000, 'big.png')], { pos: 1 });

    expect(drawn).toEqual([[1000, 750]]);
    const [[uploaded]] = handler.mock.calls;
    expect(uploaded.type).toBe('image/webp');
    expect(uploaded.size).toBe(10);
    expect(ctx.output()).toBe('<p><img src="/big.webp">abcd</p>');
  });

  it('should report on editor.events with the image option of the editor', async () => {
    const own = new Editor({ content: '<p>x</p>', image: { uploadHandler: () => Promise.resolve('/e.png') } });
    const received: string[] = [];
    const subscription = own.events.subscribe((event) => received.push(event.type));

    await uploadImageFiles(own.view, [pngFile()], { pos: 1 });

    expect(toHTML(own.view.state.doc.toJSON(), own.schema)).toBe('<p><img src="/e.png">x</p>');
    expect(received).toEqual(['imageUploadStart', 'imageUploaded']);
    subscription.unsubscribe();
    own.destroy();
  });
});

describe('imageUpload plugin: errors and cancelling', () => {
  const ctx = useUploadEditor();

  it('should show a localized error when the handler rejects and remove it after a while', async () => {
    const onError = vi.fn();
    ctx.config.onError = onError;
    ctx.config.uploadHandler = () => Promise.reject(new Error('500'));

    await uploadImageFiles(ctx.view, [pngFile(3, 'عکس.png')], { pos: 3 });

    expect(ctx.output()).toBe('<p>abcd</p>');
    expect(ctx.types()).toEqual(['imageUploadStart', 'imageUploadError']);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'uploadFailed', message: 'بارگذاری تصویر «عکس.png» انجام نشد.' }));
    expect((onError.mock.calls[0][0] as { cause: Error }).cause.message).toBe('500');
    expect(ctx.view.dom.querySelector('.NgxEditor__ImageUploadError')?.textContent).toBe('بارگذاری تصویر «عکس.png» انجام نشد.');

    await wait(40);
    expect(ctx.view.dom.querySelector('.NgxEditor__ImageUploadError')).toBeNull();
  });

  it('should reject an unsafe url from the handler', async () => {
    ctx.config.uploadHandler = () => Promise.resolve(SCRIPT_URL);

    await uploadImageFiles(ctx.view, [pngFile()], { pos: 1 });
    expect(ctx.output()).toBe('<p>abcd</p>');
    expect(ctx.events[1]).toEqual(expect.objectContaining({
      type: 'imageUploadError',
      error: expect.objectContaining({ code: 'invalidResult' }),
    }));
  });

  it('should abort the upload when the placeholder is deleted', async () => {
    let signal: AbortSignal | undefined;
    ctx.config.uploadHandler = (_file, handlerCtx) => new Promise((_resolve, reject) => {
      ({ signal } = handlerCtx);
      handlerCtx.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    });

    const done = uploadImageFiles(ctx.view, [pngFile()], { pos: 3 });
    await wait();

    // deleting the text across the placeholder removes it
    ctx.view.dispatch(ctx.view.state.tr.delete(2, 4));
    await done;

    expect(signal?.aborted).toBe(true);
    expect(ctx.output()).toBe('<p>ad</p>');
    expect(ctx.types()).toEqual(['imageUploadStart', 'imageUploadCancelled']);
    expect(ctx.view.dom.querySelector('.NgxEditor__ImageUploadError')).toBeNull();
  });

  it('should keep the placeholder when only the text next to it is deleted', async () => {
    const upload = deferred<string>();
    ctx.config.uploadHandler = () => upload.promise;

    const done = uploadImageFiles(ctx.view, [pngFile()], { pos: 3 });
    await wait();

    ctx.view.dispatch(ctx.view.state.tr.delete(2, 3));
    expect(getImageUploadPlaceholders(ctx.view.state)[0].pos).toBe(2);

    upload.resolve('/a.png');
    await done;
    expect(ctx.output()).toBe('<p>a<img src="/a.png">cd</p>');
  });

  it('should cancel with the button of the placeholder', async () => {
    const upload = deferred<string>();
    ctx.config.uploadHandler = () => upload.promise;

    const done = uploadImageFiles(ctx.view, [pngFile()], { pos: 3 });
    await wait();

    const button = ctx.view.dom.querySelector<HTMLButtonElement>('.NgxEditor__ImageUpload--Cancel');
    expect(button?.getAttribute('aria-label')).toBe('لغو بارگذاری');
    button?.click();

    upload.resolve('/a.png');
    await done;

    expect(ctx.output()).toBe('<p>abcd</p>');
    expect(ctx.types()).toEqual(['imageUploadStart', 'imageUploadCancelled']);
  });

  it('should abort running uploads when the editor is destroyed', async () => {
    let signal: AbortSignal | undefined;
    ctx.config.uploadHandler = (_file, handlerCtx) => {
      ({ signal } = handlerCtx);
      // never settles
      return deferred<string>().promise;
    };

    uploadImageFiles(ctx.view, [pngFile()], { pos: 1 });
    await wait();
    ctx.editor.destroy();
    await wait();

    expect(signal?.aborted).toBe(true);
  });
});

describe('imageUpload plugin: limits and embedding', () => {
  const ctx = useUploadEditor();

  it('should refuse files larger than maxSize', async () => {
    const handler = vi.fn(() => Promise.resolve('/a.png'));
    ctx.config = { uploadHandler: handler, maxSize: 1024 };

    await uploadImageFiles(ctx.view, [pngFile(2048, 'big.png')], { pos: 1 });

    expect(handler).not.toHaveBeenCalled();
    expect(ctx.output()).toBe('<p>abcd</p>');
    expect(ctx.events[1]).toEqual(expect.objectContaining({
      type: 'imageUploadError',
      error: expect.objectContaining({ code: 'tooLarge', message: 'حجم تصویر «big.png» بیشتر از 1 KB است.' }),
    }));
  });

  it('should refuse types that are not accepted', async () => {
    const handler = vi.fn(() => Promise.resolve('/a.svg'));
    ctx.config = { uploadHandler: handler };

    const pdf = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    await uploadImageFiles(ctx.view, [pngFile(3, 'logo.svg', 'image/svg+xml'), pdf]);

    expect(handler).not.toHaveBeenCalled();
    expect(getImageUploadPlaceholders(ctx.view.state).map((placeholder) => placeholder.kind)).toEqual(['error', 'error']);
    expect(ctx.events.map((event) => event.type === 'imageUploadError' && event.error.code)).toEqual(['invalidType', 'invalidType']);

    ctx.config.accept = ['image/*', '.svg'];
    ctx.events = [];
    await uploadImageFiles(ctx.view, [pngFile(3, 'logo.svg', 'image/svg+xml')], { pos: 1 });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(ctx.types()).toEqual(['imageUploadStart', 'imageUploaded']);
  });

  it('should embed a data url without a handler', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    try {
      await uploadImageFiles(ctx.view, [pngFile(3)], { pos: 1 });

      expect(ctx.output()).toBe('<p><img src="data:image/png;base64,AAAA">abcd</p>');
      expect(ctx.events[1]).toEqual(expect.objectContaining({ type: 'imageUploaded', embedded: true }));
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('should warn about a large embedded image', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const onWarning = vi.fn();
    ctx.config = { base64WarnSize: 2, onWarning };

    try {
      await uploadImageFiles(ctx.view, [pngFile(3, 'a.png')], { pos: 1 });

      expect(ctx.output()).toContain('<img src="data:image/png;base64,AAAA">');
      expect(onWarning).toHaveBeenCalledWith(expect.objectContaining({ code: 'base64Size', size: 3 }));
      expect(warn).toHaveBeenCalledWith('ngx-editor: تصویر «a.png» (3 B) درون محتوا جاسازی شد.');
      expect(ctx.types()).toEqual(['imageUploadStart', 'imageUploadWarning', 'imageUploaded']);
    } finally {
      warn.mockRestore();
    }
  });
});

describe('imageUpload plugin: paste and drop', () => {
  const ctx = useUploadEditor();

  const parseSlice = (html: string): Slice => {
    const element = document.createElement('div');
    element.innerHTML = html;
    return DOMParser.fromSchema(ctx.editor.schema).parseSlice(element);
  };

  it('should upload pasted image files and leave pasted html to the parser', async () => {
    ctx.config.uploadHandler = () => Promise.resolve('/pasted.png');
    const handlePaste = imageUploadKey.get(ctx.view.state)?.props.handlePaste as (view: EditorView, event: unknown) => boolean;

    const file = pngFile();
    const withHtml = { clipboardData: { files: [file], getData: () => '<img src="https://example.com/a.png">' } };
    expect(handlePaste(ctx.view, withHtml)).toBe(false);

    ctx.view.dispatch(ctx.view.state.tr.setSelection(TextSelection.create(ctx.view.state.doc, 3)));
    expect(handlePaste(ctx.view, { clipboardData: { files: [file], getData: () => '' } })).toBe(true);
    await wait();

    expect(ctx.output()).toBe('<p>ab<img src="/pasted.png">cd</p>');
  });

  it('should upload dropped image files', async () => {
    ctx.config.uploadHandler = () => Promise.resolve('/dropped.png');
    const handleDrop = imageUploadKey.get(ctx.view.state)?.props.handleDrop as (
      view: EditorView, event: unknown, slice: Slice, moved: boolean,
    ) => boolean;

    const event = { dataTransfer: { files: [pngFile()] }, clientX: 0, clientY: 0, preventDefault: vi.fn() };
    expect(handleDrop(ctx.view, { dataTransfer: { files: [] } }, Slice.empty, false)).toBe(false);
    expect(handleDrop(ctx.view, event, Slice.empty, true)).toBe(false);
    expect(handleDrop(ctx.view, event, Slice.empty, false)).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();

    await wait();
    expect(ctx.output()).toContain('<img src="/dropped.png">');
  });

  it('should strip unsafe links and images of pasted html', () => {
    const event = { clipboardData: null } as unknown as ClipboardEvent;
    ctx.view.pasteHTML(`<p><a href="${SCRIPT_URL}">click</a><img src="data:image/svg+xml;base64,PHN2Zz4="></p>`, event);
    expect(ctx.output()).toBe('<p>clickabcd</p>');
  });

  it('should drop pasted data urls above maxSize and warn about large ones', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const transformPasted = imageUploadKey.get(ctx.view.state)?.props.transformPasted as (slice: Slice, view: EditorView) => Slice;
    const big = `data:image/png;base64,${'A'.repeat(4000)}`;

    try {
      ctx.config = { maxSize: 1000 };
      expect(transformPasted(parseSlice(`<p>a<img src="${big}">b</p>`), ctx.view).content.firstChild?.textContent).toBe('ab');
      expect(transformPasted(parseSlice(`<p><img src="${big}"></p>`), ctx.view).content.firstChild?.childCount).toBe(0);
      expect(ctx.events.at(-1)).toEqual(expect.objectContaining({ type: 'imageUploadError' }));

      ctx.config = { base64WarnSize: 100 };
      const kept = transformPasted(parseSlice(`<p><img src="${big}"></p>`), ctx.view);
      expect(kept.content.firstChild?.firstChild?.type.name).toBe('image');
      expect(ctx.events.at(-1)).toEqual(expect.objectContaining({
        type: 'imageUploadWarning',
        warning: expect.objectContaining({ size: 3000 }),
      }));
    } finally {
      warn.mockRestore();
    }
  });
});

describe('image resizing', () => {
  const environment = (width: number, height: number, sizes: number[][]): ImageResizeEnvironment => ({
    loadImage: () => Promise.resolve({ width, height, source: {} as CanvasImageSource }),
    createCanvas: (w, h) => ({
      draw: () => sizes.push([w, h]),
      toBlob: (type) => Promise.resolve(new Blob(['x'], { type })),
    }),
  });

  it('should keep the aspect ratio and never enlarge', () => {
    expect(computeResizedSize(4000, 2000, { maxWidth: 1000 })).toEqual({ width: 1000, height: 500 });
    expect(computeResizedSize(2000, 4000, { maxWidth: 1000, maxHeight: 1000 })).toEqual({ width: 500, height: 1000 });
    expect(computeResizedSize(300, 200, { maxWidth: 1000, maxHeight: 1000 })).toEqual({ width: 300, height: 200 });
    expect(computeResizedSize(300, 200, {})).toEqual({ width: 300, height: 200 });
  });

  it('should downscale with the canvas and keep the type', async () => {
    const sizes: number[][] = [];
    const file = new File(['data'], 'photo.jpeg', { type: 'image/jpeg' });
    const result = await resizeImageFile(file, { maxHeight: 500 }, environment(2000, 1000, sizes));

    expect(sizes).toEqual([[1000, 500]]);
    expect(result.type).toBe('image/jpeg');
    expect(result.name).toBe('photo.jpg');
  });

  it('should skip gif and svg, small images and missing options', async () => {
    const sizes: number[][] = [];
    const gif = new File(['g'], 'a.gif', { type: 'image/gif' });
    const svg = new File(['s'], 'a.svg', { type: 'image/svg+xml' });
    const png = new File(['p'], 'a.png', { type: 'image/png' });

    expect(await resizeImageFile(gif, { maxWidth: 10 }, environment(100, 100, sizes))).toBe(gif);
    expect(await resizeImageFile(svg, { maxWidth: 10 }, environment(100, 100, sizes))).toBe(svg);
    expect(await resizeImageFile(png, { maxWidth: 1000 }, environment(100, 100, sizes))).toBe(png);
    expect(await resizeImageFile(png, null, environment(100, 100, sizes))).toBe(png);
    expect(sizes).toEqual([]);
  });

  it('should return the file when it cannot be decoded', async () => {
    const png = new File(['p'], 'a.png', { type: 'image/png' });
    const failing: ImageResizeEnvironment = {
      loadImage: () => Promise.reject(new Error('decode')),
      createCanvas: () => {
        throw new Error('not reached');
      },
    };

    expect(await resizeImageFile(png, { maxWidth: 10 }, failing)).toBe(png);
  });
});

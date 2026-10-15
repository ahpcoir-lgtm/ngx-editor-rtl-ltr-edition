import { ApplicationRef, Component, EnvironmentProviders, Provider, inject } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NodeSelection } from 'prosemirror-state';

import { toWidthPercent } from './components/video-view/video-view.component';
import Editor, { EditorOptions } from './Editor';
import { NgxEditorComponent } from './editor.component';
import { MenuService } from './modules/menu/menu.service';
import { VideoComponent } from './modules/menu/video/video.component';
import { toHTML } from './parsers';
import { provideNgxEditorConfig } from './provide-config';

const ID = 'dQw4w9WgXcQ';
const SCRIPT_URL = `${'javascript'}:alert(1)`;
const YOUTUBE = `<iframe src="https://www.youtube.com/embed/${ID}"></iframe>`;

const flush = (): Promise<void> => new Promise((resolve) => {
  setTimeout(resolve, 0);
});

const mp4 = (name = 'clip.mp4', size = 3): File => new File([new Uint8Array(size)], name, { type: 'video/mp4' });

const setFiles = (input: HTMLInputElement | null, files: File[]): void => {
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  input?.dispatchEvent(new Event('change'));
};

const type = (input: HTMLInputElement | null, value: string): void => {
  if (!input) {
    throw new Error('no input');
  }
  input.value = value;
  input.dispatchEvent(new Event('input'));
};

describe('video width math', () => {
  it('should give the width in percent of the editor, between 10 and 100', () => {
    expect(toWidthPercent(300, 600)).toBe(50);
    expect(toWidthPercent(1000, 600)).toBe(100);
    expect(toWidthPercent(10, 600)).toBe(10);
    expect(toWidthPercent(300, 0)).toBe(100);
  });
});

describe('NgxEditorComponent: videos', () => {
  let fixture: ComponentFixture<NgxEditorComponent>;
  let editor: Editor;
  let element: HTMLElement;

  // the node views are attached to the application, not to the fixture
  const render = (): void => {
    fixture.detectChanges();
    TestBed.inject(ApplicationRef).tick();
  };

  const create = (options: EditorOptions = {}, providers: (Provider | EnvironmentProviders)[] = []): void => {
    TestBed.configureTestingModule({ imports: [NgxEditorComponent], providers });

    editor = new Editor(options);
    fixture = TestBed.createComponent(NgxEditorComponent);
    fixture.componentRef.setInput('editor', editor);
    render();
    element = fixture.nativeElement as HTMLElement;
  };

  const select = (pos: number): void => {
    const { view } = editor;
    view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos)));
    render();
  };

  const output = (): string => toHTML(editor.view.state.doc.toJSON(), editor.schema);

  const button = (label: string): HTMLButtonElement => {
    const found = element.querySelector<HTMLButtonElement>(`.NgxEditor__VideoToolbar button[aria-label="${label}"]`);
    if (!found) {
      throw new Error(`no button ${label}`);
    }
    return found;
  };

  const typeInPanel = (value: string): void => {
    const input = element.querySelector<HTMLInputElement>('.NgxEditor__VideoToolbar .NgxEditor__ImageToolbar--Input');
    type(input, value);
    input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    render();
  };

  afterEach(() => {
    editor.destroy();
  });

  it('should show the player under an overlay until the video is selected', () => {
    create({ content: `<p>a</p>${YOUTUBE}` });

    const view = element.querySelector('ngx-video-view');
    const iframe = view?.querySelector('iframe');
    expect(iframe?.getAttribute('src')).toBe(`https://www.youtube.com/embed/${ID}`);
    expect(iframe?.getAttribute('title')).toBe('YouTube');
    expect(iframe?.hasAttribute('allowfullscreen')).toBe(true);
    expect(iframe?.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin');
    expect(view?.querySelector('.NgxEditor__VideoOverlay')).toBeTruthy();
    expect(element.querySelector('.NgxEditor__VideoToolbar')).toBeNull();

    select(3);
    expect(view?.querySelector('.NgxEditor__VideoOverlay')).toBeNull();
    expect(element.querySelector('.NgxEditor__VideoToolbar')?.getAttribute('role')).toBe('toolbar');
    expect(element.querySelector('.NgxEditor__VideoResize')?.getAttribute('role')).toBe('slider');
    // the same player: the iframe is not created again
    expect(view?.querySelector('iframe')).toBe(iframe);
  });

  it('should have localized labels', () => {
    create({ content: `<p>a</p>${YOUTUBE}` }, [provideNgxEditorConfig({ locale: 'fa' })]);
    select(3);

    expect(element.querySelector('.NgxEditor__VideoToolbar')?.getAttribute('aria-label')).toBe('ابزارهای ویدیو');
    expect(button('ویدیو در وسط').getAttribute('aria-pressed')).toBe('false');
    expect(button('عرض 50%')).toBeTruthy();
    expect(element.querySelector('.NgxEditor__VideoResize')?.getAttribute('aria-label')).toBe('تغییر اندازهٔ ویدیو');
    expect(element.querySelector('iframe')?.getAttribute('title')).toBe('یوتیوب');
  });

  it('should align, resize and caption the video from the toolbar', () => {
    create({ content: `<p>a</p>${YOUTUBE}` });
    select(3);

    button('Center Video').click();
    render();
    expect(output()).toContain('data-align="center"');
    expect(element.querySelector('ngx-video-view')?.getAttribute('data-align')).toBe('center');
    expect(button('Center Video').getAttribute('aria-pressed')).toBe('true');

    button('Center Video').click();
    render();
    expect(output()).not.toContain('data-align');

    button('Width 50%').click();
    render();
    expect(output()).toContain('style="width: 50%;"');
    expect((element.querySelector('ngx-video-view') as HTMLElement).style.width).toBe('50%');
    expect(button('Width 50%').getAttribute('aria-pressed')).toBe('true');

    const handle = element.querySelector<HTMLElement>('.NgxEditor__VideoResize');
    handle?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    render();
    expect(output()).toContain('style="width: 55%;"');

    button('Width 100%').click();
    render();
    expect(output()).not.toContain('width:');

    button('Caption').click();
    render();
    typeInPanel('A song');
    expect(output()).toContain('<figcaption>A song</figcaption>');
    expect(element.querySelector('.NgxEditor__VideoCaption')?.textContent).toBe('A song');
  });

  it('should grow towards the left with the arrow keys in right to left text', () => {
    create({ content: `<p>a</p>${YOUTUBE}`, dir: 'rtl' });
    fixture.componentRef.setInput('dir', 'rtl');
    select(3);

    const handle = element.querySelector<HTMLElement>('.NgxEditor__VideoResize');
    const rtl = getComputedStyle(handle as HTMLElement).direction === 'rtl';
    handle?.dispatchEvent(new KeyboardEvent('keydown', { key: rtl ? 'ArrowLeft' : 'ArrowRight', bubbles: true }));
    render();
    // from the full width the video cannot grow, so shrink it first
    expect(output()).not.toContain('width:');

    handle?.dispatchEvent(new KeyboardEvent('keydown', { key: rtl ? 'ArrowRight' : 'ArrowLeft', bubbles: true }));
    render();
    expect(output()).toContain('style="width: 95%;"');
  });

  it('should replace the video by link, refuse other hosts and delete it', () => {
    create({ content: `<p>a</p>${YOUTUBE}` });
    select(3);

    button('Replace Video').click();
    render();
    expect(element.querySelector('.NgxEditor__ImageToolbar--File')).toBeNull();

    typeInPanel('https://evil.example.com/v/1');
    expect(element.querySelector('.NgxEditor__VideoToolbar [role="alert"]')?.textContent).toBe('Videos from “evil.example.com” are not allowed.');

    typeInPanel('https://vimeo.com/76979871');
    expect(output()).toContain('src="https://player.vimeo.com/video/76979871"');

    render();
    button('Delete Video').click();
    expect(output()).toBe('<p>a</p>');
  });

  it('should replace the file with an upload', async () => {
    create({
      content: '<p>a</p><video src="/old.mp4"></video>',
      video: { uploadHandler: () => Promise.resolve('/new.mp4') },
    });
    select(3);

    expect(element.querySelector('ngx-video-view video')?.getAttribute('src')).toBe('/old.mp4');
    button('Replace Video').click();
    render();

    const input = element.querySelector<HTMLInputElement>('.NgxEditor__ImageToolbar--File input');
    expect(input?.getAttribute('accept')).toBe('video/mp4,video/webm,video/ogg');
    setFiles(input, [mp4()]);
    await flush();
    render();

    expect(output()).toContain('src="/new.mp4"');
    expect(element.querySelector('ngx-video-view video')?.getAttribute('src')).toBe('/new.mp4');
  });

  it('should play in a read-only editor without the overlay', () => {
    create({ content: `<p>a</p>${YOUTUBE}` });
    fixture.componentInstance.setDisabledState(true);
    render();
    expect(element.querySelector('.NgxEditor__VideoOverlay')).toBeNull();
  });

  it('should let the instance config win over the global one', () => {
    create({ video: { maxSize: 10 } }, [provideNgxEditorConfig({ video: { maxSize: 99, youtubeNoCookie: false } })]);
    expect(editor.videoConfig.maxSize).toBe(10);
    expect(editor.videoConfig.youtubeNoCookie).toBe(false);
  });
});

@Component({
  imports: [NgxEditorComponent, VideoComponent],
  providers: [MenuService],
  template: '<ngx-editor [editor]="editor" /><ngx-video />',
})
class DialogHostComponent {
  editor = new Editor({ content: '<p>x</p>' });

  constructor() {
    inject(MenuService).editor = this.editor;
  }
}

describe('video dialog', () => {
  let fixture: ComponentFixture<DialogHostComponent>;
  let element: HTMLElement;

  const render = (): void => {
    fixture.detectChanges();
    TestBed.inject(ApplicationRef).tick();
  };

  const setup = (providers: (Provider | EnvironmentProviders)[] = []): void => {
    TestBed.configureTestingModule({ imports: [DialogHostComponent], providers });
    fixture = TestBed.createComponent(DialogHostComponent);
    render();
    element = fixture.nativeElement as HTMLElement;
  };

  const open = (): void => {
    element.querySelector<HTMLButtonElement>('ngx-video > button')?.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    render();
  };

  const output = (): string => {
    const { editor } = fixture.componentInstance;
    return toHTML(editor.view.state.doc.toJSON(), editor.schema);
  };

  const submit = (): HTMLButtonElement => {
    const found = element.querySelector<HTMLButtonElement>('.NgxEditor__VideoPopup button[type="submit"]');
    if (!found) {
      throw new Error('no submit button');
    }
    return found;
  };

  afterEach(() => {
    fixture.componentInstance.editor.destroy();
  });

  it('should preview the link, refuse other hosts and insert the video with its caption', () => {
    setup();
    open();

    const tabs = Array.from(element.querySelectorAll<HTMLElement>('[role="tab"]'));
    expect(tabs.map((tab) => tab.textContent?.trim())).toEqual(['Embed URL', 'Upload File']);
    expect(submit().disabled).toBe(true);

    const url = element.querySelector<HTMLInputElement>('input[formControlName="url"]');
    type(url, 'https://evil.example.com/v/1');
    render();
    expect(element.querySelector('.NgxEditor__VideoPopup .NgxEditor__HelpText--Error')?.textContent?.trim())
      .toBe('Videos from “evil.example.com” are not allowed.');
    expect(submit().disabled).toBe(true);

    type(url, SCRIPT_URL);
    render();
    expect(element.querySelector('.NgxEditor__VideoPopup .NgxEditor__HelpText--Error')?.textContent?.trim())
      .toBe('This link is not a video that can be embedded.');

    type(url, `https://www.youtube.com/watch?v=${ID}&t=1m5s`);
    render();
    const preview = element.querySelector('.NgxEditor__VideoPreview');
    expect(preview?.textContent).toContain('Preview: YouTube');
    expect(preview?.querySelector('code')?.textContent).toBe(`https://www.youtube-nocookie.com/embed/${ID}?start=65`);

    type(element.querySelector<HTMLInputElement>('input[formControlName="caption"]'), 'A song');
    render();
    submit().click();
    render();

    expect(element.querySelector('.NgxEditor__VideoPopup')).toBeNull();
    expect(output()).toContain(`src="https://www.youtube-nocookie.com/embed/${ID}?start=65" title="A song"`);
    expect(output()).toContain('<figcaption>A song</figcaption>');
  });

  it('should disable the upload without a handler, with a localized note', () => {
    setup([provideNgxEditorConfig({ locale: 'fa' })]);
    open();

    element.querySelectorAll<HTMLElement>('[role="tab"]')[1].click();
    render();

    expect(element.querySelector('.NgxEditor__ImageDrop--Input')).toBeNull();
    expect(element.querySelector('.NgxEditor__VideoNote')?.textContent?.trim()).toBe('بارگذاری ویدیو در دسترس نیست، چون بارگذار ویدیو تنظیم نشده است.');
    expect(submit().disabled).toBe(true);
  });

  const openUploadTab = (maxSize: number, upload: () => Promise<string>): HTMLInputElement | null => {
    setup([provideNgxEditorConfig({ video: { uploadHandler: upload, maxSize } })]);
    open();
    element.querySelectorAll<HTMLElement>('[role="tab"]')[1].click();
    render();
    return element.querySelector<HTMLInputElement>('.NgxEditor__ImageDrop--Input');
  };

  it('should refuse files that are too large or of another type', () => {
    const input = openUploadTab(10, () => Promise.resolve('/a.mp4'));
    expect(input?.getAttribute('accept')).toBe('video/mp4,video/webm,video/ogg');

    setFiles(input, [mp4('big.mp4', 20)]);
    render();
    expect(element.querySelector('.NgxEditor__VideoPopup [role="alert"]')?.textContent).toBe('The video “big.mp4” is larger than 10 B.');
    expect(submit().disabled).toBe(true);

    setFiles(input, [new File(['x'], 'a.avi', { type: 'video/x-msvideo' })]);
    render();
    expect(element.querySelector('.NgxEditor__VideoPopup [role="alert"]')?.textContent).toBe('“a.avi” is not a supported video type.');
    expect(submit().disabled).toBe(true);
  });

  it('should check the poster and upload the file with the placeholder', async () => {
    let resolveUpload: (src: string) => void = () => undefined;
    const input = openUploadTab(10, () => new Promise((resolve) => {
      resolveUpload = resolve;
    }));

    setFiles(input, [mp4()]);
    render();
    expect(element.querySelector('.NgxEditor__VideoFile')?.textContent).toBe('Selected file: clip.mp4');

    const poster = element.querySelector<HTMLInputElement>('input[formControlName="poster"]');
    type(poster, SCRIPT_URL);
    render();
    expect(submit().disabled).toBe(true);
    type(poster, '/poster.jpg');
    render();
    expect(submit().disabled).toBe(false);

    submit().click();
    render();
    await flush();

    const { view } = fixture.componentInstance.editor;
    expect(view.dom.querySelector('.NgxEditor__ImageUpload')?.getAttribute('aria-label')).toBe('Uploading video…');

    resolveUpload('/uploaded.mp4');
    await flush();
    expect(output()).toContain('<video controls="" preload="metadata" src="/uploaded.mp4" poster="/poster.jpg"></video>');
  });


  it('should edit a selected video on the embed tab', () => {
    setup();
    const { editor } = fixture.componentInstance;
    editor.commands.insertVideo('https://vimeo.com/76979871', { caption: 'Talk' }).exec();
    render();
    open();

    expect(element.querySelector<HTMLInputElement>('input[formControlName="url"]')?.value).toBe('https://player.vimeo.com/video/76979871');
    expect(element.querySelector<HTMLInputElement>('input[formControlName="caption"]')?.value).toBe('Talk');
    expect(element.querySelector('ngx-video > button')?.classList).toContain('NgxEditor__MenuItem--Active');
  });
});

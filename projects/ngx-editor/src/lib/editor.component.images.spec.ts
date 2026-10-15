import { ApplicationRef, Component, EnvironmentProviders, Provider, inject } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NodeSelection } from 'prosemirror-state';

import { computeResizeWidth } from './components/image-view/image-view.component';
import Editor, { EditorOptions } from './Editor';
import { NgxEditorComponent } from './editor.component';
import type { NgxEditorEvent } from './events';
import { ImageComponent } from './modules/menu/image/image.component';
import { MenuService } from './modules/menu/menu.service';
import { toHTML } from './parsers';
import { uploadImageFiles } from './plugins/image-upload';
import { provideNgxEditorConfig } from './provide-config';

const SCRIPT_URL = `${'javascript'}:alert(1)`;

const flush = (): Promise<void> => new Promise((resolve) => {
  setTimeout(resolve, 0);
});

const pngFile = (name = 'a.png'): File => new File([new Uint8Array(3)], name, { type: 'image/png' });

describe('image resize math', () => {
  it('should grow towards the inline end in left to right text', () => {
    expect(computeResizeWidth({ startWidth: 200, deltaX: 50, rtl: false, maxWidth: 600 })).toBe(250);
    expect(computeResizeWidth({ startWidth: 200, deltaX: -50, rtl: false, maxWidth: 600 })).toBe(150);
  });

  it('should grow towards the left in right to left text', () => {
    expect(computeResizeWidth({ startWidth: 200, deltaX: -50, rtl: true, maxWidth: 600 })).toBe(250);
    expect(computeResizeWidth({ startWidth: 200, deltaX: 50, rtl: true, maxWidth: 600 })).toBe(150);
  });

  it('should keep the width between the minimum and the editor width', () => {
    expect(computeResizeWidth({ startWidth: 200, deltaX: 1000, rtl: false, maxWidth: 600 })).toBe(600);
    expect(computeResizeWidth({ startWidth: 200, deltaX: 1000, rtl: true, maxWidth: 600 })).toBe(20);
    expect(computeResizeWidth({ startWidth: 30, deltaX: -100, rtl: false, maxWidth: 600, minWidth: 40 })).toBe(40);
  });
});

describe('NgxEditorComponent: images', () => {
  let fixture: ComponentFixture<NgxEditorComponent>;
  let editor: Editor;
  let element: HTMLElement;

  // the node views are attached to the application, not to the fixture
  const render = (): void => {
    fixture.detectChanges();
    TestBed.inject(ApplicationRef).tick();
  };

  const create = (options: EditorOptions = {}, providers: (Provider | EnvironmentProviders)[] = []): void => {
    TestBed.configureTestingModule({
      imports: [NgxEditorComponent],
      providers,
    });

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
    const found = element.querySelector<HTMLButtonElement>(`.NgxEditor__ImageToolbar button[aria-label="${label}"]`);
    if (!found) {
      throw new Error(`no button ${label}`);
    }
    return found;
  };

  const panelInput = (): HTMLInputElement => {
    const input = element.querySelector<HTMLInputElement>('.NgxEditor__ImageToolbar--Input');
    if (!input) {
      throw new Error('no panel input');
    }
    return input;
  };

  const typeInPanel = (value: string): void => {
    const input = panelInput();
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    render();
  };

  afterEach(() => {
    editor.destroy();
  });

  it('should show the localized toolbar only on the selected image', () => {
    create({ content: '<p>a<img src="/a.png">b</p>' }, [provideNgxEditorConfig({ locale: 'fa' })]);

    expect(element.querySelector('.NgxEditor__ImageToolbar')).toBeNull();
    select(2);

    const toolbar = element.querySelector('.NgxEditor__ImageToolbar');
    expect(toolbar?.getAttribute('role')).toBe('toolbar');
    expect(toolbar?.getAttribute('aria-label')).toBe('ابزارهای تصویر');
    expect(button('تصویر در وسط').getAttribute('aria-pressed')).toBe('false');
    expect(element.querySelectorAll('.NgxEditor__ResizeHandle > span').length).toBe(2);
  });

  it('should align, set the alt text and link the image from the toolbar', () => {
    create({ content: '<p>a<img src="/a.png">b</p>' });
    select(2);

    button('Center Image').click();
    render();
    expect(output()).toContain('data-align="center"');
    expect(button('Center Image').getAttribute('aria-pressed')).toBe('true');
    expect(element.querySelector('ngx-image-view')?.getAttribute('data-align')).toBe('center');

    button('Alt Text').click();
    render();
    typeInPanel('a cat');
    expect(output()).toContain('alt="a cat"');

    button('Link').click();
    render();
    typeInPanel(SCRIPT_URL);
    expect(element.querySelector('.NgxEditor__ImageToolbar [role="alert"]')).toBeTruthy();
    expect(output()).not.toContain('<a');

    typeInPanel('https://example.com');
    expect(output()).toContain('<a href="https://example.com" target="_blank"><img');

    button('In Line with Text').click();
    expect(output()).not.toContain('data-align');
  });

  it('should add, edit and remove a caption', () => {
    create({ content: '<p><img src="/a.png"></p>' });
    select(1);

    button('Caption').click();
    render();
    typeInPanel('A caption');

    expect(output()).toBe('<figure data-type="image"><img src="/a.png"><figcaption>A caption</figcaption></figure>');
    render();
    expect(element.querySelector('ngx-image-view[data-kind="figure"] .NgxEditor__FigureCaption')?.textContent).toBe('A caption');

    button('Caption').click();
    render();
    const remove = Array.from(element.querySelectorAll<HTMLButtonElement>('.NgxEditor__ImageToolbar--Apply'))
      .find((el) => el.textContent?.trim() === 'Remove Caption');
    remove?.click();

    expect(output()).toBe('<p><img src="/a.png"></p>');
  });

  it('should replace the image by url and delete it', () => {
    create({ content: '<p>a<img src="/a.png">b</p>' });
    select(2);

    button('Replace Image').click();
    render();
    typeInPanel('https://example.com/b.png');
    expect(output()).toBe('<p>a<img src="https://example.com/b.png">b</p>');

    render();
    button('Delete Image').click();
    expect(output()).toBe('<p>ab</p>');
  });

  it('should replace the image with an uploaded file', async () => {
    create({ content: '<p>a<img src="/a.png" alt="x">b</p>', image: { uploadHandler: () => Promise.resolve('/new.png') } });
    select(2);

    button('Replace Image').click();
    render();
    const input = element.querySelector<HTMLInputElement>('.NgxEditor__ImageToolbar--File input');
    expect(input?.getAttribute('accept')).toContain('image/png');

    Object.defineProperty(input, 'files', { value: [pngFile()], configurable: true });
    input?.dispatchEvent(new Event('change'));
    await flush();
    await flush();

    expect(output()).toBe('<p>a<img src="/new.png" alt="x">b</p>');
  });

  it('should report upload errors in the language of the config and on editor.events', async () => {
    create({ content: '<p>x</p>' }, [provideNgxEditorConfig({
      locale: 'fa',
      image: { uploadHandler: () => Promise.reject(new Error('offline')) },
    })]);

    const events: NgxEditorEvent[] = [];
    editor.events.subscribe((event) => events.push(event));

    await uploadImageFiles(editor.view, [pngFile('عکس.png')], { pos: 1 });

    expect(events.map((event) => event.type)).toEqual(['imageUploadStart', 'imageUploadError']);
    expect(element.querySelector('.NgxEditor__ImageUploadError')?.textContent).toBe('بارگذاری تصویر «عکس.png» انجام نشد.');
  });

  it('should let the instance config win over the global one', () => {
    const global = vi.fn(() => Promise.resolve('/global.png'));
    const own = vi.fn(() => Promise.resolve('/own.png'));
    create({ image: { uploadHandler: own } }, [provideNgxEditorConfig({ image: { uploadHandler: global, maxSize: 10 } })]);

    expect(editor.imageConfig.uploadHandler).toBe(own);
    expect(editor.imageConfig.maxSize).toBe(10);
  });
});

@Component({
  imports: [NgxEditorComponent, ImageComponent],
  providers: [MenuService],
  template: '<ngx-editor [editor]="editor" /><ngx-image />',
})
class DialogHostComponent {
  editor = new Editor({ content: '<p>x</p>', image: { uploadHandler: () => Promise.resolve('/dialog.png') } });

  constructor() {
    inject(MenuService).editor = this.editor;
  }
}

describe('image dialog', () => {
  let fixture: ComponentFixture<DialogHostComponent>;
  let element: HTMLElement;

  const render = (): void => {
    fixture.detectChanges();
    TestBed.inject(ApplicationRef).tick();
  };

  const open = (): void => {
    const toggle = element.querySelector<HTMLButtonElement>('ngx-image > button');
    toggle?.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    render();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DialogHostComponent] });
    fixture = TestBed.createComponent(DialogHostComponent);
    render();
    element = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    fixture.componentInstance.editor.destroy();
  });

  it('should open on the upload tab and upload the chosen files', async () => {
    open();

    const tabs = Array.from(element.querySelectorAll<HTMLElement>('[role="tab"]'));
    expect(tabs.map((tab) => tab.textContent?.trim())).toEqual(['Upload', 'URL']);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');

    const input = element.querySelector<HTMLInputElement>('.NgxEditor__ImageDrop--Input');
    expect(input?.multiple).toBe(true);
    Object.defineProperty(input, 'files', { value: [pngFile(), pngFile('b.png')], configurable: true });
    input?.dispatchEvent(new Event('change'));
    render();

    expect(element.querySelector('.NgxEditor__ImagePopup')).toBeNull();
    await flush();
    await flush();

    const { editor } = fixture.componentInstance;
    expect(toHTML(editor.view.state.doc.toJSON(), editor.schema)).toBe('<p><img src="/dialog.png"><img src="/dialog.png">x</p>');
  });

  it('should insert by url and refuse unsafe urls', () => {
    open();
    element.querySelectorAll<HTMLElement>('[role="tab"]')[1].click();
    render();

    const src = element.querySelector<HTMLInputElement>('input[formControlName="src"]');
    const submit = element.querySelector<HTMLButtonElement>('form button[type="submit"]');

    if (!src || !submit) {
      throw new Error('no url form');
    }

    src.value = SCRIPT_URL;
    src.dispatchEvent(new Event('input'));
    src.dispatchEvent(new Event('blur'));
    render();
    expect(submit.disabled).toBe(true);
    expect(element.querySelector('.NgxEditor__HelpText--Error')?.textContent?.trim()).toBe('Please enter a valid URL');

    src.value = '/images/a.png';
    src.dispatchEvent(new Event('input'));
    render();
    submit.click();

    const { editor } = fixture.componentInstance;
    expect(toHTML(editor.view.state.doc.toJSON(), editor.schema)).toBe('<p><img src="/images/a.png" alt="" title="">x</p>');
  });
});

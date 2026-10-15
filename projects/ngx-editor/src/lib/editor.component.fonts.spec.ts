import { EnvironmentProviders, Provider } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TextSelection } from 'prosemirror-state';

import Editor, { EditorOptions } from './Editor';
import { NgxEditorComponent } from './editor.component';
import { NgxEditorFontLoader } from './fonts/loader';
import { provideNgxEditorConfig } from './provide-config';

describe('NgxEditorComponent: fonts', () => {
  let fixture: ComponentFixture<NgxEditorComponent>;
  let editor: Editor;
  let load: ReturnType<typeof vi.fn>;

  const create = (providers: (Provider | EnvironmentProviders)[] = [], options: EditorOptions = {}): void => {
    load = vi.fn(() => null);

    TestBed.configureTestingModule({
      imports: [NgxEditorComponent],
      providers: [{ provide: NgxEditorFontLoader, useValue: { load } }, ...providers],
    });

    editor = new Editor(options);
    fixture = TestBed.createComponent(NgxEditorComponent);
    fixture.componentRef.setInput('editor', editor);
    fixture.detectChanges();
  };

  afterEach(() => {
    editor.destroy();
  });

  it('should not load fonts for a document without one', () => {
    create([], { content: '<p>Hello</p>' });
    editor.setContent('<p>Hello world</p>');

    expect(load).not.toHaveBeenCalled();
  });

  it('should load the fonts once the document uses one', () => {
    create([provideNgxEditorConfig({ fonts: { loading: 'self-hosted' } })], { content: '<p>Hello</p>' });

    const { view } = editor;
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1, 6)));
    editor.commands.fontFamily('Vazirmatn, sans-serif').exec();
    editor.setContent('<p><span style="font-family: Amiri">Hello</span></p>');

    expect(load).toHaveBeenCalledTimes(1);
    expect(load.mock.calls[0][0]).toEqual(expect.objectContaining({ loading: 'self-hosted' }));
  });

  it('should load the fonts of initial content', () => {
    create([], { content: '<p><span style="font-family: Vazirmatn">سلام</span></p>', fonts: { loading: 'none' } });

    expect(load).toHaveBeenCalledTimes(1);
    expect(load.mock.calls[0][0]).toEqual(expect.objectContaining({ loading: 'none' }));
  });

  it('should keep only the configured fonts of pasted content', () => {
    create([provideNgxEditorConfig({ fonts: { list: ['tahoma'] } })]);

    const dataTransfer = {
      types: ['text/html'],
      getData: (type: string) => (type === 'text/html'
        ? '<p><span style="font-family: Calibri">a</span><span style="font-family: tahoma">b</span></p>'
        : ''),
    };
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: dataTransfer });
    editor.view.dom.dispatchEvent(event);

    expect(editor.view.dom.innerHTML).toContain('<p>a<span style="font-family: Tahoma, sans-serif;">b</span></p>');
  });
});

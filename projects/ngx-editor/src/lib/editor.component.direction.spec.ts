import { EnvironmentProviders, Provider } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import Editor, { EditorOptions } from './Editor';
import { NgxEditorComponent } from './editor.component';
import { NgxEditorModule } from './editor.module';
import { provideNgxEditorConfig } from './provide-config';

describe('NgxEditorComponent: direction', () => {
  let fixture: ComponentFixture<NgxEditorComponent>;
  let editor: Editor;

  const create = (
    providers: (Provider | EnvironmentProviders)[] = [],
    options: EditorOptions = {},
    imports: unknown[] = [],
  ): void => {
    TestBed.configureTestingModule({ imports: [NgxEditorComponent, ...imports], providers });

    editor = new Editor(options);
    fixture = TestBed.createComponent(NgxEditorComponent);
    fixture.componentRef.setInput('editor', editor);
    fixture.detectChanges();
  };

  const surfaceDir = (): string | null => {
    const content = (fixture.nativeElement as HTMLElement).querySelector('.NgxEditor__Content');
    return content ? content.getAttribute('dir') : 'no surface';
  };

  afterEach(() => {
    editor.destroy();
  });

  it('should inherit the direction of the page without any configuration', () => {
    create();
    expect(surfaceDir()).toBeNull();
  });

  it('should take the direction of the configured locale', () => {
    create([provideNgxEditorConfig({ locale: 'fa' })]);
    expect(surfaceDir()).toBe('rtl');
  });

  it('should take the direction of the locale configured with forRoot', () => {
    create([], {}, [NgxEditorModule.forRoot({ locale: 'ar-EG' })]);
    expect(surfaceDir()).toBe('rtl');
  });

  it('should prefer the global dir to the direction of the locale', () => {
    create([provideNgxEditorConfig({ locale: 'fa', dir: 'ltr' })]);
    expect(surfaceDir()).toBe('ltr');
  });

  it('should prefer the dir option of the editor to the global config', () => {
    create([provideNgxEditorConfig({ locale: 'fa', dir: 'ltr' })], { dir: 'auto' });
    expect(surfaceDir()).toBe('auto');
  });

  it('should prefer the [dir] input to the dir option of the editor', () => {
    create([provideNgxEditorConfig({ locale: 'fa' })], { dir: 'ltr' });

    fixture.componentRef.setInput('dir', 'rtl');
    fixture.detectChanges();
    expect(surfaceDir()).toBe('rtl');

    fixture.componentRef.setInput('dir', 'auto');
    fixture.detectChanges();
    expect(surfaceDir()).toBe('auto');

    // an unset input falls back to the editor option
    fixture.componentRef.setInput('dir', undefined);
    fixture.detectChanges();
    expect(surfaceDir()).toBe('ltr');

    // null writes no direction, so the page decides
    fixture.componentRef.setInput('dir', null);
    fixture.detectChanges();
    expect(surfaceDir()).toBeNull();
  });

  it('should put the [dir] input on the host, and only the input', () => {
    create([provideNgxEditorConfig({ locale: 'fa' })]);
    const hostElement = fixture.nativeElement as HTMLElement;
    expect(hostElement.hasAttribute('dir')).toBe(false);

    fixture.componentRef.setInput('dir', 'ltr');
    fixture.detectChanges();
    expect(hostElement.getAttribute('dir')).toBe('ltr');
  });

  it('should take the [dir] input that is set before the editor is shown', () => {
    TestBed.configureTestingModule({ imports: [NgxEditorComponent] });

    editor = new Editor();
    fixture = TestBed.createComponent(NgxEditorComponent);
    fixture.componentRef.setInput('editor', editor);
    fixture.componentRef.setInput('dir', 'rtl');
    fixture.detectChanges();

    expect(surfaceDir()).toBe('rtl');
  });

  it('should mark the surface for the autoDirection option', () => {
    create([], { autoDirection: true });

    const content = (fixture.nativeElement as HTMLElement).querySelector('.NgxEditor__Content');
    expect(content?.hasAttribute('data-auto-dir')).toBe(true);
  });

  describe('html output', () => {
    const typeAndGetValue = (): unknown => {
      const onChange = vi.fn();
      fixture.componentInstance.registerOnChange(onChange);
      fixture.componentRef.setInput('outputFormat', 'html');
      fixture.detectChanges();

      const { view } = editor;
      view.dispatch(view.state.tr.insertText('one', 1));

      return onChange.mock.calls.at(-1)?.[0];
    };

    it('should write dir="auto" with the autoDirection option of the editor', () => {
      create([], { autoDirection: true });
      expect(typeAndGetValue()).toBe('<p dir="auto">one</p>');
    });

    it('should not write dir="auto" without the option', () => {
      create();
      expect(typeAndGetValue()).toBe('<p>one</p>');
    });
  });
});

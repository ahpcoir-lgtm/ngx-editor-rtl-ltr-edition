import { EnvironmentProviders, Provider } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TextSelection } from 'prosemirror-state';

import Editor, { EditorOptions } from '../../../Editor';
import { NgxEditorFontLoader } from '../../../fonts/loader';
import { toHTML } from '../../../parsers';
import { provideNgxEditorConfig } from '../../../provide-config';
import { MenuService } from '../menu.service';
import { FontFamilyComponent } from './font-family.component';

describe('FontFamilyComponent', () => {
  let fixture: ComponentFixture<FontFamilyComponent>;
  let component: FontFamilyComponent;
  let editor: Editor;
  let load: ReturnType<typeof vi.fn>;

  const create = (providers: (Provider | EnvironmentProviders)[] = [], options: EditorOptions = {}): void => {
    load = vi.fn(() => null);

    TestBed.configureTestingModule({
      imports: [FontFamilyComponent],
      providers: [MenuService, { provide: NgxEditorFontLoader, useValue: { load } }, ...providers],
    });

    editor = new Editor({ content: '<p>Hello world</p>', ...options });
    fixture = TestBed.createComponent(FontFamilyComponent);
    fixture.debugElement.injector.get(MenuService).editor = editor;
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const buttonText = (): string => host().querySelector('.NgxEditor__Dropdown--Text')?.textContent?.trim() ?? '';
  const items = (): HTMLButtonElement[] => Array.from(host().querySelectorAll('.NgxEditor__Dropdown--Item'));

  const open = (): void => {
    host().querySelector('.NgxEditor__Dropdown--Text')?.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    fixture.detectChanges();
  };

  const select = (from: number, to: number): void => {
    const { view } = editor;
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, from, to)));
    fixture.detectChanges();
  };

  afterEach(() => {
    editor.destroy();
  });

  it('should list the default entry and the fonts, each in its own font', () => {
    create();
    open();

    const [defaultItem, first] = items();
    expect(items().length).toBe(component.fonts.length + 1);
    expect(defaultItem.textContent?.trim()).toBe('Default Font');
    expect(first.textContent?.trim()).toBe('Vazirmatn');
    expect(first.style.fontFamily).toContain('Vazirmatn');
    expect(buttonText()).toBe('Font');
  });

  it('should show the labels of the configured locale', () => {
    create([provideNgxEditorConfig({ locale: 'fa' })]);
    open();
    expect(buttonText()).toBe('قلم');
    expect(items()[0].textContent?.trim()).toBe('قلم پیش‌فرض');
    expect(items()[1].textContent?.trim()).toBe('وزیرمتن');

    TestBed.resetTestingModule();
    editor.destroy();
    create([provideNgxEditorConfig({ locale: 'ar-EG' })]);
    open();
    expect(buttonText()).toBe('الخط');
    expect(items()[0].textContent?.trim()).toBe('الخط الافتراضي');
    expect(items()[1].textContent?.trim()).toBe('فزيرمتن');
  });

  it('should list the fonts of the editor over the global config', () => {
    create([provideNgxEditorConfig({ fonts: { list: ['amiri', 'tahoma'] } })], { fonts: { list: ['cairo'] } });
    open();

    expect(items().map((item) => item.getAttribute('data-font'))).toEqual([null, 'cairo']);
  });

  it('should load the fonts of the editor when it initialises', () => {
    create([provideNgxEditorConfig({ fonts: { loading: 'self-hosted' } })], { fonts: { selfHostedBaseUrl: '/f/' } });

    expect(load).toHaveBeenCalledTimes(1);
    expect(load.mock.calls[0][0]).toEqual(expect.objectContaining({ loading: 'self-hosted', selfHostedBaseUrl: '/f/' }));
  });

  it('should apply a font, mark it active and show it on the button', () => {
    create();
    select(1, 6);
    open();
    items()[4].dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    fixture.detectChanges();

    expect(toHTML(editor.view.state.doc.toJSON())).toBe('<p><span style="font-family: Amiri, serif;">Hello</span> world</p>');
    expect(component.isDropdownOpen).toBe(false);
    expect(component.activeFont?.id).toBe('amiri');
    expect(buttonText()).toBe('Amiri');

    open();
    const active = items().filter((item) => item.getAttribute('aria-selected') === 'true');
    expect(active.map((item) => item.getAttribute('data-font'))).toEqual(['amiri']);
    expect(items()[4].classList).toContain('NgxEditor__Dropdown--Active');
  });

  it('should mark the default entry active without a font and remove the font with it', () => {
    create();
    open();
    expect(items()[0].getAttribute('aria-selected')).toBe('true');

    select(1, 6);
    component.selectFont(component.fonts[0]);
    fixture.detectChanges();
    expect(component.isActive(null)).toBe(false);

    open();
    items()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    expect(toHTML(editor.view.state.doc.toJSON())).toBe('<p>Hello world</p>');
    expect(component.activeFont).toBeNull();
    expect(buttonText()).toBe('Font');
  });

  it('should show a font that is not configured by its name', () => {
    create();
    editor.setContent('<p><span style="font-family: &quot;My Brand&quot;, serif">Hello</span></p>');
    select(2, 3);

    expect(component.activeFont).toBeUndefined();
    expect(buttonText()).toBe('My Brand');
    open();
    expect(items().filter((item) => item.getAttribute('aria-selected') === 'true')).toEqual([]);
  });

  it('should be disabled where no font can be applied', () => {
    create();
    editor.setContent('<p><img src="a.png"></p>');
    const { view } = editor;
    view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(0))));
    fixture.detectChanges();
    expect(component.canExecute).toBe(true);

    editor.setContent('<pre><code>x</code></pre>');
    select(1, 2);
    expect(component.canExecute).toBe(false);
    expect((host().querySelector('.NgxEditor__Dropdown--Text') as HTMLButtonElement).disabled).toBe(true);
  });
});

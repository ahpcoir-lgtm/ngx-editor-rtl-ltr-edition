import { Component, EnvironmentProviders, Provider, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TextSelection } from 'prosemirror-state';
import { fa, NgxEditorLocaleKey } from 'ngx-editor-rtl-ltr-edition/locales';

import Editor from '../../Editor';
import { NgxEditorComponent } from '../../editor.component';
import { provideNgxEditorConfig } from '../../provide-config';
import { toHTML } from '../../parsers';
import { NgxEditorDirection, Toolbar } from '../../types';
import { NgxEditorFloatingMenuComponent } from './floating-menu/floating-menu.component';
import { NgxEditorMenuComponent } from './menu.component';

const faText = (key: NgxEditorLocaleKey): string => fa.locals[key] ?? '';

const TOOLBAR: Toolbar = [
  ['bold', 'italic'],
  ['align_left', 'align_start', 'align_end'],
  ['dir_ltr', 'dir_rtl', 'dir_auto'],
  ['indent', 'link'],
];

@Component({
  imports: [NgxEditorMenuComponent, NgxEditorComponent, NgxEditorFloatingMenuComponent],
  template: `
    <div [attr.dir]="pageDir()">
      <ngx-editor-menu [editor]="editor" [toolbar]="toolbar" [dir]="menuDir()" />
      <ngx-editor [editor]="editor">
        <ngx-editor-floating-menu [editor]="editor" [dir]="floatingDir()" />
      </ngx-editor>
    </div>
  `,
})
class HostComponent {
  editor = new Editor({ content: '<p>one</p><p>two</p>' });
  toolbar = TOOLBAR;
  pageDir = signal<NgxEditorDirection | null | undefined>(undefined);
  menuDir = signal<NgxEditorDirection | null | undefined>(undefined);
  floatingDir = signal<NgxEditorDirection | null | undefined>(undefined);
}

describe('NgxEditorMenuComponent: direction', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const create = async (providers: (Provider | EnvironmentProviders)[] = []): Promise<void> => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideZonelessChangeDetection(), ...providers],
    });

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    await fixture.whenStable();
  };

  const query = <T extends Element = HTMLElement>(selector: string): T | null => {
    return (fixture.nativeElement as HTMLElement).querySelector<T>(selector);
  };

  const menubar = (): HTMLElement => {
    const element = query('.NgxEditor__MenuBar');
    if (!element) {
      throw new Error('no menu bar');
    }
    return element;
  };

  const getButtons = (): HTMLElement[] => Array.from(menubar().querySelectorAll<HTMLElement>('button'));

  const press = (key: string): void => {
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  };

  afterEach(() => {
    host.editor.destroy();
  });

  describe('resolution', () => {
    it('should write no direction without any configuration', async () => {
      await create();
      expect(menubar().hasAttribute('dir')).toBe(false);
      expect(query('ngx-editor-floating-menu')?.hasAttribute('dir')).toBe(false);
    });

    it('should take the direction of the locale', async () => {
      await create([provideNgxEditorConfig({ locale: 'fa' })]);
      expect(menubar().getAttribute('dir')).toBe('rtl');
      expect(query('ngx-editor-floating-menu')?.getAttribute('dir')).toBe('rtl');
      expect(query('.NgxEditor__Content')?.getAttribute('dir')).toBe('rtl');
    });

    it('should prefer the [dir] input of the menu', async () => {
      await create([provideNgxEditorConfig({ locale: 'fa' })]);

      host.menuDir.set('ltr');
      host.floatingDir.set('auto');
      await fixture.whenStable();

      expect(menubar().getAttribute('dir')).toBe('ltr');
      expect(query('ngx-editor-floating-menu')?.getAttribute('dir')).toBe('auto');
      // the editor surface has its own input
      expect(query('.NgxEditor__Content')?.getAttribute('dir')).toBe('rtl');
    });
  });

  describe('keyboard navigation', () => {
    it('should move to the next item on the left in a right to left toolbar', async () => {
      await create();
      host.menuDir.set('rtl');
      await fixture.whenStable();

      const buttons = getButtons();
      buttons[0].focus();

      press('ArrowLeft');
      expect(document.activeElement).toBe(buttons[1]);

      press('ArrowRight');
      expect(document.activeElement).toBe(buttons[0]);

      press('ArrowRight');
      expect(document.activeElement).toBe(buttons.at(-1));

      press('Home');
      expect(document.activeElement).toBe(buttons[0]);
    });

    it('should follow a right to left direction inherited from the page', async () => {
      await create();
      host.pageDir.set('rtl');
      await fixture.whenStable();

      expect(menubar().hasAttribute('dir')).toBe(false);

      const buttons = getButtons();
      buttons[0].focus();

      press('ArrowLeft');
      expect(document.activeElement).toBe(buttons[1]);
    });

    it('should keep the arrow keys of a left to right toolbar in a right to left page', async () => {
      await create();
      host.pageDir.set('rtl');
      host.menuDir.set('ltr');
      await fixture.whenStable();

      const buttons = getButtons();
      buttons[0].focus();

      press('ArrowRight');
      expect(document.activeElement).toBe(buttons[1]);
    });
  });

  describe('toolbar items', () => {
    const button = (title: string): HTMLButtonElement => {
      const element = query<HTMLButtonElement>(`button[title="${title}"]`);
      if (!element) {
        throw new Error(`no button ${title}`);
      }
      return element;
    };

    const click = async (element: HTMLElement): Promise<void> => {
      element.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
      await fixture.whenStable();
    };

    it('should set and clear the direction of the paragraph', async () => {
      await create();
      const { view } = host.editor;
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1)));
      await fixture.whenStable();

      const rtl = button('Right-to-Left Text Direction');
      await click(rtl);
      expect(toHTML(view.state.doc.toJSON())).toBe('<p dir="rtl">one</p><p>two</p>');
      expect(rtl.classList.contains('NgxEditor__MenuItem--Active')).toBe(true);
      expect(button('Left-to-Right Text Direction').classList.contains('NgxEditor__MenuItem--Active')).toBe(false);

      await click(rtl);
      expect(toHTML(view.state.doc.toJSON())).toBe('<p>one</p><p>two</p>');
      expect(rtl.classList.contains('NgxEditor__MenuItem--Active')).toBe(false);

      await click(button('Align to End'));
      expect(toHTML(view.state.doc.toJSON())).toBe('<p style="text-align: end;">one</p><p>two</p>');
    });

    it('should have the titles of the locale', async () => {
      await create([provideNgxEditorConfig({ locale: 'fa' })]);

      expect(button(faText('dir_rtl'))).toBeTruthy();
      expect(button(faText('dir_ltr'))).toBeTruthy();
      expect(button(faText('dir_auto'))).toBeTruthy();
      expect(button(faText('align_start'))).toBeTruthy();
      expect(button(faText('align_end'))).toBeTruthy();
    });

    it('should mirror only the icons drawn for a line starting on the left', async () => {
      await create();

      const mirrored = (title: string): boolean => button(title).classList.contains('NgxEditor__MenuItem--Mirror');

      expect(mirrored('Align to Start')).toBe(true);
      expect(mirrored('Align to End')).toBe(true);
      expect(mirrored('Increase Indent')).toBe(true);
      expect(mirrored('Left Align')).toBe(false);
      expect(mirrored('Right-to-Left Text Direction')).toBe(false);
      expect(mirrored('Bold')).toBe(false);
    });

    it('should keep the url input of the link popup left to right', async () => {
      await create([provideNgxEditorConfig({ locale: 'fa' })]);

      await click(button(faText('insertLink')));
      const input = query<HTMLInputElement>('ngx-link input[type="url"]');
      expect(input?.getAttribute('dir')).toBe('ltr');
    });
  });
});

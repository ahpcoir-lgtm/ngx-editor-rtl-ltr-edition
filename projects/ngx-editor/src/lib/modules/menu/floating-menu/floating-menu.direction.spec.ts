import { Component, EnvironmentProviders, Provider, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import Editor from '../../../Editor';
import { NgxEditorComponent } from '../../../editor.component';
import { provideNgxEditorConfig } from '../../../provide-config';
import { NgxEditorDirection } from '../../../types';
import { NgxEditorMenuComponent } from '../menu.component';
import { NgxEditorFloatingMenuComponent } from './floating-menu.component';

@Component({
  imports: [NgxEditorMenuComponent, NgxEditorComponent, NgxEditorFloatingMenuComponent],
  template: `
    <ngx-editor-menu [editor]="editor" [dir]="menuDir()" />
    <ngx-editor [editor]="editor" [dir]="editorDir()">
      <ngx-editor-floating-menu [editor]="editor" [dir]="floatingDir()" />
    </ngx-editor>
  `,
})
class HostComponent {
  editor = new Editor({ content: '<p>one</p>' });
  // a string, as the native `dir` property of the element accepted
  editorDir = signal<string | null | undefined>(undefined);
  menuDir = signal<NgxEditorDirection | null | undefined>(undefined);
  floatingDir = signal<NgxEditorDirection | null | undefined>(undefined);
}

describe('[dir] of <ngx-editor> and its menus', () => {
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

  const dirOf = (selector: string): string | null | undefined => {
    return (fixture.nativeElement as HTMLElement).querySelector(selector)?.getAttribute('dir');
  };

  afterEach(() => {
    host.editor.destroy();
  });

  it('should put the [dir] of <ngx-editor> on its host and on a projected floating menu', async () => {
    await create();
    expect(dirOf('ngx-editor')).toBeNull();

    host.editorDir.set('RTL');
    await fixture.whenStable();

    expect(dirOf('ngx-editor')).toBe('rtl');
    expect(dirOf('.NgxEditor__Content')).toBe('rtl');
    expect(dirOf('ngx-editor-floating-menu')).toBe('rtl');
    // the menu bar is outside the editor and has no direction of its own
    expect(dirOf('.NgxEditor__MenuBar')).toBeNull();

    // the floating menu's own input wins
    host.floatingDir.set('ltr');
    await fixture.whenStable();
    expect(dirOf('ngx-editor-floating-menu')).toBe('ltr');
  });

  it('should write no direction for a [dir] bound to null, also with a locale', async () => {
    await create([provideNgxEditorConfig({ locale: 'fa' })]);

    host.editorDir.set(null);
    host.menuDir.set(null);
    await fixture.whenStable();

    expect(dirOf('ngx-editor')).toBeNull();
    expect(dirOf('.NgxEditor__Content')).toBeNull();
    expect(dirOf('ngx-editor-floating-menu')).toBeNull();
    expect(dirOf('.NgxEditor__MenuBar')).toBeNull();

    // undefined is "not set": back to the locale
    host.editorDir.set(undefined);
    host.menuDir.set(undefined);
    await fixture.whenStable();

    expect(dirOf('.NgxEditor__Content')).toBe('rtl');
    expect(dirOf('.NgxEditor__MenuBar')).toBe('rtl');
  });

  it('should treat an unknown [dir] string as not set', async () => {
    await create([provideNgxEditorConfig({ locale: 'fa' })]);

    host.editorDir.set('sideways');
    await fixture.whenStable();

    expect(dirOf('ngx-editor')).toBeNull();
    expect(dirOf('.NgxEditor__Content')).toBe('rtl');
  });
});

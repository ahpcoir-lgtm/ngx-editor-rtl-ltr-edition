import { Component, EnvironmentInjector, createEnvironmentInjector } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { ar, fa } from 'ngx-editor-rtl-ltr-edition/locales';

import Editor from './Editor';
import { NgxEditorServiceConfig } from './editor-config.service';
import { NgxEditorService } from './editor.service';
import { NgxEditorMenuComponent } from './modules/menu/menu.component';
import { NGX_EDITOR_CONFIG_TOKEN, provideNgxEditorConfig } from './provide-config';
import { NgxEditorConfig } from './types';

const text = (service: NgxEditorService, key: string): Promise<string> => firstValueFrom(service.locals.get(key));

const buttonTitles = (fixture: ComponentFixture<unknown>): string[] => fixture.debugElement
  .queryAll(By.css('button'))
  .map((button) => (button.nativeElement as HTMLButtonElement).title);

describe('provideNgxEditorConfig', () => {
  it('should provide the config', () => {
    const config: NgxEditorConfig = { locale: 'fa', dir: 'rtl' };
    TestBed.configureTestingModule({ providers: [provideNgxEditorConfig(config)] });

    expect(TestBed.inject(NGX_EDITOR_CONFIG_TOKEN)).toBe(config);
    expect(TestBed.inject(NgxEditorServiceConfig)).toEqual({ locals: {}, icons: {}, locale: 'fa', dir: 'rtl' });
  });

  it('should configure the locale, the overrides and the direction', async () => {
    TestBed.configureTestingModule({
      providers: [provideNgxEditorConfig({ locale: 'fa', locals: { italic: 'ایتالیک' } })],
    });
    const service = TestBed.inject(NgxEditorService);

    expect(service.locale).toBe(fa);
    expect(service.dir).toBe('rtl');
    expect(await text(service, 'bold')).toBe(fa.locals.bold);
    expect(await text(service, 'italic')).toBe('ایتالیک');
  });

  it('should configure the icons', () => {
    TestBed.configureTestingModule({
      providers: [provideNgxEditorConfig({ icons: { bold: '<b>B</b>' } })],
    });
    const service = TestBed.inject(NgxEditorService);

    expect(service.getIcon('bold')).toBe('<b>B</b>');
    expect(service.getIcon('italic')).toContain('<svg');
  });

  it('should use the defaults without a config', async () => {
    TestBed.configureTestingModule({ providers: [provideNgxEditorConfig()] });
    const service = TestBed.inject(NgxEditorService);

    expect(service.dir).toBeNull();
    expect(await text(service, 'bold')).toBe('Bold');
    expect(service.getIcon('bold')).toContain('<svg');
  });

  it('should configure the editors of a child injector, such as a route, on their own', async () => {
    TestBed.configureTestingModule({ providers: [provideNgxEditorConfig({ locale: 'fa' })] });
    const root = TestBed.inject(EnvironmentInjector);
    const child = createEnvironmentInjector([provideNgxEditorConfig({ locale: 'ar' })], root);

    expect(child.get(NgxEditorService).dir).toBe('rtl');
    expect(await text(child.get(NgxEditorService), 'bold')).toBe(ar.locals.bold);
    expect(await text(TestBed.inject(NgxEditorService), 'bold')).toBe(fa.locals.bold);

    child.destroy();
  });

  describe('in a standalone component', () => {
    @Component({
      template: '<ngx-editor-menu [editor]="editor"></ngx-editor-menu>',
      imports: [NgxEditorMenuComponent],
    })
    class TestComponent {
      editor = new Editor();
    }

    it('should translate the menu', () => {
      TestBed.configureTestingModule({
        imports: [TestComponent],
        providers: [provideNgxEditorConfig({ locale: 'ar' })],
      });

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const titles = buttonTitles(fixture);
      expect(titles).toContain(ar.locals.bold);
      expect(titles).toContain(ar.locals.italic);
      expect(titles).not.toContain('Bold');

      fixture.componentInstance.editor.destroy();
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { ar, en, fa, registerNgxEditorLocale } from 'ngx-editor-rtl-ltr-edition/locales';

import { defaults } from './Locals';
import { NgxEditorModule } from './editor.module';
import { NgxEditorService } from './editor.service';
import { NgxEditorConfig } from './types';

// no config: the module without forRoot, as when a component is imported on its own
const setup = (config?: NgxEditorConfig): NgxEditorService => {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [config ? NgxEditorModule.forRoot(config) : NgxEditorModule],
  });

  return TestBed.inject(NgxEditorService);
};

const text = (service: NgxEditorService, key: string): Promise<string> => firstValueFrom(service.locals.get(key));
const texts = (service: NgxEditorService, keys: string[]): Promise<string[]> => Promise.all(
  keys.map((key) => text(service, key)),
);

const englishKeys = Object.keys(en.locals);
const arabicStrings = englishKeys.map((key) => ar.locals[key]);

describe('Locals defaults', () => {
  it('should take the English strings from the en locale', () => {
    expect(defaults).toEqual(en.locals);
  });
});

describe('NgxEditorService', () => {
  describe('locals', () => {
    it('should use the English strings without a config', async () => {
      const service = setup();

      expect(await text(service, 'bold')).toBe('Bold');
      expect(await text(service, 'placeholder')).toBe('Type Here...');
    });

    it('should use the English strings with the default forRoot config', async () => {
      TestBed.configureTestingModule({ imports: [NgxEditorModule.forRoot()] });
      const service = TestBed.inject(NgxEditorService);

      expect(await text(service, 'bold')).toBe('Bold');
    });

    it('should use the strings of the selected locale', async () => {
      const service = setup({ locale: 'fa' });

      expect(await text(service, 'bold')).toBe(fa.locals.bold);
      expect(await text(service, 'insertTable')).toBe(fa.locals.insertTable);
    });

    it('should fall back to the language of a regional locale code', async () => {
      const service = setup({ locale: 'ar-EG' });

      expect(service.locale).toBe(ar);
      expect(await text(service, 'bold')).toBe(ar.locals.bold);
    });

    it('should use the English strings for an unknown locale', async () => {
      const service = setup({ locale: 'de' });

      expect(service.locale).toBeUndefined();
      expect(await text(service, 'bold')).toBe('Bold');
    });

    it('should let the locals overrides win over the locale', async () => {
      const service = setup({ locale: 'fa', locals: { bold: 'ضخیم' } });

      expect(await text(service, 'bold')).toBe('ضخیم');
      expect(await text(service, 'italic')).toBe(fa.locals.italic);
    });

    it('should accept observable overrides', async () => {
      const bold = new BehaviorSubject('Strong');
      const service = setup({ locale: 'fa', locals: { bold } });

      expect(await text(service, 'bold')).toBe('Strong');

      bold.next('Heavy');
      expect(await text(service, 'bold')).toBe('Heavy');
    });

    it('should fall back to English for keys a registered locale does not translate', async () => {
      registerNgxEditorLocale({ code: 'x-partial', dir: 'ltr', locals: { bold: 'Fett' } });
      const service = setup({ locale: 'x-partial' });

      expect(await text(service, 'bold')).toBe('Fett');
      expect(await text(service, 'italic')).toBe('Italic');
    });

    it('should resolve every key of the locale', async () => {
      const service = setup({ locale: 'ar' });

      expect(await texts(service, englishKeys)).toEqual(arabicStrings);
    });
  });

  describe('dir', () => {
    it('should be null without a direction or locale', () => {
      expect(setup().dir).toBeNull();
      expect(setup({ locale: 'de' }).dir).toBeNull();
    });

    it('should follow the direction of the locale', () => {
      expect(setup({ locale: 'fa' }).dir).toBe('rtl');
    });

    it('should be ltr for the English locale', () => {
      expect(setup({ locale: 'en' }).dir).toBe('ltr');
    });

    it('should let the configured direction win over the locale', () => {
      expect(setup({ locale: 'fa', dir: 'ltr' }).dir).toBe('ltr');
      expect(setup({ locale: 'en', dir: 'auto' }).dir).toBe('auto');
      expect(setup({ dir: 'rtl' }).dir).toBe('rtl');
    });
  });

  describe('NgxEditorModule.forChild', () => {
    it('should configure its own service', async () => {
      TestBed.configureTestingModule({ imports: [NgxEditorModule.forChild({ locale: 'ar' })] });
      const service = TestBed.inject(NgxEditorService);

      expect(service.dir).toBe('rtl');
      expect(await text(service, 'bold')).toBe(ar.locals.bold);
    });
  });
});

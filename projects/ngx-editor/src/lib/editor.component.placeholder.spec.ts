import { Component, EnvironmentProviders, Provider, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { ar, fa } from 'ngx-editor-rtl-ltr-edition/locales';

import Editor from './Editor';
import { NgxEditorComponent } from './editor.component';
import { NgxEditorModule } from './editor.module';
import { provideNgxEditorConfig } from './provide-config';

const placeholderOf = (fixture: ComponentFixture<unknown>): string | null => {
  const element = fixture.debugElement.query(By.css('.NgxEditor__Placeholder'));
  return element ? (element.nativeElement as HTMLElement).getAttribute('data-placeholder') : null;
};

describe('NgxEditorComponent: placeholder', () => {
  describe('without [placeholder]', () => {
    let fixture: ComponentFixture<NgxEditorComponent>;
    let editor: Editor;

    const create = (providers: (Provider | EnvironmentProviders)[] = [], imports: unknown[] = []): void => {
      TestBed.configureTestingModule({ imports: [NgxEditorComponent, ...imports], providers });

      editor = new Editor();
      fixture = TestBed.createComponent(NgxEditorComponent);
      fixture.componentRef.setInput('editor', editor);
      fixture.detectChanges();
    };

    afterEach(() => {
      editor.destroy();
    });

    it('should show the English placeholder by default', () => {
      create();
      expect(placeholderOf(fixture)).toBe('Type Here...');
    });

    it('should show the placeholder of the configured locale', () => {
      create([provideNgxEditorConfig({ locale: 'fa' })]);
      expect(placeholderOf(fixture)).toBe(fa.locals.placeholder);
    });

    it('should show the placeholder of the locale configured with forRoot', () => {
      create([], [NgxEditorModule.forRoot({ locale: 'ar' })]);
      expect(placeholderOf(fixture)).toBe(ar.locals.placeholder);
    });

    it('should show the placeholder of the locals overrides', () => {
      create([provideNgxEditorConfig({ locale: 'fa', locals: { placeholder: 'متن خود را بنویسید' } })]);
      expect(placeholderOf(fixture)).toBe('متن خود را بنویسید');
    });

    it('should follow an observable placeholder', () => {
      const placeholder = new BehaviorSubject('First');
      create([provideNgxEditorConfig({ locals: { placeholder } })]);
      expect(placeholderOf(fixture)).toBe('First');

      placeholder.next('Second');
      fixture.detectChanges();
      expect(placeholderOf(fixture)).toBe('Second');
    });

    it('should stop following the locale once [placeholder] is set', () => {
      const placeholder = new BehaviorSubject('From locale');
      create([provideNgxEditorConfig({ locals: { placeholder } })]);

      fixture.componentRef.setInput('placeholder', 'From input');
      fixture.detectChanges();
      expect(placeholderOf(fixture)).toBe('From input');

      placeholder.next('Changed locale');
      fixture.detectChanges();
      expect(placeholderOf(fixture)).toBe('From input');
    });

    it('should stop following the locale when destroyed', () => {
      const placeholder = new BehaviorSubject('From locale');
      create([provideNgxEditorConfig({ locals: { placeholder } })]);

      fixture.destroy();
      expect(placeholder.observed).toBe(false);
    });
  });

  describe('with [placeholder]', () => {
    @Component({
      template: '<ngx-editor [editor]="editor" [placeholder]="placeholder()"></ngx-editor>',
      imports: [NgxEditorComponent],
    })
    class TestComponent {
      editor = new Editor();
      placeholder = signal<string | undefined>(undefined);
    }

    let fixture: ComponentFixture<TestComponent>;

    const create = (placeholder?: string): void => {
      TestBed.configureTestingModule({
        imports: [TestComponent],
        providers: [provideNgxEditorConfig({ locale: 'fa' })],
      });

      fixture = TestBed.createComponent(TestComponent);
      fixture.componentInstance.placeholder.set(placeholder);
      fixture.detectChanges();
    };

    afterEach(() => {
      fixture.componentInstance.editor.destroy();
    });

    it('should win over the locale', () => {
      create('Write something');
      expect(placeholderOf(fixture)).toBe('Write something');
    });

    it('should update live', () => {
      create('Write something');

      fixture.componentInstance.placeholder.set('Write more');
      fixture.detectChanges();
      expect(placeholderOf(fixture)).toBe('Write more');
    });

    it('should hide the placeholder when it is empty', () => {
      create('Write something');

      fixture.componentInstance.placeholder.set('');
      fixture.detectChanges();
      expect(placeholderOf(fixture)).toBeNull();
    });

    it('should hide the placeholder when it becomes undefined, as before', () => {
      create('Write something');

      fixture.componentInstance.placeholder.set(undefined);
      fixture.detectChanges();
      expect(placeholderOf(fixture)).toBeNull();
    });

    it('should not show the locale placeholder when it is bound to undefined, as before', () => {
      create(undefined);
      expect(placeholderOf(fixture)).toBeNull();
    });
  });
});

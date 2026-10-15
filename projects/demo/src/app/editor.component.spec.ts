import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { NgxEditorModule } from 'ngx-editor-rtl-ltr-edition';
import { fa } from 'ngx-editor-rtl-ltr-edition/locales';

import { EditorComponent } from './editor.component';
import { AppCustomMenuComponent } from './components/custom-menu/custom-menu.component';

describe('EditorComponent', () => {
  let component: EditorComponent;
  let fixture: ComponentFixture<EditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        EditorComponent,
        NgxEditorModule,
        AppCustomMenuComponent,
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should render editor', () => {
    const compiled: DebugElement = fixture.debugElement;
    expect(compiled.query(By.css('.NgxEditor'))).toBeTruthy();
    expect(compiled.query(By.css('.ProseMirror'))).toBeTruthy();
  });

  it('should render menubar', () => {
    const compiled: DebugElement = fixture.debugElement;
    expect(compiled.query(By.css('.NgxEditor__MenuBar'))).toBeTruthy();
  });

  describe('direction and language', () => {
    const query = (selector: string): HTMLElement => fixture.nativeElement.querySelector(selector);

    const choose = async (name: string, value: string): Promise<void> => {
      const radio: HTMLInputElement = fixture.nativeElement.querySelector(`input[name="${name}"][value="${value}"]`);
      radio.checked = true;
      radio.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      await fixture.whenStable();
    };

    it('should show the direction toolbar items', () => {
      expect(query('button[title="Right-to-Left Text Direction"]')).toBeTruthy();
      expect(query('button[title="Left-to-Right Text Direction"]')).toBeTruthy();
      expect(query('button[title="Align to Start"]')).toBeTruthy();
    });

    it('should start with the direction of each paragraph from its text', () => {
      const content = query('.NgxEditor__Content');
      expect(content.hasAttribute('data-auto-dir')).toBe(true);
      expect(content.hasAttribute('dir')).toBe(false);
    });

    it('should switch the direction of the editor', async () => {
      await choose('direction', 'rtl');
      expect(query('.NgxEditor__Content').getAttribute('dir')).toBe('rtl');
      expect(query('.NgxEditor__Content').hasAttribute('data-auto-dir')).toBe(false);

      await choose('direction', 'ltr');
      expect(query('.NgxEditor__Content').getAttribute('dir')).toBe('ltr');

      await choose('direction', 'auto');
      expect(query('.NgxEditor__Content').hasAttribute('data-auto-dir')).toBe(true);
    });

    it('should keep the content when the editor is created again', async () => {
      const text = query('.NgxEditor__Content').textContent;

      await choose('direction', 'rtl');
      expect(query('.NgxEditor__Content').textContent).toBe(text);
      expect(component.doc.value).toBeTruthy();
    });

    it('should switch the language of the toolbar', async () => {
      await choose('locale', 'fa');
      expect(query('.NgxEditor__MenuBar').getAttribute('dir')).toBe('rtl');
      expect(query(`button[title="${fa.locals.dir_rtl}"]`)).toBeTruthy();

      await choose('locale', 'en');
      expect(query('.NgxEditor__MenuBar').getAttribute('dir')).toBe('ltr');
      expect(query('button[title="Right-to-Left Text Direction"]')).toBeTruthy();
    });
  });
});

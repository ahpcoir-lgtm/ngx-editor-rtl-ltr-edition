import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DropdownComponent } from './dropdown.component';
import { MenuService } from '../menu.service';
import Editor from '../../../Editor';
import { ComponentRef } from '@angular/core';
import { TextSelection } from 'prosemirror-state';

describe('DropdownComponent', () => {
  let component: DropdownComponent;
  let fixture: ComponentFixture<DropdownComponent>;
  let componentRef: ComponentRef<DropdownComponent>;
  let menuService: MenuService;
  let editor: Editor;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DropdownComponent],
      providers: [MenuService],
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DropdownComponent);
    const { componentRef: ref, componentInstance: instance } = fixture;
    component = instance;
    componentRef = ref;
    menuService = fixture.debugElement.injector.get(MenuService);

    editor = new Editor();
    menuService.editor = editor;

    componentRef.setInput('group', 'heading');
    componentRef.setInput('items', ['h1', 'h2']);

    fixture.detectChanges();
  });

  afterEach(() => {
    editor.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should switch a heading back to a paragraph', () => {
    editor.setContent('<h1>Hello</h1>');
    componentRef.setInput('items', ['paragraph', 'h1', 'h2']);
    fixture.detectChanges();

    expect(component.activeItem).toBe('h1');

    component.selectItem('paragraph');

    expect(editor.view.state.doc.firstChild.type.name).toBe('paragraph');
    expect(component.activeItem).toBe('paragraph');
  });

  describe('table group', () => {
    const TABLE = '<table><tbody><tr><td><p>a</p></td><td><p>b</p></td></tr></tbody></table>';

    const placeCursorInFirstCell = (): void => {
      const { view } = editor;
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 4)));
      fixture.detectChanges();
    };

    beforeEach(() => {
      editor.setContent(TABLE);
      componentRef.setInput('group', 'table');
      componentRef.setInput('items', ['tableVariantBordered', 'tableVariantStriped', 'cellAlignCenter', 'setCellBackground']);
      componentRef.setInput('presets', [['#c5def5', '#fef2c0']]);
      placeCursorInFirstCell();
    });

    const cellAttrs = (): Record<string, unknown> => editor.view.state.doc.firstChild.firstChild.firstChild.attrs;

    it('should mark every active item and keep the name of the group', () => {
      component.selectItem('cellAlignCenter');
      fixture.detectChanges();

      expect(component.activeItems).toEqual(['tableVariantBordered', 'cellAlignCenter']);
      expect(component.activeItem).toBeNull();
      expect(component.disabledItems).toEqual(['tableVariantBordered']);
      expect((fixture.nativeElement as HTMLElement).querySelector('.NgxEditor__Dropdown--Text').textContent.trim()).toBe('Table');
    });

    it('should disable the table items outside a table', () => {
      editor.setContent('<p>text</p>');
      fixture.detectChanges();

      expect(component.disabledItems).toEqual(component.items());
      expect(component.isDropdownDisabled).toBe(true);
    });

    it('should open the colour palette and set the cell background', () => {
      const host = fixture.nativeElement as HTMLElement;
      const openPalette = (): void => {
        host.querySelector('.NgxEditor__Dropdown--Text')?.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
        fixture.detectChanges();
        host.querySelectorAll('.NgxEditor__Dropdown--Item')[3].dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
        fixture.detectChanges();
      };

      openPalette();
      expect(component.isDropdownOpen).toBe(true);
      expect(component.isPaletteOpen).toBe(true);
      const swatches = host.querySelectorAll<HTMLButtonElement>('.NgxEditor__Dropdown--Palette .NgxEditor__Color');
      expect(swatches.length).toBe(2);

      swatches[1].dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
      fixture.detectChanges();

      expect(cellAttrs()['background']).toBe('#fef2c0');
      expect(component.isDropdownOpen).toBe(false);
      expect(component.activeColors).toEqual(['#fef2c0']);
      expect(component.activeItems).toContain('setCellBackground');

      openPalette();
      expect(host.querySelector('.NgxEditor__Dropdown--Palette .NgxEditor__Color--Active')?.getAttribute('title')).toBe('#fef2c0');

      host.querySelector<HTMLButtonElement>('.NgxEditor__Dropdown--Palette .NgxEditor__MenuItem--Button')
        .dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
      expect(cellAttrs()['background']).toBeNull();
    });
  });
});

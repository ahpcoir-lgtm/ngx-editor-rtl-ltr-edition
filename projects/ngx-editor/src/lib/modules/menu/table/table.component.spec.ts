import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Node as ProseMirrorNode, Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';

import { TABLE_GRID_SIZE, TableComponent } from './table.component';
import { MenuService } from '../../../modules/menu/menu.service';
import Editor from '../../../Editor';
import { Table } from '../MenuCommands';

interface Context {
  fixture: ComponentFixture<TableComponent>;
  component: TableComponent;
  editor: Editor;
}

// a table component with a menu service and an editor, created for each test
const useTableComponent = (): Context => {
  const context = {} as Context;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableComponent],
      providers: [MenuService],
    })
      .compileComponents();

    context.fixture = TestBed.createComponent(TableComponent);
    context.component = context.fixture.componentInstance;

    const menuService = context.fixture.debugElement.injector.get(MenuService);
    context.editor = new Editor();
    menuService.editor = context.editor;

    context.fixture.detectChanges();
  });

  afterEach(() => {
    context.editor.destroy();
  });

  return context;
};

const findTable = (editor: Editor): ProseMirrorNode | undefined => {
  let table: ProseMirrorNode | undefined;
  editor.view.state.doc.descendants((node) => {
    if (node.type.name === 'table') {
      table = node;
    }
    return !table;
  });
  return table;
};

const cellTypes = (table: ProseMirrorNode): string[][] => {
  const rows: string[][] = [];
  table.forEach((row) => {
    const cells: string[] = [];
    row.forEach((cell) => cells.push(cell.type.name));
    rows.push(cells);
  });
  return rows;
};

describe('TableComponent', () => {
  const context = useTableComponent();

  it('should create', () => {
    expect(context.component).toBeTruthy();
  });

  it('should insert a table with a header row of one empty header cell per column and the given body rows', () => {
    const { view } = context.editor;
    expect(Table.insert(2, 3)(view.state, view.dispatch)).toBe(true);

    const table = findTable(context.editor);
    expect(table).toBeTruthy();
    expect(cellTypes(table)).toEqual([
      ['table_header', 'table_header', 'table_header'],
      ['table_cell', 'table_cell', 'table_cell'],
      ['table_cell', 'table_cell', 'table_cell'],
    ]);
    expect(table.child(0).firstChild.attrs['colspan']).toBe(1);
    expect(table.child(0).textContent).toBe('');
  });

  it('should insert a table without a header row', () => {
    const { view } = context.editor;
    expect(Table.insert(2, 2, { headerRow: false })(view.state, view.dispatch)).toBe(true);

    expect(cellTypes(findTable(context.editor))).toEqual([
      ['table_cell', 'table_cell'],
      ['table_cell', 'table_cell'],
    ]);
  });

  it('should insert a table with only a header row and with the given attributes', () => {
    const { view } = context.editor;
    const attrs = { variant: 'striped', width: 'full', align: 'center' };
    expect(Table.insert(0, 2, { attrs })(view.state, view.dispatch)).toBe(true);

    const table = findTable(context.editor);
    expect(cellTypes(table)).toEqual([['table_header', 'table_header']]);
    expect(table.attrs).toEqual({ ...attrs, dir: null });
  });

  it('should not insert a table without rows or columns', () => {
    const { state } = context.editor.view;

    expect(Table.insert(0, 3, { headerRow: false })(state)).toBe(false);
    expect(Table.insert(2, 0)(state)).toBe(false);
    expect(Table.insert(1.5, 2)(state)).toBe(false);
  });

  it('should not insert a table when the schema has no table nodes', () => {
    const schema = new Schema({
      nodes: {
        doc: { content: 'paragraph+' },
        paragraph: { content: 'text*', toDOM: () => ['p', 0] },
        text: {},
      },
    });
    const state = EditorState.create({ schema });

    expect(Table.insert(2, 3)(state)).toBe(false);
  });

  it('should not accept fractional rows or columns', () => {
    context.component.form.patchValue({ rows: 1.5, cols: 2 });
    expect(context.component.form.valid).toBe(false);

    context.component.form.patchValue({ rows: 2, cols: 1.5 });
    expect(context.component.form.valid).toBe(false);

    context.component.form.patchValue({ rows: 2, cols: 3 });
    expect(context.component.form.valid).toBe(true);
  });
});

describe('TableComponent dialog', () => {
  const context = useTableComponent();

  const open = (): HTMLElement => {
    const host = context.fixture.nativeElement as HTMLElement;
    host.querySelector('button')?.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    context.fixture.detectChanges();
    return host;
  };

  const gridCell = (host: HTMLElement, row: number, col: number): HTMLElement => {
    const rows = host.querySelectorAll('.NgxEditor__TableGrid--Row');
    return rows[row - 1].querySelectorAll<HTMLElement>('.NgxEditor__TableGrid--Cell')[col - 1];
  };

  const sizeText = (host: HTMLElement): string | undefined => {
    return host.querySelector('.NgxEditor__TableGrid--Size')?.textContent?.trim();
  };

  it('should show a 10 × 10 grid with the size of the form and the header row option checked', () => {
    const host = open();

    expect(host.querySelectorAll('.NgxEditor__TableGrid--Cell').length).toBe(TABLE_GRID_SIZE * TABLE_GRID_SIZE);
    expect(host.querySelectorAll('.NgxEditor__TableGrid--Selected').length).toBe(9);
    expect(sizeText(host)).toBe('3 × 3');
    expect(host.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true);
  });

  it('should choose the size by hovering the grid', () => {
    const host = open();

    gridCell(host, 3, 4).dispatchEvent(new MouseEvent('mouseenter'));
    context.fixture.detectChanges();

    expect(sizeText(host)).toBe('3 × 4');
    expect(host.querySelectorAll('.NgxEditor__TableGrid--Selected').length).toBe(12);
    expect(gridCell(host, 3, 4).classList).toContain('NgxEditor__TableGrid--Selected');
    expect(gridCell(host, 4, 4).classList).not.toContain('NgxEditor__TableGrid--Selected');
    expect(context.component.form.getRawValue()).toEqual({ rows: 3, cols: 4, headerRow: true });
  });

  it('should insert the hovered size on click, the header row counting as a row', () => {
    const host = open();

    gridCell(host, 3, 4).dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    context.fixture.detectChanges();

    expect(cellTypes(findTable(context.editor))).toEqual([
      Array(4).fill('table_header'),
      Array(4).fill('table_cell'),
      Array(4).fill('table_cell'),
    ]);
    expect(context.component.showPopup).toBe(false);
  });

  it('should insert without a header row when the option is unchecked', () => {
    open();
    context.component.form.patchValue({ rows: 2, cols: 2, headerRow: false });
    context.component.insertTable(new Event('submit'));

    expect(cellTypes(findTable(context.editor))).toEqual([['table_cell', 'table_cell'], ['table_cell', 'table_cell']]);
  });

  it('should change the size with the arrow keys within the grid and insert with Enter', () => {
    const host = open();
    const grid = host.querySelector<HTMLElement>('.NgxEditor__TableGrid');
    const press = (key: string): void => {
      grid.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      context.fixture.detectChanges();
    };

    press('ArrowRight');
    press('ArrowDown');
    press('ArrowDown');
    expect(context.component.form.getRawValue()).toMatchObject({ rows: 5, cols: 4 });

    press('ArrowLeft');
    press('ArrowUp');
    expect(context.component.form.getRawValue()).toMatchObject({ rows: 4, cols: 3 });

    context.component.selectGridSize(10, 1);
    press('ArrowDown');
    press('ArrowLeft');
    expect(context.component.form.getRawValue()).toMatchObject({ rows: 10, cols: 1 });

    press('Enter');
    expect(findTable(context.editor)?.childCount).toBe(10);
  });

  it('should swap Left and Right in a right to left menu', () => {
    const host = open();
    const grid = host.querySelector<HTMLElement>('.NgxEditor__TableGrid');
    const style = vi.spyOn(window, 'getComputedStyle').mockReturnValue({ direction: 'rtl' } as CSSStyleDeclaration);

    try {
      grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      expect(context.component.form.getRawValue()).toMatchObject({ rows: 3, cols: 4 });
    } finally {
      style.mockRestore();
    }
  });
});

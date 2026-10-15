import { Component, OnDestroy, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, inject, input } from '@angular/core';
import { EditorView } from 'prosemirror-view';
import { Observable, Subscription } from 'rxjs';
import { AsyncPipe } from '@angular/common';

import { NgxEditorService } from '../../../editor.service';
import { SanitizeHtmlPipe } from '../../../pipes/sanitize/sanitize-html.pipe';
import { HTML } from '../../../trustedTypesUtil';
import { TBItems, ToolbarItem } from '../../../types';
import { MenuService } from '../menu.service';
import { isMirroredIcon } from '../mirrored-icons';
import { ToggleCommands } from '../MenuCommands';

@Component({
  selector: 'ngx-toggle-command',
  templateUrl: './toggle-command.component.html',
  styleUrls: ['./toggle-command.component.scss'],
  // `Default` instead of `Eager`: the Angular 19-21 linker only knows `Default` (both mean check-always)
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [AsyncPipe, SanitizeHtmlPipe],
})
export class ToggleCommandComponent implements OnInit, OnDestroy {
  private ngxeService = inject(NgxEditorService);
  private menuService = inject(MenuService);
  private cdr = inject(ChangeDetectorRef);

  readonly toolbarItem = input<ToolbarItem>(undefined);

  get name(): TBItems {
    return this.toolbarItem() as TBItems;
  }

  get mirrored(): boolean {
    return isMirroredIcon(this.name);
  }

  html: HTML;
  editorView: EditorView;
  isActive = false;
  disabled = false;
  private updateSubscription: Subscription;

  toggle(): void {
    const { state, dispatch } = this.editorView;
    const command = ToggleCommands[this.name];
    command.toggle()(state, dispatch);
  }

  onMouseClick(e: MouseEvent): void {
    e.preventDefault();

    if (e.button !== 0) {
      return;
    }

    this.toggle();
  }

  onKeydown(): void {
    this.toggle();
  }

  update = (view: EditorView): void => {
    const { state } = view;
    const command = ToggleCommands[this.name];
    this.isActive = command.isActive(state);
    this.disabled = !command.canExecute(state);
  };

  getTitle(name: string): Observable<string> {
    return this.ngxeService.locals.get(name);
  }

  ngOnInit(): void {
    this.html = this.ngxeService.getIcon(this.name);

    this.editorView = this.menuService.editor.view;

    this.updateSubscription = this.menuService.editor.update.subscribe((view: EditorView) => {
      this.update(view);
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.updateSubscription.unsubscribe();
  }
}

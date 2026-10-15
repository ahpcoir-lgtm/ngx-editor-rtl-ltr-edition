import {
  Component, ElementRef, HostBinding, HostListener, OnDestroy, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, inject,
  InputSignalWithTransform, input,
} from '@angular/core';
import type { VirtualElement } from '@floating-ui/core';
import { autoPlacement, computePosition, detectOverflow, offset } from '@floating-ui/dom';
import { NodeSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { asyncScheduler, fromEvent, Subscription } from 'rxjs';
import { throttleTime } from 'rxjs/operators';

import { NgxEditorError } from 'ngx-editor-rtl-ltr-edition/utils';
import Editor from '../../../Editor';
import { NgxEditorComponent } from '../../../editor.component';
import { NgxEditorService } from '../../../editor.service';
import { normalizeDirection, resolveDirection } from '../../../resolve-direction';
import { NgxEditorDirection } from '../../../types';
import { BubbleComponent } from '../bubble/bubble.component';

interface BubblePosition {
  top: number;
  left: number;
}

@Component({
  selector: 'ngx-editor-floating-menu',
  templateUrl: './floating-menu.component.html',
  styleUrls: ['./floating-menu.component.scss'],
  // `Default` instead of `Eager`: the Angular 19-21 linker only knows `Default` (both mean check-always)
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [BubbleComponent],
})
export class NgxEditorFloatingMenuComponent implements OnInit, OnDestroy {
  el = inject<ElementRef<HTMLElement>>(ElementRef);
  private cdr = inject(ChangeDetectorRef);
  private ngxeService = inject(NgxEditorService);
  // the `<ngx-editor>` this menu is projected into, whose `[dir]` it follows when it has none of its own
  private parentEditor = inject(NgxEditorComponent, { optional: true });

  @HostBinding('style') get display(): Partial<CSSStyleDeclaration> {
    return {
      visibility: this.showMenu ? 'visible' : 'hidden',
      opacity: this.showMenu ? '1' : '0',
      top: `${this.posTop}px`,
      left: `${this.posLeft}px`,
    };
  }

  @HostBinding('attr.dir') get hostDir(): NgxEditorDirection | null {
    const dir = this.dir();
    return resolveDirection(dir !== undefined ? dir : this.parentEditor?.dir(), this.editor(), this.ngxeService);
  }

  private get view(): EditorView {
    return this.editor().view;
  }

  readonly editor = input<Editor>(undefined);
  readonly autoPlace = input(false);
  /** direction of the bubble menu; else the editor's `dir` option, the global `dir` or the locale's direction */
  // typed explicitly: the library compiles with strict: false, which would drop null and undefined from the
  // inferred type in the .d.ts, and strictTemplates apps could not bind `null`
  readonly dir: InputSignalWithTransform<NgxEditorDirection | null | undefined, string | null | undefined> = input<
    NgxEditorDirection | null | undefined, string | null | undefined
  >(undefined, {
    transform: normalizeDirection,
  });

  private posLeft = 0;
  private posTop = 0;
  private showMenu = false;
  private updateSubscription: Subscription;
  private dragging = false;
  private resizeSubscription: Subscription;

  @HostListener('document:mousedown', ['$event']) onMouseDown(e: MouseEvent): void {
    // e.target is retargeted to the shadow host when used inside a shadow root
    const path = e.composedPath();
    const target = path[0] as Node;

    if (path.includes(this.el.nativeElement) && target.nodeName !== 'INPUT') {
      e.preventDefault();
      return;
    }

    this.dragging = true;
  }

  @HostListener('document:keydown', ['$event']) onKeyDown(e: KeyboardEvent): void {
    const target = e.composedPath()[0] as Node;

    if (target.nodeName === 'INPUT') {
      return;
    }

    this.dragging = true;
    this.hide();
  }

  @HostListener('document:mouseup', ['$event']) onMouseUp(e: MouseEvent): void {
    const path = e.composedPath();
    const target = path[0] as Node;

    if (target.nodeName === 'INPUT') {
      // preventing mouseup on number inputs leaves the browser spinner pressed
      return;
    }

    if (path.includes(this.el.nativeElement)) {
      e.preventDefault();
      return;
    }

    this.dragging = false;
    this.useUpdate();
  }

  @HostListener('document:keyup', ['$event']) onKeyUp(e: KeyboardEvent): void {
    const target = e.composedPath()[0] as Node;

    if (target.nodeName === 'INPUT') {
      return;
    }

    this.dragging = false;
    this.useUpdate();
  }

  private useUpdate(): void {
    if (!this.view) {
      return;
    }

    this.update(this.view);
  }

  private hide(): void {
    this.showMenu = false;
    this.cdr.markForCheck();
  }

  private show(): void {
    this.showMenu = true;
    this.cdr.markForCheck();
  }

  private async calculateBubblePosition(view: EditorView): Promise<BubblePosition> {
    const {
      state: { selection },
    } = view;
    const { from, to } = selection;

    const start = view.coordsAtPos(from);
    const end = view.coordsAtPos(to);

    const selectionElement: VirtualElement = {
      getBoundingClientRect() {
        if (selection instanceof NodeSelection) {
          const node = view.nodeDOM(from) as HTMLElement;
          return node.getBoundingClientRect();
        }

        const { top, left } = start;
        const { bottom, right } = end;

        return {
          x: left,
          y: top,
          top,
          bottom,
          left,
          right,
          width: right - left,
          height: bottom - top,
        };
      },
    };

    // the floating bubble itself
    const bubbleEl = this.el.nativeElement;

    const { x: left, y: top } = await computePosition(selectionElement, bubbleEl, {
      placement: 'top',
      middleware: [
        offset(5),
        this.autoPlace()
          && autoPlacement({
            boundary: view.dom,
            padding: 5,
            allowedPlacements: ['top', 'bottom'],
          }),
        {
          // prevent overflow on right and left side
          // since only top and bottom placements are allowed
          // autoplacement can't handle overflows on the right and left
          name: 'overflowMiddleware',
          async fn(middlewareArgs) {
            const overflow = await detectOverflow(middlewareArgs, {
              boundary: view.dom,
              padding: 5,
            });

            // overflows left
            if (overflow.left > 0) {
              return {
                x: middlewareArgs.x + overflow.left,
              };
            }

            // overflows right
            if (overflow.right > 0) {
              return {
                x: middlewareArgs.x - overflow.right,
              };
            }

            return {};
          },
        },
      ].filter(Boolean),
    });

    return {
      left,
      top,
    };
  }

  private canShowMenu(view: EditorView): boolean {
    const { state } = view;
    const { selection } = state;
    const { empty } = selection;

    if (selection instanceof NodeSelection) {
      if (selection.node.type.name === 'image') {
        return false;
      }
    }

    const hasFocus = this.view.hasFocus();

    if (!hasFocus || empty || this.dragging) {
      this.hide();
      return false;
    }

    return true;
  }

  private update(view: EditorView): void {
    const canShowMenu = this.canShowMenu(view);

    if (!canShowMenu) {
      this.hide();
      return;
    }

    this.calculateBubblePosition(this.view).then(({ top, left }) => {
      if (!this.canShowMenu(this.view)) {
        this.hide();
        return;
      }

      this.posLeft = left;
      this.posTop = top;

      this.show();
    });
  }

  ngOnInit(): void {
    const editor = this.editor();
    if (!editor) {
      throw new NgxEditorError('Required editor instance to initialize floating menu component');
    }

    this.updateSubscription = editor.update.subscribe((view) => {
      this.update(view);
    });

    this.resizeSubscription = fromEvent(window, 'resize')
      .pipe(throttleTime(500, asyncScheduler, { leading: true, trailing: true }))
      .subscribe(() => {
        this.useUpdate();
      });
  }

  ngOnDestroy(): void {
    this.updateSubscription.unsubscribe();
    this.resizeSubscription.unsubscribe();
  }
}

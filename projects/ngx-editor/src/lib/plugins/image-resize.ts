import { ApplicationRef, ComponentRef, createComponent, Injector, OutputRefSubscription } from '@angular/core';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import { Command, NodeSelection, Plugin, PluginKey } from 'prosemirror-state';
import { EditorView, NodeView } from 'prosemirror-view';

import { ImageViewAction, ImageViewComponent } from '../components/image-view/image-view.component';
import {
  deleteImage, getImageLink, setImageAlign, setImageAttrs, setImageCaption, setImageLink,
} from '../commands/ImageCommands';
import { getImageUploadConfig, uploadImageFiles } from './image-upload';

class ImageRezieView implements NodeView {
  dom: HTMLElement;
  view: EditorView;
  getPos: () => number | undefined;

  applicationRef: ApplicationRef;
  imageComponentRef: ComponentRef<ImageViewComponent>;
  resizeSubscription: OutputRefSubscription;
  actionSubscription: OutputRefSubscription;

  node: ProseMirrorNode;
  updating = false;

  constructor(node: ProseMirrorNode, view: EditorView, getPos: () => number | undefined, injector: Injector) {
    this.applicationRef = injector.get(ApplicationRef);

    // create component ref; the element injector of the editor gives it the config of the editor (locale, icons)
    this.imageComponentRef = createComponent(ImageViewComponent, {
      environmentInjector: this.applicationRef.injector,
      elementInjector: injector,
    });

    // Attach to the view so that the change detector knows to run
    this.applicationRef.attachView(this.imageComponentRef.hostView);

    this.view = view;
    this.node = node;
    this.getPos = getPos;

    this.setNodeAttributes(node);
    this.imageComponentRef.setInput('view', view);
    this.imageComponentRef.setInput('accept', getImageUploadConfig(view.state)?.accept.join(',') ?? '');

    this.dom = this.imageComponentRef.location.nativeElement;

    this.resizeSubscription = this.imageComponentRef.instance.imageResize.subscribe(() => {
      this.handleResize();
    });

    this.actionSubscription = this.imageComponentRef.instance.action.subscribe((action) => {
      this.handleAction(action);
    });
  }

  private setNodeAttributes(node: ProseMirrorNode): void {
    const { attrs } = node;
    const isFigure = node.type.name === 'figure';

    this.imageComponentRef.setInput('kind', isFigure ? 'figure' : 'image');
    this.imageComponentRef.setInput('src', attrs['src']);
    this.imageComponentRef.setInput('alt', attrs['alt']);
    this.imageComponentRef.setInput('title', attrs['title']);
    this.imageComponentRef.setInput('outerWidth', attrs['width']);
    this.imageComponentRef.setInput('height', isFigure ? null : attrs['height'] ?? null);
    this.imageComponentRef.setInput('align', attrs['align'] ?? null);
    this.imageComponentRef.setInput('caption', isFigure ? attrs['caption'] ?? '' : null);
    this.imageComponentRef.setInput('href', this.getLink(node));
  }

  private getLink(node: ProseMirrorNode): string | null {
    if (node.type.name === 'figure') {
      return node.attrs['href'] ?? null;
    }

    const link = this.view.state.schema.marks['link']?.isInSet(node.marks);
    return link?.attrs['href'] ?? null;
  }

  handleResize = (): void => {
    if (this.updating) {
      return;
    }

    const pos = this.getPos();
    if (pos === undefined) {
      return;
    }

    const { state, dispatch } = this.view;
    const { tr } = state;

    // the width is set and the height follows the aspect ratio
    const transaction = tr.setNodeMarkup(pos, undefined, {
      ...this.node.attrs,
      width: this.imageComponentRef.instance.outerWidth(),
      ...('height' in this.node.attrs ? { height: null } : {}),
    });

    const resolvedPos = transaction.doc.resolve(pos);
    const newSelection = new NodeSelection(resolvedPos);

    transaction.setSelection(newSelection);
    dispatch(transaction);
  };

  private run(command: Command): void {
    command(this.view.state, this.view.dispatch);
  }

  handleAction(action: ImageViewAction): void {
    const pos = this.getPos();
    if (pos === undefined) {
      return;
    }

    switch (action.type) {
      case 'align':
        this.run(setImageAlign(action.align, pos));
        break;
      case 'alt':
        this.run(setImageAttrs({ alt: action.alt || null }, pos));
        break;
      case 'caption':
        this.run(setImageCaption(action.caption, pos));
        break;
      case 'link':
        if (getImageLink(this.view.state, pos) !== action.href) {
          this.run(setImageLink(action.href, pos));
        }
        break;
      case 'replaceUrl':
        this.run(setImageAttrs({ src: action.src }, pos));
        break;
      case 'replaceFile':
        uploadImageFiles(this.view, [action.file], { pos, replace: true });
        break;
      case 'delete':
        this.run(deleteImage(pos));
        break;
      default:
        break;
    }

    this.view.focus();
  }

  update(node: ProseMirrorNode): boolean {
    if (node.type !== this.node.type) {
      return false;
    }

    this.node = node;
    this.updating = true;
    this.setNodeAttributes(node);
    this.updating = false;
    return true;
  }

  // events of the toolbar (buttons, inputs) and the resize handles are handled by the component
  stopEvent(event: Event): boolean {
    const target = event.target as HTMLElement | null;
    return Boolean(target?.closest?.('.NgxEditor__ImageToolbar, .NgxEditor__ResizeHandle'));
  }

  ignoreMutation(): boolean {
    return true;
  }

  selectNode(): void {
    this.imageComponentRef.setInput('selected', true);
  }

  deselectNode(): void {
    this.imageComponentRef.instance.closePanel();
    this.imageComponentRef.setInput('selected', false);
  }

  destroy(): void {
    this.resizeSubscription.unsubscribe();
    this.actionSubscription.unsubscribe();
    this.applicationRef.detachView(this.imageComponentRef.hostView);
    this.imageComponentRef.destroy();
  }
}

const imageResizePlugin = (injector: Injector): Plugin => {
  const createView = (node: ProseMirrorNode, view: EditorView, getPos: () => number | undefined): NodeView => {
    return new ImageRezieView(node, view, getPos, injector);
  };

  return new Plugin({
    key: new PluginKey('image-resize'),
    props: {
      nodeViews: {
        image: createView,
        figure: createView,
      },
    },
  });
};

export default imageResizePlugin;

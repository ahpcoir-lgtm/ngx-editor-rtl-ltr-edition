import { ApplicationRef, ComponentRef, Injector, OutputRefSubscription, createComponent } from '@angular/core';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import { Command, Plugin, PluginKey } from 'prosemirror-state';
import { EditorView, NodeView } from 'prosemirror-view';

import { VideoViewAction, VideoViewComponent } from '../components/video-view/video-view.component';
import { deleteVideo, setVideoAlign, setVideoCaption, setVideoUrl, setVideoWidth } from '../commands/VideoCommands';
import { getVideoConfig } from './video-embed';
import { uploadVideoFiles } from './video-upload';

class VideoNodeView implements NodeView {
  dom: HTMLElement;

  private applicationRef: ApplicationRef;
  private componentRef: ComponentRef<VideoViewComponent>;
  private subscriptions: OutputRefSubscription[];
  private selected = false;
  private editable: boolean;
  private views: Set<VideoNodeView>;

  constructor(
    private node: ProseMirrorNode,
    private view: EditorView,
    private getPos: () => number | undefined,
    { injector, views }: { injector: Injector; views: Set<VideoNodeView> },
  ) {
    this.views = views;
    this.applicationRef = injector.get(ApplicationRef);

    // the element injector of the editor gives the component the config of the editor (locale, icons)
    this.componentRef = createComponent(VideoViewComponent, {
      environmentInjector: this.applicationRef.injector,
      elementInjector: injector,
    });
    this.applicationRef.attachView(this.componentRef.hostView);

    this.componentRef.setInput('view', view);
    this.editable = view.editable;
    this.componentRef.setInput('editable', this.editable);
    views.add(this);
    this.setNodeAttributes(node);
    this.dom = this.componentRef.location.nativeElement;

    const { instance } = this.componentRef;
    this.subscriptions = [
      instance.resizeEnd.subscribe(() => this.handleResize()),
      instance.action.subscribe((action) => this.handleAction(action)),
    ];
  }

  /** follows `view.editable` (the editable plugin changes it without updating node views) */
  syncEditable(): void {
    if (this.editable !== this.view.editable) {
      this.editable = this.view.editable;
      this.componentRef.setInput('editable', this.editable);
    }
  }

  private setNodeAttributes(node: ProseMirrorNode): void {
    const { attrs } = node;
    const ref = this.componentRef;

    ref.setInput('kind', attrs['kind'] === 'file' ? 'file' : 'embed');
    ref.setInput('src', attrs['src'] ?? '');
    ref.setInput('provider', attrs['provider'] ?? null);
    ref.setInput('poster', attrs['poster'] ?? null);
    ref.setInput('caption', attrs['caption'] ?? '');
    ref.setInput('align', attrs['align'] ?? null);
    ref.setInput('ratio', attrs['ratio'] ?? '16/9');
    ref.setInput('outerWidth', attrs['width'] ?? '');
    ref.setInput('config', getVideoConfig(this.view.state));
  }

  private run(command: Command): void {
    command(this.view.state, this.view.dispatch);
  }

  private handleResize(): void {
    const pos = this.getPos();
    if (pos !== undefined) {
      this.run(setVideoWidth(this.componentRef.instance.outerWidth() || null, pos));
    }
  }

  private handleAction(action: VideoViewAction): void {
    const pos = this.getPos();
    if (pos === undefined) {
      return;
    }

    switch (action.type) {
      case 'align':
        this.run(setVideoAlign(action.align, pos));
        break;
      case 'width':
        this.run(setVideoWidth(action.width, pos));
        break;
      case 'caption':
        this.run(setVideoCaption(action.caption, pos));
        break;
      case 'replaceUrl':
        this.run(setVideoUrl(action.url, pos));
        break;
      case 'replaceFile':
        uploadVideoFiles(this.view, [action.file], { pos, replace: true });
        break;
      case 'delete':
        this.run(deleteVideo(pos));
        break;
      default:
        break;
    }

    // the width keys keep the focus on the resize handle
    if (action.type !== 'width' || !this.dom.contains(this.dom.ownerDocument.activeElement)) {
      this.view.focus();
    }
  }

  update(node: ProseMirrorNode): boolean {
    if (node.type !== this.node.type) {
      return false;
    }

    this.node = node;
    this.setNodeAttributes(node);
    return true;
  }

  // the toolbar and the handle handle their own events, and so does the player of a selected video
  stopEvent(event: Event): boolean {
    const target = event.target as HTMLElement | null;
    if (target?.closest?.('.NgxEditor__VideoToolbar, .NgxEditor__VideoResize')) {
      return true;
    }

    return this.selected && target?.tagName === 'VIDEO';
  }

  ignoreMutation(): boolean {
    return true;
  }

  selectNode(): void {
    this.selected = true;
    this.componentRef.setInput('selected', true);
  }

  deselectNode(): void {
    this.selected = false;
    this.componentRef.instance.closePanel();
    this.componentRef.setInput('selected', false);
  }

  destroy(): void {
    this.views.delete(this);
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    this.applicationRef.detachView(this.componentRef.hostView);
    this.componentRef.destroy();
  }
}

/** the node view of `video` nodes: the player, an overlay that selects it, a resize handle and the video toolbar */
const videoViewPlugin = (injector: Injector): Plugin => {
  const views = new Set<VideoNodeView>();

  return new Plugin({
    key: new PluginKey('video-view'),
    props: {
      nodeViews: {
        video: (node, view, getPos) => new VideoNodeView(node, view, getPos, { injector, views }),
      },
    },
    view: () => ({
      update: () => views.forEach((nodeView) => nodeView.syncEditable()),
    }),
  });
};

export default videoViewPlugin;

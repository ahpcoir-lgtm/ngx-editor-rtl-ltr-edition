import { NodeSelection, TextSelection } from 'prosemirror-state';

import Editor from '../Editor';
import { toHTML } from '../parsers';
import {
  deleteVideo, getVideoTarget, insertVideo, insertVideoUrl, isVideoSelected, setVideoAlign, setVideoAttrs, setVideoCaption,
  setVideoUrl, setVideoWidth,
} from './VideoCommands';

const SCRIPT_URL = `${'javascript'}:alert(1)`;
const ID = 'dQw4w9WgXcQ';

describe('video commands', () => {
  let editor: Editor;

  const create = (content = '<p>abcd</p>', options: ConstructorParameters<typeof Editor>[0] = {}): void => {
    editor = new Editor({ content, ...options });
  };

  const run = (command: ReturnType<typeof insertVideo>): boolean => command(editor.view.state, editor.view.dispatch);

  const output = (): string => toHTML(editor.view.state.doc.toJSON(), editor.schema);

  const cursor = (pos: number): void => {
    const { view } = editor;
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, pos)));
  };

  const videoPos = (): number => {
    let pos = -1;
    editor.view.state.doc.descendants((node, at) => {
      if (node.type.name === 'video') {
        pos = at;
      }
    });
    return pos;
  };

  afterEach(() => {
    editor.destroy();
  });

  it('should insert the video of a link at the cursor, split the paragraph and select it', () => {
    create();
    cursor(3);

    expect(run(insertVideoUrl(`https://youtu.be/${ID}?t=10`, { caption: 'A song' }))).toBe(true);

    const html = output();
    expect(html).toMatch(/^<p>ab<\/p><figure data-type="video" data-kind="embed" data-provider="youtube">/);
    expect(html).toContain(`src="https://www.youtube-nocookie.com/embed/${ID}?start=10" title="A song"`);
    expect(html).toContain('<figcaption>A song</figcaption></figure><p>cd</p>');
    expect(isVideoSelected(editor.view.state)).toBe(true);
    expect(getVideoTarget(editor.view.state)?.node.attrs['caption']).toBe('A song');
  });

  it('should refuse links of hosts that are not allowed and unsafe urls', () => {
    create();
    expect(run(insertVideoUrl('https://evil.example.com/v/1'))).toBe(false);
    expect(run(insertVideoUrl(SCRIPT_URL))).toBe(false);
    expect(run(insertVideo({ kind: 'embed', src: 'http://www.youtube.com/embed/x' }))).toBe(false);
    expect(run(insertVideo({ kind: 'file', src: SCRIPT_URL }))).toBe(false);
    expect(output()).toBe('<p>abcd</p>');
  });

  it('should follow the video config of the editor', () => {
    create('<p>x</p>', { video: { allowedHosts: ['video.example.com'], youtubeNoCookie: false } });

    expect(run(insertVideoUrl(`https://youtu.be/${ID}`))).toBe(false);
    expect(run(insertVideoUrl('https://video.example.com/embed/7'))).toBe(true);
    expect(output()).toContain('data-provider="custom"');
    expect(output()).toContain('src="https://video.example.com/embed/7"');
  });

  it('should insert a video file with a sanitized poster', () => {
    create();
    expect(run(insertVideo({ kind: 'file', src: '/media/a.mp4', poster: SCRIPT_URL, width: '50%', align: 'center' }))).toBe(true);

    const video = getVideoTarget(editor.view.state)?.node;
    expect(video?.attrs).toEqual(expect.objectContaining({ kind: 'file', src: '/media/a.mp4', poster: null, provider: null }));
    expect(output()).toContain('<video controls="" preload="metadata" src="/media/a.mp4"></video>');
    expect(output()).toContain('style="width: 50%; margin-inline: auto;"');
  });

  it('should align, resize, caption and replace the selected video', () => {
    create(`<p>a</p><iframe src="https://www.youtube.com/embed/${ID}"></iframe>`);
    const pos = videoPos();
    editor.view.dispatch(editor.view.state.tr.setSelection(NodeSelection.create(editor.view.state.doc, pos)));
    const state = () => editor.view.state;

    expect(run(setVideoAlign('end'))).toBe(true);
    expect(run(setVideoAlign('end'))).toBe(false);
    expect(run(setVideoAlign('left' as 'end'))).toBe(false);
    expect(getVideoTarget(state())?.node.attrs['align']).toBe('end');

    expect(run(setVideoWidth('75%'))).toBe(true);
    expect(run(setVideoWidth('wide'))).toBe(false);
    expect(output()).toContain('style="width: 75%; float: inline-end; margin-inline-start: 1em;"');
    expect(run(setVideoWidth(null))).toBe(true);
    expect(getVideoTarget(state())?.node.attrs['width']).toBeNull();

    expect(run(setVideoCaption('  A   caption '))).toBe(true);
    expect(output()).toContain('<figcaption>A caption</figcaption>');
    expect(run(setVideoCaption(null))).toBe(true);
    expect(output()).not.toContain('figcaption');

    expect(run(setVideoUrl('https://vimeo.com/76979871'))).toBe(true);
    expect(getVideoTarget(state())?.node.attrs).toEqual(expect.objectContaining({
      provider: 'vimeo',
      src: 'https://player.vimeo.com/video/76979871',
    }));
    expect(run(setVideoUrl('https://evil.example.com/1'))).toBe(false);

    expect(run(setVideoAttrs({ ratio: '4:3', src: SCRIPT_URL }))).toBe(false);
    expect(run(setVideoAttrs({ ratio: '4:3' }))).toBe(true);
    expect(output()).toContain('aspect-ratio: 4 / 3;');
    expect(isVideoSelected(state())).toBe(true);

    expect(run(deleteVideo())).toBe(true);
    expect(output()).toBe('<p>a</p>');
    expect(run(deleteVideo())).toBe(false);
  });

  it('should work on the video at a position and through EditorCommands', () => {
    create('<p>a</p><video src="/a.mp4"></video>');
    const pos = videoPos();

    expect(run(setVideoAlign('start', pos))).toBe(true);
    expect(setVideoAlign('start', 0)(editor.view.state)).toBe(false);

    editor.commands.focus().insertVideo('https://www.aparat.com/v/abc12').exec();
    expect(output()).toContain('data-provider="aparat"');

    editor.commands.setVideoWidth('50%').setVideoCaption('Aparat').exec();
    expect(output()).toContain('<figcaption>Aparat</figcaption>');
    editor.commands.deleteVideo().exec();
    expect(output()).not.toContain('aparat');
  });
});

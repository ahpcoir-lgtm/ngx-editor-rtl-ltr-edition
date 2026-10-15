import type { Command, EditorState } from 'prosemirror-state';

import type { NgxEditorResolvedVideoConfig } from '../video/types';
import { type VideoInsertAttrs, insertVideoUrl, isVideoSelected } from './VideoCommands';

class Video {
  // inserts the video of a link or embed code, or replaces the selected node; refused for a host that is not allowed
  insert(url: string, attrs: VideoInsertAttrs = {}, config?: NgxEditorResolvedVideoConfig): Command {
    return insertVideoUrl(url, attrs, config);
  }

  // a video is selected
  isActive(state: EditorState): boolean {
    return isVideoSelected(state);
  }
}

export default Video;

# NgxEditor

<p align="center">
  <a href="https://github.com/sibiraj-s/ngx-editor">
   <img src="./sketch/ngx-editor.svg" alt="ngxEditor">
  </a>
</p>
<p align="center">The Rich Text Editor for Angular, Built on ProseMirror</p>
<p align="center">
  <a href="https://github.com/sibiraj-s/ngx-editor/actions">
    <img alt="Tests" src="https://github.com/sibiraj-s/ngx-editor/workflows/Tests/badge.svg">
  </a>
  <a href="https://www.npmjs.com/package/ngx-editor">
    <img alt="npm version" src="https://badgen.net/npm/v/ngx-editor">
  </a>
  <a href="https://www.npmjs.com/package/ngx-editor">
    <img alt="npm" src="https://badgen.net/npm/dm/ngx-editor">
  </a>
  <a href="https://www.npmjs.com/package/ngx-editor">
    <img alt="npm" src="https://badgen.net/npm/dt/ngx-editor">
  </a>
  <br />
  <a href="https://github.com/sibiraj-s/ngx-editor/blob/master/LICENSE">
    <img alt="licence" src="https://badgen.net/npm/license/ngx-editor">
  </a>
</p>

> A simple rich text editor for angular applications built with ProseMirror. It is a drop in and easy-to-use editor
> and can be easily extended using prosemirror plugins to build any additional or missing features

## Getting Started

[demo] | [edit on stackblitz][stackblitz] | [documentation] | [migrating from other editors][migration]

### Installation

Install via Package managers such as [npm] or [pnpm] or [yarn]

```bash
npm install ngx-editor
# or
pnpm install ngx-editor
# or
yarn add ngx-editor
```

### Usage

**Note**: By default the editor comes with minimal features. Refer the [demo] and [documentation] for more details and examples.

Component

```ts
import { NgxEditorComponent, NgxEditorMenuComponent, Editor } from 'ngx-editor';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'editor-component',
  templateUrl: 'editor.component.html',
  styleUrls: ['editor.component.scss'],
  standalone: true,
  imports: [NgxEditorComponent, NgxEditorMenuComponent, FormsModule],
})
export class EditorComponent implements OnInit, OnDestroy {
  html = '';
  editor: Editor;
  ngOnInit(): void {
    this.editor = new Editor();
  }

  ngOnDestroy(): void {
    this.editor.destroy();
  }
}
```

Then in HTML

```html
<div class="NgxEditor__Wrapper">
  <ngx-editor-menu [editor]="editor"> </ngx-editor-menu>
  <ngx-editor
    [editor]="editor"
    [(ngModel)]="html"
    [disabled]="false"
    [placeholder]="'Type here...'"
  ></ngx-editor>
</div>
```

Note: Input can be a HTML string or a jsonDoc

## Fonts

Add `'font_family'` to the toolbar for a font menu (each name drawn in its font, in the language of the `locale`). It
offers 13 Arabic-script web fonts (Vazirmatn, Noto Sans Arabic, Noto Naskh Arabic, Amiri, Cairo, Tajawal,
IBM Plex Sans Arabic, Almarai, Harmattan, Lateef, Scheherazade New, El Messiri, Reem Kufi) and Tahoma, Arial,
Times New Roman and Courier New. The font is written as `<span style="font-family: …">`.

```ts
provideNgxEditorConfig({
  fonts: {
    list: ['vazirmatn', 'amiri', 'tahoma'], // optional: ids of built-in fonts or your own NgxEditorFont objects
    extend: [{ id: 'brand', family: "'Brand Sans', sans-serif", label: { en: 'Brand', fa: 'برند' } }],
    loading: 'self-hosted', // 'google' (default) | 'self-hosted' | 'none'
  },
});
// or per editor: new Editor({ fonts: { ... } }), which wins over the global config
```

- `google`: one stylesheet from `fonts.googleapis.com` (`googleFontsUrl` for a mirror).
- `self-hosted`: `@font-face` rules for the WOFF2 files that ship in the package (`fonts/`). Copy them with an asset
  glob in `angular.json` (served from `/assets/ngx-editor-fonts/`, or set `selfHostedBaseUrl`):

  ```json
  "assets": [
    { "glob": "**/*", "input": "node_modules/ngx-editor-rtl-ltr-edition/fonts", "output": "assets/ngx-editor-fonts" }
  ]
  ```

- `none`: the app loads the fonts itself (`buildFontFaceCss()` and `buildGoogleFontsUrl()` help, also for pages
  that show the exported HTML).

The fonts are loaded once per document, when a font menu is shown or the document uses a font. Pasted content keeps
only the fonts of the list (`list: []` drops every pasted font). The fonts are licensed under the SIL Open Font
License 1.1, see `THIRD_PARTY_NOTICES.md`.

## Images

The `image` toolbar item opens a dialog with an **Upload** tab (file picker and drop zone) and a **URL** tab. Pasting or
dropping image files uploads them too. Configure the upload globally or per editor (the editor wins):

```ts
provideNgxEditorConfig({
  image: {
    uploadHandler: async (file, { onProgress, signal }) => {
      // send the file to your server, report onProgress(0..100), stop when signal is aborted, return the url
      return { src: 'https://cdn.example.com/a.png', alt: file.name };
    },
    maxSize: 5 * 1024 * 1024, // bytes, after resizing
    accept: ['image/png', 'image/jpeg', 'image/webp'], // default: common raster types
    resize: { maxWidth: 1600, quality: 0.85 }, // canvas downscale, aspect ratio kept (GIF/SVG untouched)
    onError: (error) => console.error(error.code, error.message),
  },
});
// or new Editor({ image: { ... } }); editor.events emits imageUploadStart/Progress, imageUploaded, imageUploadError …
```

Without an `uploadHandler` images are embedded as data URLs, with a warning (`onWarning`, console) above
`base64WarnSize` (500 KB). A selected image shows a toolbar: alignment (start / center / end, mirrored in RTL), alt
text, caption (`<figure data-type="image">`), link, replace and delete; the resize handles are on the inline-end
corners. Every image and link URL goes through `sanitizeUrl` (`ngx-editor-rtl-ltr-edition/utils`): `javascript:`,
`data:text/*` and SVG data URLs are dropped. Add `styles/content.css` to pages that show the HTML, for aligned and
captioned images.

## Browser Compatibility

Mostly works on all Evergreen-Browsers like

- Google Chrome
- Microsoft Edge
- Mozilla Firefox
- Safari
- Opera

## Collaborative Editing

See https://sibiraj-s.github.io/ngx-editor/#/collab

## Icons

Icons are from https://fonts.google.com/icons

## Contributing

All contributions are welcome. See [CONTRIBUTING.md](./.github/CONTRIBUTING.md) to get started.

[npm]: https://www.npmjs.com/
[pnpm]: https://pnpm.io/
[yarn]: https://yarnpkg.com/lang/en/
[documentation]: https://sibiraj-s.github.io/ngx-editor
[demo]: https://ngx-editor.stackblitz.io/
[stackblitz]: https://stackblitz.com/edit/ngx-editor
[migration]: https://sibiraj-s.github.io/ngx-editor/#/migration

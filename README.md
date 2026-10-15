# ngx-editor RTL/LTR edition

**English** | [فارسی](./README.fa.md)

[![Tests](https://github.com/ahpcoir-lgtm/ngx-editor-rtl-ltr-edition/actions/workflows/tests.yml/badge.svg)](https://github.com/ahpcoir-lgtm/ngx-editor-rtl-ltr-edition/actions/workflows/tests.yml)
[![Live demo](https://img.shields.io/badge/demo-GitHub%20Pages-1e5aa8)](https://ahpcoir-lgtm.github.io/ngx-editor-rtl-ltr-edition/)
[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz_small.svg)](https://stackblitz.com/github/ahpcoir-lgtm/ngx-editor-rtl-ltr-edition)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

A rich text editor for Angular, built on [ProseMirror](https://prosemirror.net/), with first-class right-to-left
and left-to-right text, Persian and Arabic locales and fonts, richer tables, image upload and video embeds.

`ngx-editor-rtl-ltr-edition` is an independent fork of **[ngx-editor](https://github.com/sibiraj-s/ngx-editor)** by
[Sibiraj](https://github.com/sibiraj-s) (MIT). It is **not** the official ngx-editor package and is not endorsed by
its author. Everything the fork builds on — the editor component, the menus, the schema, the commands — is
Sibiraj's work; thank you! The fork is maintained by Amir Farid Abbasi and Amin Abbasi.

- [Live demo](https://ahpcoir-lgtm.github.io/ngx-editor-rtl-ltr-edition/) ·
  [Open in StackBlitz](https://stackblitz.com/github/ahpcoir-lgtm/ngx-editor-rtl-ltr-edition) ·
  [Changelog](./CHANGELOG.md) · [Design notes](./FORK_DESIGN.md)

## Contents

- [What the fork adds](#what-the-fork-adds)
- [Compatibility](#compatibility)
- [Installation](#installation)
- [Migrating from ngx-editor](#migrating-from-ngx-editor)
- [Quick start](#quick-start)
- [Direction (RTL / LTR / auto)](#direction-rtl--ltr--auto)
- [Locales](#locales)
- [Toolbar](#toolbar)
- [Tables](#tables)
- [Fonts](#fonts)
- [Images](#images)
- [Videos](#videos)
- [Rendering the HTML: `styles/content.css`](#rendering-the-html-stylescontentcss)
- [Security](#security)
- [Commands, custom menus and more](#commands-custom-menus-and-more)
- [Live demo and development](#live-demo-and-development)
- [License and credits](#license-and-credits)

## What the fork adds

- **Text direction.** `dir` (`ltr` | `rtl` | `auto`) on paragraphs, headings, quotes, code blocks, lists, list items,
  task lists and tables; toolbar items `dir_ltr`, `dir_rtl`, `dir_auto`; Ctrl + Right Shift / Ctrl + Left Shift like
  Word; a `[dir]` input on the editor and the menus; `autoDirection` (each paragraph follows its first strong letter,
  in the editor and in the HTML); `align_start` / `align_end`; menus, popups, icons and keyboard navigation mirror in
  RTL; logical CSS everywhere.
- **Locales.** Built-in `en`, `fa` (Persian) and `ar` (Arabic) dictionaries, `locale: 'fa'`, your own locales with
  `registerNgxEditorLocale`, single-key overrides.
- **Tables.** Grid picker with a header-row option, table styles (bordered / striped / borderless), full width and
  alignment, cell alignment (horizontal and vertical), a cell colour palette, column resizing and arrow keys that
  work in RTL tables.
- **Fonts.** A `font_family` menu with 13 Arabic-script web fonts (Vazirmatn, Noto Sans/Naskh Arabic, Amiri, Cairo,
  Tajawal, IBM Plex Sans Arabic, …) and system fonts; Google Fonts or self-hosted WOFF2 files shipped in the package.
- **Images.** Upload tab with drag & drop, paste and drop of files, your own upload handler with progress and cancel,
  limits and client-side resizing, base64 fallback, alignment, captions (`<figure>`), alt text, links, replace,
  direction-aware resize handles and an event stream.
- **Videos.** YouTube (privacy-enhanced by default), Vimeo and Aparat links or embed code with a host allowlist, video
  file upload, alignment, width, captions.
- **Output stylesheet.** `styles/content.css` renders the exported HTML like the editor shows it.
- **Security.** Every link, image and video URL goes through `sanitizeUrl` (loaded HTML, pasted HTML, commands,
  dialogs, upload results).
- **Angular 19 – 22** from one build, `provideNgxEditorConfig()` for standalone apps.

The complete list, including every change to the emitted HTML, is in the [changelog](./CHANGELOG.md).

## Compatibility

| | |
| --- | --- |
| Angular | 19, 20, 21, 22 (`@angular/*` peer dependencies `>=19.0.0`) |
| Browsers | evergreen browsers: Chrome, Edge, Firefox, Safari, Opera |
| Rendering | browser, server-side rendering and hydration, zoneless and zone.js apps |

The package is built with the Angular 22 toolchain and only uses APIs that exist in Angular 19.0. How this is
verified:

- the unit tests of the library and the demo (Angular 22, zoneless) run on every push;
- the CI job **compat** packs the library and builds a small app against it for Angular 19, 20, 21 and 22 with
  `strictTemplates` and `skipLibCheck: false` ([scripts/compat](./scripts/compat)); the Angular 19.2 app was also
  built locally before the release;
- `npm run check:strict` type-checks the fork's own code with `strict: true`.

Run the same check yourself: `npm run build:lib && npm run compat -- --angular 19 --dir ../compat-19`.

## Installation

```bash
npm install ngx-editor-rtl-ltr-edition
```

> **Not on npm yet.** Until the first release is published, install it from GitHub or from a local build.

From a local build (works today):

```bash
git clone https://github.com/ahpcoir-lgtm/ngx-editor-rtl-ltr-edition
cd ngx-editor-rtl-ltr-edition
npm install
npm run build:lib
npm pack ./dist/ngx-editor-rtl-ltr-edition   # creates ngx-editor-rtl-ltr-edition-0.1.0.tgz

# in your app
npm install ../ngx-editor-rtl-ltr-edition/ngx-editor-rtl-ltr-edition-0.1.0.tgz
```

From GitHub: the repository contains the sources, not the built package, so `npm install github:…` does not work
directly. Download the `package` artifact (a `.tgz`) of a successful
[Tests run](https://github.com/ahpcoir-lgtm/ngx-editor-rtl-ltr-edition/actions/workflows/tests.yml) or of a release
and install that file as above.

The dependencies (ProseMirror, Floating UI, tslib) are installed with it; Angular and RxJS come from your app.

## Migrating from ngx-editor

1. Replace the package: `npm uninstall ngx-editor && npm install ngx-editor-rtl-ltr-edition`.
2. Rename the imports, including the secondary entry points:

   ```ts
   // before
   import { Editor, NgxEditorModule } from 'ngx-editor';
   import { sanitizeUrl } from 'ngx-editor/utils';
   // after
   import { Editor, NgxEditorModule } from 'ngx-editor-rtl-ltr-edition';
   import { sanitizeUrl } from 'ngx-editor-rtl-ltr-edition/utils';
   ```

   Entry points: `ngx-editor-rtl-ltr-edition`, `/schema`, `/commands`, `/helpers`, `/input-rules`, `/utils` and the
   new `/locales`.

Everything else stays: the `<ngx-editor>`, `<ngx-editor-menu>` and `<ngx-editor-floating-menu>` selectors, the
`Editor` options, toolbar item names, schema node and mark names, commands, `NgxEditorModule.forRoot()`, CSS class
names and the Trusted Types policy name `ngx-editor`. Documents written by ngx-editor load unchanged.

Changes to the emitted HTML (details in the [changelog](./CHANGELOG.md#changes-to-the-emitted-html-and-json)):

- blocks with a direction get `dir="…"`; `text-align: left` is now written;
- indentation is `margin-inline-start` instead of `margin-left` (`data-indent` unchanged);
- a new table gets one header cell per column; table/cell options are written as `data-*` plus inline styles;
- fonts are kept as `<span style="font-family: …">`; captioned images are `<figure data-type="image">`, videos
  `<figure data-type="video">`;
- unsafe link and image URLs (`javascript:`, SVG data URLs, …) are dropped.

Documents that use none of the new features are written exactly as before.

## Quick start

Standalone component:

```ts
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Editor, NgxEditorComponent, NgxEditorMenuComponent, Toolbar } from 'ngx-editor-rtl-ltr-edition';

@Component({
  selector: 'app-editor',
  imports: [NgxEditorComponent, NgxEditorMenuComponent, FormsModule],
  template: `
    <div class="NgxEditor__Wrapper">
      <ngx-editor-menu [editor]="editor" [toolbar]="toolbar"></ngx-editor-menu>
      <ngx-editor [editor]="editor" [(ngModel)]="html" [placeholder]="'Type here...'"></ngx-editor>
    </div>
  `,
})
export class EditorComponent implements OnDestroy {
  editor = new Editor();
  html = '';
  toolbar: Toolbar = [
    ['bold', 'italic', 'underline'],
    ['ordered_list', 'bullet_list'],
    [{ heading: ['h1', 'h2', 'h3'] }],
    ['align_start', 'align_center', 'align_end'],
    ['dir_rtl', 'dir_ltr'],
    ['link', 'image'],
  ];

  ngOnDestroy(): void {
    this.editor.destroy();
  }
}
```

Configure it once for the app (optional):

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideNgxEditorConfig } from 'ngx-editor-rtl-ltr-edition';

bootstrapApplication(AppComponent, {
  providers: [provideNgxEditorConfig({ locale: 'fa' })],
});
```

`provideNgxEditorConfig` in the `providers` of a route configures only the editors of that route.

NgModule apps:

```ts
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxEditorModule } from 'ngx-editor-rtl-ltr-edition';

@NgModule({
  imports: [FormsModule, NgxEditorModule.forRoot({ locale: 'fa', dir: 'rtl' })],
})
export class AppModule {}
```

The value can be an HTML string or a ProseMirror JSON document; reactive forms (`formControlName`) work too. With
`outputFormat="html"` the model is always HTML.

## Direction (RTL / LTR / auto)

The direction of the editor surface and the menus is resolved in this order: the `[dir]` input › the `Editor` option
`dir` › the global `dir` › the direction of the locale › inherited from the page.

```html
<ngx-editor-menu [editor]="editor" dir="rtl"></ngx-editor-menu>
<ngx-editor [editor]="editor" dir="rtl" [(ngModel)]="html"></ngx-editor>
```

```ts
// per editor
const editor = new Editor({ dir: 'rtl' });

// each paragraph and heading takes the direction of its first strong letter, in the editor and in the html output
const mixed = new Editor({ autoDirection: true });

// globally
provideNgxEditorConfig({ dir: 'rtl' });
```

- `[dir]="null"` writes no `dir` attribute (the page decides).
- Toolbar items `dir_ltr`, `dir_rtl`, `dir_auto` set the direction of the selected blocks; a table changes as a
  whole only when all of it is selected. New lists and quotes keep the direction of the text they wrap, and Enter
  keeps the direction.
- **Shortcuts:** Ctrl + Right Shift → right to left, Ctrl + Left Shift → left to right (as in Word and Windows). Turn
  them off with `features: { directionShortcuts: false }` (or `keyboardShortcuts: false`).
- `align_start` / `align_end` align to the start or end of the line in either direction.
- `toHTML(doc, schema, { autoDirection: true })` writes `dir="auto"` like an editor with `autoDirection`.
- From code: `editor.commands.setTextDirection('rtl').exec()`, `toggleTextDirection('ltr')`.

## Locales

```ts
provideNgxEditorConfig({ locale: 'fa' }); // 'en' | 'fa' | 'ar' | a registered code; 'fa-IR' falls back to 'fa'
```

The locale sets the language of the toolbar, dialogs, messages and the placeholder, and the direction of the menus
(unless `dir` is set). Override single keys with `locals`:

```ts
provideNgxEditorConfig({
  locale: 'fa',
  locals: {
    bold: 'ضخیم',
    placeholder: 'متن خود را بنویسید…',
  },
});
```

Add a language of your own (missing keys fall back to English):

```ts
import { fa, registerNgxEditorLocale } from 'ngx-editor-rtl-ltr-edition/locales';

registerNgxEditorLocale({
  code: 'ur',
  dir: 'rtl',
  locals: { bold: 'بولڈ', italic: 'ترچھا' },
});

// or start from a built-in dictionary
registerNgxEditorLocale({ code: 'fa-AF', dir: 'rtl', locals: { ...fa.locals, bold: 'پررنگ' } });

provideNgxEditorConfig({ locale: 'ur' });
```

`getNgxEditorLocale(code)` and `isRtlLocale(code)` are exported from the same entry point. `locals` values may also
be `Observable<string>`s (for apps that translate at runtime).

## Toolbar

```ts
import { DEFAULT_TOOLBAR, TABLE_DROPDOWN_ITEMS, Toolbar } from 'ngx-editor-rtl-ltr-edition';

const toolbar: Toolbar = [
  ['undo', 'redo'],
  ['bold', 'italic', 'underline', 'strike'],
  ['code', 'blockquote'],
  ['superscript', 'subscript'],
  ['ordered_list', 'bullet_list', 'task_list'],
  [{ heading: ['paragraph', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }],
  ['font_family'],
  ['link', 'image', 'video'], // or [{ link: { showOpenInNewTab: false } }, 'image', 'video']
  ['table', { table: TABLE_DROPDOWN_ITEMS }],
  ['text_color', 'background_color'],
  ['align_start', 'align_center', 'align_end', 'align_justify'],
  ['align_left', 'align_right'],
  ['dir_ltr', 'dir_rtl', 'dir_auto'],
  ['indent', 'outdent'],
  ['horizontal_rule', 'format_clear'],
];
```

| Item | |
| --- | --- |
| `bold`, `italic`, `underline`, `strike`, `code`, `superscript`, `subscript` | marks |
| `blockquote`, `ordered_list`, `bullet_list`, `task_list`, `horizontal_rule` | blocks |
| `{ heading: [...] }` | heading dropdown (`paragraph`, `h1` … `h6`) |
| `link`, `image`, `table`, `{ table: [...] }` | insert dialogs, table actions |
| `text_color`, `background_color`, `format_clear` | colours, clear formatting |
| `align_left`, `align_center`, `align_right`, `align_justify` | alignment |
| `indent`, `outdent`, `undo`, `redo` | indentation, history |
| **new:** `align_start`, `align_end` | logical alignment |
| **new:** `dir_ltr`, `dir_rtl`, `dir_auto` | block direction |
| **new:** `font_family` | font menu |
| **new:** `video` | video dialog |

`DEFAULT_TOOLBAR`, `TOOLBAR_MINIMAL` (the default of the menu) and `TOOLBAR_FULL` are exported. The new items are
not in the built-in toolbars, so upgrading changes nothing until you add them. Menu inputs: `editor`, `toolbar`,
`disabled`, `colorPresets`, `customMenuRef`, `dropdownPlacement` (`top` | `bottom`) and `dir`.

## Tables

`table` opens a grid picker (up to 10 × 10) with number inputs and a "header row" option. The table dropdown
(`TABLE_DROPDOWN_ITEMS`, used by the built-in toolbars) has the upstream row/column/merge/header actions plus:

- `setCellBackground` (colour palette from `colorPresets`), `clearCellBackground`;
- `cellAlignStart` / `Center` / `End`, `cellVAlignTop` / `Middle` / `Bottom`;
- `tableVariantBordered` / `Striped` / `Borderless`, `tableWidthAuto` / `Full`, `tableAlignStart` / `Center` / `End`.

Pick the ones you want:

```ts
const toolbar: Toolbar = [
  ['table', { table: ['addRowAfter', 'addColumnAfter', 'deleteRow', 'deleteColumn', 'mergeCells', 'setCellBackground', 'tableVariantStriped', 'deleteTable'] }],
];
```

Commands for your own buttons are exported from `ngx-editor-rtl-ltr-edition`: `setCellBackground`, `cellAlign`,
`cellVAlign`, `tableVariant`, `tableWidth`, `tableAlign`, `setCellsAttr`, `setTableAttr`. Column resizing and
Left/Right arrow keys follow the direction of RTL tables.

## Fonts

Add `'font_family'` to the toolbar. Each font is shown in its own typeface, with its name in the locale's language.

```ts
provideNgxEditorConfig({
  fonts: {
    list: ['vazirmatn', 'amiri', 'tahoma'], // ids of built-in fonts or your own font objects; default: all built-ins
    extend: [
      { id: 'brand', family: "'Brand Sans', sans-serif", label: { en: 'Brand', fa: 'برند' } },
    ],
    loading: 'self-hosted', // 'google' (default) | 'self-hosted' | 'none'
  },
});
// or per editor: new Editor({ fonts: { ... } }), which wins over the global config
```

Built-in web fonts: Vazirmatn, Noto Sans Arabic, Noto Naskh Arabic, Amiri, Cairo, Tajawal, IBM Plex Sans Arabic,
Almarai, Harmattan, Lateef, Scheherazade New, El Messiri, Reem Kufi; system fonts: Tahoma, Arial, Times New Roman,
Courier New (`NGX_EDITOR_FONTS`).

- **`google`** (default): one stylesheet from `fonts.googleapis.com` (`googleFontsUrl` for a mirror).
- **`self-hosted`**: `@font-face` rules for the WOFF2 files in the package (`fonts/`, Arabic and Latin subsets,
  400 and 700). Copy them with an asset glob in `angular.json`; they are served from `/assets/ngx-editor-fonts/`
  (or set `selfHostedBaseUrl`):

  ```json
  "assets": [
    { "glob": "**/*", "input": "node_modules/ngx-editor-rtl-ltr-edition/fonts", "output": "assets/ngx-editor-fonts" }
  ]
  ```

- **`none`**: nothing is loaded; the app loads the fonts itself. `buildFontFaceCss()` and `buildGoogleFontsUrl()`
  help, also for pages that show the exported HTML.

Fonts are loaded once per page, only when a font menu is shown or the document uses a font. Pasted content keeps only
the configured fonts (`list: []` drops every pasted font). A font is written as `<span style="font-family: …">`; the
page that shows the HTML must load the font too. The fonts are under the SIL Open Font License 1.1
([THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)).

## Images

The `image` item opens a dialog with an **Upload** tab (file picker and drop zone) and a **URL** tab. Pasted and
dropped image files are uploaded too. Configure the upload globally or per editor (the editor wins per field):

```ts
import { HttpClient, HttpEventType } from '@angular/common/http';
import { inject } from '@angular/core';
import { filter, map } from 'rxjs';
import { Editor, NgxEditorUploadContext, NgxEditorUploadResult } from 'ngx-editor-rtl-ltr-edition';

export class EditorComponent {
  private http = inject(HttpClient);

  editor = new Editor({
    image: {
      uploadHandler: (file, ctx) => this.upload(file, ctx),
      maxSize: 5 * 1024 * 1024, // bytes, checked after resizing
      accept: ['image/png', 'image/jpeg', 'image/webp'], // default: common raster types
      resize: { maxWidth: 1600, maxHeight: 1600, quality: 0.85 }, // canvas downscale, aspect kept (not GIF/SVG)
      onError: (error) => console.error(error.code, error.message),
    },
  });

  private upload(file: File, ctx: NgxEditorUploadContext): Promise<NgxEditorUploadResult> {
    const body = new FormData();
    body.append('file', file);

    const request = this.http
      .post<{ url: string }>('/api/uploads', body, { reportProgress: true, observe: 'events' })
      .pipe(
        map((event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            ctx.onProgress(Math.round((100 * event.loaded) / event.total));
          }
          return event;
        }),
        filter((event) => event.type === HttpEventType.Response),
        map((event) => ({ src: event.body!.url, alt: file.name })),
      );

    // the placeholder's cancel button, deleting the placeholder or destroying the editor abort the signal
    return new Promise((resolve, reject) => {
      const subscription = request.subscribe({ next: resolve, error: reject });
      ctx.signal?.addEventListener('abort', () => {
        subscription.unsubscribe();
        reject(new DOMException('Upload cancelled', 'AbortError'));
      });
    });
  }
}
```

The handler resolves to a URL string or `{ src, alt?, width? }`; the result goes through `sanitizeUrl`. While it
runs, the document shows a placeholder with a preview, progress and a cancel button; a failure shows a localized
message.

- **No handler:** images are embedded as data URLs, with a warning (`onWarning`, console, event) above
  `base64WarnSize` (default 500 KB). Prefer a handler for real content.
- **Selected image:** a toolbar with alignment (start / center / end, mirrored in RTL), alt text, caption (turns it
  into `<figure data-type="image">`), link, replace and delete; resize handles on the inline-end corners follow the
  text direction (`features.resizeImage`).
- **Events:** `editor.events` emits `imageUploadStart`, `imageUploadProgress`, `imageUploaded`,
  `imageUploadCancelled`, `imageUploadError` (`tooLarge`, `invalidType`, `uploadFailed`, `invalidResult`,
  `readFailed`) and `imageUploadWarning`:

  ```ts
  editor.events.subscribe((event) => {
    if (event.type === 'imageUploadError') {
      this.toast.error(event.error.message);
    }
  });
  ```

- From code: `uploadImageFiles(editor.view, files, { pos })`, `editor.commands.setImageAlign('center')`,
  `setImageCaption('…')`, `setImageLink(url)`, `updateImage(attrs)`, `deleteImage()`.

## Videos

Add the `video` item. Its dialog accepts YouTube (`watch`, `youtu.be`, `shorts`, `live`, start times), Vimeo (also
private links) and Aparat links, or pasted embed code, with a live preview; and video files when an upload handler is
set.

```ts
import { DEFAULT_VIDEO_HOSTS } from 'ngx-editor-rtl-ltr-edition/utils';

provideNgxEditorConfig({
  video: {
    // the allowlist replaces the default one, so spread it to add a host (exact names or '*.example.com')
    allowedHosts: [...DEFAULT_VIDEO_HOSTS, 'video.example.com'],
    youtubeNoCookie: true, // default: embed from www.youtube-nocookie.com
    // same signature as the image handler; ctx.kind === 'video'; resolves to a url or { src, poster }
    uploadHandler: (file, ctx) => uploadToServer(file, ctx),
    maxSize: 200 * 1024 * 1024,
    accept: ['video/mp4', 'video/webm'], // default mp4, webm, ogg
    onError: (error) => console.error(error.code),
  },
});
```

- Embeds of hosts outside the list are refused, in the dialog and in pasted HTML. Other hosts must use `https:`
  and are stored with `data-provider="custom"`.
- Video upload needs its own `uploadHandler` (the image handler is not reused, and there is no data URL fallback);
  without one the Upload tab explains that it is not available, and pasted video files report `noHandler`.
- Click a video to select it (a second click plays it): the toolbar aligns it, sets its width (25–100 %, or drag /
  arrow keys on the handle), edits the caption, replaces or deletes it.
- Events `videoUploadStart`, `videoUploadProgress`, `videoUploaded`, `videoUploadCancelled`, `videoUploadError`.
- `normalizeVideoUrl(url, { allowedHosts })` (in `/utils`) gives the player URL of a link;
  `editor.commands.insertVideo(url)` inserts one from code.

Videos are written as `<figure data-type="video">` with a responsive 16:9 frame and an `<iframe>` or `<video>`.

## Rendering the HTML: `styles/content.css`

The HTML of the editor (`toHTML()`, `outputFormat="html"`) relies on a few CSS rules for aligned images and videos,
table styles, task lists and direction-aware lists and quotes. Add the stylesheet to the app that displays the content:

```json
"styles": ["node_modules/ngx-editor-rtl-ltr-edition/styles/content.css", "src/styles.css"]
```

and wrap the content in `ngx-editor-content`:

```html
<article class="ngx-editor-content" [innerHTML]="html"></article>
```

Angular's `[innerHTML]` sanitizer removes `style` attributes and `<iframe>`s, so alignment, fonts and videos are lost
there; render HTML that you have sanitized on the server yourself (see [Security](#security)). The colours are CSS
variables (`--ngx-editor-content-*`). Fonts used in the content must be loaded on that page as well (see [Fonts](#fonts)).

## Security

- Every URL that enters the document — links, images, videos, loaded HTML, pasted HTML, dialog input, toolbar input
  and upload results — goes through `sanitizeUrl()` (`ngx-editor-rtl-ltr-edition/utils`). `javascript:`, `vbscript:`,
  `data:text/*`, SVG data URLs and unknown schemes are dropped; links allow `http(s)`, `mailto`, `tel` and relative
  URLs, images also `blob:` and raster `data:` URLs.
- Video embeds are limited to the host allowlist; iframes get `referrerpolicy` and a fixed `allow` list.
- Font families and CSS lengths are validated before they are written into `style` attributes.
- HTML is parsed in an inert document, and the editor supports Trusted Types (policy name `ngx-editor`).

**This does not make stored HTML safe to show to other users.** Anyone can send any HTML to your API without using the
editor. Sanitize the HTML on the server (an allowlist sanitizer such as DOMPurify, sanitize-html or HtmlSanitizer that
keeps only the tags, attributes, styles and iframe hosts you need) before you store or render it for other users, and
use a Content Security Policy.

## Commands, custom menus and more

The upstream APIs keep working. A few examples:

```ts
// chain commands
this.editor.commands.textColor('red').insertText('Hello').focus().scrollIntoView().exec();
this.editor.commands.fontFamily('Vazirmatn, sans-serif').exec();

// convert between html and json
import { toDoc, toHTML } from 'ngx-editor-rtl-ltr-edition';
const json = toDoc('<p dir="rtl">سلام</p>');
const html = toHTML(json);
```

Custom menu items are rendered after the toolbar from a template:

```html
<ngx-editor-menu [editor]="editor" [customMenuRef]="customMenu"></ngx-editor-menu>

<ng-template #customMenu>
  <app-custom-menu [editor]="editor"></app-custom-menu>
</ng-template>
```

Reuse the class names of the built-in items (`NgxEditor__MenuItem`, `NgxEditor__MenuItem--Active`,
`NgxEditor__Seperator`); the demo's [custom menu](./projects/demo/src/app/components/custom-menu) is an example. A
floating menu for the selection: `<ngx-editor-floating-menu [editor]="editor">` inside `<ngx-editor>`. `Editor`
options: `content`, `history`, `keyboardShortcuts`, `inputRules`, `schema`, `plugins`, `nodeViews`, `attributes`,
`features`, `parseOptions`, `linkValidationPattern`, plus `dir`, `autoDirection`, `fonts`, `image`, `video`.
Validators: `Validators.required(schema)`, `maxLength`, … Collaborative editing, mentions, CodeMirror code blocks and
other ProseMirror plugins work as in upstream (the [demo](./projects/demo) uses CodeMirror). The upstream
documentation at https://sibiraj-s.github.io/ngx-editor describes these base features; replace the package name in
its examples.

## Live demo and development

- **GitHub Pages:** https://ahpcoir-lgtm.github.io/ngx-editor-rtl-ltr-edition/ — deployed by
  [.github/workflows/pages.yml](./.github/workflows/pages.yml) on every push to `main` (a static build of the demo,
  `ng build demo --configuration pages`). In a fork or a new copy of the repository enable it once:
  **Settings › Pages › Build and deployment › Source: GitHub Actions**.
- **StackBlitz:** https://stackblitz.com/github/ahpcoir-lgtm/ngx-editor-rtl-ltr-edition — `.stackblitzrc` installs the
  dependencies, builds the library and serves the demo (`npm run stackblitz`). Installing and the first build take a
  few minutes in the browser.
- **Locally:**

  ```bash
  npm install
  npm run build:lib       # the demo imports the library from dist/
  npm run demo            # http://localhost:5002
  ```

  Checks: `npx ng lint ngx-editor`, `npm run check:strict`, `npm run test:lib`, `npm run build:demo`,
  `npm run build:pages`, `npm run test:demo`, `npm run compat -- --angular 19 --dir ../compat-19`.

Contributions are welcome — see [CONTRIBUTING.md](./.github/CONTRIBUTING.md) and the design rules in
[FORK_DESIGN.md](./FORK_DESIGN.md).

## License and credits

[MIT](./LICENSE). Copyright (c) 2017 Sibiraj (ngx-editor); Copyright (c) 2026 Amir Farid Abbasi, Amin Abbasi
(modifications in ngx-editor-rtl-ltr-edition).

- [ngx-editor](https://github.com/sibiraj-s/ngx-editor) by Sibiraj — the editor this fork is based on.
- [ProseMirror](https://prosemirror.net/) by Marijn Haverbeke and contributors (MIT).
- Icons from [Material Symbols](https://fonts.google.com/icons) (Apache License 2.0).
- Fonts under the SIL Open Font License 1.1.

See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) for the licenses of the dependencies, icons and fonts.

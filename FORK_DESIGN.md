# ngx-editor-rtl-ltr-edition — design notes

Developer-facing notes for the fork. They record the decisions every feature follows, so that the
pieces fit together. User-facing documentation lives in `README.md` / `README.fa.md`.

## Ground rules

- **Additive.** Existing toolbar items, `Editor` options, schema node/mark names, commands and the HTML
  of existing documents keep working. Any change to emitted HTML is listed in `CHANGELOG.md`.
- **Angular 19 – 22.** The library is built with the Angular 22 toolchain but must link and run on 19.
  Therefore: no `ChangeDetectionStrategy.Eager` (use `Default`; the 19–21 linker resolves the strategy by
  symbol name and only knows `Default`), no `afterEveryRender`/`afterRender` (use lifecycle hooks), no API
  introduced after Angular 19.0. Components keep `ChangeDetectionStrategy.Default` because the Angular 22
  linker defaults to OnPush when the field is missing.
- **TypeScript.** Upstream compiles with `strict: false`. New fork code must also type-check under
  `strict: true`; `npm run check:strict` (scripts/check-strict.mjs) runs the compiler in strict mode and
  reports diagnostics only for fork-owned files.
- **No physical directions.** New CSS uses logical properties (`margin-inline-start`, `inset-inline-end`,
  `border-inline-start`, `text-align: start`, `float: inline-start`). No `left`/`right` unless the value
  really is physical (e.g. a code block that is always LTR).
- **Every user-visible string is a locale key** with `en`, `fa` and `ar` values (see Localization). A unit
  test fails when a built-in locale misses a key.
- **Every URL that ends up in the document is sanitized** with `sanitizeUrl()` from
  `ngx-editor-rtl-ltr-edition/utils` — in `parseDOM` (so pasted/loaded HTML is cleaned), in commands and in
  dialogs.
- Selector `<ngx-editor>` and the Trusted Types policy name `ngx-editor` are unchanged, so templates and
  CSP allowlists written for ngx-editor keep working.

## Configuration surface

Global (DI): `NgxEditorModule.forRoot(config)` (existing) and `provideNgxEditorConfig(config)` (new,
for standalone apps). `NgxEditorConfig` gains:

```ts
interface NgxEditorConfig {
  locals?: Partial<Record<LocalsKeys, string | Observable<string>>>; // existing: per-key overrides
  icons?: Partial<Record<IconsKeys, string>>;                        // existing
  locale?: string;            // 'en' | 'fa' | 'ar' | any registered locale code
  dir?: 'ltr' | 'rtl' | 'auto';
  fonts?: NgxEditorFontsConfig;
  image?: NgxEditorImageConfig;
  video?: NgxEditorVideoConfig;
}
```

Per instance: `new Editor({ dir, autoDirection, image, video, fonts, ... })`. Instance options win over
the global config, which wins over built-in defaults. Components resolve the merged value through
`NgxEditorService` + the editor instance (`editor.options` is exposed read-only as `editor.config`).

Direction resolution for the editor surface and for the menus/popups:
`[dir]` input on the component › `Editor` option `dir` › global `dir` › the selected locale's direction ›
inherited from the page (no attribute written).

## 1. Direction (RTL / LTR / auto)

- Block attribute `dir: null | 'ltr' | 'rtl' | 'auto'` on `paragraph`, `heading`, `blockquote`,
  `code_block`, `ordered_list`, `bullet_list`, `task_list`, `list_item`, `task_item`, `table`.
  `parseDOM` reads the `dir` attribute; `toDOM` writes it only when not null.
- Toolbar items `dir_ltr`, `dir_rtl`, `dir_auto` (toggle commands, `Commands.DIR_LTR` …). They set the
  attribute on the textblocks and the nearest list/blockquote/table containers in the selection; toggling
  the active value clears it.
- Keyboard: Ctrl + Right Shift → RTL, Ctrl + Left Shift → LTR for the current block (the Word / Windows
  convention), feature flag `features.directionShortcuts` (default `true`).
- `<ngx-editor [dir]="'rtl'">` and `<ngx-editor-menu [dir]>` inputs; `Editor` option `dir`.
  The editor surface gets the resolved `dir` on `.NgxEditor__Content`.
- `autoDirection` (`Editor` option, default `false` to keep upstream output): the surface gets
  `data-auto-dir`, where blocks without an explicit `dir` use `unicode-bidi: plaintext` (direction and
  `text-align: start` follow each block's first strong character — the same rule as `dir="auto"`), and
  `toHTML(doc, schema, { autoDirection: true })` writes `dir="auto"` on those blocks so the published HTML
  renders the same way.
- Alignment: `TextAlign` accepts `start | end | left | center | right | justify`. New toolbar items
  `align_start` / `align_end` (icons mirror in RTL). `toDOM` now writes `text-align:left` too (upstream
  dropped it, which made "left" a no-op inside RTL content).
- Indent: `margin-inline-start: N*40px` instead of `margin-left` (still `data-indent="N"`).
- Editor CSS: lists `padding-inline-start`, blockquote `border-inline-start` + `padding-inline-start`, task
  list checkbox with `margin-inline-end`, table cells `text-align: start`. Code blocks default to
  `direction: ltr; text-align: left` unless they carry `dir`.
- Menus mirror through the inherited `dir`: the flex row reverses, separators use `border-inline-start`,
  arrow-key navigation swaps Left/Right in RTL, popups use logical placement (`-start` resolves to the
  inline start side), URL/number inputs are always `dir="ltr"`.

## 2. Localization

- `Locals.ts` keeps the English defaults; every new key is added there.
- New secondary entry point `ngx-editor-rtl-ltr-edition/locales` exports `en`, `fa`, `ar`
  (`NgxEditorLocale = { code, dir, locals }`), `registerNgxEditorLocale(locale)` and
  `getNgxEditorLocale(code)`. Config `locale: 'fa'` picks the dictionary, `locals` overrides single keys.
- Locale-dependent labels on data (font display names) use `Record<string, string>` keyed by locale code
  with `en` as fallback.

## 3. Tables

Upstream already has `prosemirror-tables`, a rows/cols insert popup and a dropdown of actions. The fork
adds: a grid picker plus numeric inputs and a "header row" option (header row = one header cell per
column); table attributes `dir`, `variant` (`bordered` default | `striped` | `borderless`),
`width` (`auto` | `full`), `align` (`start` | `center` | `end`); cell attributes `align`
(`start` | `center` | `end`) and `valign` (`top` | `middle` | `bottom`) next to the existing `background`;
a colour palette for the cell background (`setCellBackground`) — `setCellBackgroundGreen` stays for
compatibility; correct behaviour of column resizing and cell navigation in RTL tables.

## 4. Fonts

- Mark `font_family` (`attrs: { family }`) → `<span style="font-family: …">`; parsed from `font-family`
  styles that match a configured font.
- Toolbar item `font_family`: dropdown of configured fonts, each label rendered in its own font, plus
  "Default" to remove the mark.
- `NgxEditorFont = { id, family /* CSS stack */, label: string | Record<locale, string>, category?,
  google?: { family, weights }, files?: { weight, style, path }[] }`.
- Built-in: Vazirmatn, Noto Sans Arabic, Noto Naskh Arabic, Amiri, Cairo, Tajawal, IBM Plex Sans Arabic,
  Almarai, Harmattan, Lateef, Scheherazade New, El Messiri, Reem Kufi (+ a few system fonts that need no
  loading). Labels in en/fa/ar.
- `fonts: { list?, extend?, loading?: 'google' | 'self-hosted' | 'none', selfHostedBaseUrl?, googleFontsUrl? }`.
  Default `loading: 'google'` (one `<link>` to fonts.googleapis.com, injected once, SSR-safe).
  `'self-hosted'` injects `@font-face` rules pointing at `selfHostedBaseUrl` (default
  `/assets/ngx-editor-fonts/`); the woff2 files ship in the package under `fonts/` and are copied with an
  `angular.json` asset glob. `'none'`: the app loads fonts itself.
- OFL texts in `LICENSES/fonts/`, summary in `THIRD_PARTY_NOTICES.md`.

## 5. Images

- `image` (inline, existing) gains `height` and `align` (`start` | `center` | `end` | null). A link on an
  image is the `link` mark applied to the image node.
- New block node `figure` (atom) for captioned images: `src, alt, title, width, align, caption, href`,
  `<figure data-type="image"><img …><figcaption>…</figcaption></figure>`.
- Insert dialog: Upload (file picker, drop zone, multiple) and URL. Paste and drag & drop of files into the
  editor go through the same pipeline (plugin `imageUpload`).
- `image: { uploadHandler?: (file, ctx: { kind, onProgress(percent) }) => Promise<string | { src, alt?, width? }>,
  maxSize?, accept?, resize?: { maxWidth?, maxHeight?, quality?, mimeType? }, base64WarnSize?,
  onError?, onWarning? }`. Without a handler the file is embedded as a data URL and a warning is reported
  above `base64WarnSize`.
- While uploading, a widget decoration shows a placeholder with a progress bar at the drop/paste position;
  errors replace it with a short-lived error message and are emitted on `editor.events`.
- Selected image/figure shows a media toolbar: align start/center/end, alt text, caption on/off + text,
  link, replace, delete. Resize handles on the inline-end corners (mirrored in RTL), aspect ratio kept.

## 6. Video

- Block atom node `video`: `kind ('embed' | 'file'), src, provider, width, align, poster, caption, ratio`.
  `<figure data-type="video" …><div class="ngx-video__frame" style="aspect-ratio: 16 / 9"><iframe …>`
  or `<video controls preload="metadata" …>`, optional `<figcaption>`.
- `video: { allowedHosts?, youtubeNoCookie?, uploadHandler?, maxSize?, accept? }`. Embed URLs are
  normalised (YouTube watch/short/youtu.be/embed + start time, Vimeo, Aparat) and accepted only for
  allowlisted hosts; parsing an `<iframe>` from a host outside the list drops it.
- Toolbar item `video` with an Embed / Upload dialog; media toolbar shared with images.

## Output stylesheet

`ngx-editor-rtl-ltr-edition/styles/content.css` (plain CSS, shipped as an asset) renders exported HTML the
way the editor shows it: directions, aligned images/figures/videos, table variants, task lists. The editor
styles use the same rules.

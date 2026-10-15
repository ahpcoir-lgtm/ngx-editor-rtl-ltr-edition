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
  reports diagnostics only for fork-owned files (the `FORK_OWNED` globs at the top of the script; every
  feature appends its new files). It resolves the entry points to their sources, so it needs no build.
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
for standalone apps; `makeEnvironmentProviders` with the same tokens as `forRoot` plus its own
`NgxEditorService`, so in a route's `providers` it configures that route like `forChild`).
`NGX_EDITOR_CONFIG_TOKEN` now lives in `provide-config.ts` and is still exported from `editor.module.ts`.
`NgxEditorConfig` gains:

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
inherited from the page (no attribute written). An input bound to `null` skips the chain and writes no `dir`;
`undefined` is "not set". The inputs accept any string (they replace the native `dir` property, so
`strictTemplates` code binding a `string` keeps compiling): `normalizeDirection` maps `ltr`/`rtl`/`auto` in any
case and treats other strings as not set.

## 1. Direction (RTL / LTR / auto)

- Block attribute `dir: null | 'ltr' | 'rtl' | 'auto'` on `paragraph`, `heading`, `blockquote`,
  `code_block`, `ordered_list`, `bullet_list`, `task_list`, `list_item`, `task_item`, `table`.
  `parseDOM` reads the `dir` attribute; `toDOM` writes it only when not null.
  The list and table specs of prosemirror-schema-list / prosemirror-tables get it through
  `withDirection()` (schema/block-attrs.ts), which keeps their own attributes, parse rules and output. In the
  editor the table and the task item are node views (`DirectionTableView`, `TaskItemView`), which write `dir`
  themselves.
- Toolbar items `dir_ltr`, `dir_rtl`, `dir_auto` (toggle commands, `Commands.DIR_LTR` …,
  `commands/TextDirection.ts`). Targets of a command: the textblocks in the selection, the nearest
  list/blockquote of each one (searched only up to its table cell), and every list/blockquote/table whose
  textblocks are all selected. So a table changes its direction (and column order) only when all of it is
  selected (select all, a cell selection of every cell); a paragraph in one cell changes alone, like Word.
  Active = every selected textblock has the value, from its own `dir` or the nearest ancestor with one
  (not beyond its table cell), **and that node is one of the targets**. A value inherited from a node the
  command does not change (a list item or task item with `dir`, an outer blockquote that is not wholly
  selected, a table) is shown as not active, and clicking sets it on the targets. So toggling the active
  value always clears it on all targets, and a toggle that would change nothing is not executable.
- Wrapping keeps the direction: a list, task list or blockquote created by the toolbar or by the `- `, `1. `, `> `
  input rules gets the `dir` shared by the textblocks it wraps (their own or from a node inside the range,
  `getCommonDirection`), so markers and the quote border are on the side of the text; none when they differ.
  The input rules use a recording rule with the same pattern in front of `wrappingInputRule`, whose `getAttrs`
  only sees the match.
  `EditorCommands.setTextDirection(dir | null)` / `toggleTextDirection(dir)`.
- Enter keeps the direction: the block created at the end of a block with `dir` (paragraph, heading, list
  item) gets the same `dir` (splitting in the middle already copies it).
- Keyboard: Ctrl + Right Shift → RTL, Ctrl + Left Shift → LTR for the blocks in the selection (the Word /
  Windows convention; sets, never toggles). It runs on keyup of the Shift key, only when Ctrl and Shift were
  pressed with no other key in between and without Alt/Meta (so Ctrl+Shift+Z or AltGr are not affected).
  The native `beforeinput` `formatSetBlockTextDirection` (Chromium on Windows) is applied the same way
  instead of letting the browser change the DOM. Feature flag `features.directionShortcuts` (default
  `true`); `keyboardShortcuts: false` turns it off too.
- `<ngx-editor [dir]="'rtl'">`, `<ngx-editor-menu [dir]>` and `<ngx-editor-floating-menu [dir]>` inputs;
  the input of `<ngx-editor>` is also written on its host (as the native property was before the input existed),
  and a floating menu projected into it uses that input when it has none of its own (before the `Editor` option);
  `Editor` option `dir`; `resolveDirection()` implements the order above for all three. The editor surface
  gets the resolved `dir` on `.NgxEditor__Content` through the `direction` plugin (registered by `Editor`
  with its options, updated by the component); the menu bar and the floating menu host get it as
  attribute. The global config is read when the editor component initialises (like the placeholder); the
  menus read it on every change detection. A `dir` in the `attributes` option still wins on the surface.
- `autoDirection` (`Editor` option, default `false` to keep upstream output): the surface gets
  `data-auto-dir`, and the `direction` plugin puts `dir="auto"` node decorations (editor DOM only, not the
  document) on the same blocks that `toHTML(doc, schema, { autoDirection: true })` writes `dir="auto"` on
  (`forEachAutoDirectionBlock` in parsers.ts, one rule for both), so the published HTML renders exactly the
  same way: one direction per block from its first strong character, also across hard breaks. (`unicode-bidi:
  plaintext` was not used because it decides per line.) "Those blocks" are paragraphs and headings (non-code textblocks with a `dir`
  attribute) with no `dir` of their own and no ancestor with one; lists, quotes and tables keep the
  inherited direction, so the markers and borders match between the editor and the HTML. The component's
  `html` output passes the editor's `autoDirection` to `toHTML`.
- Alignment: `TextAlign` accepts `start | end | left | center | right | justify`. New toolbar items
  `align_start` / `align_end` (icons mirror in RTL). `toDOM` now writes `text-align:left` too (upstream
  dropped it, which made "left" a no-op inside RTL content).
- Indent: `margin-inline-start: N*40px` instead of `margin-left` (still `data-indent="N"`).
- Editor CSS: lists `padding-inline-start`, blockquote `border-inline-start` + `padding-inline-start`, task
  list checkbox with `margin-inline-end`, table cells `text-align: start`. Code blocks default to
  `direction: ltr; text-align: left` unless they carry `dir`.
  Lists get `padding-inline: var(--ngx-editor-list-indent, 40px) 0`, so page rules like
  `ul { padding-left }` cannot push RTL markers out. Placeholders of aligned blocks (other than
  `start`/`justify`) are placed in the flow.
- Popups and dropdowns get no horizontal inset in CSS: `PopupPositionDirective` writes `left` (and
  `right: auto`). An `inset-inline-start` would be `right` in RTL and, with a fixed width, make the browser drop
  `left`, pinning the menu to the viewport edge.
- Menus mirror through the inherited `dir`: the flex row reverses, separators use `border-inline-start`,
  arrow-key navigation swaps Left/Right when the focused item's computed direction is RTL (so an inherited
  page direction counts too), popups use logical placement (floating-ui reads the computed direction, so
  `-start` resolves to the inline start side), URL/number inputs are always `dir="ltr"`.
- Icons drawn for a line starting on the left (`align_start`, `align_end`, `indent`, `outdent`,
  `bullet_list`, `task_list`; `modules/menu/mirrored-icons.ts`) get `NgxEditor__MenuItem--Mirror` and are
  flipped with `:dir(rtl)`; `align_left`/`align_right` and the direction icons are physical and never flip.
- Not yet RTL-aware (later sections): column resizing of prosemirror-tables (screen coordinates; tables),
  the image resize handles (images).

## 2. Localization

- The English strings have one source, `projects/ngx-editor/locales/en.ts`; `Locals.ts` builds its
  `defaults` from it (and keeps exporting `defaults`, `LocalsKeys` and `Locals`). A new key is added to
  `en.ts`, `fa.ts` and `ar.ts` together: `fa`/`ar` are typed as the complete dictionary and
  `locales.spec.ts` fails on a missing, empty or unknown key. `src/lib/Locals.keys.spec.ts` lists the keys
  the library looks up (typed as `Record`s over `TBItems`, `TBHeadingItems`, `TBTableItems`, so a new toolbar
  item does not compile there until its keys are listed) and fails when one has no English string; in dev
  mode `Locals.get` warns once about such a key.
- New secondary entry point `ngx-editor-rtl-ltr-edition/locales` exports `en`, `fa`, `ar`
  (`NgxEditorLocale = { code, dir, locals }`), `registerNgxEditorLocale(locale)`,
  `getNgxEditorLocale(code)` (exact code, then its prefixes: `fa-IR` → `fa`; case and `_` ignored;
  unknown → `undefined`) and `isRtlLocale(code)`. It imports nothing from the primary entry point
  (the primary imports it), so ng-packagr builds it first and there is no cycle. Specs next to a
  secondary entry point run with the library tests (`include` of the test target in `angular.json`);
  specs under `src/` import the locales by the package path, as the sources do, so both use one registry.
- Config `locale: 'fa'` picks the dictionary, `locals` overrides single keys:
  `NgxEditorService.locals` = English defaults ‹ locale ‹ `locals`. Keys a registered locale leaves out fall
  back to English. `NgxEditorService.dir` = config `dir` ?? the locale's `dir` ?? `null`.
- The editor placeholder is the locale key `placeholder` (en `Type Here...`, upstream's default) while
  `[placeholder]` is not bound; a bound value wins (also `''` and `undefined`, which show none, as upstream).
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

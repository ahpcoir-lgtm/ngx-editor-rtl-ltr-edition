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
- Not yet RTL-aware (later sections): the image resize handles (images). Column resizing of tables: section 3.

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

- Schema (`schema/table-attrs.ts`): `withTableAttributes()` adds `variant`, `width`, `align` to the table spec of
  prosemirror-tables (defaults `bordered`, `auto`, `start`, never written, so old tables keep their HTML);
  non-defaults are written as `data-variant` / `data-width` / `data-align` plus the inline style that keeps them
  without the content stylesheet (`width: 100%`, `margin-inline: auto`, `margin-inline-start: auto`). Parsed from
  the `data-*` attributes, else `width="100%"` / `style="width: 100%"` and the legacy `align="center"`.
  `tableCellAttributes`: `background` (only colours are written), `colwidth`, `align` and `valign`, written as
  `data-align` / `data-valign` plus `text-align` / `vertical-align`; read from `data-*`, the style or the legacy
  `align` / `valign` attributes (`left`/`right` are not read: physical, and paragraphs keep their own alignment).
  The `text_background_color` mark ignores `background-color` on cells (a style rule with context `table_row/`).
- `Table.insert(rows, cols, { headerRow = true, attrs })`: `rows` body rows plus the header row. The dialog counts
  the header row as one of its rows (Word-like grid: 3 × 4 inserts three rows in all).
- Commands (`commands/TableCommands.ts`, `TABLE_MENU_COMMANDS`): cell commands work on every cell of a cell
  selection, else the cell around the cursor; a cell toggle clears the value when every selected cell has it. Table
  commands change the innermost table around the selection; toggling an active non-default value goes back to the
  default, and the active default is not executable. Everything is disabled outside a table. The table dropdown
  marks every active item and keeps its own name on the button; `setCellBackground` opens a palette (the menu's
  `colorPresets`) under the item.
- RTL (`plugins/table-rtl.ts`): prosemirror-tables picks the resized column from the screen x and the physical
  side (`left` = the column before, `right` = this column) and grows a column when the mouse moves right. A plugin
  registered before `columnResizing` handles mousemove/mousedown in right to left tables (computed `direction` of
  the cell): the physical left edge is the inline end (this column), the right edge the inline start (the column
  before), and the drag offset is negated. Left to right tables still go to the original code. The handle
  decoration is unchanged and drawn with `inset-inline-end`. `tableRtlNavigation` (before `tableEditing`) swaps the
  logical direction of Left/Right and Shift-Left/Right in right to left cells; Tab/Shift-Tab (`goToNextCell`) were
  logical already. `getDefaultPlugins` registers both.
- Editor CSS: `table-layout: fixed` with `width` from the attribute (the table view's own px width is overridden for
  `full`), `text-align: start` cells, striped = row lines and alternating rows, borderless shows dashed guides
  in the editor only.

## 4. Fonts

- Mark `font_family` (`attrs: { family }`, `schema/marks.ts`) → `<span style="font-family: …">`. It comes right
  after `link` in the mark order, so `code`, colours etc. render inside the font span (inline code stays monospace).
  The family is a CSS stack normalized by `normalizeFontFamily()` (`utils/fontFamily.ts`): names split respecting
  quotes, names with anything but one identifier in single quotes, generic families lower case, CSS-wide keywords and
  names with CSS punctuation (`;`, `:`, braces, parentheses, `<`, `>`, `\`, `/`, `*`, `!`, `@`, `=`, backtick) or
  control characters dropped (nothing can leave the declaration);
  no valid name → no mark.
- Parsing: **every** `font-family` is read (also families that are not configured), so stored HTML round-trips and a
  font removed from the config later is not silently lost. The schema is static and cannot see the config, so the
  "configured fonts only" rule is applied where it matters, on paste: plugin `fontFamilyPaste`
  (`plugins/font-family.ts`, registered by the editor component with a getter for the resolved list) maps the pasted
  slice: a font whose first family matches a configured font (`findFont`, case-insensitive) gets the configured
  stack, any other font mark is dropped. Word and Google Docs put `Calibri`/`Arial`… on every run, which would
  override the page font; `fonts: { list: [] }` drops every pasted font (the upstream paste behaviour).
- Commands (`commands/FontFamily.ts`, `FONT_FAMILY`): `apply(family)` (replaces another font: a mark type excludes
  itself; stored mark at a cursor; not on a selected atom; refused for an unsafe value), `remove()`, `isActive`,
  `getActiveFamilies` (unique), `canExecute`. `EditorCommands.fontFamily(family)` / `removeFontFamily()`.
  Clear formatting removes it (all marks but `link`).
- Toolbar item `font_family` (`modules/menu/font-family`, `<ngx-font-family>` with the dropdown classes): "Default
  Font" (removes the mark) and the configured fonts, each label in its own `font-family`, label from
  `getFontLabel(font, config.locale)` (exact code › language › `en` › first › id). The button shows the active
  font's label in that font, the first family of a font that is not configured, else "Font". Active = the font of the
  selection (first of a mixed selection), "Default Font" when there is none. Not in the built-in toolbars (they would
  start loading Google Fonts for existing users). Locale keys `font_family`, `defaultFont`.
- `NgxEditorFont = { id, family /* CSS stack */, label: string | Record<locale, string>, category?,
  google?: { family, weights }, files?: { weight, style?, path, unicodeRange? }[] }` (`src/lib/fonts/types.ts`).
- Built-in (`fonts/built-in.ts`, `NGX_EDITOR_WEB_FONTS` + `NGX_EDITOR_SYSTEM_FONTS` = `NGX_EDITOR_FONTS`): Vazirmatn,
  Noto Sans Arabic, Noto Naskh Arabic, Amiri, Cairo, Tajawal, IBM Plex Sans Arabic, Almarai, Harmattan, Lateef,
  Scheherazade New, El Messiri, Reem Kufi; Tahoma, Arial, Times New Roman, Courier New (no loading). Labels in
  en/fa/ar (Persian with ی/ک, Arabic with ي/ك; tested). Web fonts: Google weights 400;700; files = the Arabic and Latin
  subsets of Google Fonts. Google serves one variable file for both weights of Vazirmatn, Noto Sans/Naskh Arabic,
  Cairo, El Messiri and Reem Kufi: shipped once as `<dir>-<subset>.woff2` with `font-weight: 400 700`; the static
  fonts as `<dir>-<weight>-<subset>.woff2`.
- `fonts: { list?, extend?, loading?: 'google' | 'self-hosted' | 'none', selfHostedBaseUrl?, googleFontsUrl? }` in
  `NgxEditorConfig` and as `Editor` option. `resolveFonts(global, instance)`: every field instance › global › default;
  list = instance list › global list › built-ins; `extend` is appended (the global `extend` only when the instance has
  no list); strings in `list`/`extend` are ids of built-in fonts (unknown ids skipped); a later font with the same id
  replaces the earlier one in its place. `NgxEditorService.getFonts(editor)`.
- Loading (`fonts/loader.ts`, `loadFonts(document, resolved)`, service `NgxEditorFontLoader` with `DOCUMENT`, so on
  the server the element is rendered into the page): `google` → one `<link rel="stylesheet">` to
  `googleFontsUrl?family=Name:wght@400;700&…&display=swap` (fonts with `google`); `self-hosted` → one `<style>` with
  `@font-face` per file (`font-display: swap`, `unicode-range`, `format()` from the extension) relative to
  `selfHostedBaseUrl` (default `/assets/ngx-editor-fonts/`; absolute paths and urls kept); `none` → nothing. Values
  are escaped/validated so they cannot leave the rule. Once per document: the elements carry
  `data-ngx-editor-fonts` (ids) and `data-ngx-editor-fonts-source` (mode + url); fonts already loaded with the same
  source are skipped (also elements rendered by the server, so hydration adds nothing), new fonts get one more
  element. Lazily: when `<ngx-font-family>` initialises (all fonts of the editor, the labels need them) and when the
  editor component sees a `font_family` mark in the document (on init and on doc changes until loaded). An editor
  that uses no fonts loads nothing. Browsers download a file only when its glyphs are rendered.
- Package: the files and each `OFL.txt` live in `projects/ngx-editor/fonts/<dir>/` and are an ng-packagr asset
  (`fonts/` in the package, about 1.7 MB); apps copy them with
  `{ "glob": "**/*", "input": "node_modules/ngx-editor-rtl-ltr-edition/fonts", "output": "assets/ngx-editor-fonts" }`.
  The demo uses `projects/ngx-editor/fonts` as input and `loading: 'self-hosted'`, so it works offline.
- Exported HTML: the inline `font-family` keeps the font; the page showing it must load the fonts (the loader,
  `buildFontFaceCss`, `buildGoogleFontsUrl` or its own CSS). `styles/content.css` needs no rule.
- OFL texts in `LICENSES/fonts/<Font>-OFL.txt`, summary in `THIRD_PARTY_NOTICES.md` (copied into the package by
  `scripts/postbuild.js`).

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

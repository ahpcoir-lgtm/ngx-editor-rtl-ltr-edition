<div dir="rtl">

# ngx-editor نسخهٔ راست‌به‌چپ/چپ‌به‌راست

[English](./README.md) | **فارسی**

[![Tests](https://github.com/ahpcoir-lgtm/ngx-editor-rtl-ltr-edition/actions/workflows/tests.yml/badge.svg)](https://github.com/ahpcoir-lgtm/ngx-editor-rtl-ltr-edition/actions/workflows/tests.yml)
[![Live demo](https://img.shields.io/badge/demo-GitHub%20Pages-1e5aa8)](https://ahpcoir-lgtm.github.io/ngx-editor-rtl-ltr-edition/)
[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz_small.svg)](https://stackblitz.com/github/ahpcoir-lgtm/ngx-editor-rtl-ltr-edition)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

ویرایشگر متن غنی برای Angular، ساخته‌شده بر پایهٔ [ProseMirror](https://prosemirror.net/)، با پشتیبانی کامل از متن
راست‌به‌چپ و چپ‌به‌راست، زبان‌ها و قلم‌های فارسی و عربی، جدول‌های کامل‌تر، بارگذاری تصویر و درج ویدیو.

`ngx-editor-rtl-ltr-edition` یک انشعاب (fork) مستقل از **[ngx-editor](https://github.com/sibiraj-s/ngx-editor)**
ساختهٔ [Sibiraj](https://github.com/sibiraj-s) با مجوز MIT است. این بسته **بستهٔ رسمی ngx-editor نیست** و از سوی
سازندهٔ آن تأیید نشده است. پایهٔ همهٔ چیزهایی که این انشعاب بر آن‌ها ساخته شده — کامپوننت ویرایشگر، منوها، طرح‌واره
(schema) و فرمان‌ها — کار Sibiraj است؛ از او سپاسگزاریم. نگه‌دارندگان این انشعاب امیرفرید عباسی و امین عباسی هستند.

- [نسخهٔ نمایشی آنلاین](https://ahpcoir-lgtm.github.io/ngx-editor-rtl-ltr-edition/) ·
  [باز کردن در StackBlitz](https://stackblitz.com/github/ahpcoir-lgtm/ngx-editor-rtl-ltr-edition) ·
  [فهرست تغییرات](./CHANGELOG.md) · [یادداشت‌های طراحی](./FORK_DESIGN.md)

## فهرست

- [آنچه این انشعاب اضافه می‌کند](#آنچه-این-انشعاب-اضافه-میکند)
- [سازگاری](#سازگاری)
- [نصب](#نصب)
- [مهاجرت از ngx-editor](#مهاجرت-از-ngx-editor)
- [شروع سریع](#شروع-سریع)
- [جهت متن (راست‌به‌چپ، چپ‌به‌راست، خودکار)](#جهت-متن-راستبهچپ-چپبهراست-خودکار)
- [زبان‌ها](#زبانها)
- [نوار ابزار](#نوار-ابزار)
- [جدول‌ها](#جدولها)
- [قلم‌ها](#قلمها)
- [تصویرها](#تصویرها)
- [ویدیوها](#ویدیوها)
- [نمایش HTML خروجی با styles/content.css](#نمایش-html-خروجی-با-stylescontentcss)
- [امنیت](#امنیت)
- [فرمان‌ها، منوهای سفارشی و موارد دیگر](#فرمانها-منوهای-سفارشی-و-موارد-دیگر)
- [نسخهٔ نمایشی و توسعه](#نسخهٔ-نمایشی-و-توسعه)
- [مجوز و قدردانی](#مجوز-و-قدردانی)

## آنچه این انشعاب اضافه می‌کند

- **جهت متن.** ویژگی `dir` (`ltr` یا `rtl` یا `auto`) برای پاراگراف، سرتیتر، نقل‌قول، بلوک کد، فهرست‌ها، آیتم‌های
  فهرست، فهرست کارها و جدول؛ دکمه‌های `dir_ltr`، `dir_rtl` و `dir_auto` در نوار ابزار؛ میان‌بر Ctrl + Shift راست و
  Ctrl + Shift چپ مانند Word؛ ورودی `[dir]` روی ویرایشگر و منوها؛ گزینهٔ `autoDirection` (جهت هر پاراگراف از نخستین
  حرف قوی آن، هم در ویرایشگر و هم در HTML)؛ ترازبندی `align_start` و `align_end`؛ قرینه شدن منوها، پنجره‌های بازشو،
  آیکن‌ها و پیمایش با صفحه‌کلید در راست‌به‌چپ؛ و CSS منطقی در همه‌جا.
- **زبان‌ها.** واژه‌نامه‌های داخلی `en`، `fa` (فارسی) و `ar` (عربی)، گزینهٔ `locale: 'fa'`، افزودن زبان دلخواه با
  `registerNgxEditorLocale` و جایگزین کردن تک‌تک عبارت‌ها.
- **جدول‌ها.** انتخاب اندازه با شبکه و گزینهٔ «ردیف سرستون»، سبک جدول (با کادر، راه‌راه، بدون کادر)، تمام‌عرض و
  ترازبندی جدول، ترازبندی افقی و عمودی خانه‌ها، پالت رنگ خانه‌ها، و تغییر اندازهٔ ستون‌ها و کلیدهای جهت‌نما که در
  جدول‌های راست‌به‌چپ درست کار می‌کنند.
- **قلم‌ها.** منوی `font_family` با ۱۳ قلم وب برای خط عربی و فارسی (وزیرمتن، Noto Sans/Naskh Arabic، امیری، Cairo،
  Tajawal، IBM Plex Sans Arabic و…) و قلم‌های سیستمی؛ بارگذاری از Google Fonts یا از فایل‌های WOFF2 همراه بسته.
- **تصویرها.** زبانهٔ بارگذاری با کشیدن و رها کردن، چسباندن و رها کردن فایل، تابع بارگذاری دلخواه با نمایش پیشرفت و
  لغو، محدودیت حجم و کوچک‌سازی در مرورگر، جایگزین base64، ترازبندی، زیرنویس (`<figure>`)، متن جایگزین، پیوند،
  جایگزینی، دستگیره‌های تغییر اندازه که جهت متن را رعایت می‌کنند، و جریان رویدادها.
- **ویدیوها.** پیوند یا کد درج YouTube (به‌طور پیش‌فرض در حالت حفظ حریم خصوصی)، Vimeo و آپارات با فهرست میزبان‌های
  مجاز، بارگذاری فایل ویدیو، ترازبندی، پهنا و زیرنویس.
- **شیوه‌نامهٔ خروجی.** `styles/content.css` خروجی HTML را همان‌طور نشان می‌دهد که در ویرایشگر دیده می‌شود.
- **امنیت.** همهٔ نشانی‌های پیوند، تصویر و ویدیو از `sanitizeUrl` می‌گذرند (HTML بارگذاری‌شده، HTML چسبانده‌شده،
  فرمان‌ها، پنجره‌ها و نتیجهٔ بارگذاری).
- **Angular نسخهٔ ۱۹ تا ۲۲** با یک ساخت واحد، و `provideNgxEditorConfig()` برای برنامه‌های standalone.

فهرست کامل، همراه با همهٔ تغییرات HTML خروجی، در [فهرست تغییرات](./CHANGELOG.md) آمده است.

## سازگاری

| | |
| --- | --- |
| Angular | ۱۹، ۲۰، ۲۱، ۲۲ (وابستگی‌های همتای `@angular/*` از `>=19.0.0`) |
| مرورگرها | مرورگرهای به‌روز: Chrome، Edge، Firefox، Safari، Opera |
| رندر | مرورگر، رندر سمت سرور و hydration، برنامه‌های zoneless و zone.js |

بسته با ابزارهای Angular 22 ساخته می‌شود و فقط از APIهایی استفاده می‌کند که در Angular 19.0 وجود دارند. راه‌های
اطمینان از این موضوع:

- آزمون‌های واحد کتابخانه و برنامهٔ نمایشی (Angular 22، zoneless) در هر push اجرا می‌شوند؛
- کار **compat** در CI کتابخانه را بسته‌بندی می‌کند و یک برنامهٔ کوچک را با آن برای Angular 19، 20، 21 و 22 با
  `strictTemplates` و `skipLibCheck: false` می‌سازد ([scripts/compat](./scripts/compat))؛ برنامهٔ Angular 19.2 پیش از
  انتشار به‌صورت محلی هم ساخته شده است؛
- `npm run check:strict` کد خود این انشعاب را با `strict: true` بررسی نوع می‌کند.

همین بررسی را خودتان اجرا کنید:

</div>

```bash
npm run build:lib && npm run compat -- --angular 19 --dir ../compat-19
```

<div dir="rtl">

## نصب

</div>

```bash
npm install ngx-editor-rtl-ltr-edition
```

<div dir="rtl">

> **هنوز در npm منتشر نشده است.** تا انتشار نخستین نسخه، آن را از GitHub یا از یک ساخت محلی نصب کنید.

از ساخت محلی (از همین امروز کار می‌کند):

</div>

```bash
git clone https://github.com/ahpcoir-lgtm/ngx-editor-rtl-ltr-edition
cd ngx-editor-rtl-ltr-edition
npm install
npm run build:lib
npm pack ./dist/ngx-editor-rtl-ltr-edition   # creates ngx-editor-rtl-ltr-edition-0.1.0.tgz

# in your app
npm install ../ngx-editor-rtl-ltr-edition/ngx-editor-rtl-ltr-edition-0.1.0.tgz
```

<div dir="rtl">

از GitHub: مخزن کد منبع را دارد، نه بستهٔ ساخته‌شده را؛ بنابراین `npm install github:…` مستقیم کار نمی‌کند. فایل
`package` (یک `.tgz`) را از یک [اجرای موفق Tests](https://github.com/ahpcoir-lgtm/ngx-editor-rtl-ltr-edition/actions/workflows/tests.yml)
یا از یک انتشار دریافت کنید و مانند بالا نصب کنید.

وابستگی‌ها (ProseMirror، Floating UI، tslib) همراه آن نصب می‌شوند؛ Angular و RxJS از برنامهٔ شما می‌آیند.

## مهاجرت از ngx-editor

۱. بسته را جایگزین کنید: `npm uninstall ngx-editor && npm install ngx-editor-rtl-ltr-edition`.

۲. مسیر importها را، همراه با نقطه‌های ورود فرعی، تغییر دهید:

</div>

```ts
// before
import { Editor, NgxEditorModule } from 'ngx-editor';
import { sanitizeUrl } from 'ngx-editor/utils';
// after
import { Editor, NgxEditorModule } from 'ngx-editor-rtl-ltr-edition';
import { sanitizeUrl } from 'ngx-editor-rtl-ltr-edition/utils';
```

<div dir="rtl">

نقطه‌های ورود: `ngx-editor-rtl-ltr-edition`، `/schema`، `/commands`، `/helpers`، `/input-rules`، `/utils` و نقطهٔ
ورود تازهٔ `/locales`.

بقیهٔ چیزها بدون تغییر می‌مانند: انتخابگرهای `<ngx-editor>`، `<ngx-editor-menu>` و `<ngx-editor-floating-menu>`،
گزینه‌های `Editor`، نام دکمه‌های نوار ابزار، نام گره‌ها و نشانه‌های طرح‌واره، فرمان‌ها، `NgxEditorModule.forRoot()`،
نام کلاس‌های CSS و نام سیاست Trusted Types یعنی `ngx-editor`. سندهایی که با ngx-editor نوشته شده‌اند بدون تغییر
بارگذاری می‌شوند.

تغییرات HTML خروجی (جزئیات در [فهرست تغییرات](./CHANGELOG.md#changes-to-the-emitted-html-and-json)):

- بلوک‌هایی که جهت دارند `dir="…"` می‌گیرند؛ `text-align: left` اکنون نوشته می‌شود؛
- تورفتگی با `margin-inline-start` به‌جای `margin-left` نوشته می‌شود (`data-indent` تغییری نکرده است)؛
- جدول تازه برای هر ستون یک خانهٔ سرستون دارد؛ گزینه‌های جدول و خانه به‌صورت `data-*` همراه سبک درون‌خطی نوشته
  می‌شوند؛
- قلم‌ها به‌صورت `<span style="font-family: …">` نگه داشته می‌شوند؛ تصویرهای زیرنویس‌دار `<figure data-type="image">`
  و ویدیوها `<figure data-type="video">` هستند؛
- نشانی‌های ناامن پیوند و تصویر (`javascript:`، نشانی‌های data از نوع SVG و…) حذف می‌شوند.

سندهایی که از هیچ‌یک از قابلیت‌های تازه استفاده نمی‌کنند دقیقاً مانند قبل نوشته می‌شوند.

## شروع سریع

کامپوننت standalone:

</div>

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

<div dir="rtl">

پیکربندی یک‌باره برای کل برنامه (اختیاری):

</div>

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideNgxEditorConfig } from 'ngx-editor-rtl-ltr-edition';

bootstrapApplication(AppComponent, {
  providers: [provideNgxEditorConfig({ locale: 'fa' })],
});
```

<div dir="rtl">

اگر `provideNgxEditorConfig` را در `providers` یک مسیر (route) بگذارید، فقط ویرایشگرهای همان مسیر را پیکربندی می‌کند.

برنامه‌های NgModule:

</div>

```ts
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxEditorModule } from 'ngx-editor-rtl-ltr-edition';

@NgModule({
  imports: [FormsModule, NgxEditorModule.forRoot({ locale: 'fa', dir: 'rtl' })],
})
export class AppModule {}
```

<div dir="rtl">

مقدار می‌تواند رشتهٔ HTML یا سند JSON از ProseMirror باشد؛ فرم‌های واکنشی (`formControlName`) هم کار می‌کنند. با
`outputFormat="html"` مدل همیشه HTML است.

## جهت متن (راست‌به‌چپ، چپ‌به‌راست، خودکار)

جهت سطح ویرایشگر و منوها به این ترتیب تعیین می‌شود: ورودی `[dir]` › گزینهٔ `dir` در `Editor` › `dir` سراسری ›
جهت زبان انتخاب‌شده › به ارث رسیده از صفحه.

</div>

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

<div dir="rtl">

- `[dir]="null"` هیچ ویژگی `dir` نمی‌نویسد (تصمیم با صفحه است).
- دکمه‌های `dir_ltr`، `dir_rtl` و `dir_auto` جهت بلوک‌های انتخاب‌شده را تعیین می‌کنند؛ جهت یک جدول فقط وقتی یکجا
  تغییر می‌کند که همهٔ آن انتخاب شده باشد. فهرست‌ها و نقل‌قول‌های تازه جهت متنی را که در بر می‌گیرند نگه می‌دارند و
  کلید Enter هم جهت را حفظ می‌کند.
- **میان‌برها:** Ctrl + Shift راست ← راست‌به‌چپ، Ctrl + Shift چپ ← چپ‌به‌راست (مانند Word و Windows). برای خاموش کردن
  آن‌ها `features: { directionShortcuts: false }` (یا `keyboardShortcuts: false`) را به کار ببرید.
- `align_start` و `align_end` متن را در هر دو جهت به ابتدا یا انتهای سطر تراز می‌کنند.
- `toHTML(doc, schema, { autoDirection: true })` مانند ویرایشگری با `autoDirection`، `dir="auto"` می‌نویسد.
- از راه کد: `editor.commands.setTextDirection('rtl').exec()` و `toggleTextDirection('ltr')`.

## زبان‌ها

</div>

```ts
provideNgxEditorConfig({ locale: 'fa' }); // 'en' | 'fa' | 'ar' | a registered code; 'fa-IR' falls back to 'fa'
```

<div dir="rtl">

زبان، متن نوار ابزار، پنجره‌ها، پیام‌ها و متن راهنمای خالی (placeholder) را تعیین می‌کند و اگر `dir` تنظیم نشده باشد،
جهت منوها را هم. تک‌تک عبارت‌ها را با `locals` جایگزین کنید:

</div>

```ts
provideNgxEditorConfig({
  locale: 'fa',
  locals: {
    bold: 'ضخیم',
    placeholder: 'متن خود را بنویسید…',
  },
});
```

<div dir="rtl">

زبان دلخواه خود را اضافه کنید (عبارت‌هایی که تعریف نشوند از انگلیسی گرفته می‌شوند):

</div>

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

<div dir="rtl">

`getNgxEditorLocale(code)` و `isRtlLocale(code)` هم از همین نقطهٔ ورود صادر می‌شوند. مقدارهای `locals` می‌توانند
`Observable<string>` هم باشند (برای برنامه‌هایی که در زمان اجرا ترجمه می‌کنند).

## نوار ابزار

</div>

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

<div dir="rtl">

| دکمه | کاربرد |
| --- | --- |
| `bold`، `italic`، `underline`، `strike`، `code`، `superscript`، `subscript` | قالب‌بندی متن |
| `blockquote`، `ordered_list`، `bullet_list`، `task_list`، `horizontal_rule` | بلوک‌ها |
| `{ heading: [...] }` | فهرست بازشوی سرتیتر (`paragraph`، `h1` تا `h6`) |
| `link`، `image`، `table`، `{ table: [...] }` | پنجره‌های درج و کارهای جدول |
| `text_color`، `background_color`، `format_clear` | رنگ‌ها و پاک کردن قالب‌بندی |
| `align_left`، `align_center`، `align_right`، `align_justify` | ترازبندی |
| `indent`، `outdent`، `undo`، `redo` | تورفتگی و تاریخچه |
| **تازه:** `align_start`، `align_end` | ترازبندی منطقی |
| **تازه:** `dir_ltr`، `dir_rtl`، `dir_auto` | جهت بلوک |
| **تازه:** `font_family` | منوی قلم |
| **تازه:** `video` | پنجرهٔ ویدیو |

`DEFAULT_TOOLBAR`، `TOOLBAR_MINIMAL` (پیش‌فرض منو) و `TOOLBAR_FULL` صادر می‌شوند. دکمه‌های تازه در نوارهای ابزار
داخلی نیستند، بنابراین به‌روزرسانی تا وقتی آن‌ها را اضافه نکنید چیزی را تغییر نمی‌دهد. ورودی‌های منو: `editor`،
`toolbar`، `disabled`، `colorPresets`، `customMenuRef`، `dropdownPlacement` (`top` یا `bottom`) و `dir`.

## جدول‌ها

دکمهٔ `table` شبکه‌ای برای انتخاب اندازه (تا ۱۰ × ۱۰) همراه با ورودی‌های عددی و گزینهٔ «ردیف سرستون» باز می‌کند.
فهرست بازشوی جدول (`TABLE_DROPDOWN_ITEMS`، که نوارهای ابزار داخلی از آن استفاده می‌کنند) علاوه بر کارهای اصلی
ردیف، ستون، ادغام و سرستون این موارد را دارد:

- `setCellBackground` (پالت رنگ از `colorPresets`) و `clearCellBackground`؛
- `cellAlignStart` / `Center` / `End` و `cellVAlignTop` / `Middle` / `Bottom`؛
- `tableVariantBordered` / `Striped` / `Borderless`، `tableWidthAuto` / `Full` و `tableAlignStart` / `Center` / `End`.

هر کدام را که می‌خواهید انتخاب کنید:

</div>

```ts
const toolbar: Toolbar = [
  ['table', { table: ['addRowAfter', 'addColumnAfter', 'deleteRow', 'deleteColumn', 'mergeCells', 'setCellBackground', 'tableVariantStriped', 'deleteTable'] }],
];
```

<div dir="rtl">

فرمان‌ها برای دکمه‌های خودتان از `ngx-editor-rtl-ltr-edition` صادر می‌شوند: `setCellBackground`، `cellAlign`،
`cellVAlign`، `tableVariant`، `tableWidth`، `tableAlign`، `setCellsAttr` و `setTableAttr`. تغییر اندازهٔ ستون‌ها و
کلیدهای جهت‌نمای چپ و راست در جدول‌های راست‌به‌چپ از جهت جدول پیروی می‌کنند.

## قلم‌ها

`'font_family'` را به نوار ابزار اضافه کنید. هر قلم با شکل خودش و با نامی به زبان انتخاب‌شده نمایش داده می‌شود.

</div>

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

<div dir="rtl">

قلم‌های وب داخلی: وزیرمتن (Vazirmatn)، Noto Sans Arabic، Noto Naskh Arabic، امیری (Amiri)، Cairo، Tajawal، IBM Plex
Sans Arabic، Almarai، Harmattan، Lateef، Scheherazade New، El Messiri و Reem Kufi؛ قلم‌های سیستمی: Tahoma، Arial، Times
New Roman و Courier New (`NGX_EDITOR_FONTS`).

- **`google`** (پیش‌فرض): یک شیوه‌نامه از `fonts.googleapis.com` (برای آینه از `googleFontsUrl` استفاده کنید).
- **`self-hosted`**: قاعده‌های `@font-face` برای فایل‌های WOFF2 درون بسته (`fonts/`، زیرمجموعه‌های عربی و لاتین، وزن‌های
  400 و 700). آن‌ها را با یک الگوی asset در `angular.json` کپی کنید؛ از `/assets/ngx-editor-fonts/` ارائه می‌شوند (یا
  `selfHostedBaseUrl` را تنظیم کنید):

</div>

```json
"assets": [
  { "glob": "**/*", "input": "node_modules/ngx-editor-rtl-ltr-edition/fonts", "output": "assets/ngx-editor-fonts" }
]
```

<div dir="rtl">

- **`none`**: چیزی بارگذاری نمی‌شود و برنامه خودش قلم‌ها را بارگذاری می‌کند. `buildFontFaceCss()` و
  `buildGoogleFontsUrl()` در این کار کمک می‌کنند، از جمله برای صفحه‌هایی که HTML خروجی را نشان می‌دهند.

قلم‌ها در هر صفحه یک بار و فقط وقتی بارگذاری می‌شوند که منوی قلم نمایش داده شود یا سند از قلمی استفاده کند. محتوای
چسبانده‌شده فقط قلم‌های پیکربندی‌شده را نگه می‌دارد (`list: []` همهٔ قلم‌های چسبانده‌شده را حذف می‌کند). قلم به‌صورت
`<span style="font-family: …">` نوشته می‌شود و صفحه‌ای که HTML را نشان می‌دهد هم باید آن قلم را بارگذاری کند.
مجوز قلم‌ها SIL Open Font License 1.1 است ([THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)).

## تصویرها

دکمهٔ `image` پنجره‌ای با زبانهٔ **بارگذاری** (انتخاب فایل و ناحیهٔ رها کردن) و زبانهٔ **نشانی** باز می‌کند. فایل‌های
تصویری که چسبانده یا رها شوند هم بارگذاری می‌شوند. بارگذاری را به‌صورت سراسری یا برای هر ویرایشگر پیکربندی کنید
(تنظیم ویرایشگر برای هر فیلد برنده است):

</div>

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

<div dir="rtl">

تابع بارگذاری یک رشتهٔ نشانی یا `{ src, alt?, width? }` برمی‌گرداند و نتیجه از `sanitizeUrl` می‌گذرد. در حین
بارگذاری، سند یک جای‌نگهدار با پیش‌نمایش، میزان پیشرفت و دکمهٔ لغو نشان می‌دهد؛ در صورت خطا پیامی به زبان انتخاب‌شده
نمایش داده می‌شود.

- **بدون تابع بارگذاری:** تصویرها به‌صورت نشانی data درون سند قرار می‌گیرند و برای حجم بیشتر از `base64WarnSize`
  (پیش‌فرض ۵۰۰ کیلوبایت) هشدار داده می‌شود (`onWarning`، کنسول و رویداد). برای محتوای واقعی از تابع بارگذاری استفاده
  کنید.
- **تصویر انتخاب‌شده:** نوار ابزاری با ترازبندی (ابتدا، وسط، انتها؛ قرینه در راست‌به‌چپ)، متن جایگزین، زیرنویس (که
  آن را به `<figure data-type="image">` تبدیل می‌کند)، پیوند، جایگزینی و حذف؛ دستگیره‌های تغییر اندازه در گوشه‌های
  سمت انتهای سطر قرار دارند و از جهت متن پیروی می‌کنند (`features.resizeImage`).
- **رویدادها:** `editor.events` رویدادهای `imageUploadStart`، `imageUploadProgress`، `imageUploaded`،
  `imageUploadCancelled`، `imageUploadError` (`tooLarge`، `invalidType`، `uploadFailed`، `invalidResult`، `readFailed`)
  و `imageUploadWarning` را منتشر می‌کند:

</div>

```ts
editor.events.subscribe((event) => {
  if (event.type === 'imageUploadError') {
    this.toast.error(event.error.message);
  }
});
```

<div dir="rtl">

- از راه کد: `uploadImageFiles(editor.view, files, { pos })`، `editor.commands.setImageAlign('center')`،
  `setImageCaption('…')`، `setImageLink(url)`، `updateImage(attrs)` و `deleteImage()`.

## ویدیوها

دکمهٔ `video` را اضافه کنید. پنجرهٔ آن پیوندهای YouTube (`watch`، `youtu.be`، `shorts`، `live` و زمان شروع)، Vimeo (از
جمله پیوندهای خصوصی) و آپارات یا کد درج چسبانده‌شده را با پیش‌نمایش زنده می‌پذیرد، و اگر تابع بارگذاری تنظیم شده
باشد، فایل ویدیو را هم.

</div>

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

<div dir="rtl">

- درج ویدیو از میزبان‌هایی که در فهرست نیستند، چه در پنجره و چه در HTML چسبانده‌شده، پذیرفته نمی‌شود. میزبان‌های
  دیگر باید `https:` باشند و با `data-provider="custom"` ذخیره می‌شوند.
- بارگذاری ویدیو به `uploadHandler` جداگانه نیاز دارد (تابع بارگذاری تصویر دوباره به کار نمی‌رود و جایگزین data هم
  وجود ندارد)؛ بدون آن، زبانهٔ بارگذاری توضیح می‌دهد که این امکان در دسترس نیست و فایل‌های ویدیوی چسبانده‌شده خطای
  `noHandler` می‌دهند.
- با یک کلیک ویدیو انتخاب می‌شود (کلیک دوم آن را پخش می‌کند): نوار ابزار آن را تراز می‌کند، پهنایش را تعیین می‌کند
  (۲۵ تا ۱۰۰ درصد، یا با کشیدن دستگیره یا کلیدهای جهت‌نما)، زیرنویس را ویرایش می‌کند، آن را جایگزین یا حذف می‌کند.
- رویدادهای `videoUploadStart`، `videoUploadProgress`، `videoUploaded`، `videoUploadCancelled` و `videoUploadError`.
- `normalizeVideoUrl(url, { allowedHosts })` (در `/utils`) نشانی پخش‌کنندهٔ یک پیوند را می‌دهد و
  `editor.commands.insertVideo(url)` ویدیو را از راه کد درج می‌کند.

ویدیوها به‌صورت `<figure data-type="video">` با قاب واکنش‌گرای ۱۶:۹ و یک `<iframe>` یا `<video>` نوشته می‌شوند.

## نمایش HTML خروجی با styles/content.css

HTML ویرایشگر (`toHTML()` یا `outputFormat="html"`) برای تصویرها و ویدیوهای ترازشده، سبک‌های جدول، فهرست کارها و
فهرست‌ها و نقل‌قول‌های وابسته به جهت به چند قاعدهٔ CSS نیاز دارد. این شیوه‌نامه را به برنامه‌ای که محتوا را نشان
می‌دهد اضافه کنید:

</div>

```json
"styles": ["node_modules/ngx-editor-rtl-ltr-edition/styles/content.css", "src/styles.css"]
```

<div dir="rtl">

و محتوا را درون `ngx-editor-content` قرار دهید:

</div>

```html
<article class="ngx-editor-content" [innerHTML]="html"></article>
```

<div dir="rtl">

پاک‌ساز `[innerHTML]` در Angular ویژگی‌های `style` و `<iframe>`ها را حذف می‌کند و در نتیجه ترازبندی، قلم‌ها و
ویدیوها از دست می‌روند؛ HTMLی را نمایش دهید که خودتان در سرور پاک‌سازی کرده‌اید (بخش [امنیت](#امنیت) را ببینید).
رنگ‌ها متغیرهای CSS هستند (`--ngx-editor-content-*`). قلم‌های به‌کاررفته در محتوا هم باید در همان صفحه بارگذاری
شوند (بخش [قلم‌ها](#قلمها)).

## امنیت

- هر نشانی که وارد سند می‌شود — پیوندها، تصویرها، ویدیوها، HTML بارگذاری‌شده، HTML چسبانده‌شده، ورودی پنجره‌ها و نوار
  ابزار و نتیجهٔ بارگذاری — از `sanitizeUrl()` (`ngx-editor-rtl-ltr-edition/utils`) می‌گذرد. `javascript:`،
  `vbscript:`، `data:text/*`، نشانی‌های data از نوع SVG و طرح‌های ناشناخته حذف می‌شوند؛ پیوندها `http(s)`، `mailto`،
  `tel` و نشانی‌های نسبی را می‌پذیرند و تصویرها `blob:` و نشانی‌های data تصویری را هم.
- درج ویدیو به فهرست میزبان‌های مجاز محدود است؛ iframeها `referrerpolicy` و فهرست ثابت `allow` دارند.
- نام قلم‌ها و طول‌های CSS پیش از نوشته شدن در ویژگی `style` اعتبارسنجی می‌شوند.
- HTML در یک سند بی‌اثر (inert) تجزیه می‌شود و ویرایشگر از Trusted Types پشتیبانی می‌کند (نام سیاست `ngx-editor`).

**این‌ها HTML ذخیره‌شده را برای نمایش به کاربران دیگر امن نمی‌کنند.** هر کسی می‌تواند بدون استفاده از ویرایشگر هر
HTMLی را به API شما بفرستد. پیش از ذخیره یا نمایش HTML به کاربران دیگر، آن را در سرور پاک‌سازی کنید (با یک پاک‌ساز
مبتنی بر فهرست مجاز مانند DOMPurify، sanitize-html یا HtmlSanitizer که فقط برچسب‌ها، ویژگی‌ها، سبک‌ها و میزبان‌های
iframe مورد نیازتان را نگه دارد) و از Content Security Policy استفاده کنید.

## فرمان‌ها، منوهای سفارشی و موارد دیگر

APIهای نسخهٔ اصلی همچنان کار می‌کنند. چند نمونه:

</div>

```ts
// chain commands
this.editor.commands.textColor('red').insertText('Hello').focus().scrollIntoView().exec();
this.editor.commands.fontFamily('Vazirmatn, sans-serif').exec();

// convert between html and json
import { toDoc, toHTML } from 'ngx-editor-rtl-ltr-edition';
const json = toDoc('<p dir="rtl">سلام</p>');
const html = toHTML(json);
```

<div dir="rtl">

آیتم‌های منوی سفارشی از یک قالب (template) و پس از نوار ابزار نمایش داده می‌شوند:

</div>

```html
<ngx-editor-menu [editor]="editor" [customMenuRef]="customMenu"></ngx-editor-menu>

<ng-template #customMenu>
  <app-custom-menu [editor]="editor"></app-custom-menu>
</ng-template>
```

<div dir="rtl">

از نام کلاس‌های دکمه‌های داخلی (`NgxEditor__MenuItem`، `NgxEditor__MenuItem--Active`، `NgxEditor__Seperator`) دوباره
استفاده کنید؛ [منوی سفارشی](./projects/demo/src/app/components/custom-menu) برنامهٔ نمایشی یک نمونه است. منوی
شناور برای متن انتخاب‌شده: `<ngx-editor-floating-menu [editor]="editor">` درون `<ngx-editor>`. گزینه‌های `Editor`:
`content`، `history`، `keyboardShortcuts`، `inputRules`، `schema`، `plugins`، `nodeViews`، `attributes`، `features`،
`parseOptions`، `linkValidationPattern` و افزون بر آن‌ها `dir`، `autoDirection`، `fonts`، `image` و `video`.
اعتبارسنج‌ها: `Validators.required(schema)`، `maxLength` و… ویرایش گروهی، اشاره (mention)، بلوک‌های کد CodeMirror و
افزونه‌های دیگر ProseMirror مانند نسخهٔ اصلی کار می‌کنند ([برنامهٔ نمایشی](./projects/demo) از CodeMirror استفاده
می‌کند). مستندات نسخهٔ اصلی در https://sibiraj-s.github.io/ngx-editor این قابلیت‌های پایه را شرح می‌دهد؛ در
نمونه‌های آن نام بسته را جایگزین کنید.

## نسخهٔ نمایشی و توسعه

- **GitHub Pages:** https://ahpcoir-lgtm.github.io/ngx-editor-rtl-ltr-edition/ — با
  [.github/workflows/pages.yml](./.github/workflows/pages.yml) در هر push به شاخهٔ `main` منتشر می‌شود (ساخت ایستای
  برنامهٔ نمایشی با `ng build demo --configuration pages`). در یک fork یا نسخهٔ تازه از مخزن، یک بار آن را فعال کنید:
  **Settings › Pages › Build and deployment › Source: GitHub Actions**.
- **StackBlitz:** https://stackblitz.com/github/ahpcoir-lgtm/ngx-editor-rtl-ltr-edition — فایل `.stackblitzrc`
  وابستگی‌ها را نصب می‌کند، کتابخانه را می‌سازد و برنامهٔ نمایشی را اجرا می‌کند (`npm run stackblitz`). نصب و نخستین
  ساخت در مرورگر چند دقیقه طول می‌کشد.
- **به‌صورت محلی:**

</div>

```bash
npm install
npm run build:lib       # the demo imports the library from dist/
npm run demo            # http://localhost:5002
```

<div dir="rtl">

بررسی‌ها: `npx ng lint ngx-editor`، `npm run check:strict`، `npm run test:lib`، `npm run build:demo`،
`npm run build:pages`، `npm run test:demo` و `npm run compat -- --angular 19 --dir ../compat-19`.

مشارکت شما را خوشامد می‌گوییم — [CONTRIBUTING.md](./.github/CONTRIBUTING.md) و قاعده‌های طراحی در
[FORK_DESIGN.md](./FORK_DESIGN.md) را ببینید.

## مجوز و قدردانی

[MIT](./LICENSE). Copyright (c) 2017 Sibiraj (ngx-editor)؛ Copyright (c) 2026 امیرفرید عباسی و امین عباسی
(تغییرات در ngx-editor-rtl-ltr-edition).

- [ngx-editor](https://github.com/sibiraj-s/ngx-editor) ساختهٔ Sibiraj — ویرایشگری که این انشعاب بر پایهٔ آن است.
- [ProseMirror](https://prosemirror.net/) ساختهٔ Marijn Haverbeke و همکاران (MIT).
- آیکن‌ها از [Material Symbols](https://fonts.google.com/icons) (Apache License 2.0).
- قلم‌ها با مجوز SIL Open Font License 1.1.

مجوز وابستگی‌ها، آیکن‌ها و قلم‌ها در [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) آمده است.

</div>

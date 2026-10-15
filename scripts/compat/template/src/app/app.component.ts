import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  DEFAULT_TOOLBAR,
  Editor,
  NgxEditorComponent,
  NgxEditorFloatingMenuComponent,
  NgxEditorMenuComponent,
  NgxEditorUploadContext,
  Toolbar,
  toHTML,
} from 'ngx-editor-rtl-ltr-edition';
import { fa, getNgxEditorLocale, registerNgxEditorLocale } from 'ngx-editor-rtl-ltr-edition/locales';
import { DEFAULT_VIDEO_HOSTS, normalizeVideoUrl, sanitizeUrl } from 'ngx-editor-rtl-ltr-edition/utils';

registerNgxEditorLocale({ code: 'fa-AF', dir: 'rtl', locals: { ...fa.locals, bold: 'پررنگ' } });

@Component({
  selector: 'app-root',
  imports: [FormsModule, NgxEditorComponent, NgxEditorMenuComponent, NgxEditorFloatingMenuComponent],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnDestroy {
  readonly toolbar: Toolbar = [
    ...DEFAULT_TOOLBAR,
    ['align_start', 'align_end'],
    ['dir_ltr', 'dir_rtl', 'dir_auto'],
    ['font_family'],
    ['video'],
  ];

  readonly editor = new Editor({
    autoDirection: true,
    image: {
      maxSize: 5 * 1024 * 1024,
      uploadHandler: async (file: File, ctx: NgxEditorUploadContext) => {
        ctx.onProgress(100);
        return { src: sanitizeUrl(URL.createObjectURL(file), 'image') ?? '', alt: file.name };
      },
    },
    video: { allowedHosts: [...DEFAULT_VIDEO_HOSTS, 'video.example.com'] },
  });

  dir: string | null = 'rtl';
  html = '<p>سلام <strong>دنیا</strong></p>';

  readonly locale = getNgxEditorLocale('fa-IR')?.code ?? 'en';
  readonly video = normalizeVideoUrl('https://youtu.be/aqz-KE-bpKQ?t=30')?.src ?? '';

  get output(): string {
    return toHTML(this.editor.view.state.doc.toJSON(), undefined, { autoDirection: true });
  }

  ngOnDestroy(): void {
    this.editor.destroy();
  }
}

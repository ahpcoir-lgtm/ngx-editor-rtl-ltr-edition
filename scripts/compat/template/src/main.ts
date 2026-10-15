import { bootstrapApplication } from '@angular/platform-browser';
import { provideNgxEditorConfig } from 'ngx-editor-rtl-ltr-edition';

import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideNgxEditorConfig({
      locale: 'fa',
      fonts: { loading: 'self-hosted' },
      video: { youtubeNoCookie: true },
    }),
  ],
}).catch((error: unknown) => console.error(error));

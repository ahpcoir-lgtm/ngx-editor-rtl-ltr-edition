# Third-party notices

ngx-editor-rtl-ltr-edition is released under the MIT license (`LICENSE`). It is a fork of
[ngx-editor](https://github.com/sibiraj-s/ngx-editor) by Sibiraj (MIT, Copyright (c) 2017 Sibiraj), whose copyright
notice is kept in `LICENSE`. It includes or redistributes the third-party components listed below, each under its own
license.

## Runtime dependencies

These npm packages are installed with the library (`dependencies` of its `package.json` and their own dependencies)
and end up in the bundle of an application that uses the editor. None of them is bundled into the package itself;
each ships its full license text in its own package. Versions are those of the lock file at the time of writing.

| Package | Version | License | Copyright |
| --- | --- | --- | --- |
| prosemirror-commands | 1.7.2 | MIT | Copyright (C) 2015-2017 by Marijn Haverbeke and others |
| prosemirror-history | 1.5.1 | MIT | Copyright (C) 2015-2017 by Marijn Haverbeke and others |
| prosemirror-inputrules | 1.5.1 | MIT | Copyright (C) 2015-2017 by Marijn Haverbeke and others |
| prosemirror-keymap | 1.2.3 | MIT | Copyright (C) 2015-2017 by Marijn Haverbeke and others |
| prosemirror-model | 1.25.12 | MIT | Copyright (C) 2015-2017 by Marijn Haverbeke and others |
| prosemirror-schema-list | 1.5.1 | MIT | Copyright (C) 2015-2017 by Marijn Haverbeke and others |
| prosemirror-state | 1.4.4 | MIT | Copyright (C) 2015-2017 by Marijn Haverbeke and others |
| prosemirror-tables | 1.8.5 | MIT | Copyright (C) 2015-2016 by Marijn Haverbeke and others |
| prosemirror-transform (via prosemirror-*) | 1.12.2 | MIT | Copyright (C) 2015-2017 by Marijn Haverbeke and others |
| prosemirror-view | 1.42.6 | MIT | Copyright (C) 2015-2017 by Marijn Haverbeke and others |
| orderedmap (via prosemirror-model) | 2.1.1 | MIT | Copyright (C) 2016 by Marijn Haverbeke and others |
| rope-sequence (via prosemirror-history) | 1.3.4 | MIT | Copyright (C) 2016 by Marijn Haverbeke |
| w3c-keyname (via prosemirror-keymap, prosemirror-view) | 2.2.8 | MIT | Copyright (C) 2016 by Marijn Haverbeke and others |
| @floating-ui/core | 1.8.0 | MIT | Copyright (c) 2021-present Floating UI contributors |
| @floating-ui/dom | 1.8.0 | MIT | Copyright (c) 2021-present Floating UI contributors |
| @floating-ui/utils (via @floating-ui/*) | 0.2.12 | MIT | Copyright (c) 2021-present Floating UI contributors |
| @types/trusted-types (type declarations only) | 2.0.7 | MIT | Copyright (c) Microsoft Corporation |
| tslib | 2.8.1 | 0BSD | Copyright (c) Microsoft Corporation |

Peer dependencies, installed by the application itself: `@angular/*` (MIT, Copyright (c) Google LLC) and `rxjs`
(Apache-2.0, Copyright (c) Google, Inc., Netflix, Inc., Microsoft Corp. and contributors).

## Icons

The toolbar icons (SVG paths in `src/lib/icons/`, compiled into the library) are taken from Google's Material
Icons / Material Symbols (https://fonts.google.com/icons), Copyright Google LLC, licensed under the Apache License,
Version 2.0. The full license text is in `LICENSES/Apache-2.0.txt` (also in the package).

## Fonts

The font files under `fonts/` of the package (`projects/ngx-editor/fonts/` in the repository) are unmodified
WOFF2 subsets (Arabic and Latin, weights 400 and 700) as served by Google Fonts. Each font is licensed under the
SIL Open Font License, Version 1.1 (OFL-1.1). The full license text ships next to the files (`fonts/<font>/OFL.txt`)
and is also in `LICENSES/fonts/` of the repository. The fonts may be used, embedded and redistributed with the
editor; they may not be sold by themselves.

| Font | Copyright | License | Source |
| --- | --- | --- | --- |
| Vazirmatn | Copyright 2015 The Vazirmatn Project Authors (https://github.com/rastikerdar/vazirmatn) | OFL-1.1 | https://fonts.google.com/specimen/Vazirmatn |
| Noto Sans Arabic | Copyright 2022 The Noto Project Authors (https://github.com/notofonts/arabic) | OFL-1.1 | https://fonts.google.com/specimen/Noto+Sans+Arabic |
| Noto Naskh Arabic | Copyright 2022 The Noto Project Authors (https://github.com/notofonts/arabic) | OFL-1.1 | https://fonts.google.com/specimen/Noto+Naskh+Arabic |
| Amiri | Copyright 2010-2022 The Amiri Project Authors (https://github.com/aliftype/amiri). | OFL-1.1 | https://fonts.google.com/specimen/Amiri |
| Cairo | Copyright 2009 The Cairo Project Authors (https://github.com/Gue3bara/Cairo) | OFL-1.1 | https://fonts.google.com/specimen/Cairo |
| Tajawal | Copyright 2018 Boutros International. (http://www.boutrosfonts.com) | OFL-1.1 | https://fonts.google.com/specimen/Tajawal |
| IBM Plex Sans Arabic | Copyright © 2017 IBM Corp. with Reserved Font Name "Plex" | OFL-1.1 | https://fonts.google.com/specimen/IBM+Plex+Sans+Arabic |
| Almarai | Copyright 2019 The Almarai Project Authors (https://github.com/JuergenWillrodt/Almarai) | OFL-1.1 | https://fonts.google.com/specimen/Almarai |
| Harmattan | Copyright (c) 2007-2008, The C&MA Guinea Fulbe Team; Copyright renewed 2011-2012, George W. Nuss (http://www.fulbefouta.com), with the Reserved Font Name "Fouta". Copyright (c) 2004-2025, SIL Global (https://www.sil.org), with Reserved Font Names 'Andika' and 'SIL'. | OFL-1.1 | https://fonts.google.com/specimen/Harmattan |
| Lateef | Copyright (c) 1994-2025, SIL Global (https://www.sil.org/), with Reserved Font Names "Lateef" and "SIL". Latin glyphs copyright (c) 2018 The Crimson Pro Project Authors (https://github.com/Fonthausen/CrimsonPro) | OFL-1.1 | https://fonts.google.com/specimen/Lateef |
| Scheherazade New | Copyright (c) 1994-2026, SIL Global (https://www.sil.org/), with Reserved Font Names "Scheherazade" and "SIL". | OFL-1.1 | https://fonts.google.com/specimen/Scheherazade+New |
| El Messiri | Copyright 2015 The El Messiri Project Authors (https://github.com/Gue3bara/El-Messiri) | OFL-1.1 | https://fonts.google.com/specimen/El+Messiri |
| Reem Kufi | Copyright 2015-2022 The Reem Kufi Project Authors (https://github.com/aliftype/reem-kufi), with Reserved Font Name "Josefin Sans". | OFL-1.1 | https://fonts.google.com/specimen/Reem+Kufi |

The system fonts offered by the font menu (Tahoma, Arial, Times New Roman, Courier New) are not included; they are
only named in CSS and come from the reader's device.

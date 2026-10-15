> **Note — upstream documentation.** This folder is the documentation site of the original
> [ngx-editor](https://github.com/sibiraj-s/ngx-editor) package (Astro / Starlight), kept unchanged from upstream for
> reference. It describes upstream ngx-editor and its package name, not the additions of ngx-editor-rtl-ltr-edition,
> and it is not built or deployed by this repository (GitHub Pages publishes the demo instead). The documentation of
> the fork is [README.md](../README.md) / [README.fa.md](../README.fa.md).

# docs site: built with Startlight(Astro)

```bash
git clone https://github.com/sibiraj-s/ngx-editor # clone the repo
cd docs # navigate to docs
npm install # install the dependencies
npm run dev # start the dev server
```

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/sibiraj-s/ngx-editor/tree/master/docs)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/s/github/sibiraj-s/ngx-editor/tree/master/docs)

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro + Starlight project, you'll see the following folders and files:

```
.
├── public/
├── src/
│   ├── assets/
│   ├── content/
│   │   ├── docs/en
│   │   └── config.ts
│   └── env.d.ts
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

Starlight looks for `.md` or `.mdx` files in the `src/content/docs/` directory. Each file is exposed as a route based on its file name.

Images can be added to `src/assets/` and embedded in Markdown with a relative link.

Static assets, like favicons, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:3000`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Check out [Starlight’s docs](https://starlight.astro.build/), read [the Astro documentation](https://docs.astro.build), or jump into the [Astro Discord server](https://astro.build/chat).

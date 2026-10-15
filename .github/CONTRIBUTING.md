# Contributing

Contributions to ngx-editor-rtl-ltr-edition are welcome. Please discuss a change first:

- bugs: open an issue at https://github.com/ahpcoir-lgtm/ngx-editor-rtl-ltr-edition/issues
- anything else: start a discussion at https://github.com/ahpcoir-lgtm/ngx-editor-rtl-ltr-edition/discussions

This repository is a fork of [ngx-editor](https://github.com/sibiraj-s/ngx-editor). Problems that also happen with
the original `ngx-editor` package are best reported (and fixed) upstream as well.

Read [FORK_DESIGN.md](../FORK_DESIGN.md) before changing the editor: it lists the rules every feature of the fork
follows (Angular 19 – 22, strict TypeScript for fork code, logical CSS properties, locale keys for every string,
sanitized URLs, emitted HTML changes listed in the changelog).

## Setting up the development environment

- clone the repository

```bash
git clone https://github.com/ahpcoir-lgtm/ngx-editor-rtl-ltr-edition
```

- install the dependencies (Node.js 22.22.3+ or 24.15+)

```bash
npm install
```

- build the library (the demo imports it from `dist/`), or build and watch it

```bash
npm run build:lib
npm run dev
```

- run the demo on http://localhost:5002

```bash
npm run demo
```

## Checks

```bash
npx ng lint ngx-editor
npm run check:strict
npm run test:lib
npm run build:demo
npx ng build demo --configuration pages
npm run test:demo
# a small Angular 19 app built against the packed library (in a folder outside the repository)
npm run compat -- --angular 19 --dir ../compat-19
```

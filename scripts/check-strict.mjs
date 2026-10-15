// Type-checks the library with `strict: true` and reports only the diagnostics in fork-owned files, because the
// upstream sources are written for `strict: false`. The entry points resolve to their sources, so no build is needed.
// usage: npm run check:strict
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

// fork-owned files, relative to the repository root; add the files of every new feature here
const FORK_OWNED = [
  'projects/ngx-editor/locales/**',
  'projects/ngx-editor/src/lib/provide-config.ts',
  'projects/ngx-editor/src/lib/provide-config.spec.ts',
  'projects/ngx-editor/src/lib/editor.service.spec.ts',
  'projects/ngx-editor/src/lib/editor.component.placeholder.spec.ts',
  // 1. direction
  'projects/ngx-editor/schema/block-attrs.ts',
  'projects/ngx-editor/schema/nodes.spec.ts',
  'projects/ngx-editor/src/lib/commands/TextDirection.ts',
  'projects/ngx-editor/src/lib/commands/TextDirection.spec.ts',
  'projects/ngx-editor/src/lib/commands/TextAlign.spec.ts',
  'projects/ngx-editor/src/lib/plugins/direction.ts',
  'projects/ngx-editor/src/lib/plugins/direction.spec.ts',
  'projects/ngx-editor/src/lib/plugins/direction-shortcuts.ts',
  'projects/ngx-editor/src/lib/plugins/direction-shortcuts.spec.ts',
  'projects/ngx-editor/src/lib/plugins/set-attribute.ts',
  'projects/ngx-editor/src/lib/plugins/table-view.ts',
  'projects/ngx-editor/src/lib/resolve-direction.ts',
  'projects/ngx-editor/src/lib/parsers.spec.ts',
  'projects/ngx-editor/src/lib/defaultPlugins.direction.spec.ts',
  'projects/ngx-editor/src/lib/editor.component.direction.spec.ts',
  'projects/ngx-editor/src/lib/modules/menu/mirrored-icons.ts',
  'projects/ngx-editor/src/lib/modules/menu/menu.component.direction.spec.ts',
  'projects/ngx-editor/src/lib/icons/align_start.ts',
  'projects/ngx-editor/src/lib/icons/align_end.ts',
  'projects/ngx-editor/src/lib/icons/dir_*.ts',
  'projects/ngx-editor/src/lib/resolve-direction.spec.ts',
  'projects/ngx-editor/src/lib/commands/wrap-direction.spec.ts',
  'projects/ngx-editor/src/lib/modules/menu/popup-position.directive.spec.ts',
  'projects/ngx-editor/src/lib/modules/menu/floating-menu/floating-menu.direction.spec.ts',
  // 2. localization
  'projects/ngx-editor/src/lib/Locals.keys.spec.ts',
  // 3. tables
  'projects/ngx-editor/schema/table-attrs.ts',
  'projects/ngx-editor/schema/table-attrs.spec.ts',
  'projects/ngx-editor/src/lib/commands/table.ts',
  'projects/ngx-editor/src/lib/commands/TableCommands.ts',
  'projects/ngx-editor/src/lib/commands/TableCommands.spec.ts',
  'projects/ngx-editor/src/lib/plugins/table-rtl.ts',
  'projects/ngx-editor/src/lib/plugins/table-rtl.spec.ts',
  'projects/ngx-editor/src/lib/modules/menu/table/table.component.ts',
  'projects/ngx-editor/src/lib/modules/menu/dropdown/dropdown.component.ts',
];

// the library sources and their specs, each checked with its own tsconfig
const TSCONFIGS = [
  'projects/ngx-editor/tsconfig.lib.json',
  'projects/ngx-editor/tsconfig.spec.json',
];

const rootDir = path.resolve(import.meta.dirname, '..');
const libDir = path.join(rootDir, 'projects/ngx-editor');
const packageName = JSON.parse(fs.readFileSync(path.join(libDir, 'package.json'), 'utf8')).name;

const toPosix = (file) => file.split(path.sep).join('/');

const globToRegExp = (glob) => {
  let source = '';

  for (let i = 0; i < glob.length; i++) {
    const char = glob[i];

    if (char === '*' && glob[i + 1] === '*') {
      // `**/` matches any number of directories, a trailing `**` anything
      const slash = glob[i + 2] === '/';
      source += slash ? '(?:.*/)?' : '.*';
      i += slash ? 2 : 1;
    } else if (char === '*') {
      source += '[^/]*';
    } else if (char === '?') {
      source += '[^/]';
    } else {
      source += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }

  return new RegExp(`^${source}$`);
};

const forkOwned = FORK_OWNED.map(globToRegExp);
const isForkOwned = (fileName) => {
  const relative = toPosix(path.relative(rootDir, path.resolve(fileName)));
  return forkOwned.some((pattern) => pattern.test(relative));
};

// `ngx-editor-rtl-ltr-edition` and every `ngx-editor-rtl-ltr-edition/<name>` (a folder with an ng-package.json)
const sourcePaths = () => {
  const entryFile = (dir) => {
    const ngPackage = JSON.parse(fs.readFileSync(path.join(dir, 'ng-package.json'), 'utf8'));
    return path.resolve(dir, ngPackage.lib?.entryFile ?? 'public_api.ts');
  };

  const paths = { [packageName]: [entryFile(libDir)] };

  for (const entry of fs.readdirSync(libDir, { withFileTypes: true })) {
    const dir = path.join(libDir, entry.name);
    if (entry.isDirectory() && fs.existsSync(path.join(dir, 'ng-package.json'))) {
      paths[`${packageName}/${entry.name}`] = [entryFile(dir)];
    }
  }

  return paths;
};

const formatHost = {
  getCanonicalFileName: (fileName) => fileName,
  getCurrentDirectory: () => rootDir,
  getNewLine: () => ts.sys.newLine,
};

// an unresolved import means the check runs against the wrong files, wherever it happens
const CANNOT_FIND_MODULE = new Set([2307, 2792]);

const check = (tsconfig) => {
  const configPath = path.join(rootDir, tsconfig);
  const { config, error } = ts.readConfigFile(configPath, ts.sys.readFile);
  if (error) {
    return { reported: [error], ignored: 0, files: 0 };
  }

  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, path.dirname(configPath), {
    strict: true,
    noEmit: true,
    // emit options of the build that do not apply without output
    declaration: false,
    declarationMap: false,
    sourceMap: false,
    inlineSources: false,
    paths: sourcePaths(),
  }, configPath);

  const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
  const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];

  // diagnostics without a file concern the configuration and always count
  const reported = diagnostics.filter((diagnostic) => !diagnostic.file
    || isForkOwned(diagnostic.file.fileName)
    || CANNOT_FIND_MODULE.has(diagnostic.code));
  const files = parsed.fileNames.filter(isForkOwned).length;

  return { reported, ignored: diagnostics.length - reported.length, files };
};

let failed = false;

for (const tsconfig of TSCONFIGS) {
  const { reported, ignored, files } = check(tsconfig);

  if (reported.length > 0) {
    failed = true;
    console.error(ts.formatDiagnosticsWithColorAndContext(reported, formatHost));
  }

  console.log(`${tsconfig}: ${reported.length} strict mode error(s) in ${files} fork-owned file(s)`
    + ` (${ignored} in upstream files ignored)`);
}

if (failed) {
  process.exitCode = 1;
}

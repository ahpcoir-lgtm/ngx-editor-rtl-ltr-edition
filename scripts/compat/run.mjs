// Compatibility smoke test: creates a small Angular app for one Angular major in a folder outside the repository,
// installs the packed library into it and builds it with strict templates and a full library check
// (`skipLibCheck: false`), so the partial declarations, the typings and the package exports are checked.
//
// usage: node scripts/compat/run.mjs --angular 19 --dir <empty or missing folder> [--tarball <file.tgz>] [--no-build]
//
// Without --tarball the library is packed from dist/ngx-editor-rtl-ltr-edition (run `npm run build:lib` first).
// The versions of TypeScript and zone.js are the ones the chosen Angular release asks for (npm view).
import { execFileSync } from 'node:child_process';
import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const distDir = path.join(repoRoot, 'dist/ngx-editor-rtl-ltr-edition');

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? undefined : args[index + 1];
};

const major = option('angular');
const dir = option('dir');
const build = !args.includes('--no-build');

if (!major || !/^\d+$/.test(major) || !dir) {
  console.error('usage: node scripts/compat/run.mjs --angular <major> --dir <folder> [--tarball <file.tgz>] [--no-build]');
  process.exit(2);
}

const appDir = path.resolve(dir);
if (appDir === repoRoot || appDir.startsWith(repoRoot + path.sep)) {
  // inside the repository the app would resolve the repository's own node_modules (Angular 22)
  console.error('the folder must be outside the repository');
  process.exit(2);
}

const isWindows = process.platform === 'win32';
const run = (command, commandArgs, cwd) => {
  console.log(`> ${command} ${commandArgs.join(' ')}`);
  return execFileSync(command, commandArgs, { cwd, stdio: ['ignore', 'pipe', 'inherit'], shell: isWindows, encoding: 'utf8' });
};
const runVisible = (command, commandArgs, cwd) => {
  console.log(`> ${command} ${commandArgs.join(' ')}`);
  execFileSync(command, commandArgs, { cwd, stdio: 'inherit', shell: isWindows });
};

// the peer dependency of the newest release of the major, e.g. typescript of @angular/compiler-cli@19.x; x-ranges because cmd.exe treats ^ as an escape character
const peerRange = (pkg, peer) => {
  const output = run('npm', ['view', `${pkg}@${major}.x`, 'peerDependencies', '--json'], repoRoot);
  const parsed = JSON.parse(output);
  const latest = Array.isArray(parsed) ? parsed[parsed.length - 1] : parsed;
  const range = latest?.[peer];
  if (!range) {
    throw new Error(`${pkg}@${major}.x has no peer dependency ${peer}`);
  }
  return range;
};

await mkdir(appDir, { recursive: true });
if ((await readdir(appDir)).length > 0) {
  console.error(`${appDir} is not empty`);
  process.exit(2);
}

let tarball = option('tarball');
if (tarball) {
  tarball = path.resolve(tarball);
} else {
  const packed = JSON.parse(run('npm', ['pack', distDir, '--pack-destination', appDir, '--json'], repoRoot));
  tarball = path.join(appDir, packed[0].filename);
}

await cp(path.join(here, 'template'), appDir, { recursive: true });

const typescript = peerRange('@angular/compiler-cli', 'typescript');
const zone = peerRange('@angular/core', 'zone.js');
const packageFile = path.join(appDir, 'package.json');
const manifest = (await readFile(packageFile, 'utf8'))
  .replaceAll('__ANGULAR__', `${major}.x`)
  .replaceAll('__TYPESCRIPT__', typescript)
  .replaceAll('__ZONE__', zone)
  .replaceAll('__LIBRARY__', `file:${tarball.split(path.sep).join('/')}`);
await writeFile(packageFile, manifest);

console.log(`Angular ${major}.x, typescript ${typescript}, zone.js ${zone}, library ${path.basename(tarball)}`);

runVisible('npm', ['install', '--no-audit', '--no-fund'], appDir);
runVisible('npx', ['ng', 'version'], appDir);

if (build) {
  runVisible('npx', ['ng', 'build'], appDir);
  console.log(`Angular ${major}: the app built against ngx-editor-rtl-ltr-edition`);
}

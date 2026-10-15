import fs from 'node:fs/promises';
import path from 'node:path';
import pc from 'picocolors';

const distDir = path.resolve(process.cwd(), 'dist/ngx-editor-rtl-ltr-edition');

const copyFile = async function (srcFilePath, destFilePath) {
  const fileName = path.basename(srcFilePath);
  try {
    const srcPath = path.resolve(process.cwd(), srcFilePath);
    const destPath = path.resolve(distDir, destFilePath);
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.copyFile(srcPath, destPath);
    console.log(pc.green(`- File Copied: ${fileName}`));
  } catch (err) {
    console.log(pc.red(`Error while copying ${fileName}`), err);
    process.exitCode = 1;
  }
};

// The Angular 22 compiler writes `ChangeDetectionStrategy.Default` as `ChangeDetectionStrategy.Eager` in the
// partial declarations. The linker of Angular 19-21 resolves the strategy by its symbol name and only knows
// `Default`, so it fails with "Unsupported change detection strategy". Both names are the same enum value
// (check-always), and the Angular 22 linker accepts `Default` too, so rewriting the name keeps one build
// working on every supported Angular version.
const makeLinkableOnOlderAngular = async function () {
  const fesmDir = path.join(distDir, 'fesm2022');
  const files = (await fs.readdir(fesmDir)).filter((file) => file.endsWith('.mjs'));
  let count = 0;

  for (const file of files) {
    const filePath = path.join(fesmDir, file);
    const source = await fs.readFile(filePath, 'utf8');
    const rewritten = source.replaceAll('ChangeDetectionStrategy.Eager', () => {
      count += 1;
      return 'ChangeDetectionStrategy.Default';
    });

    if (rewritten !== source) {
      await fs.writeFile(filePath, rewritten);
    }
  }

  console.log(pc.green(`- Change detection names made linkable on Angular 19+: ${count}`));
};

await makeLinkableOnOlderAngular();
await copyFile('README.md', 'README.md');
// the Persian README is optional until it is written
if (await fs.stat('README.fa.md').catch(() => null)) {
  await copyFile('README.fa.md', 'README.fa.md');
}
await copyFile('CHANGELOG.md', 'CHANGELOG.md');
await copyFile('LICENSE', 'LICENSE');

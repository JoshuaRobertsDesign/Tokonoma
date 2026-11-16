// Writes public/THIRD-PARTY-NOTICES.txt from the installed production dependencies
// (their own LICENSE / NOTICE files), plus the icons and font used in the skin.
// Run by `npm run build`; the file is served at /THIRD-PARTY-NOTICES.txt and
// copied next to the embeddable build in /lib/.
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const dirs = execSync('npm ls --omit=dev --all --parseable', { cwd: root, encoding: 'utf8' })
  .trim().split('\n').slice(1);
const seen = new Set();
const parts = [];
for (const dir of dirs) {
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const id = `${pkg.name}@${pkg.version}`;
  if (seen.has(id)) continue;
  seen.add(id);
  const files = readdirSync(dir).filter((f) => /^(licen[cs]e|notice|copying)(\.|$)/i.test(f));
  const texts = files.map((f) => readFileSync(join(dir, f), 'utf8').trim());
  parts.push([
    `${id}`,
    `License: ${pkg.license || 'see below'}`,
    pkg.homepage ? `Homepage: ${pkg.homepage}` : '',
    '',
    texts.join('\n\n') || '(no license file shipped with the package)',
  ].filter((l, i) => l !== '' || i === 3).join('\n'));
}
const header = `THIRD-PARTY NOTICES — Tokonoma, a skin for Video.js v10

Tokonoma is built on, and its embeddable build (/lib/tokonoma.js) includes, the
open-source software listed below. Each is used under its own license, reproduced
here. Interface icons are drawn from Phosphor Icons (MIT); the typeface is
JetBrains Mono (SIL Open Font License 1.1).

Generated ${new Date().toISOString().slice(0, 10)} from the installed packages.
`;
const out = [header, ...parts].join(`\n\n${'='.repeat(78)}\n\n`) + '\n';
writeFileSync(join(root, 'public', 'THIRD-PARTY-NOTICES.txt'), out);
if (existsSync(join(root, 'dist', 'lib'))) writeFileSync(join(root, 'dist', 'lib', 'THIRD-PARTY-NOTICES.txt'), out);
console.log(`notices: ${parts.length} packages`);

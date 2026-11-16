// Vite leaves an ES library build unminified (to keep tree-shaking hints for
// bundlers). The hosted copy under /lib/ is loaded straight into pages, so
// minify it.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { transformSync } from 'esbuild';

const dir = new URL('../dist/lib/', import.meta.url);
for (const name of readdirSync(dir).filter((f) => f.endsWith('.js'))) {
  const file = new URL(name, dir);
  const { code } = transformSync(readFileSync(file, 'utf8'), { minify: true, format: 'esm', target: 'es2020' });
  // keep a pointer to the licenses of what's bundled inside
  const banner = '/*! Tokonoma, a skin for Video.js v10. Includes Video.js, hls.js and Lit (Apache-2.0 / BSD-3-Clause) and Phosphor Icons (MIT); see THIRD-PARTY-NOTICES.txt */\n';
  writeFileSync(file, banner + code);
}

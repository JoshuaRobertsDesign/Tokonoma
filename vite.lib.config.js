import { defineConfig } from 'vite';

// The embeddable build: one module that defines <tokonoma-player> (Video.js
// included) and one stylesheet, published with the site under /lib/.
export default defineConfig({
  base: './',
  publicDir: false,
  build: {
    outDir: 'dist/lib',
    minify: 'esbuild',
    emptyOutDir: true,
    lib: {
      entry: 'src/lib.js',
      formats: ['es'],
      fileName: () => 'tokonoma.js',
      cssFileName: 'tokonoma',
    },
  },
});

import { defineConfig } from 'astro/config';

// Fully static site: `npm run build` writes plain files to dist/.
export default defineConfig({
  output: 'static',
  // The tests build into their own folder so fake data never lands in dist/.
  outDir: process.env.ASTRO_OUT_DIR || './dist',
});

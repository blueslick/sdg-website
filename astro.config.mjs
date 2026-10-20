import { defineConfig } from 'astro/config';

// Fully static site: `npm run build` writes plain files to dist/.
export default defineConfig({
  output: 'static',
});

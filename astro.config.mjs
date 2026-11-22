import { defineConfig } from 'astro/config';
import pagefind from 'astro-pagefind';
import { webcore } from 'webcoreui/integration';

// Set SITE and BASE for your host, for example:
//   SITE=https://example.github.io BASE=/zzz-builds npm run build
const site = process.env.SITE || 'http://localhost:4321';
const base = process.env.BASE || '/';

export default defineConfig({
  site,
  base,
  integrations: [webcore(), pagefind()],
  vite: {
    build: {
      // Emit item images as files instead of inlining them into every page.
      assetsInlineLimit: 0,
    },
  },
});

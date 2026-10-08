// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // The address canonical links use. Staging builds set PUBLIC_SITE_URL; production keeps the www default.
  site: process.env.PUBLIC_SITE_URL || 'https://www.cbitx.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
});

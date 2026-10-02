// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.cbitx.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
});

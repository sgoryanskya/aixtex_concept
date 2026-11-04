import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

/* Адрес и подпапка публикации задаются переменными окружения, см. README */
const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');

export default defineConfig({
  site: env.PUBLIC_SITE_URL || undefined,
  base: env.BASE_PATH || '/',
  trailingSlash: 'ignore',
  build: { assets: 'assets' },
  devToolbar: { enabled: false },
  /* Живого WebGL на странице нет: сцена раунда 4 лежит в _archive/round4 и не собирается */
  vite: {
    build: { chunkSizeWarningLimit: 700 },
  },
});

import { defineConfig } from 'vite';

// Le jeu est servi depuis https://counteraccro.github.io/IdleBabel/
export default defineConfig({
  base: '/IdleBabel/',
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
});

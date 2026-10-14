/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import { VERSION } from './src/data/version';

/** L'identifiant de ce build : sa date de compilation. */
const BUILD_DATE = new Date().toISOString();

/**
 * Publie version.json à côté du jeu : le build et le nom de la version en ligne. Le jeu le relit pour savoir
 * qu'une nouvelle version est sortie (ui/updateNotice).
 */
const versionFile = (): Plugin => ({
  name: 'version-file',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD_DATE, name: VERSION }) });
  },
});

// Le jeu est servi depuis https://counteraccro.github.io/IdleBabel/
export default defineConfig({
  base: '/IdleBabel/',
  define: {
    __BUILD_DATE__: JSON.stringify(BUILD_DATE),
  },
  plugins: [versionFile()],
  // Les tests qui jouent des milliers de pages prennent ~1 s ici, plus de 5 s sur la machine de GitHub, plus lente et qui
  // lance tous les fichiers à la fois (build du 14/10 en échec) : ils ont le temps.
  test: { testTimeout: 30_000 },
});

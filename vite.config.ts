import { readFileSync } from 'node:fs';
import preact from '@preact/preset-vite';
import { defineConfig } from 'vitest/config';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  // caminhos relativos: o mesmo build serve em https://<usuário>.github.io/calorie-burn/ ou na raiz de qualquer host
  base: './',
  plugins: [preact()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  // o Bluefy (iPhone) usa o WebKit do sistema; safari14 cobre iOS 14+
  build: { target: 'safari14' },
  test: { include: ['src/**/*.test.ts'] },
});

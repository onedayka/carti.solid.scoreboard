import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import sass from 'vite-plugin-sass';
import devtools from 'solid-devtools/vite'

export default defineConfig({
  plugins: [
    /* 
    Uncomment the following line to enable solid-devtools.
    For more info see https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#readme
    */
    devtools({
      /* features options - all disabled by default */
      autoname: true, // e.g. enable autoname
      locator: {
        targetIDE: 'vscode',
        componentLocation: true,
        jsxLocation: true,
      },
    }),
    solidPlugin(),
    sass()
  ],
  server: {
    port: 3000,
  },
  build: {
    target: 'es2016',
  },
});

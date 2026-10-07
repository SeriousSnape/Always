import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: { main: 'index.html', result: 'result.html', pay: 'pay.html' },
    },
  },
});

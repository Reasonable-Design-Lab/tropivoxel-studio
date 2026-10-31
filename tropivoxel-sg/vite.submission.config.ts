import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  base:'./',
  publicDir:false,
  define:{'import.meta.env.VITE_STATIC_SUBMISSION':JSON.stringify('true')},
  plugins:[react(),tailwindcss()],
  build:{
    outDir:'../submission',
    emptyOutDir:false,
    minify:false,
    cssCodeSplit:false,
    modulePreload:false,
    rollupOptions:{output:{format:'iife',inlineDynamicImports:true,entryFileNames:'app.js',assetFileNames:asset=>asset.names.some(n=>n.endsWith('.css'))?'styles.css':'[name][extname]'}},
  },
});

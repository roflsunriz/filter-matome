export default {
  build: {
    outDir: 'dist',
    lib: {
      entry: 'src/main.ts',
      name: 'CacheDataManager',
      fileName: 'list',
      formats: ['es' as const]
    },
    rollupOptions: {
      output: {
        entryFileNames: 'list.js',
        format: 'es' as const
      }
    },
    emptyOutDir: true,
    sourcemap: true,
    minify: true
  },
  resolve: {
    alias: {
      '@': '../src'
    }
  },
  server: {
    port: 3000,
    open: false
  }
}; 
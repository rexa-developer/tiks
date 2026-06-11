import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    react: 'src/react.ts',
    vue: 'src/vue.ts',
    svelte: 'src/svelte.ts',
    solid: 'src/solid.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  minify: true,
  treeshake: true,
  clean: true,
  external: ['react', 'vue'],
})

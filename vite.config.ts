import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    dts({
      include: ['src/components/PerfectVirtualScroll.vue', 'src/index.ts'],
      outDir: 'dist',
      insertTypesEntry: true,
      compilerOptions: {
        declaration: true
      }
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'PerfectVirtualScroll',
      fileName: 'perfect-virtual-scroll'
    },
    rollupOptions: {
      // 确保应用中不会打包 vue，而是将其作为外部依赖
      external: ['vue'],
      output: {
        // 在 UMD 构建模式下为这些外部化的依赖提供一个全局变量
        globals: {
          vue: 'Vue'
        }
      }
    }
  }
})

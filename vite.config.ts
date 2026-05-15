import { defineConfig } from 'vite'
import honox from 'honox/vite'
import build from '@hono/vite-build/cloudflare-workers'
import adapter from '@hono/vite-dev-server/cloudflare'

export default defineConfig(({ mode }) => {
  if (mode === 'client') {
    return {
      plugins: [
        honox({
          client: {
            input: ['/app/client.ts', '/app/style.css'],
            assetsDir: 'static',
            jsxImportSource: 'hono/jsx/dom',
          },
        }),
      ],
    }
  }

  if (mode === 'development') {
    return {
      plugins: [
        honox({
          devServer: { adapter: adapter({ proxy: { remoteBindings: false, persist: true } }) },
          client: {
            input: ['/app/client.ts', '/app/style.css'],
            assetsDir: 'static',
            jsxImportSource: 'hono/jsx/dom',
          },
        }),
      ],
    }
  }

  return {
    plugins: [
      honox({
        client: {
          input: ['/app/client.ts', '/app/style.css'],
          assetsDir: 'static',
          jsxImportSource: 'hono/jsx/dom',
        },
      }),
      build(),
    ],
  }
})
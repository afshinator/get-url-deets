import { jsxRenderer } from 'hono/jsx-renderer'
import { Link, Script } from 'honox/server'

export default jsxRenderer(({ children, title }: { children?: any; title?: string; Layout: any }) => {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <Link href="/app/style.css" rel="stylesheet" />
        <title>{title ?? 'Deets'}</title>
      </head>
      <body>
        {children}
        <Script src="/app/client.ts" />
      </body>
    </html>
  )
})

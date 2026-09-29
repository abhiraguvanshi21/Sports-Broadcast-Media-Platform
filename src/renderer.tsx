// ============================================================
// HTML RENDERER — page ka basic dhancha (sirf dev preview ke liye)
// Kaam: HTML head/body ka wrapper banana. Production me Cloudflare
// khud bana deta hai, isliye ye mainly local testing me use hota hai.
// ============================================================
import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html>
      <head>
        <link href="/static/style.css" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
})

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createServer, DevEnvironment } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const origin = 'https://www.hushful-app.com'
const pages = [
  ['/', null, 'Hushful | Free Wishlist App & Private Gift Coordination', 'Create free wishlists from any store. Share links with anyone, even without an account, and coordinate gifts privately. Available on iPhone, iPad, and the web.'],
  ['/press', 'press', 'About Hushful | Wishlist App for iOS & Web', 'Learn about Hushful, the wishlist app for sharing gift ideas and privately coordinating gifts with friends and family.'],
  ['/support', 'support', 'Hushful Support | Help with Wishlists & Your Account', 'Get help with Hushful wishlists, sharing, gift coordination, your account, and the lifetime Pro upgrade.'],
  ['/privacy', 'privacy', 'Privacy Policy | Hushful', 'Read how Hushful collects, uses, and protects your account information and wishlist data.'],
  ['/terms', 'terms', 'Terms of Use | Hushful', 'Read the terms for using Hushful on iOS, Android, and the web.'],
  ['/account-deletion', 'account-deletion', 'Delete Your Account | Hushful', 'Learn how to delete your Hushful account and associated data.'],
  ['/safety', 'safety', 'Community Safety | Hushful', 'Learn about Hushful community safety, reporting, and sharing controls.'],
]
const escape = (text) => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const template = await readFile('dist/index.html', 'utf8')
function documentFor(path, title, description, content, indexable) {
  const url = `${origin}${path}`
  return template
    .replace(/<title>.*?<\/title>/, `<title>${escape(title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escape(description)}" />`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escape(title)}" />`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escape(description)}" />`)
    .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}" />`)
    .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}" />`)
    .replace('</head>', `<meta name="robots" content="${indexable ? 'index, follow' : 'noindex, follow'}" />\n</head>`)
    .replace('<div id="root"></div>', `<div id="root">${content}</div>`)
}
// Keep the SPA fallback free of marketing content for account and guest routes.
await writeFile('dist/app.html', documentFor('/login', 'Sign In | Hushful', 'Sign in to create and manage your Hushful wishlists.', '', false))
await mkdir('dist/login', { recursive: true })
await writeFile('dist/login/index.html', documentFor('/login', 'Sign In | Hushful', 'Sign in to create and manage your Hushful wishlists.', '', false))
const server = await createServer({
  server: { middlewareMode: true, hmr: false, watch: null },
  appType: 'custom',
  environments: { client: { dev: { createEnvironment: (name, config) => new DevEnvironment(name, config, { hot: false }) } } },
})
try {
  const { LandingPage } = await server.ssrLoadModule('/src/LandingPage.tsx')
  const { LegalPage } = await server.ssrLoadModule('/src/LegalPages.tsx')
  for (const [path, page, title, description] of pages) {
    const content = renderToStaticMarkup(createElement(page ? LegalPage : LandingPage, page ? { page } : {}))
    const directory = path === '/' ? 'dist' : `dist${path}`
    await mkdir(directory, { recursive: true })
    await writeFile(`${directory}/index.html`, documentFor(path, title, description, content, true))
  }
} finally { await server.close() }
await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(([path]) => `  <url><loc>${origin}${path}</loc></url>`).join('\n')}\n</urlset>\n`)
await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`)
console.log(`Prerendered ${pages.length} public pages, login, sitemap, and robots.txt.`)

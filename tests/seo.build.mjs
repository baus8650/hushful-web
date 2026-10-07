import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const origin = 'https://www.hushful-app.com'
const routes = ['', 'press', 'support', 'privacy', 'terms', 'account-deletion', 'safety']
test('public pages contain crawlable content and their own canonical URLs', async () => {
  const titles = new Set()
  for (const route of routes) {
    const html = await readFile(`dist/${route ? `${route}/` : ''}index.html`, 'utf8')
    const title = html.match(/<title>(.*?)<\/title>/)?.[1]
    assert.ok(title)
    assert.ok(!titles.has(title), `Duplicate title for ${route}`)
    titles.add(title)
    assert.ok(html.includes(`rel="canonical" href="${origin}/${route}"`))
    assert.match(html, /name="robots" content="index, follow"/)
    assert.match(html, /<h1[^>]*>[^<]+<\/h1>/)
    assert.match(html, /<div id="root"><div/)
  }
  const home = await readFile('dist/index.html', 'utf8')
  assert.match(home, /without downloading Hushful or creating an account/)
  assert.match(home, /https:\/\/apps.apple.com\/us\/app\/hushful\/id6805499302/)
  assert.match(home, /href="\/login"/)
})
test('account and guest fallback is noindex and does not include homepage content', async () => {
  for (const path of ['dist/app.html', 'dist/login/index.html']) {
    const html = await readFile(path, 'utf8')
    assert.match(html, /name="robots" content="noindex, follow"/)
    assert.match(html, /<div id="root"><\/div>/)
    assert.ok(!html.includes('Your wishlist. Shared with anyone.'))
  }
  assert.equal(await readFile('dist/_redirects', 'utf8'), '/baby-wishlist / 301\n/* /app.html 200\n')
})
test('sitemap lists public pages only and robots advertises it', async () => {
  const sitemap = await readFile('dist/sitemap.xml', 'utf8')
  assert.equal((sitemap.match(/<loc>/g) ?? []).length, routes.length)
  for (const route of routes) assert.ok(sitemap.includes(`<loc>${origin}/${route}</loc>`))
  assert.ok(!sitemap.includes('/login'))
  assert.ok(!sitemap.includes('/share'))
  assert.ok((await readFile('dist/robots.txt', 'utf8')).includes(`Sitemap: ${origin}/sitemap.xml`))
})

test('homepage presents a range of occasions without singling out a holiday', async () => {
  const home = await readFile('dist/index.html', 'utf8')
  for (const occasion of ['Birthdays', 'Holidays', 'Wedding registries', 'Baby showers']) assert.ok(home.includes(occasion))
  assert.ok(!home.includes('Christmas'))
  assert.ok(!home.includes('/baby-wishlist'))
})

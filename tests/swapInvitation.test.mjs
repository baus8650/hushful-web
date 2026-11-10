import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer, DevEnvironment } from 'vite'

test('swap links and saved invitations prompt account creation instead of guest participation', async () => {
  const store = new Map(), session = new Map()
  const storage = map => ({ getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) })
  const originals = new Map(['localStorage', 'sessionStorage', 'window', 'document'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  const location = { pathname: '/', search: '', origin: 'https://hushful.app' }
  Object.defineProperties(globalThis, {
    document: { value: { documentElement: { dataset: { theme: 'light' } } }, configurable: true },
    localStorage: { value: storage(store), configurable: true },
    sessionStorage: { value: storage(session), configurable: true },
    window: { value: { location, matchMedia: () => ({ matches: false }) }, configurable: true },
  })
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, esbuild: { jsx: 'automatic' }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', environments: { client: { dev: { createEnvironment: (name, config) => new DevEnvironment(name, config, { hot: false }) } } } })
  try {
    const { default: App } = await server.ssrLoadModule('/src/App.tsx')
    for (const saved of [false, true]) {
      const invite = 'a'.repeat(64)
      location.pathname = saved ? '/' : `/swap/${invite}`
      if (saved) store.set('hushful.swap.pendingInvite', invite)
      const markup = renderToStaticMarkup(createElement(App))
      assert.match(markup, /Create account/)
      assert.match(markup, /Sign in or create a Hushful account to join the swap/)
      assert.match(markup, /Already have an account\? Sign in/)
      assert.doesNotMatch(markup, /No account needed|Restore guest access|private recovery details/)
    }
  } finally {
    await server.close()
    for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key] }
  }
})

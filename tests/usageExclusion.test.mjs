import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer, DevEnvironment } from 'vite'

test('browser exclusion stops all events and survives a collector reload', async () => {
  const store = new Map(), session = new Map(), sent = []
  const storage = (map) => ({ getItem: key => map.get(key) ?? null, setItem: (key,value) => map.set(key,value), removeItem: key => map.delete(key) })
  const originals = new Map(['localStorage','sessionStorage','window','navigator','document','location','fetch'].map(key => [key,Object.getOwnPropertyDescriptor(globalThis,key)]))
  Object.defineProperties(globalThis, {
    localStorage: { value: storage(store), configurable: true }, sessionStorage: { value: storage(session), configurable: true },
    window: { value: { dispatchEvent() {} }, configurable: true },
    navigator: { value: { doNotTrack: '0', userAgent: 'Test Safari', language: 'en-US' }, configurable: true },
    document: { value: { referrer: '' }, configurable: true }, location: { value: { search: '' }, configurable: true },
    fetch: { value: async (url,options) => { sent.push({url,...options}); return new Response(null,{status:204}) }, configurable: true },
  })
  const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', environments: { client: { dev: { createEnvironment: (name,config) => new DevEnvironment(name,config,{ hot: false }) } } } })
  try {
    const collector = await server.ssrLoadModule('/src/usageMetrics.ts')
    collector.setUsageExcluded(true)
    collector.trackUsage('/'); collector.trackUsage('/app/home'); collector.trackUsage('/', 'app_store_click')
    assert.equal(sent.length,0)
    const reloaded = await server.ssrLoadModule('/src/usageMetrics.ts')
    assert.equal(reloaded.usageExcluded(),true)
    reloaded.trackUsage('/privacy')
    assert.equal(sent.length,0)
    collector.setUsageExcluded(false)
    collector.trackUsage('/share/private-token')
    assert.equal(sent.length,1)
    assert.equal(JSON.parse(sent[0].body).path,'/share')
    assert.equal(JSON.parse(sent[0].body).consented,false)
    session.set('hushful.accessToken','test-admin-session')
    collector.trackUsage('/app/home')
    assert.equal(sent[1].headers.Authorization,'Bearer test-admin-session')
    assert.ok(!sent[1].body.includes('test-admin-session'))
    collector.setUsageExcluded(true)
    collector.trackUsage('/app/shared-list')
    assert.equal(sent.length,2)
  } finally {
    await server.close()
    for (const [key,descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis,key,descriptor); else delete globalThis[key] }
  }
})

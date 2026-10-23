import { authStorage } from './storage'
import { safeUsagePath } from './usagePrivacyRules'
import { api } from './api'
export type UsageDimension = { name: string; count: number }
export type UsageDay = { date: string; pageViews: number; appOpens: number; appStoreClicks: number; newAccounts: number; recordedUpdates: number }
export type UsageVisit = { id: string; date: string; source: string; kind: string; path: string; consented: boolean; country?: string; region?: string; city?: string; device?: string; browser?: string; os?: string; version?: string; language?: string; timezone?: string; referrer?: string; campaign?: string }
export type UsageDashboard = { locationDiagnostics?: { databaseAvailable: boolean; trustedProxyEnabled: boolean; eventsWithCity: number }; days: number; pageViews: number; appOpens: number; appStoreClicks: number; consentedSessions: number; detailedEvents: number; newAccounts: number; recordedUpdates: number; daily: UsageDay[]; countries: UsageDimension[]; cities: UsageDimension[]; devices: UsageDimension[]; browsers: UsageDimension[]; operatingSystems: UsageDimension[]; referrers: UsageDimension[]; pages: UsageDimension[]; campaigns: UsageDimension[]; timezones: UsageDimension[]; recent: UsageVisit[] }
const key = 'hushful.usage-consent.v1'
const exclusionKey = 'hushful.usage-excluded.v1'
export function usageExclusionConfigured() { try { return localStorage.getItem(exclusionKey) !== null } catch { return true } }
export function usageExcluded() { try { return localStorage.getItem(exclusionKey) === 'yes' } catch { return true } }
export function setUsageExcluded(excluded: boolean) {
  try { localStorage.setItem(exclusionKey, excluded ? 'yes' : 'no'); if (excluded) sessionStorage.removeItem('hushful.usage-session') } catch { /* storage unavailable */ }
  if (excluded) { session = undefined; currentPage = undefined }
  window.dispatchEvent(new Event('hushful-analytics-exclusion'))
}

let session: string | undefined
let currentPage: { path: string; id: string } | undefined
const lastEvents = new Map<string, number>()
export function privacySignal() { return navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true }
export function usagePreference(): string | null { try { return localStorage.getItem(key) } catch { return 'no' } }
export function chooseUsage(value: boolean) { try { localStorage.setItem(key, value ? 'yes' : 'no'); localStorage.removeItem('hushful.metrics.visitor') } catch { /* storage unavailable */ } if (!value) { session = undefined; try { sessionStorage.removeItem('hushful.usage-session') } catch { /* storage unavailable */ } }
  if (currentPage) trackUsage(currentPage.path, 'page_view', true) }
export function trackUsage(path: string, kind: 'page_view' | 'app_store_click' = 'page_view', updateConsent = false) {
  if (usageExcluded()) return
  const safePath = kind === 'app_store_click' && currentPage ? currentPage.path : safeUsagePath(path), eventKey = `${kind}:${safePath}`, now = Date.now()
  // Suppress React StrictMode duplicate effects, without suppressing later navigation.
  if (!updateConsent && now - (lastEvents.get(eventKey) ?? 0) < 500) return
  lastEvents.set(eventKey, now)
  // New visitors have analytics enabled; explicit opt-outs and browser signals win.
  const consented = !privacySignal() && usagePreference() !== 'no'
  let details = {}
  if (consented) {
    try {
      const previous = JSON.parse(sessionStorage.getItem('hushful.usage-session') ?? 'null') as { id?: string; at?: number } | null
      session = previous?.id && now - (previous.at ?? 0) < 30 * 60 * 1000 ? previous.id : crypto.randomUUID()
      sessionStorage.setItem('hushful.usage-session', JSON.stringify({ id: session, at: now }))
    } catch { session ??= crypto.randomUUID() }
    const ua = navigator.userAgent
    const match = /Edg\/([\d.]+)/.exec(ua) || /Firefox\/([\d.]+)/.exec(ua) || /CriOS\/([\d.]+)/.exec(ua) || /Chrome\/([\d.]+)/.exec(ua) || /Version\/([\d.]+).*Safari/.exec(ua)
    const browserName = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\/|CriOS\//.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : 'Other'
    const browser = match ? `${browserName} ${match[1]}` : browserName
    const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS/iPadOS' : /Windows/.test(ua) ? 'Windows' : /Macintosh/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Other'
    let referrer: string | undefined
    try { referrer = document.referrer ? new URL(document.referrer).origin : undefined } catch { /* invalid referrer */ }
    const campaign = new URLSearchParams(location.search).get('utm_campaign')
    details = { sessionID: session, device: /iPad|Tablet/.test(ua) ? 'Tablet' : /Mobi/.test(ua) ? 'Mobile' : 'Desktop', browser, os, language: navigator.language, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, referrer, campaign: campaign && /^[A-Za-z0-9_-]{1,80}$/.test(campaign) ? campaign : undefined }
  }
  const id = updateConsent && currentPage ? currentPage.id : crypto.randomUUID()
  if (kind === 'page_view') currentPage = { path: safePath, id }
  let token: string | null = null
  try { token = authStorage.get() } catch { /* storage unavailable */ }
  void api.trackUsage({ id, source: 'web', kind, path: safePath, consented, ...details }, token).catch(() => undefined)
}

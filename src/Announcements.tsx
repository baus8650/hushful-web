import { useEffect, useRef, useState } from 'react'
import { api } from './api'
import type { Announcement, AnnouncementInput, AnnouncementCard } from './api'

type Props = { token: string }
export function AnnouncementPreference({ token }: Props) {
  const [enabled, setEnabled] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fail = (e: unknown) => setError(e instanceof Error ? e.message : 'Unable to save preference.')
  async function load() {
    setBusy(true)
    try { const preference = await api.announcementPreference(token); setEnabled(preference.enabled); setLoaded(true); setError('') } catch (e) { fail(e) } finally { setBusy(false) }
  }
  useEffect(() => {
    let active = true
    setLoaded(false)
    api.announcementPreference(token).then(value => { if (active) { setEnabled(value.enabled); setLoaded(true); setError('') } }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Unable to load preference.') })
    return () => { active = false }
  }, [token])
  async function save(value: boolean) {
    setBusy(true)
    try { setEnabled((await api.updateAnnouncementPreference(token, value)).enabled); setError('') } catch (e) { fail(e) } finally { setBusy(false) }
  }
  return <section className="feedback-panel"><label className="checkbox"><input type="checkbox" checked={enabled} disabled={!loaded || busy} onChange={e => void save(e.target.checked)} /><span><strong>Feature tips & announcements</strong><small>Allow occasional push messages from Hushful about features and news. Turn off anytime without affecting other notifications. Device notifications must also be enabled in the app. Dismissible announcements appear in My Lists and remain in Activity.</small></span></label>{error && <><p className="form-error" role="alert">{error}</p><button type="button" disabled={busy} onClick={() => void load()}>Retry</button></>}</section>
}

export function AdminAnnouncements({ token }: Props) {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [id, setId] = useState(() => crypto.randomUUID())
  const [attempted, setAttempted] = useState<AnnouncementInput | null>(null)
  const [history, setHistory] = useState<Announcement[]>([])
  const [audience, setAudience] = useState<{ users: number; pushUsers: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const input = attempted ?? { id, title: title.trim(), message: message.trim() }
  const valid = input.title.length > 0 && input.title.length <= 80 && input.message.length > 0 && input.message.length <= 500
  const fail = (e: unknown) => setError(e instanceof Error ? e.message : 'Request failed.')
  function reset() { setAttempted(null); setTitle(''); setMessage(''); setId(crypto.randomUUID()) }
  async function load() {
    const [people, entries] = await Promise.all([api.announcementAudience(token), api.announcements(token)])
    setAudience(people); setHistory(entries)
    if (attempted && entries.some(entry => entry.id === attempted.id)) reset()
  }
  useEffect(() => {
    let active = true
    Promise.all([api.announcementAudience(token), api.announcements(token)]).then(([people, entries]) => { if (active) { setAudience(people); setHistory(entries) } }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Unable to load announcements.') })
    return () => { active = false }
  }, [token])
  async function send(test: boolean) {
    if (busy || !valid) return
    setBusy(true); setError('')
    try {
      if (test) { await api.testAnnouncement(token, input); setStatus('Test push requested for your devices.') }
      else {
        const people = await api.announcementAudience(token); setAudience(people)
        if (!window.confirm(`Send “${input.title}” to ${people.users} accounts in My Lists and Activity and up to ${people.pushUsers} push subscribers? This cannot be recalled.`)) return
        setAttempted(input)
        const result = await api.sendAnnouncement(token, input)
        setStatus(`Announcement queued for ${result.recipientCount} accounts.`); reset()
        const entries = await api.announcements(token); setHistory(entries)
      }
    } catch (e) { fail(e) } finally { setBusy(false) }
  }
  return <section className="feedback-admin"><div><strong>Announcements</strong><small>Talk to your users through dismissible My Lists announcements, Activity, and push notifications.</small></div>
    <label>Title<input value={title} maxLength={80} disabled={busy || attempted !== null} onChange={e => setTitle(e.target.value)} /></label>
    <label>Message<textarea value={message} rows={4} maxLength={500} disabled={busy || attempted !== null} onChange={e => setMessage(e.target.value)} /></label>
    <small>{title.length}/80 title · {message.length}/500 message</small>
    {valid && <article aria-label="Notification preview"><small>Hushful · Notification preview</small><strong>{input.title}</strong><p>{input.message}</p></article>}
    {audience && <p className="hint">{audience.users} accounts · {audience.pushUsers} eligible for push. Counts may change before delivery.</p>}
    <div className="modal-actions"><button type="button" className="secondary" disabled={!valid || busy} onClick={() => void send(true)}>Send test to my devices</button><button type="button" className="primary" disabled={!valid || busy || !audience} onClick={() => void send(false)}>{busy ? 'Working…' : attempted ? 'Retry this announcement' : 'Send announcement'}</button></div>
    {attempted && <p className="hint">Send result uncertain. Retry uses the same ID to prevent duplicates, or refresh history to check.</p>}
    {status && <p role="status">{status}</p>}{error && <p className="form-error" role="alert">{error}</p>}
    <div className="modal-actions spread"><strong>Send history</strong><button type="button" className="text-button" disabled={busy} onClick={() => void load().catch(fail)}>Refresh history</button></div>
    <small>Processed counts indicate attempts, not confirmed push receipt.</small>
    <div className="feedback-responses">{history.map(item => <article key={item.id}><strong>{item.title}</strong><p>{item.message}</p><small>{item.recipientCount} recipients · {item.pendingCount} pending{item.createdAt ? ` · ${new Date(item.createdAt).toLocaleString()}` : ''}</small></article>)}</div>
  </section>
}


export function AnnouncementCards({ token }: Props) {
  const dismissed = useRef(new Set<string>())
  const [cards, setCards] = useState<AnnouncementCard[]>([])
  const [dismissing, setDismissing] = useState<string[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    dismissed.current.clear()
    setCards([])
    const load = () => { void api.announcementCards(token).then(items => { if (active) setCards(items.filter(item => !dismissed.current.has(item.id))) }).catch(() => undefined) }
    load()
    window.addEventListener('focus', load)
    const timer = window.setInterval(load, 60000)
    return () => { active = false; window.removeEventListener('focus', load); window.clearInterval(timer) }
  }, [token])
  async function dismiss(card: AnnouncementCard) {
    setDismissing(ids => [...ids, card.id])
    try { await api.dismissAnnouncement(token, card.id); dismissed.current.add(card.id); setCards(items => items.filter(item => item.id !== card.id)); setError('') }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to dismiss announcement. Please try again.') }
    finally { setDismissing(ids => ids.filter(id => id !== card.id)) }
  }
  return <>{cards.map(card => <section className="swap-banner" key={card.id} aria-label="Hushful announcement"><div className="swap-heading"><strong>From Hushful</strong><button type="button" className="text-button" aria-label={`Dismiss announcement: ${card.title}`} disabled={dismissing.includes(card.id)} onClick={() => void dismiss(card)}>Dismiss</button></div><h2>{card.title}</h2><p style={{ whiteSpace: 'pre-wrap' }}>{card.message}</p></section>)}{error && <p className="form-error" role="alert">{error}</p>}</>
}

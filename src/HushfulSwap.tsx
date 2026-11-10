import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { api } from './api'
import type { Friendship, HushfulSwap, SwapWish, Wishlist } from './types'

const message = (e: unknown) => e instanceof Error ? e.message : 'Please try again.'
const day = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString()

export function SwapBanner({ token, wishlists }: { token: string; wishlists: Wishlist[] }) {
  const [swaps, setSwaps] = useState<HushfulSwap[]>([]), [selected, setSelected] = useState<HushfulSwap | null>(null)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('hushful.swap.introductionDismissed') === '1'), [error, setError] = useState('')
  const load = useCallback(async () => { try { setSwaps(await api.swaps(token)); setError('') } catch (e) { setError(message(e)) } }, [token])
  useEffect(() => { void load(); const refresh = () => { void load() }; window.addEventListener('focus', refresh); window.addEventListener('hushful:swaps-changed', refresh); return () => { window.removeEventListener('focus', refresh); window.removeEventListener('hushful:swaps-changed', refresh) } }, [load])
  return <>
    {!dismissed && <section className="swap-banner" aria-label="Introducing Hushful Swap"><div className="swap-heading"><strong>Introducing Hushful Swap</strong><button className="text-button" aria-label="Dismiss Hushful Swap announcement" onClick={() => { setDismissed(true); localStorage.setItem('hushful.swap.introductionDismissed', '1') }}>Dismiss</button></div><p>A secret gift exchange for any occasion. Invite your people, draw recipients, and keep every gifter a surprise.</p><p className="hint">To start, open the navigation menu and choose Start Hushful Swap.</p></section>}
    {(swaps.some(s => s.status !== 'cancelled') || error) && <section className="swap-banner" aria-label="Your Hushful Swaps"><h2>Your Hushful Swaps</h2>
    {error && <p role="alert">{error} <button className="text-button" onClick={() => void load()}>Retry</button></p>}
    {swaps.filter(s => s.status !== 'cancelled').map(s => <button key={s.id} className="swap-row" onClick={async () => { try { setSelected(await api.swap(s.id, token)) } catch (e) { setError(message(e)) } }}><span><strong>{s.title}</strong><small>{day(s.exchangeDate)} · {s.myStatus === 'pending' ? 'Invitation waiting' : s.status === 'drawn' ? 'Your recipient is ready' : 'Preparing the draw'}</small></span><span>Open →</span></button>)}
    </section>}
    {selected && <SwapDialog close={() => { setSelected(null); void load() }}><SwapDetail initial={selected} token={token} wishlists={wishlists} /></SwapDialog>}
  </>
}
export function SwapCreationDialog({ token, wishlists, close }: { token: string; wishlists: Wishlist[]; close: () => void }) {
  const [created, setCreated] = useState<HushfulSwap | null>(null)
  return <SwapDialog close={close}>{created ? <SwapDetail initial={created} token={token} wishlists={wishlists} /> : <CreateSwap token={token} created={swap => { setCreated(swap); window.dispatchEvent(new Event('hushful:swaps-changed')) }} />}</SwapDialog>
}
function SwapDialog({ close, children }: { close: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'Tab') {
        const elements = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], summary')
        const first = elements?.[0], last = elements?.[elements.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('keydown', escape); previous?.focus() }
  }, [close])
  return <div className="modal-backdrop" onClick={close}><section ref={dialog} role="dialog" aria-modal="true" aria-label="Hushful Swap" className="modal swap-dialog" onClick={e => e.stopPropagation()}><button className="text-button" onClick={close} autoFocus>Close</button>{children}</section></div>
}
function CreateSwap({ token, created }: { token: string; created: (swap: HushfulSwap) => void }) {
  const [friends, setFriends] = useState<Friendship[]>([]), [ids, setIDs] = useState<string[]>([])
  const [title, setTitle] = useState('Hushful Swap'), [date, setDate] = useState(''), [limit, setLimit] = useState(''), [currency, setCurrency] = useState('USD')
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  useEffect(() => { api.friends(token).then(setFriends).catch(e => setError(message(e))) }, [token])
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('')
    try { created(await api.createSwap(token, { title, exchangeDate: date, currencyCode: currency, priceLimit: limit ? Number(limit) : undefined, userIDs: ids })) } catch (e) { setError(message(e)) } finally { setBusy(false) }
  }
  return <form className="stack-form" onSubmit={submit}><h2>Start a Hushful Swap</h2><p>You participate as the organizer. Invite friends now and share a guest invitation link afterward. At least four accepted participants are needed.</p>
    <label>Swap name<input value={title} maxLength={80} onChange={e => setTitle(e.target.value)} required /></label>
    <label>Exchange date<input type="date" value={date} min={new Date().toLocaleDateString('en-CA')} onChange={e => setDate(e.target.value)} required /></label>
    <label>Price limit (optional)<input type="number" min="0.01" max="1000000" step="any" value={limit} onChange={e => setLimit(e.target.value)} /></label>
    <label>Currency<input value={currency} maxLength={3} onChange={e => setCurrency(e.target.value.toUpperCase())} required /></label>
    <fieldset><legend>Invite friends</legend>{friends.length ? friends.map(f => <label className="checkbox" key={f.user.id}><input type="checkbox" checked={ids.includes(f.user.id)} onChange={e => setIDs(e.target.checked ? [...ids, f.user.id] : ids.filter(id => id !== f.user.id))} />{f.user.displayName || f.user.username}</label>) : <p className="hint">You can also invite people with the guest link after creating the swap.</p>}</fieldset>
    {error && <p role="alert" className="auth-error">{error}</p>}<button className="primary" disabled={busy}>{busy ? 'Creating…' : 'Create swap'}</button></form>
}
export function SwapDetail({ initial, token, guestKey, wishlists = [] }: { initial: HushfulSwap; token?: string; guestKey?: string; wishlists?: Wishlist[] }) {
  const [swap, setSwap] = useState(initial), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [wishes, setWishes] = useState<SwapWish[]>(initial.wishes), [listID, setListID] = useState(''), [days, setDays] = useState(initial.reminderDays?.toString() ?? '')
  const [confirmDraw, setConfirmDraw] = useState(false)
  async function update(body: Parameters<typeof api.updateSwap>[1]) {
    setBusy(true); setError(''); setNotice('')
    try { const next = await api.updateSwap(swap.id, body, token, guestKey); setSwap(next); setWishes(next.wishes); setConfirmDraw(false); setNotice(body.action === 'remind' ? 'Reminder sent to their activity and eligible push devices.' : 'Saved.') } catch (e) { setError(message(e)) } finally { setBusy(false) }
  }
  useEffect(() => { const refresh = () => { api.swap(initial.id, token, guestKey).then(setSwap).catch(e => setError(message(e))) }; window.addEventListener('focus', refresh); return () => window.removeEventListener('focus', refresh) }, [initial.id, token, guestKey])
  const ready = swap.members.length >= 4 && swap.members.every(m => m.status === 'accepted')
  return <fieldset className="stack-form swap-detail" disabled={busy}><p className="eyebrow">Hushful Swap · {swap.status}</p><h2>{swap.title}</h2><p>{day(swap.exchangeDate)}{swap.priceLimit != null && ` · Limit: ${swap.currencyCode} ${swap.priceLimit}`}</p>
    <p className="hint">Everyone gives once and receives once. You can only see your own recipient, including when you organize. The roster locks after drawing.</p>
    {swap.status === 'cancelled' ? <p>This swap has been cancelled.</p> : <>
      {swap.status === 'draft' && swap.myStatus !== 'accepted' && <div><button disabled={busy} className="primary" onClick={() => void update({ action: 'accept' })}>Accept invitation</button> <button disabled={busy} className="secondary" onClick={() => void update({ action: 'decline' })}>Decline</button></div>}
      {swap.recipient && <section className="swap-recipient"><h3>You’re gifting to {swap.recipient.name}</h3>{swap.recipient.wishes.length ? <ul>{swap.recipient.wishes.map((w, i) => <li key={i}>{w.url ? <a href={w.url} target="_blank" rel="noreferrer noopener">{w.title}</a> : <strong>{w.title}</strong>}{w.note && <p>{w.note}</p>}</li>)}</ul> : <p>They haven’t added gift ideas yet. Check back soon.</p>}</section>}
      <section><h3>Participants</h3>{swap.members.map(m => <div className="swap-row" key={m.id}><span>{m.name}{m.id === swap.myID ? ' (you)' : ''}<small>{m.status}</small></span>{swap.isAdmin && swap.status === 'draft' && m.id !== swap.myID && <span>{m.status === 'pending' && <button className="text-button" disabled={busy || !m.canRemind} onClick={() => void update({ action: 'remind', memberID: m.id })}>{m.canRemind ? 'Remind' : 'Reminded'}</button>}<button className="text-button" disabled={busy} onClick={() => { if (window.confirm(`Remove ${m.name} from this swap?`)) void update({ action: 'remove', memberID: m.id }) }}>Remove</button></span>}</div>)}</section>
      {swap.inviteURL && <section><h3>Invite someone without an account</h3><p className="hint">Anyone with this link can join before the draw. Review the roster before generating recipients.</p><input readOnly aria-label="Guest invitation link" value={swap.inviteURL} /><button className="secondary" onClick={async () => { try { await navigator.clipboard.writeText(swap.inviteURL!); setNotice('Invitation link copied.') } catch { setError('Select and copy the invitation link above.') } }}>Copy invitation link</button></section>}
      {swap.isAdmin && swap.status === 'draft' && <section><button className="primary" disabled={busy || !ready} onClick={() => setConfirmDraw(true)}>Generate recipients</button>{!ready && <p className="hint">At least four people must accept. Remove declined invitations to continue.</p>}{confirmDraw && <div><p>This permanently locks participants and draws one recipient per person. You cannot view other assignments or redraw.</p><button className="primary" disabled={busy} onClick={() => void update({ action: 'draw' })}>Confirm and draw</button> <button className="secondary" onClick={() => setConfirmDraw(false)}>Go back</button></div>}</section>}
      {swap.myStatus === 'accepted' && <section><h3>Your gift ideas</h3><p className="hint">Only your assigned gifter can see these ideas. Sharing copies ideas into this swap so opening them never identifies your gifter. Edit your swap list here anytime.</p>
        {token && wishlists.length > 0 && <div><select aria-label="Existing wishlist" value={listID} onChange={e => setListID(e.target.value)}><option value="">Choose a personal wishlist</option>{wishlists.filter(w => w.purpose === 'for_myself' && !w.isCollaborative && !w.isArchived && !w.matureContentEnabled).map(w => <option key={w.id} value={w.id}>{w.title}</option>)}</select><button className="secondary" disabled={busy || !listID} onClick={() => void update({ action: 'wishes', wishlistID: listID })}>Share a copy of this list</button></div>}
        {wishes.map((w, i) => <div className="swap-wish" key={i}><label>Gift idea<input value={w.title} maxLength={200} onChange={e => setWishes(wishes.map((v, j) => j === i ? { ...v, title: e.target.value } : v))} /></label><label>Link (optional)<input type="url" value={w.url || ''} onChange={e => setWishes(wishes.map((v, j) => j === i ? { ...v, url: e.target.value || undefined } : v))} /></label><label>Note (optional)<textarea maxLength={2000} value={w.note || ''} onChange={e => setWishes(wishes.map((v, j) => j === i ? { ...v, note: e.target.value || undefined } : v))} /></label><button className="text-button" onClick={() => setWishes(wishes.filter((_, j) => j !== i))}>Remove idea</button></div>)}
        <button className="secondary" disabled={wishes.length >= 100} onClick={() => setWishes([...wishes, { title: '' }])}>Add gift idea</button> <button className="primary" disabled={busy || wishes.some(w => !w.title.trim())} onClick={() => void update({ action: 'wishes', wishes })}>Save swap list</button>
      </section>}
      {token && swap.myStatus === 'accepted' && <section><h3>Your purchase reminder</h3><label>Days before the exchange (0–365, blank for off)<input type="number" min="0" max="365" step="1" value={days} onChange={e => setDays(e.target.value)} /></label><p className="hint">Push reminders require notifications enabled on your device. Delivery starts after recipients are drawn, at noon UTC on the chosen day.</p><button className="secondary" disabled={busy || (days !== '' && (!Number.isInteger(Number(days)) || Number(days) < 0 || Number(days) > 365))} onClick={() => void update({ action: 'reminder', reminderDays: days === '' ? null : Number(days) })}>Save reminder</button></section>}
      {swap.isAdmin && <button className="text-button" disabled={busy} onClick={() => { if (window.confirm('Cancel this swap? This cannot be undone.')) void update({ action: 'cancel' }) }}>Cancel swap</button>}
    </>}{error && <p className="auth-error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <button className="text-button" disabled={busy} onClick={async () => { try { setSwap(await api.swap(swap.id, token, guestKey)); setNotice('Updated.') } catch (e) { setError(message(e)) } }}>Refresh swap</button>
  </fieldset>
}

export function SwapGuestPage({ invite, token }: { invite: string; token?: string }) {
  const storageKey = `hushful.swap.guest.${invite}`
  const [session, setSession] = useState<{ id: string; key?: string } | null>(() => { try { return JSON.parse(localStorage.getItem(storageKey) || 'null') } catch { return null } })
  const [swap, setSwap] = useState<HushfulSwap | null>(null), [preview, setPreview] = useState<{ title: string; exchangeDate: string; status: string } | null>(null)
  const [name, setName] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  useEffect(() => { if (session) api.swap(session.id, token, session.key).then(setSwap).catch(e => setError(message(e))); else api.swapInvite(invite).then(setPreview).catch(e => setError(message(e))) }, [invite, session, token])
  async function join(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('')
    try { const joined = await api.joinSwap(invite, name, token); const saved = { id: joined.swap.id, key: joined.guestKey }; setSession(saved); setSwap(joined.swap); try { localStorage.setItem(storageKey, JSON.stringify(saved)) } catch { setError('This browser could not save your access. Save your private recovery details below before leaving.') } } catch (e) { setError(message(e)) } finally { setBusy(false) }
  }
  return <main className="auth-page"><section className="auth-card swap-guest"><h1>Hushful Swap</h1>{swap ? <><SwapDetail initial={swap} token={session?.key ? undefined : token} guestKey={session?.key} />{session?.key && <div><p className="hint">Keep your private access key. The organizer cannot recover it. Anyone holding it can see your recipient. Return using this invitation link on this browser.</p><details><summary>Your private recovery details</summary><p>Swap ID: {session.id}</p><p className="swap-key">Private key: {session.key}</p></details></div>}</> : preview && <form className="stack-form" onSubmit={join}><h2>{preview.title}</h2><p>Exchange on {day(preview.exchangeDate)}</p>{preview.status === 'draft' ? <><label>Your name<input value={name} maxLength={80} onChange={e => setName(e.target.value)} required /></label><p>No account needed. This browser stores your private access key. Joining accepts the invitation.</p><button className="primary" disabled={busy}>{busy ? 'Joining…' : 'Join swap'}</button></> : <p>This swap is no longer accepting participants.</p>}</form>}{!swap && <details><summary>Restore guest access</summary><GuestRestore restore={saved => { localStorage.setItem(storageKey, JSON.stringify(saved)); setSession(saved); setError('') }} /></details>}{error && <p role="alert" className="auth-error">{error}</p>}</section></main>
}
function GuestRestore({ restore }: { restore: (saved: { id: string; key: string }) => void }) {
  const [id, setID] = useState(''), [key, setKey] = useState('')
  return <form className="stack-form" onSubmit={e => { e.preventDefault(); restore({ id, key }) }}><label>Swap ID<input value={id} onChange={e => setID(e.target.value.trim())} required /></label><label>Private access key<input type="password" value={key} onChange={e => setKey(e.target.value.trim())} required /></label><button className="secondary">Restore access</button></form>
}

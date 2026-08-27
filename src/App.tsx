import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Check, ChevronRight, Copy, ExternalLink, Gift, Link2, LoaderCircle, LogOut, Menu, PackageCheck, Pencil, Plus, RefreshCw, Send, Settings, Share2, Sparkles, Trash2, User, X } from 'lucide-react'
import { api, ApiError } from './api'
import { authStorage, shareStorage } from './storage'
import type { CurrentUser, SharedItemRow, SharedWishlist, Wishlist, WishlistItem } from './types'

type View = { kind: 'home' } | { kind: 'wishlist'; wishlist: Wishlist } | { kind: 'shared'; share: SharedWishlist }

export default function App() {
  const [token, setToken] = useState<string | null>(authStorage.get())
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(Boolean(token))
  const [toast, setToast] = useState('')

  const logout = useCallback(() => { authStorage.clear(); setToken(null); setUser(null) }, [])
  const onError = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) return logout()
    setToast(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
  }, [logout])

  useEffect(() => {
    if (!token) return
    setLoading(true)
    api.me(token).then(setUser).catch(onError).finally(() => setLoading(false))
  }, [token, onError])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 4200)
    return () => window.clearTimeout(timer)
  }, [toast])

  if (loading) return <FullPageLoader />
  if (!token || !user) return <AuthScreen onAuthenticated={(accessToken) => { authStorage.set(accessToken); setToken(accessToken) }} onError={onError} />
  return <>
    <Dashboard token={token} user={user} setUser={setUser} logout={logout} onError={onError} notify={setToast} />
    {toast && <div className="toast" role="status"><Check />{toast}</div>}
  </>
}

function AuthScreen({ onAuthenticated, onError }: { onAuthenticated: (token: string) => void; onError: (e: unknown) => void }) {
  const [register, setRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true)
    try {
      const response = register ? await api.register(email, password, name.trim()) : await api.login(email, password)
      onAuthenticated(response.accessToken)
    } catch (error) { onError(error) } finally { setBusy(false) }
  }
  return <main className="auth-page">
    <div className="auth-brand"><Logo /><p>All the wishes.<br />None of the spoilers.</p></div>
    <section className="auth-card">
      <div className="eyebrow">{register ? 'A fresh start' : 'Welcome back'}</div>
      <h1>{register ? 'Create your account' : 'Sign in to Hushful'}</h1>
      <p className="muted">{register ? 'Keep every thoughtful idea in one calm place.' : 'Your wishlists are waiting for you.'}</p>
      <form onSubmit={submit} className="stack-form">
        {register && <Field label="Your name"><input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="How friends know you" required /></Field>}
        <Field label="Email"><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></Field>
        <Field label="Password"><input type="password" autoComplete={register ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required /></Field>
        <button className="primary wide" disabled={busy}>{busy && <LoaderCircle className="spin" />} {register ? 'Create account' : 'Sign in'} <ChevronRight /></button>
      </form>
      <button className="text-button auth-switch" onClick={() => setRegister(!register)}>{register ? 'Already have an account? Sign in' : 'New to Hushful? Create an account'}</button>
    </section>
    <p className="auth-foot">Private by design · Share only with the people you choose</p>
  </main>
}

function Dashboard({ token, user, setUser, logout, onError, notify }: { token: string; user: CurrentUser; setUser: (u: CurrentUser) => void; logout: () => void; onError: (e: unknown) => void; notify: (s: string) => void }) {
  const [view, setView] = useState<View>({ kind: 'home' })
  const [wishlists, setWishlists] = useState<Wishlist[]>([])
  const [shared, setShared] = useState(() => shareStorage.list(user.id))
  const [busy, setBusy] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)

  const loadWishlists = useCallback(async () => { try { setWishlists(await api.wishlists(token)) } catch (e) { onError(e) } finally { setBusy(false) } }, [token, onError])
  useEffect(() => { void loadWishlists() }, [loadWishlists])
  useEffect(() => {
    const match = window.location.pathname.match(/^\/share\/([^/]+)/)
    if (match) setShareOpen(true)
  }, [])

  function select(next: View) { setView(next); setMobileNav(false) }
  async function createWishlist(title: string) {
    try { const created = await api.createWishlist(token, title); setWishlists((old) => [created, ...old]); setCreateOpen(false); select({ kind: 'wishlist', wishlist: created }); notify('Wishlist created') } catch (e) { onError(e) }
  }
  function saveShare(share: SharedWishlist, viewerToken: string) {
    shareStorage.save(user.id, share, viewerToken); setShared(shareStorage.list(user.id)); setShareOpen(false); select({ kind: 'shared', share })
    if (window.location.pathname.startsWith('/share/')) window.history.replaceState({}, '', '/')
  }
  function removeShare(shareToken: string) { shareStorage.remove(user.id, shareToken); setShared(shareStorage.list(user.id)); if (view.kind === 'shared' && view.share.shareToken === shareToken) select({ kind: 'home' }) }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
      <div className="sidebar-top"><Logo compact /><button className="icon-button mobile-close" onClick={() => setMobileNav(false)}><X /></button></div>
      <nav>
        <button className={`nav-home ${view.kind === 'home' ? 'active' : ''}`} onClick={() => select({ kind: 'home' })}><Sparkles /> Overview</button>
        <NavGroup title="My wishlists" action={<button aria-label="New wishlist" onClick={() => setCreateOpen(true)}><Plus /></button>}>
          {wishlists.map((wishlist) => <button key={wishlist.id} className={view.kind === 'wishlist' && view.wishlist.id === wishlist.id ? 'active' : ''} onClick={() => select({ kind: 'wishlist', wishlist })}><span className="nav-dot" />{wishlist.title}</button>)}
        </NavGroup>
        <NavGroup title="Shared with me" action={<button aria-label="Open shared wishlist" onClick={() => setShareOpen(true)}><Link2 /></button>}>
          {shared.map((share) => <button key={share.shareToken} className={view.kind === 'shared' && view.share.shareToken === share.shareToken ? 'active' : ''} onClick={() => select({ kind: 'shared', share })}><span className="nav-dot shared-dot" />{share.title}</button>)}
        </NavGroup>
      </nav>
      <button className="profile-chip" onClick={() => setAccountOpen(true)}><Avatar name={user.displayName || user.email} /><span><strong>{user.displayName || 'Your account'}</strong><small>{user.email}</small></span><Settings /></button>
    </aside>
    {mobileNav && <button className="scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    <main className="main-panel">
      <header className="mobile-header"><button className="icon-button" onClick={() => setMobileNav(true)}><Menu /></button><Logo compact /><span /></header>
      {busy ? <FullPageLoader embedded /> : view.kind === 'home' ? <Home user={user} wishlists={wishlists} shared={shared} openWishlist={(w) => select({ kind: 'wishlist', wishlist: w })} openShared={(s) => select({ kind: 'shared', share: s })} newWishlist={() => setCreateOpen(true)} openShare={() => setShareOpen(true)} /> : view.kind === 'wishlist' ? <WishlistDetail token={token} wishlist={view.wishlist} onError={onError} notify={notify} /> : <SharedDetail accountId={user.id} share={view.share} onError={onError} onRemove={() => removeShare(view.share.shareToken)} />}
    </main>
    {createOpen && <CreateWishlistModal close={() => setCreateOpen(false)} create={createWishlist} />}
    {shareOpen && <OpenShareModal accountId={user.id} initialToken={window.location.pathname.match(/^\/share\/([^/]+)/)?.[1]} close={() => setShareOpen(false)} save={saveShare} onError={onError} />}
    {accountOpen && <AccountModal user={user} close={() => setAccountOpen(false)} save={async (name) => { try { setUser(await api.updateProfile(token, name)); setAccountOpen(false); notify('Profile updated') } catch (e) { onError(e) } }} logout={logout} />}
  </div>
}

function Home({ user, wishlists, shared, openWishlist, openShared, newWishlist, openShare }: { user: CurrentUser; wishlists: Wishlist[]; shared: SharedWishlist[]; openWishlist: (w: Wishlist) => void; openShared: (s: SharedWishlist) => void; newWishlist: () => void; openShare: () => void }) {
  return <div className="page home-page">
    <header className="page-heading"><div><p className="eyebrow">Your quiet corner</p><h1>Good {greeting()}, {firstName(user.displayName)}.</h1><p>Gather every wish. Keep every gift a surprise.</p></div><button className="primary" onClick={newWishlist}><Plus /> New wishlist</button></header>
    {wishlists.length === 0 && shared.length === 0 ? <EmptyState icon={<Gift />} title="A little space for things you love" text="Create your first wishlist, then share it privately with friends and family." action={<button className="primary" onClick={newWishlist}><Plus /> Create a wishlist</button>} /> : <>
      <section><SectionTitle title="My wishlists" subtitle={`${wishlists.length} ${wishlists.length === 1 ? 'collection' : 'collections'}`} action={<button className="text-button" onClick={newWishlist}>Add new <Plus /></button>} />
        <div className="card-grid">{wishlists.map((wishlist, index) => <button className="wishlist-card" key={wishlist.id} onClick={() => openWishlist(wishlist)}><div className={`card-art art-${index % 4}`}><Gift /></div><div><span className="card-kicker">Wishlist</span><h3>{wishlist.title}</h3><p>Open collection</p></div><ChevronRight /></button>)}</div>
      </section>
      <section><SectionTitle title="Shared with me" subtitle="Gift ideas from your favorite people" action={<button className="text-button" onClick={openShare}>Open a link <Link2 /></button>} />
        {shared.length ? <div className="shared-row">{shared.map((share) => <button className="shared-card" key={share.shareToken} onClick={() => openShared(share)}><Avatar name={share.sharedByName || 'Someone'} /><span><strong>{share.title}</strong><small>From {share.sharedByName || 'Someone'}</small></span><ChevronRight /></button>)}</div> : <button className="share-placeholder" onClick={openShare}><Link2 /><span><strong>Have a Hushful link?</strong><small>Paste it here to keep the list close.</small></span></button>}
      </section>
    </>}
  </div>
}

function WishlistDetail({ token, wishlist, onError, notify }: { token: string; wishlist: Wishlist; onError: (e: unknown) => void; notify: (s: string) => void }) {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null)
  const [shareUrl, setShareUrl] = useState('')
  const load = useCallback(async () => { setLoading(true); try { setItems(await api.items(token, wishlist.id)) } catch (e) { onError(e) } finally { setLoading(false) } }, [token, wishlist.id, onError])
  useEffect(() => { void load() }, [load])
  async function remove(item: WishlistItem) { if (!window.confirm(`Remove “${item.title}” from this wishlist?`)) return; const old = items; setItems((all) => all.filter((i) => i.id !== item.id)); try { await api.deleteItem(token, wishlist.id, item.id); notify('Item removed') } catch (e) { setItems(old); onError(e) } }
  async function share() { try { const result = await api.createShare(token, wishlist.id); setShareUrl(`${window.location.origin}/share/${result.shareToken}`) } catch (e) { onError(e) } }
  return <div className="page detail-page">
    <header className="page-heading"><div><p className="eyebrow">My wishlist</p><h1>{wishlist.title}</h1><p>{items.length} {items.length === 1 ? 'wish' : 'wishes'} tucked away</p></div><div className="heading-actions"><button className="secondary" onClick={share}><Share2 /> Share</button><button className="primary" onClick={() => setAddOpen(true)}><Plus /> Add item</button></div></header>
    {loading ? <FullPageLoader embedded /> : items.length ? <div className="items-grid">{items.map((item) => <article className="item-card" key={item.id}><div className="item-icon"><Gift /></div><div className="item-copy"><div className="item-title-row"><h3>{item.title}</h3>{item.price != null && <strong>{currency(item.price)}</strong>}</div>{item.ownerNote && <p>{item.ownerNote}</p>}{item.url && <a href={safeUrl(item.url)} target="_blank" rel="noreferrer">View item <ExternalLink /></a>}</div><div className="item-card-actions"><button className="edit-button" aria-label={`Edit ${item.title}`} onClick={() => setEditingItem(item)}><Pencil /></button><button className="delete-button" aria-label={`Delete ${item.title}`} onClick={() => remove(item)}><Trash2 /></button></div></article>)}</div> : <EmptyState icon={<Gift />} title="This list is ready for a first wish" text="Add an item, a thoughtful note, and an optional link or price." action={<button className="primary" onClick={() => setAddOpen(true)}><Plus /> Add your first item</button>} />}
    {addOpen && <AddItemModal close={() => setAddOpen(false)} save={async (item) => { try { const created = await api.createItem(token, wishlist.id, item); setItems((all) => [created, ...all]); setAddOpen(false); notify('Wish added') } catch (e) { onError(e) } }} />}
    {editingItem && <AddItemModal initial={editingItem} close={() => setEditingItem(null)} save={async (changes) => { try { const updated = await api.updateItem(token, wishlist.id, editingItem.id, changes); setItems((all) => all.map((item) => item.id === updated.id ? updated : item)); setEditingItem(null); notify('Wish updated') } catch (e) { onError(e) } }} />}
    {shareUrl && <ShareLinkModal url={shareUrl} title={wishlist.title} close={() => setShareUrl('')} notify={notify} />}
  </div>
}

function SharedDetail({ accountId, share, onError, onRemove }: { accountId: string; share: SharedWishlist; onError: (e: unknown) => void; onRemove: () => void }) {
  const viewerToken = shareStorage.viewerToken(accountId, share.shareToken)
  const [rows, setRows] = useState<SharedItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [identity, setIdentity] = useState<{ itemId: string; purchased?: boolean; note?: string } | null>(null)
  const [noteItem, setNoteItem] = useState<string | null>(null)
  const load = useCallback(async () => { if (!viewerToken) return; setLoading(true); try { setRows(await api.sharedItems(share.shareToken, viewerToken)) } catch (e) { onError(e) } finally { setLoading(false) } }, [viewerToken, share.shareToken, onError])
  useEffect(() => { void load() }, [load])
  async function update(itemId: string, body: { purchased?: boolean; note?: string; displayName?: string; shareName?: boolean }) { if (!viewerToken) return; try { const row = await api.updateSharedItem(share.shareToken, itemId, viewerToken, body); setRows((all) => all.map((r) => r.item.id === itemId ? row : r)) } catch (e) { onError(e); void load() } }
  return <div className="page detail-page shared-detail">
    <header className="page-heading"><div><p className="eyebrow">Shared by {share.sharedByName || 'Someone'}</p><h1>{share.title}</h1><p>Claims stay hidden from the person who made this list.</p></div><div className="heading-actions"><button className="secondary" onClick={() => void load()}><RefreshCw /> Refresh</button><button className="icon-button danger" aria-label="Remove saved list" onClick={onRemove}><Trash2 /></button></div></header>
    {loading ? <FullPageLoader embedded /> : rows.length ? <div className="items-grid">{rows.map((row) => <article className={`item-card shared-item ${row.purchased ? 'purchased' : ''}`} key={row.item.id}><div className="item-icon">{row.purchased ? <PackageCheck /> : <Gift />}</div><div className="item-copy"><div className="item-title-row"><h3>{row.item.title}</h3>{row.item.price != null && <strong>{currency(row.item.price)}</strong>}</div>{row.item.ownerNote && <p>{row.item.ownerNote}</p>}{row.item.url && <a href={safeUrl(row.item.url)} target="_blank" rel="noreferrer">View item <ExternalLink /></a>}<div className="item-actions"><button className={`claim-button ${row.purchasedByMe ? 'mine' : ''}`} disabled={row.purchased && !row.purchasedByMe} onClick={() => row.purchasedByMe ? void update(row.item.id, { purchased: false }) : setIdentity({ itemId: row.item.id, purchased: true })}>{row.purchasedByMe ? <><Check /> Claimed by you</> : row.purchased ? <><Check /> Already claimed</> : 'I’ll get this'}</button><button className="text-button" onClick={() => setNoteItem(row.item.id)}>Add a note</button></div>{row.notes.length > 0 && <div className="notes"><span>Notes</span>{row.notes.map((note, i) => <p key={`${note.updatedAt}-${i}`}>{note.authorDisplayName && <strong>{note.authorDisplayName} · </strong>}{note.note}</p>)}</div>}</div></article>)}</div> : <EmptyState icon={<Gift />} title="There’s nothing here yet" text="Check back after the list owner adds a wish." />}
    {identity && <IdentityModal close={() => setIdentity(null)} continueWith={(displayName, shareName) => { void update(identity.itemId, { purchased: identity.purchased, note: identity.note, displayName, shareName }); setIdentity(null) }} />}
    {noteItem && <NoteModal close={() => setNoteItem(null)} save={(note) => { setNoteItem(null); setIdentity({ itemId: noteItem, note }) }} />}
  </div>
}

function Modal({ children, close, size = '' }: { children: ReactNode; close: () => void; size?: string }) { return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}><section className={`modal ${size}`} role="dialog" aria-modal="true">{children}</section></div> }
function ModalHeader({ eyebrow, title, close }: { eyebrow?: string; title: string; close: () => void }) { return <header className="modal-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div><button className="icon-button" onClick={close}><X /></button></header> }
function CreateWishlistModal({ close, create }: { close: () => void; create: (title: string) => void }) { const [title, setTitle] = useState(''); return <Modal close={close}><ModalHeader eyebrow="A new collection" title="Name your wishlist" close={close} /><form className="stack-form" onSubmit={(e) => { e.preventDefault(); create(title.trim()) }}><Field label="Wishlist name"><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Birthday ideas, Cozy home…" /></Field><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={!title.trim()}>Create wishlist</button></div></form></Modal> }
function AddItemModal({ initial, close, save }: { initial?: WishlistItem; close: () => void; save: (item: { title: string; url?: string; price?: number; ownerNote?: string }) => void }) { const editing = Boolean(initial); const [title, setTitle] = useState(initial?.title || ''); const [url, setUrl] = useState(initial?.url || ''); const [price, setPrice] = useState(initial?.price?.toString() || ''); const [note, setNote] = useState(initial?.ownerNote || ''); return <Modal close={close} size="modal-wide"><ModalHeader eyebrow={editing ? 'A thoughtful adjustment' : 'One more lovely thing'} title={editing ? 'Edit this wish' : 'Add a wish'} close={close} /><form className="stack-form" onSubmit={(e) => { e.preventDefault(); save({ title: title.trim(), url: url.trim() || undefined, price: price ? Number(price.replace(',', '.')) : undefined, ownerNote: note.trim() || undefined }) }}><Field label="Item title"><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you wishing for?" /></Field><div className="field-row"><Field label="Link (optional)"><input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></Field><Field label="Price (optional)"><div className="money-input"><span>$</span><input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" /></div></Field></div><Field label="A note (optional)"><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Size, color, or why you love it…" /></Field><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={!title.trim()}>{editing ? 'Save changes' : 'Add to wishlist'}</button></div></form></Modal> }
/* Deep-link initialization intentionally runs once with the token from the first URL. */
/* eslint-disable react-hooks/exhaustive-deps */
function OpenShareModal({ accountId, initialToken, close, save, onError }: { accountId: string; initialToken?: string; close: () => void; save: (s: SharedWishlist, vt: string) => void; onError: (e: unknown) => void }) { const [input, setInput] = useState(initialToken || ''); const [busy, setBusy] = useState(false); useEffect(() => { if (initialToken) void open() }, []); async function open(e?: FormEvent) { e?.preventDefault(); const shareToken = extractToken(input); if (!shareToken) return; setBusy(true); try { const response = await api.openShare(shareToken, shareStorage.viewerToken(accountId, shareToken) || undefined); save({ shareToken, title: response.wishlist.title, sharedByName: response.wishlist.sharedByName }, response.viewerToken) } catch (error) { onError(error) } finally { setBusy(false) } } return <Modal close={close}><ModalHeader eyebrow="Something thoughtful awaits" title="Open a shared wishlist" close={close} /><form className="stack-form" onSubmit={open}><Field label="Private link or token"><input autoFocus value={input} onChange={(e) => setInput(e.target.value)} placeholder="Paste a Hushful link here" /></Field><p className="hint">This list will be saved under “Shared with me” on this browser.</p><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={busy || !input.trim()}>{busy && <LoaderCircle className="spin" />} Open wishlist</button></div></form></Modal> }
/* eslint-enable react-hooks/exhaustive-deps */
function AccountModal({ user, close, save, logout }: { user: CurrentUser; close: () => void; save: (name: string) => void; logout: () => void }) { const [name, setName] = useState(user.displayName || ''); return <Modal close={close}><ModalHeader eyebrow="Your Hushful account" title="Account settings" close={close} /><form className="stack-form" onSubmit={(e) => { e.preventDefault(); save(name.trim()) }}><Field label="Display name"><input value={name} onChange={(e) => setName(e.target.value)} /></Field><Field label="Email"><input value={user.email} disabled /></Field><div className="modal-actions spread"><button type="button" className="text-button danger-text" onClick={logout}><LogOut /> Log out</button><button className="primary" disabled={!name.trim()}>Save changes</button></div></form></Modal> }
function ShareLinkModal({ url, title, close, notify }: { url: string; title: string; close: () => void; notify: (s: string) => void }) { async function copy() { await navigator.clipboard.writeText(url); notify('Link copied') } async function nativeShare() { if (navigator.share) await navigator.share({ title, text: `A Hushful wishlist: ${title}`, url }); else await copy() } return <Modal close={close}><ModalHeader eyebrow="Keep it in the circle" title="Your private share link" close={close} /><p className="muted modal-copy">Anyone with this link can see the list and privately coordinate gifts.</p><div className="copy-field"><span>{url}</span><button onClick={copy}><Copy /></button></div><div className="modal-actions"><button className="secondary" onClick={copy}><Copy /> Copy link</button><button className="primary" onClick={nativeShare}><Send /> Share</button></div></Modal> }
function IdentityModal({ close, continueWith }: { close: () => void; continueWith: (name: string, shareName: boolean) => void }) { const [name, setName] = useState(localStorage.getItem('hushful.displayName') || ''); const [shareName, setShareName] = useState(false); return <Modal close={close}><ModalHeader eyebrow="Just between gifters" title="What should we call you?" close={close} /><form className="stack-form" onSubmit={(e) => { e.preventDefault(); localStorage.setItem('hushful.displayName', name.trim()); continueWith(name.trim(), shareName) }}><Field label="Your name"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" /></Field><label className="checkbox"><input type="checkbox" checked={shareName} onChange={(e) => setShareName(e.target.checked)} /><span><strong>Show my name on notes</strong><small>Your purchase is still hidden from the wishlist owner.</small></span></label><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={!name.trim()}>Continue</button></div></form></Modal> }
function NoteModal({ close, save }: { close: () => void; save: (note: string) => void }) { const [note, setNote] = useState(''); return <Modal close={close}><ModalHeader eyebrow="For fellow gifters" title="Add a note" close={close} /><form className="stack-form" onSubmit={(e) => { e.preventDefault(); save(note.trim()) }}><Field label="Note"><textarea autoFocus rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="I can pick this up, or want to split it?" /></Field><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={!note.trim()}>Add note</button></div></form></Modal> }

function Logo({ compact = false }: { compact?: boolean }) { return <div className={`logo ${compact ? 'compact' : ''}`}><span><Sparkles /></span><strong>hushful</strong></div> }
function Avatar({ name }: { name: string }) { return <span className="avatar">{name.trim().charAt(0).toUpperCase() || <User />}</span> }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="field"><span>{label}</span>{children}</label> }
function NavGroup({ title, action, children }: { title: string; action: ReactNode; children: ReactNode }) { return <div className="nav-group"><div className="nav-label"><span>{title}</span>{action}</div>{children}</div> }
function SectionTitle({ title, subtitle, action }: { title: string; subtitle: string; action: ReactNode }) { return <div className="section-title"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div> }
function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) { return <div className="empty-state"><div className="empty-icon">{icon}</div><h2>{title}</h2><p>{text}</p>{action}</div> }
function FullPageLoader({ embedded = false }: { embedded?: boolean }) { return <div className={`page-loader ${embedded ? 'embedded' : ''}`}><Logo compact /><LoaderCircle className="spin" /></div> }
function firstName(name?: string) { return name?.trim().split(/\s+/)[0] || 'friend' }
function greeting() { const h = new Date().getHours(); return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening' }
function currency(value: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value) }
function safeUrl(url: string) { return /^https?:\/\//i.test(url) ? url : `https://${url}` }
function extractToken(value: string) { const text = value.trim(); try { const url = new URL(text); return url.pathname.split('/').filter(Boolean).pop() || '' } catch { return text } }

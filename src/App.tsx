import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Bell, Check, ChevronRight, CircleHelp, Copy, ExternalLink, Gift, Link2, LoaderCircle, LogOut, Menu, PackageCheck, Pencil, Plus, RefreshCw, Send, Settings, Share2, Sparkles, Trash2, User, Users, X } from 'lucide-react'
import { api, ApiError } from './api'
import { authStorage, shareStorage } from './storage'
import type { AccountSharedWishlist, ActivityItem, CurrentUser, FriendGroup, FriendProfile, Friendship, ProfileWishlist, SharedItemRow, SharedWishlist, SocialUser, Wishlist, WishlistAudience, WishlistItem } from './types'

type View = { kind: 'home' } | { kind: 'wishlist'; wishlist: Wishlist } | { kind: 'shared'; share: SharedWishlist }

export default function App() {
  const resetToken = new URLSearchParams(window.location.search).get('resetToken')
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

  if (resetToken) return <ResetPasswordScreen token={resetToken} />
  if (loading) return <FullPageLoader />
  if (!token || !user) return <AuthScreen onAuthenticated={(accessToken) => { authStorage.set(accessToken); setToken(accessToken) }} onError={onError} />
  return <>
    <Dashboard token={token} user={user} setUser={setUser} logout={logout} onError={onError} notify={setToast} />
    {toast && <div className="toast" role="status"><Check />{toast}</div>}
  </>
}

function AuthScreen({ onAuthenticated, onError }: { onAuthenticated: (token: string) => void; onError: (e: unknown) => void }) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const register = mode === 'register'
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true)
    try {
      if (mode === 'forgot') {
        const response = await api.forgotPassword(email)
        setMessage(response.message)
        return
      }
      const response = register ? await api.register(email, password, name.trim()) : await api.login(email, password)
      onAuthenticated(response.accessToken)
    } catch (error) { onError(error) } finally { setBusy(false) }
  }
  return <main className="auth-page">
    <div className="auth-brand"><Logo /><p>All the wishes.<br />None of the spoilers.</p></div>
    <section className="auth-card">
      <div className="eyebrow">{mode === 'forgot' ? 'Account recovery' : register ? 'A fresh start' : 'Welcome back'}</div>
      <h1>{mode === 'forgot' ? 'Reset your password' : register ? 'Create your account' : 'Sign in to Hushful'}</h1>
      <p className="muted">{mode === 'forgot' ? 'Enter your email and we’ll send you a secure reset link.' : register ? 'Keep every thoughtful idea in one calm place.' : 'Your wishlists are waiting for you.'}</p>
      <form onSubmit={submit} className="stack-form">
        {register && <Field label="Your name"><input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="How friends know you" required /></Field>}
        <Field label="Email"><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></Field>
        {mode !== 'forgot' && <Field label="Password"><input type="password" autoComplete={register ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required /></Field>}
        {message && <p className="auth-message" role="status">{message}</p>}
        <button className="primary wide" disabled={busy}>{busy && <LoaderCircle className="spin" />} {mode === 'forgot' ? 'Send reset link' : register ? 'Create account' : 'Sign in'} <ChevronRight /></button>
      </form>
      {mode !== 'forgot' && <>
        <div className="auth-divider"><span>or</span></div>
        <GoogleSignInButton onAuthenticated={onAuthenticated} onError={onError} />
      </>}
      {mode === 'login' && <button className="text-button auth-switch" onClick={() => { setMessage(''); setMode('forgot') }}>Forgot password?</button>}
      <button className="text-button auth-switch" onClick={() => { setMessage(''); setMode(mode === 'login' ? 'register' : 'login') }}>{mode === 'register' ? 'Already have an account? Sign in' : mode === 'forgot' ? 'Back to sign in' : 'New to Hushful? Create an account'}</button>
    </section>
    <p className="auth-foot">Private by design · Share only with the people you choose</p>
  </main>
}

function GoogleSignInButton({ onAuthenticated, onError }: { onAuthenticated: (token: string) => void; onError: (e: unknown) => void }) {
  const container = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
    if (!clientId) return
    let attempts = 0
    const timer = window.setInterval(() => {
      attempts += 1
      if (!window.google || !container.current) {
        if (attempts >= 100) window.clearInterval(timer)
        return
      }
      window.clearInterval(timer)
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          try { onAuthenticated((await api.googleLogin(credential)).accessToken) }
          catch (error) { onError(error) }
        },
      })
      container.current.replaceChildren()
      window.google.accounts.id.renderButton(container.current, {
        type: 'standard', theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: 360,
      })
    }, 50)
    return () => window.clearInterval(timer)
  }, [onAuthenticated, onError])
  return <div className="google-sign-in" ref={container} />
}

function ResetPasswordScreen({ token }: { token: string }) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirmation) return setError('The passwords do not match.')
    setBusy(true); setError('')
    try { await api.resetPassword(token, password); setComplete(true) }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to reset your password.') }
    finally { setBusy(false) }
  }

  return <main className="auth-page">
    <div className="auth-brand"><Logo /><p>All the wishes.<br />None of the spoilers.</p></div>
    <section className="auth-card">
      <div className="eyebrow">Account recovery</div>
      <h1>{complete ? 'Password updated' : 'Choose a new password'}</h1>
      {complete ? <>
        <p className="muted">Your new password is ready. You can now return to Hushful and sign in.</p>
        <button className="primary wide" onClick={() => { authStorage.clear(); window.location.assign('/') }}>Return to sign in <ChevronRight /></button>
      </> : <form onSubmit={submit} className="stack-form">
        <Field label="New password"><input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
        <Field label="Confirm password"><input type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required /></Field>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="primary wide" disabled={busy}>{busy && <LoaderCircle className="spin" />} Update password <ChevronRight /></button>
      </form>}
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
  const [friendsOpen, setFriendsOpen] = useState(false)
  const [peopleSearchOpen, setPeopleSearchOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [mobileNav, setMobileNav] = useState(false)
  const tutorialKey = `hushful.tutorial.seen.${user.id}`
  const [tutorialOpen, setTutorialOpen] = useState(() => localStorage.getItem(tutorialKey) !== '1')

  const loadWishlists = useCallback(async () => { try { setWishlists(await api.wishlists(token)) } catch (e) { onError(e) } finally { setBusy(false) } }, [token, onError])
  useEffect(() => { void loadWishlists() }, [loadWishlists])
  const loadActivity = useCallback(async () => { try { setActivity(await api.activity(token)) } catch (e) { onError(e) } }, [token, onError])
  useEffect(() => { void loadActivity(); const timer = window.setInterval(() => void loadActivity(), 30000); return () => window.clearInterval(timer) }, [loadActivity])
  useEffect(() => {
    async function syncAccountShares() {
      try {
        const local = shareStorage.list(user.id)
        let server = await api.accountShares(token)
        for (const share of local) {
          if (!share.shareToken) continue
          const existsOnServer = server.some((saved) => saved.id === share.accountShareID || saved.wishlistID === share.wishlistID)
          if (existsOnServer) continue
          const saved = await api.saveAccountShare(token, share.shareToken, shareStorage.viewerToken(user.id, share.shareToken) || undefined)
          server = [...server, saved]
        }
        setShared(server.map((share) => {
          const cached = local.find((item) => item.accountShareID === share.id || item.wishlistID === share.wishlistID)
          return { shareToken: cached?.shareToken || '', title: share.title, sharedByName: share.sharedByName, accountShareID: share.id, wishlistID: share.wishlistID }
        }))
      } catch (error) { onError(error) }
    }
    void syncAccountShares()
  }, [token, user.id, onError])
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
  async function addShareToAccount(share: SharedWishlist) {
    if (!share.shareToken) throw new Error('Open the original share link to add this list to your account.')
    const viewerToken = shareStorage.viewerToken(user.id, share.shareToken) || undefined
    const saved = await api.saveAccountShare(token, share.shareToken, viewerToken)
    const updated = { ...share, title: saved.title, sharedByName: saved.sharedByName, accountShareID: saved.id, wishlistID: saved.wishlistID }
    shareStorage.save(user.id, updated, viewerToken || '')
    setShared((all) => all.map((item) => item.shareToken === share.shareToken ? updated : item))
    select({ kind: 'shared', share: updated })
    notify('Added to Shared With Me')
  }
  async function removeShare(share: SharedWishlist) { try { if (share.accountShareID) await api.removeAccountShare(token, share.accountShareID); if (share.shareToken) shareStorage.remove(user.id, share.shareToken); setShared((all) => all.filter((item) => item.accountShareID !== share.accountShareID || item.shareToken !== share.shareToken)); if (view.kind === 'shared' && (view.share.accountShareID === share.accountShareID || view.share.shareToken === share.shareToken)) select({ kind: 'home' }) } catch (error) { onError(error) } }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
      <div className="sidebar-top"><Logo compact /><button className="icon-button mobile-close" onClick={() => setMobileNav(false)}><X /></button></div>
      <nav>
        <button className={`nav-home ${view.kind === 'home' ? 'active' : ''}`} onClick={() => select({ kind: 'home' })}><Sparkles /> Overview</button>
        <button className="nav-home" onClick={() => { setFriendsOpen(true); setMobileNav(false) }}><Users /> Friends</button>
        <button className="nav-home" onClick={() => { setPeopleSearchOpen(true); setMobileNav(false) }}><User /> Find people</button>
        <button className="nav-home" onClick={() => { setActivityOpen(true); setMobileNav(false) }}><Bell /> Activity {activity.some((item) => !item.readAt) && <span className="notification-badge">{activity.filter((item) => !item.readAt).length}</span>}</button>
        <NavGroup title="My wishlists" action={<button aria-label="New wishlist" onClick={() => setCreateOpen(true)}><Plus /></button>}>
          {wishlists.map((wishlist) => <button key={wishlist.id} className={view.kind === 'wishlist' && view.wishlist.id === wishlist.id ? 'active' : ''} onClick={() => select({ kind: 'wishlist', wishlist })}><span className="nav-dot" />{wishlist.title}</button>)}
        </NavGroup>
        <NavGroup title="Shared with me" action={<button aria-label="Open shared wishlist" onClick={() => setShareOpen(true)}><Link2 /></button>}>
          {shared.map((share) => <button key={share.accountShareID || share.shareToken} className={view.kind === 'shared' && (view.share.accountShareID || view.share.shareToken) === (share.accountShareID || share.shareToken) ? 'active' : ''} onClick={() => select({ kind: 'shared', share })}><span className="nav-dot shared-dot" />{share.title}</button>)}
        </NavGroup>
      </nav>
      <button className="tutorial-button" onClick={() => setTutorialOpen(true)}><CircleHelp /> How Hushful works</button>
      <button className="profile-chip" onClick={() => setAccountOpen(true)}><Avatar name={user.displayName || user.email} userId={user.id} hasAvatar={user.hasAvatar} /><span><strong>{user.displayName || 'Your account'}</strong><small>{user.email}</small></span><Settings /></button>
    </aside>
    {mobileNav && <button className="scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    <main className="main-panel">
      <header className="mobile-header"><button className="icon-button" onClick={() => setMobileNav(true)}><Menu /></button><Logo compact /><span /></header>
      {busy ? <FullPageLoader embedded /> : view.kind === 'home' ? <Home user={user} wishlists={wishlists} shared={shared} openWishlist={(w) => select({ kind: 'wishlist', wishlist: w })} openShared={(s) => select({ kind: 'shared', share: s })} newWishlist={() => setCreateOpen(true)} openShare={() => setShareOpen(true)} /> : view.kind === 'wishlist' ? <WishlistDetail token={token} wishlist={view.wishlist} onError={onError} notify={notify} /> : <SharedDetail token={token} accountId={user.id} defaultNoteName={user.displayName || user.email.split('@')[0]} share={view.share} onError={onError} onRemove={() => void removeShare(view.share)} onAdd={() => addShareToAccount(view.share)} />}
    </main>
    {createOpen && <CreateWishlistModal close={() => setCreateOpen(false)} create={createWishlist} />}
    {shareOpen && <OpenShareModal accessToken={token} accountId={user.id} initialToken={window.location.pathname.match(/^\/share\/([^/]+)/)?.[1]} close={() => setShareOpen(false)} save={saveShare} onError={onError} />}
    {friendsOpen && <FriendsModal token={token} close={() => setFriendsOpen(false)} onError={onError} notify={notify} openShare={(saved) => { const share = { shareToken: '', title: saved.title, sharedByName: saved.sharedByName, accountShareID: saved.id, wishlistID: saved.wishlistID }; setShared((all) => all.some((item) => item.accountShareID === saved.id) ? all : [...all, share]); setFriendsOpen(false); select({ kind: 'shared', share }) }} />}
    {peopleSearchOpen && <UserSearchModal token={token} close={() => setPeopleSearchOpen(false)} onError={onError} notify={notify} openShare={(saved) => { const share = { shareToken: '', title: saved.title, sharedByName: saved.sharedByName, accountShareID: saved.id, wishlistID: saved.wishlistID }; setShared((all) => all.some((item) => item.accountShareID === saved.id) ? all : [...all, share]); setPeopleSearchOpen(false); select({ kind: 'shared', share }) }} />}
    {activityOpen && <ActivityModal token={token} items={activity} changed={setActivity} close={() => setActivityOpen(false)} onError={onError} />}
    {accountOpen && <AccountModal token={token} user={user} userChanged={setUser} close={() => setAccountOpen(false)} save={async (profile) => { try { setUser(await api.updateProfile(token, profile)); setAccountOpen(false); notify('Profile updated') } catch (e) { onError(e) } }} onError={onError} notify={notify} logout={logout} />}
    {tutorialOpen && <TutorialModal close={() => { localStorage.setItem(tutorialKey, '1'); setTutorialOpen(false) }} />}
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
        {shared.length ? <div className="shared-row">{shared.map((share) => <button className="shared-card" key={share.accountShareID || share.shareToken} onClick={() => openShared(share)}><Avatar name={share.sharedByName || 'Someone'} /><span><strong>{share.title}</strong><small>From {share.sharedByName || 'Someone'}</small></span><ChevronRight /></button>)}</div> : <button className="share-placeholder" onClick={openShare}><Link2 /><span><strong>Have a Hushful link?</strong><small>Paste it here to keep the list close.</small></span></button>}
      </section>
    </>}
  </div>
}

function WishlistDetail({ token, wishlist, onError, notify }: { token: string; wishlist: Wishlist; onError: (e: unknown) => void; notify: (s: string) => void }) {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null)
  const [sharing, setSharing] = useState(false)
  const load = useCallback(async () => { setLoading(true); try { setItems(await api.items(token, wishlist.id)) } catch (e) { onError(e) } finally { setLoading(false) } }, [token, wishlist.id, onError])
  useEffect(() => { void load() }, [load])
  async function remove(item: WishlistItem) { if (!window.confirm(`Remove “${item.title}” from this wishlist?`)) return; const old = items; setItems((all) => all.filter((i) => i.id !== item.id)); try { await api.deleteItem(token, wishlist.id, item.id); notify('Item removed') } catch (e) { setItems(old); onError(e) } }
  return <div className="page detail-page">
    <header className="page-heading"><div><p className="eyebrow">My wishlist</p><h1>{wishlist.title}</h1><p>{items.length} {items.length === 1 ? 'wish' : 'wishes'} tucked away</p></div><div className="heading-actions"><button className="secondary" onClick={() => setSharing(true)}><Share2 /> Share</button><button className="primary" onClick={() => setAddOpen(true)}><Plus /> Add item</button></div></header>
    {loading ? <FullPageLoader embedded /> : items.length ? <div className="items-grid">{items.map((item) => <article className="item-card" key={item.id}><div className="item-icon"><Gift /></div><div className="item-copy"><div className="item-title-row"><h3>{item.title}</h3>{item.price != null && <strong>{currency(item.price)}</strong>}</div><small>Quantity: {item.quantity || 1}</small>{item.ownerNote && <p>{item.ownerNote}</p>}{item.url && <a href={safeUrl(item.url)} target="_blank" rel="noreferrer">View item <ExternalLink /></a>}</div><div className="item-card-actions"><button className="edit-button" aria-label={`Edit ${item.title}`} onClick={() => setEditingItem(item)}><Pencil /></button><button className="delete-button" aria-label={`Delete ${item.title}`} onClick={() => remove(item)}><Trash2 /></button></div></article>)}</div> : <EmptyState icon={<Gift />} title="This list is ready for a first wish" text="Add an item, a thoughtful note, and an optional link or price." action={<button className="primary" onClick={() => setAddOpen(true)}><Plus /> Add your first item</button>} />}
    {addOpen && <AddItemModal close={() => setAddOpen(false)} save={async (item) => { try { const created = await api.createItem(token, wishlist.id, item); setItems((all) => [created, ...all]); setAddOpen(false); notify('Wish added') } catch (e) { onError(e) } }} />}
    {editingItem && <AddItemModal initial={editingItem} close={() => setEditingItem(null)} save={async (changes) => { try { const updated = await api.updateItem(token, wishlist.id, editingItem.id, changes); setItems((all) => all.map((item) => item.id === updated.id ? updated : item)); setEditingItem(null); notify('Wish updated') } catch (e) { onError(e) } }} />}
    {sharing && <SocialShareModal token={token} wishlist={wishlist} close={() => setSharing(false)} notify={notify} onError={onError} />}
  </div>
}

function SharedDetail({ token, accountId, defaultNoteName, share, onError, onRemove, onAdd }: { token: string; accountId: string; defaultNoteName: string; share: SharedWishlist; onError: (e: unknown) => void; onRemove: () => void; onAdd: () => Promise<void> }) {
  const viewerToken = shareStorage.viewerToken(accountId, share.shareToken)
  const [rows, setRows] = useState<SharedItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [identity, setIdentity] = useState<{ itemId: string; purchasedQuantity?: number; note?: string } | null>(null)
  const [noteItem, setNoteItem] = useState<{ itemId: string; note?: string; displayName?: string; shareName?: boolean } | null>(null)
  const [saving, setSaving] = useState(false)
  const load = useCallback(async () => { if (!viewerToken && !share.accountShareID) return; setLoading(true); try { setRows(share.accountShareID ? await api.accountSharedItems(token, share.accountShareID) : await api.sharedItems(share.shareToken, viewerToken!)) } catch (e) { onError(e) } finally { setLoading(false) } }, [token, viewerToken, share.shareToken, share.accountShareID, onError])
  useEffect(() => { void load() }, [load])
  async function update(itemId: string, body: { purchased?: boolean; purchasedQuantity?: number; note?: string; displayName?: string; shareName?: boolean }) { if (!viewerToken && !share.accountShareID) return; try { const row = share.accountShareID ? await api.updateAccountSharedItem(token, share.accountShareID, itemId, body) : await api.updateSharedItem(share.shareToken, itemId, viewerToken!, body); setRows((all) => all.map((r) => r.item.id === itemId ? row : r)) } catch (e) { onError(e); void load() } }
  return <div className="page detail-page shared-detail">
    <header className="page-heading"><div><p className="eyebrow">Shared by {share.sharedByName || 'Someone'}</p><h1>{share.title}</h1><p>Claims stay hidden from the person who made this list.</p></div><div className="heading-actions"><button className="secondary" onClick={() => void load()}><RefreshCw /> Refresh</button><button className="icon-button danger" aria-label="Remove saved list" onClick={onRemove}><Trash2 /></button></div></header>
    <section className="save-shared-panel">
      <div><strong>{share.accountShareID ? 'Saved to your account' : 'Keep this list close'}</strong><span>{share.accountShareID ? 'You can save it again to verify the account connection.' : 'Add it to Shared With Me so it follows you across devices and sign-ins.'}</span></div>
      <div className="save-shared-actions">
        {share.shareToken ? <button className="primary" disabled={saving} onClick={async () => { setSaving(true); try { await onAdd() } catch (e) { onError(e) } finally { setSaving(false) } }}>{saving ? <LoaderCircle className="spin" /> : <Plus />}{saving ? 'Saving…' : 'Add to Shared With Me'}</button> : <span className="saved-account-label"><Check /> Saved to Shared With Me</span>}
        {share.accountShareID && share.shareToken && <button className="secondary danger-text" onClick={() => { if (window.confirm(`Remove “${share.title}” from Shared With Me? You’ll need the original link to add it again.`)) onRemove() }}><Trash2 /> Remove from account</button>}
      </div>
    </section>
    {loading ? <FullPageLoader embedded /> : rows.length ? <div className="items-grid">{rows.map((row) => <SharedItemCard key={row.item.id} row={row} chooseQuantity={(quantity) => quantity === 0 ? void update(row.item.id, { purchasedQuantity: 0 }) : setIdentity({ itemId: row.item.id, purchasedQuantity: quantity })} editNote={(note) => setNoteItem({ itemId: row.item.id, note: note?.note, displayName: note?.authorDisplayName, shareName: Boolean(note?.authorDisplayName) })} removeNote={async () => { await update(row.item.id, { note: '', shareName: false }); await load() }} />)}</div> : <EmptyState icon={<Gift />} title="There’s nothing here yet" text="Check back after the list owner adds a wish." />}
    {identity && <IdentityModal close={() => setIdentity(null)} continueWith={(displayName, shareName) => { void update(identity.itemId, { purchasedQuantity: identity.purchasedQuantity, note: identity.note, displayName, shareName }); setIdentity(null) }} />}
    {noteItem && <NoteModal initial={noteItem} defaultName={defaultNoteName} close={() => setNoteItem(null)} save={async (note, displayName, shareName) => { const itemId = noteItem.itemId; setNoteItem(null); await update(itemId, { note, displayName, shareName }); await load() }} />}
  </div>
}

function SharedItemCard({ row, chooseQuantity, editNote, removeNote }: { row: SharedItemRow; chooseQuantity: (quantity: number) => void; editNote: (note?: SharedItemRow['notes'][number]) => void; removeNote: () => void }) {
  const requested = row.item.quantity || 1
  const claimed = row.purchasedQuantity ?? (row.purchased ? 1 : 0)
  const mine = row.purchasedQuantityByMe ?? (row.purchasedByMe ? 1 : 0)
  const maximumForMe = Math.max(0, requested - claimed + mine)
  const myNote = row.notes.find((note) => note.isMine)
  return <article className={`item-card shared-item ${claimed >= requested ? 'purchased' : ''}`}><div className="item-icon">{claimed >= requested ? <PackageCheck /> : <Gift />}</div><div className="item-copy"><div className="item-title-row"><h3>{row.item.title}</h3>{row.item.price != null && <strong>{currency(row.item.price)}</strong>}</div><small>{claimed} of {requested} claimed</small>{row.item.ownerNote && <p>{row.item.ownerNote}</p>}{row.item.url && <a href={safeUrl(row.item.url)} target="_blank" rel="noreferrer">View item <ExternalLink /></a>}<div className="item-actions"><label className="quantity-choice"><span>You’re buying</span><select value={mine} onChange={(event) => chooseQuantity(Number(event.target.value))}>{Array.from({ length: maximumForMe + 1 }, (_, quantity) => <option key={quantity} value={quantity}>{quantity}</option>)}</select></label><button className="text-button" onClick={() => editNote(myNote)}>{myNote ? 'Edit your note' : 'Add a note'}</button></div>{row.notes.length > 0 && <div className="notes"><span>Notes</span>{row.notes.map((note, i) => <div className="note-row" key={`${note.updatedAt}-${i}`}><p><strong>{note.authorDisplayName || 'Anonymous'} · </strong>{note.note}</p>{note.isMine && <div><button className="text-button" onClick={() => editNote(note)}>Edit</button><button className="text-button danger-text" onClick={() => { if (window.confirm('Remove your note?')) removeNote() }}>Remove</button></div>}</div>)}</div>}</div></article>
}

function Modal({ children, close, size = '' }: { children: ReactNode; close: () => void; size?: string }) { return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}><section className={`modal ${size}`} role="dialog" aria-modal="true">{children}</section></div> }
function ModalHeader({ eyebrow, title, close }: { eyebrow?: string; title: string; close: () => void }) { return <header className="modal-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div><button className="icon-button" onClick={close}><X /></button></header> }
function TutorialModal({ close }: { close: () => void }) { const [page, setPage] = useState(0); const steps = [{ title: 'Start from Home', text: 'Use New wishlist to create a list. Use Open a link for a list someone shared with you.' }, { title: 'Build and share a list', text: 'Inside a wishlist, Add item adds a wish and Share creates its private link.' }, { title: 'Shop a shared list', text: 'View item opens the product. Quantity and note controls are directly beneath it.' }]; const step = steps[page]; return <Modal close={close} size="modal-wide"><div className="tutorial"><Logo compact /><TutorialPreview page={page} /><p className="eyebrow">Step {page + 1} of {steps.length}</p><h2>{step.title}</h2><p>{step.text}</p><div className="tutorial-dots">{steps.map((_, index) => <span key={index} className={index === page ? 'active' : ''} />)}</div><div className="modal-actions spread"><button className="text-button" onClick={close}>{page === steps.length - 1 ? 'Close' : 'Skip'}</button><button className="primary" onClick={() => page === steps.length - 1 ? close() : setPage(page + 1)}>{page === steps.length - 1 ? 'Start using Hushful' : 'Next'} <ChevronRight /></button></div></div></Modal> }
function TutorialPreview({ page }: { page: number }) { return <div className="tutorial-preview"><div className="tutorial-preview-nav"><strong>{page === 0 ? 'Hushful' : page === 1 ? 'Birthday Wishes' : 'Shared List'}</strong><div>{page === 0 ? <><TutorialCallout icon={<Link2 />} label="Open a link" /><TutorialCallout icon={<Plus />} label="New wishlist" /></> : page === 1 ? <><TutorialCallout icon={<Share2 />} label="Share" /><TutorialCallout icon={<Plus />} label="Add item" /></> : <TutorialCallout icon={<ExternalLink />} label="View item" />}</div></div><div className="tutorial-preview-body">{page === 0 ? <><TutorialMiniRow title="Birthday Wishes" detail="My wishlist" /><TutorialMiniRow title="Alex’s List" detail="Shared with me" /></> : page === 1 ? <><TutorialMiniRow title="Cozy blanket" detail="Quantity: 1" /><small>Use Edit on an item to update its details.</small></> : <><TutorialMiniRow title="Coffee mugs" detail="1 of 4 claimed" /><div className="tutorial-detail-actions"><button>Quantity: 1</button><button>Add a note</button></div></>}</div></div> }
function TutorialCallout({ icon, label }: { icon: ReactNode; label: string }) { return <span className="tutorial-callout"><i>{icon}</i><small>{label}</small></span> }
function TutorialMiniRow({ title, detail }: { title: string; detail: string }) { return <div className="tutorial-mini-row"><i><Gift /></i><span><strong>{title}</strong><small>{detail}</small></span><ChevronRight /></div> }
function CreateWishlistModal({ close, create }: { close: () => void; create: (title: string) => void }) { const [title, setTitle] = useState(''); return <Modal close={close}><ModalHeader eyebrow="A new collection" title="Name your wishlist" close={close} /><form className="stack-form" onSubmit={(e) => { e.preventDefault(); create(title.trim()) }}><Field label="Wishlist name"><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Birthday ideas, Cozy home…" /></Field><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={!title.trim()}>Create wishlist</button></div></form></Modal> }
function AddItemModal({ initial, close, save }: { initial?: WishlistItem; close: () => void; save: (item: { title: string; url?: string; price?: number; ownerNote?: string; quantity: number }) => void }) { const editing = Boolean(initial); const [title, setTitle] = useState(initial?.title || ''); const [url, setUrl] = useState(initial?.url || ''); const [price, setPrice] = useState(initial?.price?.toString() || ''); const [note, setNote] = useState(initial?.ownerNote || ''); const [quantity, setQuantity] = useState(initial?.quantity || 1); return <Modal close={close} size="modal-wide"><ModalHeader eyebrow={editing ? 'A thoughtful adjustment' : 'One more lovely thing'} title={editing ? 'Edit this wish' : 'Add a wish'} close={close} /><form className="stack-form" onSubmit={(e) => { e.preventDefault(); save({ title: title.trim(), url: url.trim() || undefined, price: price ? Number(price.replace(',', '.')) : undefined, ownerNote: note.trim() || undefined, quantity }) }}><Field label="Item title"><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you wishing for?" /></Field><div className="field-row"><Field label="Link (optional)"><input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></Field><Field label="Price (optional)"><div className="money-input"><span>$</span><input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" /></div></Field></div><Field label="Quantity"><input type="number" min="1" max="999" value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))} /></Field><Field label="A note (optional)"><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Size, color, or why you love it…" /></Field><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={!title.trim()}>{editing ? 'Save changes' : 'Add to wishlist'}</button></div></form></Modal> }
/* Deep-link initialization intentionally runs once with the token from the first URL. */
/* eslint-disable react-hooks/exhaustive-deps */
function OpenShareModal({ accountId, initialToken, close, save, onError }: { accessToken: string; accountId: string; initialToken?: string; close: () => void; save: (s: SharedWishlist, vt: string) => void; onError: (e: unknown) => void }) { const [input, setInput] = useState(initialToken || ''); const [busy, setBusy] = useState(false); useEffect(() => { if (initialToken) void open() }, []); async function open(e?: FormEvent) { e?.preventDefault(); const shareToken = extractToken(input); if (!shareToken) return; setBusy(true); try { const existingViewerToken = shareStorage.viewerToken(accountId, shareToken) || undefined; const response = await api.openShare(shareToken, existingViewerToken); save({ shareToken, title: response.wishlist.title, sharedByName: response.wishlist.sharedByName, wishlistID: response.wishlist.id }, response.viewerToken) } catch (error) { onError(error) } finally { setBusy(false) } } return <Modal close={close}><ModalHeader eyebrow="Something thoughtful awaits" title="Open a shared wishlist" close={close} /><form className="stack-form" onSubmit={open}><Field label="Private link or token"><input autoFocus value={input} onChange={(e) => setInput(e.target.value)} placeholder="Paste a Hushful link here" /></Field><p className="hint">Open the list, then choose Add to Shared With Me to save it to your account.</p><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={busy || !input.trim()}>{busy && <LoaderCircle className="spin" />} Open wishlist</button></div></form></Modal> }
/* eslint-enable react-hooks/exhaustive-deps */
function FriendsModal({ token, close, onError, notify, openShare }: { token: string; close: () => void; onError: (e: unknown) => void; notify: (s: string) => void; openShare: (share: AccountSharedWishlist) => void }) {
  const [friends, setFriends] = useState<Friendship[]>([]), [requests, setRequests] = useState<Friendship[]>([]), [groups, setGroups] = useState<FriendGroup[]>([])
  const [groupName, setGroupName] = useState('')
  const load = useCallback(async () => { try { const [f, r, g] = await Promise.all([api.friends(token), api.friendRequests(token), api.friendGroups(token)]); setFriends(f); setRequests(r); setGroups(g) } catch (e) { onError(e) } }, [token, onError])
  useEffect(() => { void load() }, [load])
  const incoming = requests.filter((r) => r.direction === 'incoming')
  const [profile, setProfile] = useState<Friendship | null>(null)
  if (profile) return <FriendProfileModal token={token} person={profile.user} friendship={profile.status === 'accepted' ? profile : undefined} close={() => setProfile(null)} removed={async () => { setProfile(null); await load(); notify('Friend removed') }} openShare={openShare} onError={onError} />
  return <Modal close={close} size="modal-wide"><ModalHeader eyebrow="Your private circle" title="Friends & groups" close={close} /><div className="social-stack">
    {incoming.length > 0 && <section><h3>Requests</h3>{incoming.map((request) => <SocialRow key={request.id} person={request.user} action={<button className="primary" onClick={async () => { try { await api.acceptFriend(token, request.id); notify('Friend added'); await load() } catch (e) { onError(e) } }}>Accept</button>} />)}</section>}
    <section><h3>Friends</h3>{friends.length ? friends.map((friend) => <button className="profile-list-row" key={friend.id} onClick={() => setProfile(friend)}><Avatar name={friend.user.displayName || friend.user.username} userId={friend.user.id} hasAvatar={friend.user.hasAvatar} /><span><strong>{friend.user.displayName || `@${friend.user.username}`}</strong><small>@{friend.user.username}</small></span><ChevronRight /></button>) : <p className="hint">Search for a username to start your private circle.</p>}</section>
    <section><h3>Private groups</h3><form className="inline-social-form" onSubmit={async (e) => { e.preventDefault(); if (!groupName.trim()) return; try { await api.createFriendGroup(token, groupName.trim()); setGroupName(''); await load() } catch (error) { onError(error) } }}><input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Family, close friends…" /><button className="secondary">Create</button></form>
      {groups.map((group) => <details className="social-group" key={group.id}><summary>{group.name}<small>{group.members.length} members</small></summary>{friends.map((friend) => { const checked = group.members.some((member) => member.id === friend.user.id); return <label className="audience-choice" key={friend.user.id}><input type="checkbox" checked={checked} onChange={async () => { try { checked ? await api.removeGroupMember(token, group.id, friend.user.id) : await api.addGroupMember(token, group.id, friend.user.id); await load() } catch (e) { onError(e) } }} /><span>{friend.user.displayName || `@${friend.user.username}`}<small>@{friend.user.username}</small></span></label> })}</details>)}
    </section>
  </div></Modal>
}

function UserSearchModal({ token, close, onError, notify, openShare }: { token: string; close: () => void; onError: (e: unknown) => void; notify: (s: string) => void; openShare: (share: AccountSharedWishlist) => void }) {
  const [query, setQuery] = useState(''), [results, setResults] = useState<SocialUser[]>([]), [friends, setFriends] = useState<Friendship[]>([]), [requests, setRequests] = useState<Friendship[]>([]), [profile, setProfile] = useState<SocialUser | null>(null)
  const loadRelationships = useCallback(async () => { try { const [f, r] = await Promise.all([api.friends(token), api.friendRequests(token)]); setFriends(f); setRequests(r) } catch (e) { onError(e) } }, [token, onError])
  useEffect(() => { void loadRelationships() }, [loadRelationships])
  useEffect(() => { const timer = window.setTimeout(() => { if (query.trim().length >= 2) api.searchUsers(token, query.trim()).then(setResults).catch(onError); else setResults([]) }, 250); return () => window.clearTimeout(timer) }, [query, token, onError])
  if (profile) { const friendship = friends.find((item) => item.user.id === profile.id); return <FriendProfileModal token={token} person={profile} friendship={friendship} close={() => setProfile(null)} removed={async () => { setProfile(null); await loadRelationships(); notify('Friend removed') }} openShare={openShare} onError={onError} /> }
  return <Modal close={close} size="modal-wide"><ModalHeader eyebrow="Discover public wishlists" title="Find people" close={close} /><div className="social-stack"><Field label="Search by username"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search usernames" autoFocus /></Field>
    {query.trim().length < 2 ? <p className="hint">Enter at least two characters to find a profile.</p> : results.length ? results.map((person) => { const friendship = friends.find((item) => item.user.id === person.id), requested = requests.some((item) => item.user.id === person.id && item.direction === 'outgoing'); return <SocialRow key={person.id} person={person} action={<div className="social-actions"><button className="secondary" onClick={() => setProfile(person)}>View lists</button><button className="secondary" disabled={Boolean(friendship) || requested} onClick={async () => { try { await api.requestFriend(token, person.id); notify('Friend request sent'); await loadRelationships() } catch (e) { onError(e) } }}>{friendship ? 'Friends' : requested ? 'Requested' : 'Add friend'}</button></div>} /> }) : <p className="hint">No matching users found.</p>}
  </div></Modal>
}

function FriendProfileModal({ token, friendship, person, close, removed, openShare, onError }: { token: string; friendship?: Friendship; person: SocialUser; close: () => void; removed: () => Promise<void>; openShare: (share: AccountSharedWishlist) => void; onError: (e: unknown) => void }) {
  const [profile, setProfile] = useState<FriendProfile | null>(null), [opening, setOpening] = useState<string | null>(null)
  useEffect(() => { api.friendProfile(token, person.id).then(setProfile).catch(onError) }, [token, person.id, onError])
  async function openPublic(wishlistID: string) { setOpening(wishlistID); try { openShare(await api.openPublicWishlist(token, wishlistID)) } catch (e) { onError(e) } finally { setOpening(null) } }
  const saved = (item: ProfileWishlist): AccountSharedWishlist => ({ id: item.accountShareID!, wishlistID: item.wishlistID, title: item.title, sharedByName: profile?.user.displayName || `@${profile?.user.username || person.username}` })
  return <Modal close={close} size="modal-wide"><ModalHeader eyebrow={`@${person.username}`} title={person.displayName || `@${person.username}`} close={close} />{!profile ? <FullPageLoader embedded /> : <div className="social-stack"><div className="friend-profile-heading"><Avatar name={person.displayName || person.username} userId={person.id} hasAvatar={person.hasAvatar} /><p>Only public wishlists and lists shared specifically with you appear here.</p></div>
    <section><h3>Public wishlists</h3>{profile.publicWishlists.length ? profile.publicWishlists.map((item) => <button className="profile-list-row" key={item.wishlistID} disabled={opening === item.wishlistID} onClick={() => void openPublic(item.wishlistID)}><Gift /><span><strong>{item.title}</strong><small>Public</small></span><ChevronRight /></button>) : <p className="hint">No public wishlists.</p>}</section>
    <section><h3>Shared with you</h3>{profile.sharedWishlists.length ? profile.sharedWishlists.map((item) => <button className="profile-list-row" key={item.wishlistID} onClick={() => openShare(saved(item))}><Users /><span><strong>{item.title}</strong><small>Shared privately with you</small></span><ChevronRight /></button>) : <p className="hint">No private lists have been shared with you.</p>}</section>
    {friendship && <div className="modal-actions"><button className="secondary danger-text" onClick={async () => { if (!window.confirm(`Are you sure you want to remove ${person.displayName || `@${person.username}`} as a friend? This cannot be undone.`)) return; try { await api.removeFriendship(token, friendship.id); await removed() } catch (e) { onError(e) } }}><Trash2 /> Remove friend</button></div>}
  </div>}</Modal>
}

function ActivityModal({ token, items, changed, close, onError }: { token: string; items: ActivityItem[]; changed: (items: ActivityItem[]) => void; close: () => void; onError: (e: unknown) => void }) {
  useEffect(() => { if (!items.some((item) => !item.readAt)) return; api.readAllActivity(token).then(() => changed(items.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })))).catch(onError) }, [])
  return <Modal close={close} size="modal-wide"><ModalHeader eyebrow="What’s new" title="Activity" close={close} /><div className="activity-list">{items.length ? items.map((item) => <article className={`activity-item ${item.readAt ? '' : 'unread'}`} key={item.id}><span className="activity-icon">{item.kind === 'friend_request' || item.kind === 'friend_accepted' ? <Users /> : <Gift />}</span><div><strong>{item.title}</strong><p>{item.message}</p>{item.createdAt && <small>{new Date(item.createdAt).toLocaleString()}</small>}</div></article>) : <EmptyState icon={<Bell />} title="You’re all caught up" text="Friend requests and shared-list updates will appear here." />}</div></Modal>
}

function SocialRow({ person, action }: { person: SocialUser; action: ReactNode }) { return <div className="social-row"><Avatar name={person.displayName || person.username} userId={person.id} hasAvatar={person.hasAvatar} /><span><strong>{person.displayName || `@${person.username}`}</strong><small>@{person.username}</small></span>{action}</div> }

function SocialShareModal({ token, wishlist, close, notify, onError }: { token: string; wishlist: Wishlist; close: () => void; notify: (s: string) => void; onError: (e: unknown) => void }) {
  const [friends, setFriends] = useState<Friendship[]>([]), [groups, setGroups] = useState<FriendGroup[]>([]), [audience, setAudience] = useState<WishlistAudience>({ userIDs: [], groupIDs: [] }), [visibility, setVisibility] = useState<'private' | 'public'>('private'), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [shareUrl, setShareUrl] = useState('')
  useEffect(() => { Promise.all([api.friends(token), api.friendGroups(token), api.wishlistAudience(token, wishlist.id), api.wishlistSettings(token, wishlist.id)]).then(([f, g, a, s]) => { setFriends(f); setGroups(g); setAudience(a); setVisibility(s.visibility) }).catch(onError).finally(() => setLoading(false)) }, [token, wishlist.id, onError])
  function toggle(key: keyof WishlistAudience, id: string) { setAudience((old) => ({ ...old, [key]: old[key].includes(id) ? old[key].filter((value) => value !== id) : [...old[key], id] })) }
  async function save() { setSaving(true); try { await Promise.all([api.updateWishlistAudience(token, wishlist.id, audience), api.updateWishlistSettings(token, wishlist.id, { visibility })]); notify('Sharing updated'); close() } catch (e) { onError(e) } finally { setSaving(false) } }
  async function guestLink() { try { const result = await api.createShare(token, wishlist.id); setShareUrl(`${window.location.origin}/share/${result.shareToken}`) } catch (e) { onError(e) } }
  if (shareUrl) return <ShareLinkModal url={shareUrl} title={wishlist.title} close={() => setShareUrl('')} notify={notify} />
  return <Modal close={close} size="modal-wide"><ModalHeader eyebrow="Share without a link" title={`Share “${wishlist.title}”`} close={close} />{loading ? <FullPageLoader embedded /> : <div className="social-stack"><label className="checkbox public-choice"><input type="checkbox" checked={visibility === 'public'} onChange={(e) => setVisibility(e.target.checked ? 'public' : 'private')} /><span><strong>Make this wishlist public</strong><small>Anyone can view it, and friends will see it on your profile. Purchase activity remains hidden from you.</small></span></label><p className="muted">{visibility === 'public' ? 'Public access is separate from the private friends and groups selected below.' : 'Only the friends and private groups you select can open this wishlist.'}</p>
    {groups.length > 0 && <section><h3>Groups</h3>{groups.map((group) => <label className="audience-choice" key={group.id}><input type="checkbox" checked={audience.groupIDs.includes(group.id)} onChange={() => toggle('groupIDs', group.id)} /><span>{group.name}<small>{group.members.length} friends</small></span></label>)}</section>}
    <section><h3>Friends</h3>{friends.length ? friends.map((friend) => <label className="audience-choice" key={friend.user.id}><input type="checkbox" checked={audience.userIDs.includes(friend.user.id)} onChange={() => toggle('userIDs', friend.user.id)} /><Avatar name={friend.user.displayName || friend.user.username} userId={friend.user.id} hasAvatar={friend.user.hasAvatar} /><span>{friend.user.displayName || `@${friend.user.username}`}<small>@{friend.user.username}</small></span></label>) : <p className="hint">Add friends first, or use a guest link below.</p>}</section>
    <div className="guest-link-option"><div><strong>Sharing with someone without Hushful?</strong><small>Guest links work like unlisted links and can be forwarded.</small></div><button className="secondary" onClick={guestLink}><Link2 /> Create guest link</button></div>
    <div className="modal-actions"><button className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={saving} onClick={save}>{saving && <LoaderCircle className="spin" />} Save audience</button></div></div>}</Modal>
}

function AccountModal({ token, user, userChanged, close, save, onError, notify, logout }: { token: string; user: CurrentUser; userChanged: (user: CurrentUser) => void; close: () => void; save: (profile: Partial<CurrentUser>) => void; onError: (e: unknown) => void; notify: (s: string) => void; logout: () => void }) {
  const [name, setName] = useState(user.displayName || ''), [username, setUsername] = useState(user.username || ''), [discoverable, setDiscoverable] = useState(user.isDiscoverable), [policy, setPolicy] = useState(user.friendRequestPolicy), [avatarVersion, setAvatarVersion] = useState(0), [avatarBusy, setAvatarBusy] = useState(false)
  async function upload(file?: File) { if (!file) return; if (file.size > 2 * 1024 * 1024) return onError(new Error('Profile pictures must be 2 MB or smaller.')); if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return onError(new Error('Choose a JPEG, PNG, or WebP image.')); setAvatarBusy(true); try { userChanged(await api.uploadAvatar(token, file)); setAvatarVersion(Date.now()); notify('Profile picture updated') } catch (e) { onError(e) } finally { setAvatarBusy(false) } }
  async function removeAvatar() { setAvatarBusy(true); try { userChanged(await api.removeAvatar(token)); setAvatarVersion(Date.now()); notify('Profile picture removed') } catch (e) { onError(e) } finally { setAvatarBusy(false) } }
  return <Modal close={close}><ModalHeader eyebrow="Your Hushful account" title="Account & privacy" close={close} /><form className="stack-form" onSubmit={(e) => { e.preventDefault(); save({ displayName: name.trim(), username: username.trim() || undefined, isDiscoverable: discoverable, friendRequestPolicy: policy }) }}>
    <div className="avatar-editor"><Avatar name={name || user.email} userId={user.id} hasAvatar={user.hasAvatar} version={avatarVersion} /><div><label className="secondary avatar-upload">{avatarBusy ? 'Uploading…' : user.hasAvatar ? 'Change picture' : 'Add picture'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={avatarBusy} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = '' }} /></label>{user.hasAvatar && <button type="button" className="text-button danger-text" disabled={avatarBusy} onClick={() => void removeAvatar()}>Remove</button>}<small>JPEG, PNG, or WebP · 2 MB maximum</small></div></div>
    <Field label="Display name"><input value={name} onChange={(e) => setName(e.target.value)} /></Field><Field label="Username"><input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="your_username" /></Field><label className="checkbox"><input type="checkbox" checked={discoverable} onChange={(e) => setDiscoverable(e.target.checked)} /><span><strong>Let people find my username</strong><small>Your profile picture and username appear in search. Your email never does.</small></span></label><Field label="Friend requests"><select value={policy} onChange={(e) => setPolicy(e.target.value as CurrentUser['friendRequestPolicy'])}><option value="everyone">Anyone who finds me</option><option value="nobody">Nobody</option></select></Field><Field label="Email"><input value={user.email} disabled /></Field><div className="modal-actions spread"><button type="button" className="text-button danger-text" onClick={logout}><LogOut /> Log out</button><button className="primary" disabled={!name.trim() || (discoverable && username.length < 3)}>Save changes</button></div>
  </form></Modal>
}
function ShareLinkModal({ url, title, close, notify }: { url: string; title: string; close: () => void; notify: (s: string) => void }) { async function copy() { await navigator.clipboard.writeText(url); notify('Link copied') } async function nativeShare() { if (navigator.share) await navigator.share({ title, text: `A Hushful wishlist: ${title}`, url }); else await copy() } return <Modal close={close}><ModalHeader eyebrow="Keep it in the circle" title="Your private share link" close={close} /><p className="muted modal-copy">Anyone with this link can see the list and privately coordinate gifts.</p><div className="copy-field"><span>{url}</span><button onClick={copy}><Copy /></button></div><div className="modal-actions"><button className="secondary" onClick={copy}><Copy /> Copy link</button><button className="primary" onClick={nativeShare}><Send /> Share</button></div></Modal> }
function IdentityModal({ close, continueWith }: { close: () => void; continueWith: (name: string, shareName: boolean) => void }) { const [name, setName] = useState(localStorage.getItem('hushful.displayName') || ''); const [shareName, setShareName] = useState(false); return <Modal close={close}><ModalHeader eyebrow="Just between gifters" title="What should we call you?" close={close} /><form className="stack-form" onSubmit={(e) => { e.preventDefault(); localStorage.setItem('hushful.displayName', name.trim()); continueWith(name.trim(), shareName) }}><Field label="Your name"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" /></Field><label className="checkbox"><input type="checkbox" checked={shareName} onChange={(e) => setShareName(e.target.checked)} /><span><strong>Show my name on notes</strong><small>Your purchase is still hidden from the wishlist owner.</small></span></label><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={!name.trim()}>Continue</button></div></form></Modal> }
function NoteModal({ initial, defaultName, close, save }: { initial?: { note?: string; displayName?: string; shareName?: boolean }; defaultName: string; close: () => void; save: (note: string, displayName: string | undefined, shareName: boolean) => void }) { const editing = Boolean(initial?.note); const [note, setNote] = useState(initial?.note || ''); const [shareName, setShareName] = useState(editing ? Boolean(initial?.shareName) : true); const [name, setName] = useState(initial?.displayName || localStorage.getItem('hushful.displayName') || defaultName); return <Modal close={close}><ModalHeader eyebrow="For fellow gifters" title={editing ? 'Edit your note' : 'Add a note'} close={close} /><form className="stack-form" onSubmit={(e) => { e.preventDefault(); if (shareName) localStorage.setItem('hushful.displayName', name.trim()); save(note.trim(), shareName ? name.trim() : undefined, shareName) }}><Field label="Note"><textarea autoFocus rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="I can pick this up, or want to split it?" /></Field><label className="checkbox"><input type="checkbox" checked={!shareName} onChange={(e) => setShareName(!e.target.checked)} /><span><strong>Post anonymously</strong><small>{shareName ? `Your note will display as ${name || defaultName}.` : 'This note will appear as Anonymous.'}</small></span></label>{shareName && <Field label="Your name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" autoComplete="name" /></Field>}<div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={!note.trim() || (shareName && !name.trim())}>{editing ? 'Save changes' : 'Add note'}</button></div></form></Modal> }

function Logo({ compact = false }: { compact?: boolean }) { return <div className={`logo ${compact ? 'compact' : ''}`}><span><Sparkles /></span><strong>hushful</strong></div> }
function Avatar({ name, userId, hasAvatar = false, version = 0 }: { name: string; userId?: string; hasAvatar?: boolean; version?: number }) { return <span className={`avatar ${hasAvatar ? 'has-image' : ''}`}>{hasAvatar && userId ? <img src={`${api.avatarURL(userId)}${version ? `?v=${version}` : ''}`} alt="" /> : name.trim().charAt(0).toUpperCase() || <User />}</span> }
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

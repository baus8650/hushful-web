import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Banknote, Bell, CalendarDays, Check, ChevronRight, CircleAlert, CircleHelp, Copy, ExternalLink, Gift, Link2, LoaderCircle, LogOut, Menu, MessageCircle, Moon, PackageCheck, Pencil, Pin, Plus, RefreshCw, Send, Settings, Share2, Sparkles, Sun, Trash2, User, Users, X } from 'lucide-react'
import { api, ApiError } from './api'
import { authStorage, shareStorage } from './storage'
import type { AccountSharedWishlist, ActivityItem, CurrentUser, FriendGroup, FriendProfile, Friendship, Pins, ProfileWishlist, RecurringOccasion, ShareViewResponse, SharedItemRow, SharedWishlist, SocialUser, Wishlist, WishlistAudience, WishlistDiscussionComment, WishlistItem } from './types'
import { LegalPage, PublicFooter, legalRoute } from './LegalPages'

type View = { kind: 'home' } | { kind: 'wishlist'; wishlist: Wishlist } | { kind: 'shared'; share: SharedWishlist }

function metricsVisitorID() {
  const key = 'hushful.metrics.visitor'
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const created = crypto.randomUUID(); localStorage.setItem(key, created); return created
}

export default function App() {
  const publicPage = legalRoute(window.location.pathname)
  const resetToken = new URLSearchParams(window.location.search).get('resetToken')
  const guestShareToken = window.location.pathname.match(/^\/share\/([^/]+)/)?.[1]
  const [token, setToken] = useState<string | null>(authStorage.get())
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(Boolean(token))
  const [toast, setToast] = useState<{ message: string; kind: 'success' | 'error' } | null>(null)
  const notify = useCallback((message: string) => setToast({ message, kind: 'success' }), [])
  const [theme, setTheme] = useState<'light' | 'dark'>(() => { const saved = localStorage.getItem('hushful.theme'); return saved === 'light' || saved === 'dark' ? saved : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' })
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('hushful.theme', theme) }, [theme])
  const themeToggle = <ThemeToggle theme={theme} toggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />

  const logout = useCallback(() => { authStorage.clear(); setToken(null); setUser(null) }, [])
  const onError = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) return logout()
    setToast({ message: error instanceof Error ? error.message : 'Something went wrong. Please try again.', kind: 'error' })
  }, [logout])

  useEffect(() => {
    if (!token) return
    setLoading(true)
    api.me(token).then(setUser).catch(onError).finally(() => setLoading(false))
  }, [token, onError])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4200)
    return () => window.clearTimeout(timer)
  }, [toast])
  useEffect(() => {
    const path = guestShareToken ? '/share' : resetToken ? '/reset-password' : token ? '/app' : '/login'
    void api.trackPageView(metricsVisitorID(), path, Boolean(token)).catch(() => undefined)
  }, [guestShareToken, resetToken, token])

  if (publicPage) return <>{themeToggle}<LegalPage page={publicPage} /></>
  if (resetToken) return <>{themeToggle}<ResetPasswordScreen token={resetToken} /></>
  if (guestShareToken) return <>{themeToggle}<GuestShareScreen shareToken={guestShareToken} /></>
  if (loading) return <FullPageLoader />
  if (!token || !user) return <>{themeToggle}<AuthScreen onAuthenticated={(accessToken) => { authStorage.set(accessToken); setToken(accessToken) }} onError={onError} /></>
  if (!user.username) return <>{themeToggle}<UsernameOnboarding token={token} completed={setUser} logout={logout} /></>
  return <>
    {themeToggle}
    <Dashboard token={token} user={user} setUser={setUser} logout={logout} onError={onError} notify={notify} />
    {toast && <div className={`toast ${toast.kind}`} role={toast.kind === 'error' ? 'alert' : 'status'}>{toast.kind === 'error' ? <CircleAlert /> : <Check />}{toast.message}</div>}
  </>
}

function ThemeToggle({ theme, toggle }: { theme: 'light' | 'dark'; toggle: () => void }) {
  return <button className="theme-toggle" onClick={toggle} aria-label={theme === 'dark' ? 'Use light mode' : 'Use dark mode'} title={theme === 'dark' ? 'Use light mode' : 'Use dark mode'}>{theme === 'dark' ? <Sun /> : <Moon />}</button>
}

function UsernameOnboarding({ token, completed, logout }: { token: string; completed: (user: CurrentUser) => void; logout: () => void }) {
  const [username, setUsername] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const valid = /^[a-z0-9_]{3,30}$/.test(username)
  async function save(e: FormEvent) { e.preventDefault(); if (!valid) return; setBusy(true); setError(''); try { completed(await api.updateProfile(token, { username })) } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save that username.') } finally { setBusy(false) } }
  return <main className="auth-page"><div className="auth-brand"><Logo /><p>One last step before your wishes.</p></div><section className="auth-card"><div className="eyebrow">Your Hushful identity</div><h1>Choose your permanent username</h1><p className="muted">Friends use this to find you. Choose carefully—your username cannot be changed later. Your email is never shown in search.</p><form className="stack-form" onSubmit={save}><Field label="Username"><div className="username-input"><span>@</span><input autoFocus value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, '_').replace(/[^a-z0-9_]/g, ''))} placeholder="your_username" /></div></Field><p className="hint">3–30 letters, numbers, or underscores. Spaces become underscores. This cannot be changed later.</p>{error && <p className="auth-error" role="alert">{error}</p>}<button className="primary wide" disabled={busy || !valid}>{busy && <LoaderCircle className="spin" />} Continue <ChevronRight /></button><button type="button" className="text-button auth-switch" onClick={logout}>Log out</button></form></section></main>
}

function GuestShareScreen({ shareToken }: { shareToken: string }) {
  const storageKey = `hushful.guest.viewer.${shareToken}`
  const [share, setShare] = useState<ShareViewResponse['wishlist'] | null>(null)
  const [viewerToken, setViewerToken] = useState(() => localStorage.getItem(storageKey) || '')
  const [rows, setRows] = useState<SharedItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [identity, setIdentity] = useState<{ itemId: string; purchasedQuantity: number } | null>(null)
  const [noteItem, setNoteItem] = useState<{ itemId: string; note?: string; displayName?: string; shareName?: boolean } | null>(null)
  const discussionError = useCallback((e: unknown) => setError(e instanceof Error ? e.message : 'Unable to update the discussion.'), [])

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const opened = await api.openShare(shareToken, viewerToken || undefined)
      localStorage.setItem(storageKey, opened.viewerToken)
      setViewerToken(opened.viewerToken)
      setShare(opened.wishlist)
      setRows(await api.sharedItems(shareToken, opened.viewerToken))
    } catch (e) { setError(e instanceof Error ? e.message : 'This share link is unavailable.') }
    finally { setLoading(false) }
  }, [shareToken, storageKey, viewerToken])
  useEffect(() => { void load() }, [])

  async function update(itemId: string, body: { purchasedQuantity?: number; note?: string; displayName?: string; shareName?: boolean }) {
    if (!viewerToken) return
    try {
      const updated = await api.updateSharedItem(shareToken, itemId, viewerToken, body)
      setRows((all) => all.map((row) => row.item.id === itemId ? updated : row))
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to update this wish.'); void load() }
  }

  if (loading) return <FullPageLoader />
  if (error && !share) return <main className="auth-page"><div className="auth-brand"><Logo /><p>This private link may have expired or been revoked.</p></div><section className="auth-card"><h1>Wishlist unavailable</h1><p className="auth-error">{error}</p></section></main>
  return <main className="page detail-page shared-detail guest-shared-detail">
    <header className="page-heading"><div><Logo compact /><p className="eyebrow">Shared by {share?.sharedByName || 'Someone'}</p><h1>{share?.title}</h1><p>No account is needed. Claims and notes stay hidden from the list owner.</p></div><div className="heading-actions"><button className="secondary" onClick={() => void load()}><RefreshCw /> Refresh</button></div></header>
    {error && <p className="auth-error" role="alert">{error}</p>}
    {rows.length ? <div className="items-grid">{rows.map((row) => <SharedItemCard key={row.item.id} row={row} chooseQuantity={(quantity) => quantity === 0 ? void update(row.item.id, { purchasedQuantity: 0 }) : setIdentity({ itemId: row.item.id, purchasedQuantity: quantity })} editNote={(note) => setNoteItem({ itemId: row.item.id, note: note?.note, displayName: note?.authorDisplayName, shareName: Boolean(note?.authorDisplayName) })} removeNote={() => void update(row.item.id, { note: '', shareName: false })} />)}</div> : <EmptyState icon={<Gift />} title="There’s nothing here yet" text="Check back after the list owner adds a wish." />}
    {viewerToken && <DiscussionPanel shareToken={shareToken} viewerToken={viewerToken} defaultName="" onError={discussionError} />}
    {identity && <IdentityModal close={() => setIdentity(null)} continueWith={(displayName, shareName) => { void update(identity.itemId, { purchasedQuantity: identity.purchasedQuantity, displayName, shareName }); setIdentity(null) }} />}
    {noteItem && <NoteModal initial={noteItem} defaultName="" close={() => setNoteItem(null)} save={(note, displayName, shareName) => { const itemId = noteItem.itemId; setNoteItem(null); return update(itemId, { note, displayName, shareName }) }} />}
  </main>
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
    <PublicFooter />
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
    <PublicFooter />
  </main>
}

function Dashboard({ token, user, setUser, logout, onError, notify }: { token: string; user: CurrentUser; setUser: (u: CurrentUser) => void; logout: () => void; onError: (e: unknown) => void; notify: (s: string) => void }) {
  const [view, setView] = useState<View>({ kind: 'home' })
  useEffect(() => {
    const path = view.kind === 'home' ? '/app/home' : view.kind === 'wishlist' ? '/app/wishlist' : '/app/shared-list'
    void api.trackPageView(metricsVisitorID(), path, true).catch(() => undefined)
  }, [view])
  const [wishlists, setWishlists] = useState<Wishlist[]>([])
  const [shared, setShared] = useState(() => shareStorage.list(user.id))
  const [busy, setBusy] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [sharedLibraryOpen, setSharedLibraryOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [friendsOpen, setFriendsOpen] = useState(false)
  const [peopleSearchOpen, setPeopleSearchOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [occasionsOpen, setOccasionsOpen] = useState(false)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [pins, setPins] = useState<Pins>({ wishlistIDs: [], userIDs: [], groupIDs: [] })
  const [socialFriends, setSocialFriends] = useState<Friendship[]>([])
  const [socialGroups, setSocialGroups] = useState<FriendGroup[]>([])
  const [personToOpen, setPersonToOpen] = useState<SocialUser | undefined>()
  const [mobileNav, setMobileNav] = useState(false)
  const tutorialKey = `hushful.tutorial.v3.seen.${user.id}`
  const [tutorialOpen, setTutorialOpen] = useState(() => localStorage.getItem(tutorialKey) !== '1')

  const loadWishlists = useCallback(async () => { try { setWishlists((await api.wishlists(token)).map((wishlist) => ({ ...wishlist, proAccess: user.isPro === true }))) } catch (e) { onError(e) } finally { setBusy(false) } }, [token, user.isPro, onError])
  useEffect(() => { void loadWishlists() }, [loadWishlists])
  const loadActivity = useCallback(async () => { try { setActivity(await api.activity(token)) } catch (e) { onError(e) } }, [token, onError])
  useEffect(() => { void loadActivity(); const timer = window.setInterval(() => void loadActivity(), 30000); return () => window.clearInterval(timer) }, [loadActivity])
  useEffect(() => { Promise.all([api.pins(token), api.friends(token), api.friendGroups(token)]).then(([p, f, g]) => { setPins(p); setSocialFriends(f); setSocialGroups(g) }).catch(onError) }, [token, onError])
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
        }).sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })))
      } catch (error) { onError(error) }
    }
    void syncAccountShares()
  }, [token, user.id, onError])
  useEffect(() => {
    const match = window.location.pathname.match(/^\/share\/([^/]+)/)
    if (match) setShareOpen(true)
  }, [])

  function select(next: View) { setView(next); setMobileNav(false) }
  async function toggleWishlistPin(id: string) { try { setPins(await (pins.wishlistIDs.includes(id) ? api.unpin(token, 'wishlist', id) : api.pin(token, 'wishlist', id))); notify(pins.wishlistIDs.includes(id) ? 'Removed from pinned lists' : 'Pinned to home') } catch (e) { onError(e) } }
  async function createWishlist(title: string, visibility: 'public' | 'private') {
    try { let created = await api.createWishlist(token, title, visibility); if (created.visibility !== visibility) { const settings = await api.updateWishlistSettings(token, created.id, { visibility }); created = { ...created, visibility: settings.visibility } }; created = { ...created, proAccess: user.isPro === true }; setWishlists((old) => [created, ...old]); setCreateOpen(false); select({ kind: 'wishlist', wishlist: created }); notify('Wishlist created') } catch (e) { onError(e) }
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
  async function removeShare(share: SharedWishlist) { if (!window.confirm(`Are you sure you want to remove “${share.title}” from your account? You may need the original link to add it again.`)) return; try { if (share.accountShareID) await api.removeAccountShare(token, share.accountShareID); if (share.shareToken) shareStorage.remove(user.id, share.shareToken); setShared((all) => all.filter((item) => item.accountShareID !== share.accountShareID || item.shareToken !== share.shareToken)); if (view.kind === 'shared' && (view.share.accountShareID === share.accountShareID || view.share.shareToken === share.shareToken)) select({ kind: 'home' }) } catch (error) { onError(error) } }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
      <div className="sidebar-top"><Logo compact /><button className="icon-button mobile-close" onClick={() => setMobileNav(false)}><X /></button></div>
      <nav>
        <button className={`nav-home ${view.kind === 'home' ? 'active' : ''}`} onClick={() => select({ kind: 'home' })}><Sparkles /> Overview</button>
        <button className="nav-home" onClick={() => { setFriendsOpen(true); setMobileNav(false) }}><Users /> Friends</button>
        <button className="nav-home" onClick={() => { setPeopleSearchOpen(true); setMobileNav(false) }}><User /> Find people</button>
        <button className="nav-home" onClick={() => { setActivityOpen(true); setMobileNav(false) }}><Bell /> Activity {activity.some((item) => !item.readAt) && <span className="notification-badge">{activity.filter((item) => !item.readAt).length}</span>}</button>
        {user.isPro === true && <button className="nav-home" onClick={() => { setOccasionsOpen(true); setMobileNav(false) }}><CalendarDays /> Occasions</button>}
        <NavGroup title="My wishlists" action={<button aria-label="New wishlist" onClick={() => setCreateOpen(true)}><Plus /></button>}>
          {wishlists.filter((wishlist) => wishlist.isCollaborative !== true).map((wishlist) => <button key={wishlist.id} className={view.kind === 'wishlist' && view.wishlist.id === wishlist.id ? 'active' : ''} onClick={() => select({ kind: 'wishlist', wishlist })}><span className="nav-dot" />{wishlist.title}</button>)}
        </NavGroup>
        {wishlists.some((wishlist) => wishlist.isCollaborative === true) && <NavGroup title="My collaborations" action={<Users />}>
          {wishlists.filter((wishlist) => wishlist.isCollaborative === true).map((wishlist) => <button key={wishlist.id} className={view.kind === 'wishlist' && view.wishlist.id === wishlist.id ? 'active' : ''} onClick={() => select({ kind: 'wishlist', wishlist })}><span className="nav-dot shared-dot" />{wishlist.title}</button>)}
        </NavGroup>}
        <NavGroup title="Pinned lists" action={<Pin />}>
          {wishlists.filter((wishlist) => pins.wishlistIDs.includes(wishlist.id)).map((wishlist) => <button key={wishlist.id} onClick={() => select({ kind: 'wishlist', wishlist })}><span className="nav-dot" />{wishlist.title}</button>)}
          {shared.filter((share) => share.wishlistID && pins.wishlistIDs.includes(share.wishlistID)).map((share) => <button key={share.accountShareID || share.shareToken} onClick={() => select({ kind: 'shared', share })}><span className="nav-dot shared-dot" />{share.title}</button>)}
        </NavGroup>
        <NavGroup title="Pinned people & groups" action={<Users />}>
          {socialFriends.filter((friend) => pins.userIDs.includes(friend.user.id)).map((friend) => <button key={friend.id} onClick={() => { setPersonToOpen(friend.user); setPeopleSearchOpen(true) }}><span className="nav-dot shared-dot" />{friend.user.displayName || `@${friend.user.username}`}</button>)}
          {socialGroups.filter((group) => pins.groupIDs.includes(group.id)).map((group) => <button key={group.id} onClick={() => setFriendsOpen(true)}><span className="nav-dot shared-dot" />{group.name}</button>)}
        </NavGroup>
        <button className="nav-home" onClick={() => setSharedLibraryOpen(true)}><Link2 /> All shared lists</button>
      </nav>
      <button className="tutorial-button" onClick={() => setTutorialOpen(true)}><CircleHelp /> How Hushful works</button>
      <button className="profile-chip" onClick={() => setAccountOpen(true)}><Avatar name={user.displayName || user.email} userId={user.id} hasAvatar={user.hasAvatar} /><span><strong>{user.displayName || 'Your account'}</strong><small>{user.email}</small></span><Settings /></button>
    </aside>
    {mobileNav && <button className="scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    <main className="main-panel">
      <header className="mobile-header"><button className="icon-button" onClick={() => setMobileNav(true)}><Menu /></button><Logo compact /><span /></header>
      {busy ? <FullPageLoader embedded /> : view.kind === 'home' ? <Home user={user} wishlists={wishlists} shared={shared.filter((share) => Boolean(share.wishlistID && pins.wishlistIDs.includes(share.wishlistID)))} openWishlist={(w) => select({ kind: 'wishlist', wishlist: w })} openShared={(s) => select({ kind: 'shared', share: s })} newWishlist={() => setCreateOpen(true)} openShare={() => setShareOpen(true)} /> : view.kind === 'wishlist' ? <WishlistDetail token={token} wishlist={view.wishlist} allWishlists={wishlists} pinned={pins.wishlistIDs.includes(view.wishlist.id)} togglePin={() => void toggleWishlistPin(view.wishlist.id)} onRenamed={(updated) => { setWishlists((all) => all.map((item) => item.id === updated.id ? updated : item)); setView({ kind: 'wishlist', wishlist: updated }) }} onError={onError} notify={notify} /> : <SharedDetail token={token} accountId={user.id} defaultNoteName={user.displayName || user.email.split('@')[0]} share={view.share} pinned={Boolean(view.share.wishlistID && pins.wishlistIDs.includes(view.share.wishlistID))} togglePin={() => view.share.wishlistID && void toggleWishlistPin(view.share.wishlistID)} onError={onError} onRemove={() => void removeShare(view.share)} onAdd={() => addShareToAccount(view.share)} />}
    </main>
    {createOpen && <CreateWishlistModal close={() => setCreateOpen(false)} create={createWishlist} />}
    {shareOpen && <OpenShareModal accessToken={token} accountId={user.id} initialToken={window.location.pathname.match(/^\/share\/([^/]+)/)?.[1]} close={() => setShareOpen(false)} save={saveShare} onError={onError} />}
    {sharedLibraryOpen && <Modal close={() => setSharedLibraryOpen(false)} size="modal-wide"><ModalHeader eyebrow="Your complete library" title="All shared lists" close={() => setSharedLibraryOpen(false)} /><div className="social-stack">{shared.length ? [...shared].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })).map((share) => <button className="profile-list-row" key={share.accountShareID || share.shareToken} onClick={() => { setSharedLibraryOpen(false); select({ kind: 'shared', share }) }}><Gift /><span><strong>{share.title}</strong><small>Shared by {share.sharedByName || 'Someone'}</small></span><ChevronRight /></button>) : <p className="hint">No lists have been shared with you yet.</p>}<div className="modal-actions"><button className="secondary" onClick={() => { setSharedLibraryOpen(false); setShareOpen(true) }}><Link2 /> Open a link</button></div></div></Modal>}
    {friendsOpen && <FriendsModal token={token} close={() => setFriendsOpen(false)} onError={onError} notify={notify} openShare={(saved) => { const share = { shareToken: '', title: saved.title, sharedByName: saved.sharedByName, accountShareID: saved.id, wishlistID: saved.wishlistID }; setShared((all) => all.some((item) => item.accountShareID === saved.id) ? all : [...all, share]); setFriendsOpen(false); select({ kind: 'shared', share }) }} />}
    {peopleSearchOpen && <UserSearchModal token={token} initialPerson={personToOpen} close={() => { setPeopleSearchOpen(false); setPersonToOpen(undefined) }} onError={onError} notify={notify} openShare={(saved) => { const share = { shareToken: '', title: saved.title, sharedByName: saved.sharedByName, accountShareID: saved.id, wishlistID: saved.wishlistID }; setShared((all) => all.some((item) => item.accountShareID === saved.id) ? all : [...all, share]); setPeopleSearchOpen(false); setPersonToOpen(undefined); select({ kind: 'shared', share }) }} />}
    {activityOpen && <ActivityModal token={token} items={activity} changed={setActivity} close={() => setActivityOpen(false)} onError={onError} />}
    {user.isPro === true && occasionsOpen && <OccasionsModal token={token} close={() => setOccasionsOpen(false)} onError={onError} notify={notify} createWishlist={createWishlist} />}
    {accountOpen && <AccountModal token={token} user={user} userChanged={setUser} close={() => setAccountOpen(false)} save={async (profile) => { try { setUser(await api.updateProfile(token, profile)); setAccountOpen(false); notify('Profile updated') } catch (e) { onError(e) } }} onError={onError} notify={notify} logout={logout} />}
    {tutorialOpen && <TutorialModal close={() => { localStorage.setItem(tutorialKey, '1'); setTutorialOpen(false) }} />}
  </div>
}

function Home({ user, wishlists, shared, openWishlist, openShared, newWishlist, openShare }: { user: CurrentUser; wishlists: Wishlist[]; shared: SharedWishlist[]; openWishlist: (w: Wishlist) => void; openShared: (s: SharedWishlist) => void; newWishlist: () => void; openShare: () => void }) {
  const owned = wishlists.filter((wishlist) => wishlist.isCollaborative !== true && !wishlist.isArchived)
  const collaborations = wishlists.filter((wishlist) => wishlist.isCollaborative === true && !wishlist.isArchived)
  const archived = wishlists.filter((wishlist) => wishlist.isArchived)
  return <div className="page home-page">
    <header className="page-heading"><div><p className="eyebrow">Your quiet corner</p><h1>Good {greeting()}, {firstName(user.displayName)}.</h1><p>Gather every wish. Keep every gift a surprise.</p></div><button className="primary" onClick={newWishlist}><Plus /> New wishlist</button></header>
    {wishlists.length === 0 && shared.length === 0 ? <EmptyState icon={<Gift />} title="A little space for things you love" text="Create your first wishlist, then share it privately with friends and family." action={<button className="primary" onClick={newWishlist}><Plus /> Create a wishlist</button>} /> : <>
      <section><SectionTitle title="My wishlists" subtitle={`${owned.length} ${owned.length === 1 ? 'collection' : 'collections'}`} action={<button className="text-button" onClick={newWishlist}>Add new <Plus /></button>} />
        <div className="card-grid">{owned.map((wishlist, index) => <button className="wishlist-card" key={wishlist.id} onClick={() => openWishlist({ ...wishlist, proAccess: user.isPro === true })}><div className={`card-art art-${index % 4}`}><Gift /></div><div><span className="card-kicker">Wishlist</span><h3>{wishlist.title}</h3><p>Open collection</p></div><ChevronRight /></button>)}</div>
      </section>
      {collaborations.length > 0 && <section><SectionTitle title="My collaborations" subtitle={`${collaborations.length} co-owned ${collaborations.length === 1 ? 'list' : 'lists'}`} action={<Users />} /><div className="card-grid">{collaborations.map((wishlist, index) => <button className="wishlist-card" key={wishlist.id} onClick={() => openWishlist({ ...wishlist, proAccess: user.isPro === true })}><div className={`card-art art-${(index + 1) % 4}`}><Users /></div><div><span className="card-kicker">Collaborative list</span><h3>{wishlist.title}</h3><p>Open collaboration</p></div><ChevronRight /></button>)}</div></section>}
      {user.isPro === true && archived.length > 0 && <section><SectionTitle title="Archived" subtitle={`${archived.length} saved ${archived.length === 1 ? 'list' : 'lists'}`} action={<Gift />} /><div className="card-grid">{archived.map((wishlist, index) => <button className="wishlist-card" key={wishlist.id} onClick={() => openWishlist({ ...wishlist, proAccess: true })}><div className={`card-art art-${(index + 2) % 4}`}><Gift /></div><div><span className="card-kicker">Archived wishlist</span><h3>{wishlist.title}</h3><p>View or restore</p></div><ChevronRight /></button>)}</div></section>}
      <section><SectionTitle title="Shared with me" subtitle="Gift ideas from your favorite people" action={<button className="text-button" onClick={openShare}>Open a link <Link2 /></button>} />
        {shared.length ? <div className="shared-row">{[...shared].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })).map((share) => <button className="shared-card" key={share.accountShareID || share.shareToken} onClick={() => openShared(share)}><Avatar name={share.sharedByName || 'Someone'} /><span><strong>{share.title}</strong><small>From {share.sharedByName || 'Someone'}</small></span><ChevronRight /></button>)}</div> : <button className="share-placeholder" onClick={openShare}><Link2 /><span><strong>Have a Hushful link?</strong><small>Paste it here to keep the list close.</small></span></button>}
      </section>
    </>}
  </div>
}

function WishlistDetail({ token, wishlist, allWishlists, pinned, togglePin, onRenamed, onError, notify }: { token: string; wishlist: Wishlist; allWishlists: Wishlist[]; pinned: boolean; togglePin: () => void; onRenamed: (wishlist: Wishlist) => void; onError: (e: unknown) => void; notify: (s: string) => void }) {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null)
  const [sharing, setSharing] = useState(false)
  const [collaborating, setCollaborating] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'manual' | 'name' | 'price-low' | 'price-high' | 'newest'>('manual')
  const [pricedOnly, setPricedOnly] = useState(false)
  const load = useCallback(async () => { setLoading(true); try { setItems(await api.items(token, wishlist.id)) } catch (e) { onError(e) } finally { setLoading(false) } }, [token, wishlist.id, onError])
  useEffect(() => { void load() }, [load])
  async function remove(item: WishlistItem) { if (!window.confirm(`Remove “${item.title}” from this wishlist? If it is linked to other wishlists, it will remain there.`)) return; const old = items; setItems((all) => all.filter((i) => i.id !== item.id)); try { await api.deleteItem(token, wishlist.id, item.id); notify('Item removed') } catch (e) { setItems(old); onError(e) } }
  const visibleItems = items.filter((item) => (!pricedOnly || item.price != null) && (!query.trim() || item.title.toLowerCase().includes(query.toLowerCase()) || item.ownerNote?.toLowerCase().includes(query.toLowerCase()))).sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title) : sort === 'price-low' ? (a.price ?? Infinity) - (b.price ?? Infinity) : sort === 'price-high' ? (b.price ?? -Infinity) - (a.price ?? -Infinity) : sort === 'newest' ? Date.parse(b.createdAt) - Date.parse(a.createdAt) : 0)
  return <div className="page detail-page">
    <header className="page-heading"><div><p className="eyebrow">{wishlist.isPrimaryOwner === false ? 'Collaborative wishlist' : 'My wishlist'}</p><h1>{wishlist.title}</h1><p>{wishlist.description || `${items.length} ${items.length === 1 ? 'wish' : 'wishes'} tucked away`} · {wishlist.visibility === 'public' ? 'Public' : 'Private'}</p></div><div className="heading-actions"><button className="secondary" onClick={() => setRenaming(true)}><Pencil /> Rename</button><button className="secondary" onClick={() => setEditingDescription(true)}><Pencil /> Description</button><button className="secondary" onClick={() => setCollaborating(true)}><Users /> Owners & purpose</button><button className="secondary" onClick={togglePin}><Pin /> {pinned ? 'Unpin' : 'Pin'}</button>{wishlist.isPrimaryOwner !== false && <button className="secondary" onClick={() => setSharing(true)}><Share2 /> Sharing & privacy</button>}<button className="primary" onClick={() => setAddOpen(true)}><Plus /> Add item</button></div></header>
    <div className="heading-actions"><input aria-label="Search this list" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this list" /><select aria-label="Sort items" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}><option value="manual">Manual order</option><option value="name">Name</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="newest">Newest</option></select><label className="checkbox"><input type="checkbox" checked={pricedOnly} onChange={(e) => setPricedOnly(e.target.checked)} /><span>Priced items only</span></label></div>
    {loading ? <FullPageLoader embedded /> : visibleItems.length ? <div className="items-grid">{visibleItems.map((item) => <OwnerItemCard key={item.id} item={item} edit={() => setEditingItem(item)} remove={() => remove(item)} />)}</div> : <EmptyState icon={<Gift />} title={items.length ? "No wishes match those filters" : "This list is ready for a first wish"} text={items.length ? "Try a different search or clear the price filter." : "Add an item, a thoughtful note, and an optional link or price."} action={!items.length ? <button className="primary" onClick={() => setAddOpen(true)}><Plus /> Add your first item</button> : undefined} />}
    {addOpen && <AddItemModal token={token} wishlist={wishlist} allWishlists={allWishlists} close={() => setAddOpen(false)} save={async (item, image) => { const created = await api.createItem(token, wishlist.id, item); if (image.file) await api.uploadItemImage(token, wishlist.id, created.id, image.file); setItems((all) => [created, ...all]); setAddOpen(false); notify('Wish added') }} />}
    {editingItem && <AddItemModal token={token} wishlist={wishlist} allWishlists={allWishlists} initial={editingItem} close={() => setEditingItem(null)} save={async (changes, image) => { const updated = await api.updateItem(token, wishlist.id, editingItem.id, changes); if (image.file) await api.uploadItemImage(token, wishlist.id, editingItem.id, image.file); else if (image.remove) await api.removeItemImage(token, wishlist.id, editingItem.id); setItems((all) => all.map((item) => item.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : item)); setEditingItem(null); notify('Wish updated') }} />}
    {sharing && <SocialShareModal token={token} wishlist={wishlist} close={() => setSharing(false)} notify={notify} onError={onError} />}
    {collaborating && <WishlistCollaborationModal token={token} wishlist={wishlist} close={() => setCollaborating(false)} notify={notify} onError={onError} />}
    {renaming && <RenameWishlistModal initial={wishlist.title} close={() => setRenaming(false)} save={async (title) => { try { const updated = await api.renameWishlist(token, wishlist.id, title); onRenamed(updated); setRenaming(false); notify('Wishlist renamed') } catch (e) { onError(e) } }} />}
    {editingDescription && <DescriptionModal initial={wishlist.description || ''} close={() => setEditingDescription(false)} save={async (description) => { try { await api.updateWishlistSettings(token, wishlist.id, { description }); onRenamed({ ...wishlist, description }); setEditingDescription(false); notify('Description saved') } catch (e) { onError(e) } }} />}
  </div>
}

function SharedDetail({ token, accountId, defaultNoteName, share, pinned, togglePin, onError, onRemove, onAdd }: { token: string; accountId: string; defaultNoteName: string; share: SharedWishlist; pinned: boolean; togglePin: () => void; onError: (e: unknown) => void; onRemove: () => void; onAdd: () => Promise<void> }) {
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
    <header className="page-heading"><div><p className="eyebrow">Shared by {share.sharedByName || 'Someone'}</p><h1>{share.title}</h1><p>Claims stay hidden from the person who made this list.</p></div><div className="heading-actions"><button className="secondary" disabled={!share.wishlistID} onClick={togglePin}><Pin /> {pinned ? 'Unpin' : 'Pin'}</button><button className="secondary" onClick={() => void load()}><RefreshCw /> Refresh</button><button className="icon-button danger" aria-label="Remove saved list" onClick={onRemove}><Trash2 /></button></div></header>
    <section className="save-shared-panel">
      <div><strong>{share.accountShareID ? 'Saved to your account' : 'Keep this list close'}</strong><span>{share.accountShareID ? 'You can save it again to verify the account connection.' : 'Add it to Shared With Me so it follows you across devices and sign-ins.'}</span></div>
      <div className="save-shared-actions">
        {share.shareToken ? <button className="primary" disabled={saving} onClick={async () => { setSaving(true); try { await onAdd() } catch (e) { onError(e) } finally { setSaving(false) } }}>{saving ? <LoaderCircle className="spin" /> : <Plus />}{saving ? 'Saving…' : 'Add to Shared With Me'}</button> : <span className="saved-account-label"><Check /> Saved to Shared With Me</span>}
        {share.accountShareID && share.shareToken && <button className="secondary danger-text" onClick={onRemove}><Trash2 /> Remove from account</button>}
      </div>
    </section>
    {loading ? <FullPageLoader embedded /> : rows.length ? <div className="items-grid">{rows.map((row) => <SharedItemCard key={row.item.id} row={row} chooseQuantity={(quantity) => quantity === 0 ? void update(row.item.id, { purchasedQuantity: 0 }) : setIdentity({ itemId: row.item.id, purchasedQuantity: quantity })} editNote={(note) => setNoteItem({ itemId: row.item.id, note: note?.note, displayName: note?.authorDisplayName, shareName: Boolean(note?.authorDisplayName) })} removeNote={async () => { await update(row.item.id, { note: '', shareName: false }); await load() }} />)}</div> : <EmptyState icon={<Gift />} title="There’s nothing here yet" text="Check back after the list owner adds a wish." />}
    <DiscussionPanel token={token} shareToken={share.shareToken} viewerToken={viewerToken || undefined} accountShareID={share.accountShareID} defaultName={defaultNoteName} onError={onError} />
    {identity && <IdentityModal close={() => setIdentity(null)} continueWith={(displayName, shareName) => { void update(identity.itemId, { purchasedQuantity: identity.purchasedQuantity, note: identity.note, displayName, shareName }); setIdentity(null) }} />}
    {noteItem && <NoteModal initial={noteItem} defaultName={defaultNoteName} close={() => setNoteItem(null)} save={async (note, displayName, shareName) => { const itemId = noteItem.itemId; setNoteItem(null); await update(itemId, { note, displayName, shareName }); await load() }} />}
  </div>
}

function DiscussionPanel({ token, shareToken, viewerToken, accountShareID, defaultName, onError }: { token?: string; shareToken: string; viewerToken?: string; accountShareID?: string; defaultName: string; onError: (error: unknown) => void }) {
  const [comments, setComments] = useState<WishlistDiscussionComment[]>([])
  const [message, setMessage] = useState('')
  const [name, setName] = useState(() => defaultName || localStorage.getItem('hushful.displayName') || '')
  const [anonymous, setAnonymous] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    if (!accountShareID && (!shareToken || !viewerToken)) return
    setLoading(true)
    try {
      setComments(accountShareID && token
        ? await api.accountDiscussion(token, accountShareID)
        : await api.discussion(shareToken, viewerToken!))
    } catch (error) { onError(error) }
    finally { setLoading(false) }
  }, [token, shareToken, viewerToken, accountShareID, onError])

  useEffect(() => { void load() }, [load])

  async function post(event: FormEvent) {
    event.preventDefault()
    const trimmed = message.trim()
    if (!trimmed || (!anonymous && !name.trim())) return
    setSending(true)
    try {
      const body = { message: trimmed, displayName: anonymous ? undefined : name.trim(), shareName: !anonymous }
      const created = accountShareID && token
        ? await api.createAccountDiscussionComment(token, accountShareID, body)
        : await api.createDiscussionComment(shareToken, viewerToken!, body)
      if (!anonymous) localStorage.setItem('hushful.displayName', name.trim())
      setComments((all) => [...all, created])
      setMessage('')
    } catch (error) { onError(error) }
    finally { setSending(false) }
  }

  async function remove(comment: WishlistDiscussionComment) {
    if (!window.confirm('Delete this comment from the discussion?')) return
    try {
      if (accountShareID && token) await api.deleteAccountDiscussionComment(token, accountShareID, comment.id)
      else await api.deleteDiscussionComment(shareToken, viewerToken!, comment.id)
      setComments((all) => all.filter((item) => item.id !== comment.id))
    } catch (error) { onError(error) }
  }

  return <section className="discussion-panel">
    <div className="discussion-heading">
      <div className="discussion-title"><span><MessageCircle /></span><div><strong>Gift-planning discussion</strong><small>Private from every wishlist owner</small></div></div>
      <button className="text-button" onClick={() => void load()}><RefreshCw /> Refresh</button>
    </div>
    <div className="discussion-comments" aria-live="polite">
      {loading && !comments.length ? <div className="discussion-empty"><LoaderCircle className="spin" /> Loading discussion…</div> : comments.length ? comments.map((comment) => <article className="discussion-comment" key={comment.id}>
        <div><strong>{comment.authorDisplayName || 'Anonymous'}</strong><time>{comment.createdAt ? new Date(comment.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : ''}</time></div>
        <p>{comment.message}</p>
        {comment.isMine && <button className="text-button danger-text" onClick={() => void remove(comment)}><Trash2 /> Delete</button>}
      </article>) : <div className="discussion-empty">No comments yet. Start the conversation with the other gift planners.</div>}
    </div>
    <form className="discussion-composer" onSubmit={post}>
      <textarea value={message} maxLength={1000} onChange={(event) => setMessage(event.target.value)} placeholder="Write a comment…" rows={3} />
      <div className="discussion-identity">
        <label className="checkbox"><input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} /><span><strong>Post anonymously</strong></span></label>
        {!anonymous && <input aria-label="Your name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" maxLength={80} />}
        <button className="primary" disabled={sending || !message.trim() || (!anonymous && !name.trim())}>{sending ? <LoaderCircle className="spin" /> : <Send />}{sending ? 'Posting…' : 'Post comment'}</button>
      </div>
    </form>
  </section>
}

function OwnerItemCard({ item, edit, remove }: { item: WishlistItem; edit: () => void; remove: () => void }) {
  const cash = item.itemType === 'cash_fund'
  return <article className={`item-card ${cash ? 'cash-fund-card' : ''}`}>{cash ? <div className="item-icon item-artwork"><Banknote /></div> : <ItemArtwork item={item} />}<div className="item-copy"><div className="item-title-row"><h3>{item.title}</h3>{cash ? item.contributionGoal != null && <strong>Goal: {currency(item.contributionGoal)}</strong> : item.price != null && <strong>{currency(item.price)}</strong>}</div>{!cash && <small>Quantity: {item.quantity || 1}</small>}{item.ownerNote && <p>{item.ownerNote}</p>}{item.url && <a href={safeUrl(item.url)} target="_blank" rel="noreferrer">{cash ? 'Open contribution link' : 'View item'} <ExternalLink /></a>}{cash && <small>Hushful does not process or hold funds.</small>}</div><div className="item-card-actions"><button className="edit-button" aria-label={`Edit ${item.title}`} onClick={edit}><Pencil /></button><button className="delete-button" aria-label={`Delete ${item.title}`} onClick={remove}><Trash2 /></button></div></article>
}

function SharedItemCard({ row, chooseQuantity, editNote, removeNote }: { row: SharedItemRow; chooseQuantity: (quantity: number) => void; editNote: (note?: SharedItemRow['notes'][number]) => void; removeNote: () => void }) {
  const requested = row.item.quantity || 1
  const claimed = row.purchasedQuantity ?? (row.purchased ? 1 : 0)
  const mine = row.purchasedQuantityByMe ?? (row.purchasedByMe ? 1 : 0)
  const maximumForMe = Math.max(0, requested - claimed + mine)
  const myNote = row.notes.find((note) => note.isMine)
  if (row.item.itemType === 'cash_fund') return <article className="item-card shared-item cash-fund-card"><div className="item-icon item-artwork"><Banknote /></div><div className="item-copy"><div className="item-title-row"><h3>{row.item.title}</h3>{row.item.contributionGoal != null && <strong>Goal: {currency(row.item.contributionGoal)}</strong>}</div>{row.item.ownerNote && <p>{row.item.ownerNote}</p>}{row.item.url && <a className="primary contribution-link" href={safeUrl(row.item.url)} target="_blank" rel="noreferrer">Contribute <ExternalLink /></a>}<small>Payment is completed through the recipient’s selected service. Hushful does not process or hold funds.</small></div></article>
  return <article className={`item-card shared-item ${claimed >= requested ? 'purchased' : ''}`}><ItemArtwork item={row.item} claimed={claimed >= requested} /><div className="item-copy"><div className="item-title-row"><h3>{row.item.title}</h3>{row.item.price != null && <strong>{currency(row.item.price)}</strong>}</div><small>{claimed} of {requested} claimed</small>{row.item.ownerNote && <p>{row.item.ownerNote}</p>}{row.item.url && <a href={safeUrl(row.item.url)} target="_blank" rel="noreferrer">View item <ExternalLink /></a>}<div className="item-actions"><label className="quantity-choice"><span>You’re buying</span><select value={mine} onChange={(event) => chooseQuantity(Number(event.target.value))}>{Array.from({ length: maximumForMe + 1 }, (_, quantity) => <option key={quantity} value={quantity}>{quantity}</option>)}</select></label><button className="text-button" onClick={() => editNote(myNote)}>{myNote ? 'Edit your note' : 'Add a note'}</button></div>{row.notes.length > 0 && <div className="notes"><span>Notes</span>{row.notes.map((note, i) => <div className="note-row" key={`${note.updatedAt}-${i}`}><p><strong>{note.authorDisplayName || 'Anonymous'} · </strong>{note.note}</p>{note.isMine && <div><button className="text-button" onClick={() => editNote(note)}>Edit</button><button className="text-button danger-text" onClick={() => { if (window.confirm('Remove your note?')) removeNote() }}>Remove</button></div>}</div>)}</div>}</div></article>
}

function ItemArtwork({ item, claimed = false }: { item: WishlistItem; claimed?: boolean }) {
  const [failed, setFailed] = useState(false)
  return <div className="item-icon item-artwork">{claimed ? <PackageCheck /> : <Gift />}{!failed && <img src={api.itemImageURL(item.id, item.updatedAt)} alt="" onError={() => setFailed(true)} />}{claimed && !failed && <span className="item-claimed-badge"><Check /></span>}</div>
}

function Modal({ children, close, size = '' }: { children: ReactNode; close: () => void; size?: string }) { return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}><section className={`modal ${size}`} role="dialog" aria-modal="true">{children}</section></div> }
function ModalHeader({ eyebrow, title, close }: { eyebrow?: string; title: string; close: () => void }) { return <header className="modal-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div><button className="icon-button" onClick={close}><X /></button></header> }
function TutorialModal({ close }: { close: () => void }) {
  const [page, setPage] = useState(0)
  const steps = [
    { title: 'Meet Penny—and your Hushful spaces', text: 'Overview holds your lists and collaborations. Shared is your complete library from friends. Find people, Friends & groups, Activity, and Account each have a focused home in the sidebar.' },
    { title: 'Build Penny’s perfect list', text: 'Create a Public or Private wishlist, then add wishes with a link, price, quantity, note, and image. Edit or reorder anything later, and link one item to multiple lists.' },
    { title: 'Save from almost any shopping app', text: 'On iPhone, open an Amazon, Safari, or store item and tap Share. Choose Hushful—use More if needed—pick Penny’s list, review the title and image, choose additional lists, and tap Add.' },
    { title: 'Share only the way Penny wants', text: 'Public lists appear on Penny’s profile. Private lists stay hidden unless she selects friends or groups. A guest link lets anyone with the URL coordinate without creating an account.' },
    { title: 'Find Penny and make a group', text: 'Find people searches names and usernames as you type. Open Penny’s profile and send a request; she approves it in Activity. Friends & groups lets you create Family and choose accepted friends as members.' },
    { title: 'Plan together without spoilers', text: 'Add co-owners in Owners & purpose. Our Wishlist hides claims from every owner because they are recipients. Gift Planning lets organizers see claims and coordinate purchases together.' },
    { title: 'Keep Penny’s lists close', text: 'Shared contains friends’ public lists and lists shared privately with you. Filter by Penny’s name, username, or list title, and pin favorites without changing their privacy.' },
    { title: 'Coordinate the surprise', text: 'Claim the quantity you’re buying and leave recipient notes. Penny cannot see claims or those notes. Shared-list settings control update notifications and whether a guest-link list stays saved.' },
    { title: 'Private, informed, and in control', text: 'Activity holds friend requests and list updates. Account controls your picture and shows your permanent username, discoverability, and request policy. Hushful confirms destructive actions before anything is removed.' },
  ]
  const step = steps[page]
  return <Modal close={close} size="modal-wide"><div className="tutorial"><Logo compact /><TutorialPreview page={page} /><p className="eyebrow">Step {page + 1} of {steps.length}</p><h2>{step.title}</h2><p>{step.text}</p><div className="tutorial-dots">{steps.map((_, index) => <span key={index} className={index === page ? 'active' : ''} />)}</div><div className="modal-actions spread"><button className="text-button" onClick={close}>{page === steps.length - 1 ? 'Close' : 'Skip'}</button><button className="primary" onClick={() => page === steps.length - 1 ? close() : setPage(page + 1)}>{page === steps.length - 1 ? 'Start using Hushful' : 'Next'} <ChevronRight /></button></div></div></Modal>
}

function TutorialPreview({ page }: { page: number }) {
  const titles = ['Hushful', 'Penny’s Wishes', 'Share to Hushful', 'Sharing & privacy', 'Find Penny', 'Owners & purpose', 'Shared', 'Penny’s Wishes', 'Activity']
  const controls = page === 0 ? <><TutorialCallout icon={<Users />} label="People" /><TutorialCallout icon={<Bell />} label="Activity" /></> : page === 1 ? <><TutorialCallout icon={<Gift />} label="Image" /><TutorialCallout icon={<Plus />} label="Add item" /></> : page === 2 ? <><TutorialCallout icon={<Share2 />} label="iPhone Share" /><TutorialCallout icon={<Sparkles />} label="Hushful" /></> : page === 3 ? <><TutorialCallout icon={<User />} label="Private" /><TutorialCallout icon={<Link2 />} label="Guest link" /></> : page === 4 ? <TutorialCallout icon={<User />} label="Search" /> : page === 5 ? <TutorialCallout icon={<Users />} label="Co-owners" /> : page === 6 ? <TutorialCallout icon={<Pin />} label="Pin" /> : page === 7 ? <><TutorialCallout icon={<Check />} label="Claim" /><TutorialCallout icon={<Settings />} label="Settings" /></> : <TutorialCallout icon={<Settings />} label="Privacy" />
  const content = page === 0 ? <><TutorialMiniRow title="Penny’s Birthday" detail="Your wishlist" /><TutorialMiniRow title="Penny’s Cozy Home" detail="A collaboration" /></> : page === 1 ? <><TutorialMiniRow title="Cozy blanket" detail="Image · $48 · Quantity 1" /><TutorialMiniRow title="Also on Christmas" detail="One item linked across lists" /></> : page === 2 ? <><TutorialMiniRow title="Amazon" detail="Share → More → Hushful" /><TutorialMiniRow title="Penny’s Wishes" detail="Title and product image found" /></> : page === 3 ? <><TutorialMiniRow title="Penny’s Birthday" detail="Private · Shared with Family" /><small>Friends, groups, public access, or a guest link—you choose.</small></> : page === 4 ? <><TutorialMiniRow title="Penny Lou" detail="@penny · View profile" /><div className="tutorial-detail-actions"><button>Send friend request</button></div></> : page === 5 ? <><TutorialMiniRow title="Our Wishlist" detail="Owners never see recipient claims" /><TutorialMiniRow title="Gift Planning" detail="Owners coordinate purchases" /></> : page === 6 ? <><TutorialMiniRow title="Penny’s Birthday" detail="Pinned list" /><TutorialMiniRow title="Family" detail="Pinned group" /></> : page === 7 ? <><TutorialMiniRow title="Cozy blanket" detail="Claimed 1 of 1 · hidden from Penny" /><TutorialMiniRow title="Recipient note" detail="Only fellow gifters can see it" /></> : <><TutorialMiniRow title="Friend request from Penny" detail="Accept or decline" /><small>Control discoverability and requests in Account & privacy.</small></>
  return <div className="tutorial-preview"><div className="tutorial-preview-nav"><strong>{titles[page]}</strong><div>{controls}</div></div><div className="tutorial-preview-body">{content}</div></div>
}
function TutorialCallout({ icon, label }: { icon: ReactNode; label: string }) { return <span className="tutorial-callout"><i>{icon}</i><small>{label}</small></span> }
function TutorialMiniRow({ title, detail }: { title: string; detail: string }) { return <div className="tutorial-mini-row"><i><Gift /></i><span><strong>{title}</strong><small>{detail}</small></span><ChevronRight /></div> }
function CreateWishlistModal({ close, create }: { close: () => void; create: (title: string, visibility: 'public' | 'private') => void }) { const [title, setTitle] = useState(''), [visibility, setVisibility] = useState<'public' | 'private'>('public'); return <Modal close={close}><ModalHeader eyebrow="A new collection" title="Create a wishlist" close={close} /><form className="stack-form" onSubmit={(e) => { e.preventDefault(); create(title.trim(), visibility) }}><Field label="Wishlist name"><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Birthday ideas, Cozy home…" /></Field><Field label="Visibility"><select value={visibility} onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}><option value="public">Public — anyone can view</option><option value="private">Private — only people you choose</option></select></Field><p className="hint">You can change this later from the list’s sharing settings.</p><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={!title.trim()}>Create wishlist</button></div></form></Modal> }

function OccasionsModal({ token, close, onError, notify, createWishlist }: { token: string; close: () => void; onError: (e: unknown) => void; notify: (s: string) => void; createWishlist: (title: string, visibility: 'public' | 'private') => Promise<void> }) {
  const blank = (): RecurringOccasion => ({ name: '', eventMonth: new Date().getMonth() + 1, eventDay: new Date().getDate(), reminderMonth: new Date().getMonth() + 1, reminderDay: new Date().getDate(), icon: 'gift', colorHex: '786A82' })
  const [values, setValues] = useState<RecurringOccasion[]>([]), [editing, setEditing] = useState<RecurringOccasion>(blank()), [busy, setBusy] = useState(true)
  const dateValue = (month: number, day: number) => `2028-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const changeDate = (key: 'event' | 'reminder', raw: string) => { const [, month, day] = raw.split('-').map(Number); setEditing((old) => key === 'event' ? { ...old, eventMonth: month, eventDay: day } : { ...old, reminderMonth: month, reminderDay: day }) }
  useEffect(() => { api.occasions(token).then(setValues).catch(onError).finally(() => setBusy(false)) }, [token, onError])
  async function save(event: FormEvent) { event.preventDefault(); try { const saved = editing.id ? await api.updateOccasion(token, editing) : await api.createOccasion(token, editing); setValues((all) => [...all.filter((item) => item.id !== saved.id), saved]); setEditing(blank()); notify('Occasion saved') } catch (error) { onError(error) } }
  async function remove(value: RecurringOccasion) { if (!value.id || !window.confirm(`Delete “${value.name}”?`)) return; try { await api.deleteOccasion(token, value.id); setValues((all) => all.filter((item) => item.id !== value.id)); if (editing.id === value.id) setEditing(blank()); notify('Occasion deleted') } catch (error) { onError(error) } }
  async function startList(value: RecurringOccasion) { const title = value.name.toLowerCase().includes('wishlist') ? value.name : `${value.name} Wishlist`; await createWishlist(title, 'public'); const year = new Date().getFullYear(); if (value.id) { const updated = await api.updateOccasion(token, { ...value, lastCreatedYear: year }); setValues((all) => all.map((item) => item.id === updated.id ? updated : item)) }; setOccasionSafeClose() }
  function setOccasionSafeClose() { close() }
  return <Modal close={close} size="modal-wide"><ModalHeader eyebrow="Plan every year" title="Recurring occasions" close={close} />{busy ? <FullPageLoader embedded /> : <><div className="social-stack">{values.length === 0 ? <p className="hint">No recurring occasions yet. Add a birthday, holiday, anniversary, or special date.</p> : values.map((value) => <div className="profile-list-row" key={value.id}><CalendarDays /><span><strong>{value.name}</strong><small>Every {new Date(2028, value.eventMonth - 1, value.eventDay).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} · reminder {new Date(2028, value.reminderMonth - 1, value.reminderDay).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</small></span><button className="icon-button" aria-label={`Create list for ${value.name}`} onClick={() => void startList(value)}><Plus /></button><button className="icon-button" aria-label={`Edit ${value.name}`} onClick={() => setEditing(value)}><Pencil /></button><button className="icon-button danger" aria-label={`Delete ${value.name}`} onClick={() => void remove(value)}><Trash2 /></button></div>)}</div><form className="stack-form" onSubmit={save}><Field label="Name"><input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} placeholder="Birthday, anniversary…" /></Field><div className="field-row"><Field label="Repeats every"><input type="date" value={dateValue(editing.eventMonth, editing.eventDay)} onChange={(event) => changeDate('event', event.target.value)} /></Field><Field label="Reminder date"><input type="date" value={dateValue(editing.reminderMonth, editing.reminderDay)} onChange={(event) => changeDate('reminder', event.target.value)} /></Field></div><p className="hint">Mobile devices schedule their own 9:00 AM notifications from these synced dates.</p><div className="modal-actions"><button type="button" className="secondary" onClick={() => setEditing(blank())}>New</button><button className="primary" disabled={!editing.name.trim()}>{editing.id ? 'Save changes' : 'Add occasion'}</button></div></form></>}</Modal>
}
function RenameWishlistModal({ initial, close, save }: { initial: string; close: () => void; save: (title: string) => void }) { const [title, setTitle] = useState(initial); return <Modal close={close}><ModalHeader eyebrow="A thoughtful adjustment" title="Rename wishlist" close={close} /><form className="stack-form" onSubmit={(event) => { event.preventDefault(); save(title.trim()) }}><Field label="Wishlist name"><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} /></Field><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={!title.trim()}>Save name</button></div></form></Modal> }
function DescriptionModal({ initial, close, save }: { initial: string; close: () => void; save: (description: string) => void }) { const [description, setDescription] = useState(initial); return <Modal close={close}><ModalHeader eyebrow="A little context" title="List description" close={close} /><form className="stack-form" onSubmit={(event) => { event.preventDefault(); save(description.trim()) }}><Field label="Description"><textarea autoFocus value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What is this list for?" /></Field><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary">Save description</button></div></form></Modal> }
type ItemFormValue = { title: string; url?: string; price?: number; ownerNote?: string; quantity: number; linkedWishlistIDs: string[]; itemType?: 'wish' | 'cash_fund'; contributionGoal?: number }

function AddItemModal({ token, wishlist, allWishlists, initial, close, save }: { token: string; wishlist: Wishlist; allWishlists: Wishlist[]; initial?: WishlistItem; close: () => void; save: (item: ItemFormValue, image: { file?: File; remove: boolean }) => Promise<void> }) {
  const editing = Boolean(initial)
  const [title, setTitle] = useState(initial?.title || ''), [url, setUrl] = useState(initial?.url || ''), [price, setPrice] = useState(initial?.price?.toString() || ''), [note, setNote] = useState(initial?.ownerNote || ''), [quantity, setQuantity] = useState(initial?.quantity || 1)
  const [cashFund, setCashFund] = useState(initial?.itemType === 'cash_fund'), [goal, setGoal] = useState(initial?.contributionGoal?.toString() || '')
  const [linked, setLinked] = useState<Set<string>>(new Set([wishlist.id]))
  const [imageFile, setImageFile] = useState<File>(), [imagePreview, setImagePreview] = useState(initial ? api.itemImageURL(initial.id, initial.updatedAt) : ''), [removeImage, setRemoveImage] = useState(false)
  const [saving, setSaving] = useState(false), [error, setError] = useState('')
  useEffect(() => { if (initial) api.itemLinks(token, wishlist.id, initial.id).then((value) => setLinked(new Set(value.wishlistIDs))).catch(() => undefined) }, [token, wishlist.id, initial])
  function toggle(id: string) { setLinked((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); next.add(wishlist.id); return next }) }
  function chooseImage(file?: File) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Choose a JPEG, PNG, or WebP image no larger than 5 MB.'); return }
    setImageFile(file); setRemoveImage(false); setImagePreview(URL.createObjectURL(file)); setError('')
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('')
    if (cashFund && !/^https:\/\//i.test(url.trim())) { setError('Enter a valid payment link beginning with https://.'); setSaving(false); return }
    try { await save({ title: title.trim(), url: url.trim() || undefined, price: cashFund ? undefined : price ? Number(price.replace(',', '.')) : undefined, ownerNote: note.trim() || undefined, quantity: cashFund ? 1 : quantity, linkedWishlistIDs: [...linked], itemType: cashFund ? 'cash_fund' : 'wish', contributionGoal: cashFund && goal ? Number(goal.replace(',', '.')) : undefined }, { file: imageFile, remove: removeImage }) }
    catch (problem) { setError(problem instanceof Error ? problem.message : 'The wish could not be saved.'); setSaving(false) }
  }
  return <Modal close={close} size="modal-wide"><ModalHeader eyebrow={editing ? 'A thoughtful adjustment' : 'One more lovely thing'} title={editing ? 'Edit this wish' : 'Add a wish'} close={close} /><form className="stack-form" onSubmit={submit}>
    {!editing && wishlist.proAccess && <fieldset className="public-choice"><legend>What would you like to add?</legend><label className="checkbox"><input type="radio" checked={!cashFund} onChange={() => setCashFund(false)} /><span><strong>Wish</strong><small>A product or gift idea</small></span></label><label className="checkbox"><input type="radio" checked={cashFund} onChange={() => setCashFund(true)} /><span><strong>Cash Fund</strong><small>An external contribution link</small></span></label></fieldset>}
    <Field label="Image (optional)"><div className="item-image-editor"><div className="item-image-preview">{imagePreview && !removeImage ? <img src={imagePreview} alt="Item preview" onError={() => setImagePreview('')} /> : <Gift />}</div><div><label className="secondary image-upload">{imagePreview && !removeImage ? 'Change image' : 'Choose image'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { chooseImage(event.target.files?.[0]); event.target.value = '' }} /></label>{imagePreview && !removeImage && <button type="button" className="text-button danger-text" onClick={() => { setImageFile(undefined); setImagePreview(''); setRemoveImage(Boolean(initial)) }}>Remove image</button>}<small>JPEG, PNG, or WebP · 5 MB maximum</small></div></div></Field>
    <Field label="Item title"><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you wishing for?" /></Field>
    <div className="field-row"><Field label={cashFund ? 'Payment link' : 'Link (optional)'}><input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></Field><Field label={cashFund ? 'Goal (optional)' : 'Price (optional)'}><div className="money-input"><span>$</span><input inputMode="decimal" value={cashFund ? goal : price} onChange={(e) => cashFund ? setGoal(e.target.value) : setPrice(e.target.value)} placeholder="0.00" /></div></Field></div>
    {!cashFund && <Field label="Quantity"><input type="number" min="1" max="999" value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))} /></Field>}<Field label={cashFund ? 'What will this fund help with? (optional)' : 'A note (optional)'}><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={cashFund ? 'Diapers, childcare, a college fund…' : 'Size, color, or why you love it…'} /></Field>
    {cashFund && <p className="hint">Payments happen through the recipient’s selected service. Hushful does not process or hold funds.</p>}
    {allWishlists.length > 1 && <fieldset className="public-choice"><legend>Show on lists</legend>{allWishlists.map((list) => <label className="checkbox" key={list.id}><input type="checkbox" checked={linked.has(list.id)} disabled={list.id === wishlist.id} onChange={() => toggle(list.id)} /><span><strong>{list.title}</strong><small>{list.id === wishlist.id ? 'Current list' : 'Purchase status stays synchronized'}</small></span></label>)}</fieldset>}
    <p className="hint">Recipient notes remain private to the list where they were written.</p>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={!title.trim() || saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add to wishlist'}</button></div>
  </form></Modal>
}
/* Deep-link initialization intentionally runs once with the token from the first URL. */
/* eslint-disable react-hooks/exhaustive-deps */
function OpenShareModal({ accountId, initialToken, close, save, onError }: { accessToken: string; accountId: string; initialToken?: string; close: () => void; save: (s: SharedWishlist, vt: string) => void; onError: (e: unknown) => void }) { const [input, setInput] = useState(initialToken || ''); const [busy, setBusy] = useState(false); useEffect(() => { if (initialToken) void open() }, []); async function open(e?: FormEvent) { e?.preventDefault(); const shareToken = extractToken(input); if (!shareToken) return; setBusy(true); try { const existingViewerToken = shareStorage.viewerToken(accountId, shareToken) || undefined; const response = await api.openShare(shareToken, existingViewerToken); save({ shareToken, title: response.wishlist.title, sharedByName: response.wishlist.sharedByName, wishlistID: response.wishlist.id }, response.viewerToken) } catch (error) { onError(error) } finally { setBusy(false) } } return <Modal close={close}><ModalHeader eyebrow="Something thoughtful awaits" title="Open a shared wishlist" close={close} /><form className="stack-form" onSubmit={open}><Field label="Private link or token"><input autoFocus value={input} onChange={(e) => setInput(e.target.value)} placeholder="Paste a Hushful link here" /></Field><p className="hint">Open the list, then choose Add to Shared With Me to save it to your account.</p><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={busy || !input.trim()}>{busy && <LoaderCircle className="spin" />} Open wishlist</button></div></form></Modal> }
/* eslint-enable react-hooks/exhaustive-deps */
function FriendsModal({ token, close, onError, notify, openShare }: { token: string; close: () => void; onError: (e: unknown) => void; notify: (s: string) => void; openShare: (share: AccountSharedWishlist) => void }) {
  const [friends, setFriends] = useState<Friendship[]>([]), [requests, setRequests] = useState<Friendship[]>([]), [groups, setGroups] = useState<FriendGroup[]>([])
  const [groupName, setGroupName] = useState(''), [query, setQuery] = useState(''), [results, setResults] = useState<SocialUser[]>([])
  const [pins, setPins] = useState<Pins>({ wishlistIDs: [], userIDs: [], groupIDs: [] })
  const load = useCallback(async () => { try { const [f, r, g] = await Promise.all([api.friends(token), api.friendRequests(token), api.friendGroups(token)]); setFriends(f); setRequests(r); setGroups(g) } catch (e) { onError(e) } }, [token, onError])
  useEffect(() => { void load(); api.pins(token).then(setPins).catch(onError) }, [load, token, onError])
  useEffect(() => { const timer = window.setTimeout(() => { if (query.trim().length >= 2) api.searchUsers(token, query.trim()).then(setResults).catch(onError); else setResults([]) }, 250); return () => window.clearTimeout(timer) }, [query, token, onError])
  const incoming = requests.filter((r) => r.direction === 'incoming')
  const [profile, setProfile] = useState<Friendship | null>(null)
  if (profile) return <FriendProfileModal token={token} person={profile.user} friendship={profile.status === 'accepted' ? profile : undefined} close={() => setProfile(null)} removed={async () => { setProfile(null); await load(); notify('Friend removed') }} added={async () => { await load(); notify('Friend request sent') }} openShare={openShare} onError={onError} />
  return <Modal close={close} size="modal-wide"><ModalHeader eyebrow="Your private circle" title="Friends & groups" close={close} /><div className="social-stack">
    <Field label="Find by name or username"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search names or usernames" autoFocus /></Field>
    {results.map((person) => <button className="profile-list-row" key={person.id} onClick={() => setProfile(friends.find((item) => item.user.id === person.id) || { id: '', user: person, direction: 'outgoing', status: 'pending' })}><Avatar name={person.displayName || person.username} userId={person.id} hasAvatar={person.hasAvatar} /><span><strong>{person.displayName || `@${person.username}`}</strong><small>@{person.username}</small></span><ChevronRight /></button>)}
    {incoming.length > 0 && <section><h3>Requests</h3>{incoming.map((request) => <SocialRow key={request.id} person={request.user} action={<button className="primary" onClick={async () => { try { await api.acceptFriend(token, request.id); notify('Friend added'); await load() } catch (e) { onError(e) } }}>Accept</button>} />)}</section>}
    <section><h3>Friends</h3>{friends.length ? friends.map((friend) => <button className="profile-list-row" key={friend.id} onClick={() => setProfile(friend)}><Avatar name={friend.user.displayName || friend.user.username} userId={friend.user.id} hasAvatar={friend.user.hasAvatar} /><span><strong>{friend.user.displayName || `@${friend.user.username}`}</strong><small>@{friend.user.username}</small></span><ChevronRight /></button>) : <p className="hint">Search for a username to start your private circle.</p>}</section>
    <section><h3>Private groups</h3><form className="inline-social-form" onSubmit={async (e) => { e.preventDefault(); if (!groupName.trim()) return; try { await api.createFriendGroup(token, groupName.trim()); setGroupName(''); await load() } catch (error) { onError(error) } }}><input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Family, close friends…" /><button className="secondary">Create</button></form>
      {groups.map((group) => <details className="social-group" key={group.id}><summary>{group.name}<small>{group.members.length} members</small></summary><button className="text-button" onClick={async () => { try { setPins(await (pins.groupIDs.includes(group.id) ? api.unpin(token, 'group', group.id) : api.pin(token, 'group', group.id))) } catch (e) { onError(e) } }}><Pin /> {pins.groupIDs.includes(group.id) ? 'Unpin group' : 'Pin group'}</button>{friends.map((friend) => { const checked = group.members.some((member) => member.id === friend.user.id); return <label className="audience-choice" key={friend.user.id}><input type="checkbox" checked={checked} onChange={async () => { if (checked && !window.confirm(`Remove ${friend.user.displayName || `@${friend.user.username}`} from “${group.name}”?`)) return; try { if (checked) await api.removeGroupMember(token, group.id, friend.user.id); else await api.addGroupMember(token, group.id, friend.user.id); await load() } catch (e) { onError(e) } }} /><span>{friend.user.displayName || `@${friend.user.username}`}<small>@{friend.user.username}</small></span></label> })}</details>)}
    </section>
  </div></Modal>
}

function UserSearchModal({ token, initialPerson, close, onError, notify, openShare }: { token: string; initialPerson?: SocialUser; close: () => void; onError: (e: unknown) => void; notify: (s: string) => void; openShare: (share: AccountSharedWishlist) => void }) {
  const [query, setQuery] = useState(''), [results, setResults] = useState<SocialUser[]>([]), [friends, setFriends] = useState<Friendship[]>([]), [profile, setProfile] = useState<SocialUser | null>(initialPerson || null)
  const loadRelationships = useCallback(async () => { try { setFriends(await api.friends(token)) } catch (e) { onError(e) } }, [token, onError])
  useEffect(() => { void loadRelationships() }, [loadRelationships])
  useEffect(() => { const timer = window.setTimeout(() => { if (query.trim().length >= 2) api.searchUsers(token, query.trim()).then(setResults).catch(onError); else setResults([]) }, 250); return () => window.clearTimeout(timer) }, [query, token, onError])
  if (profile) { const friendship = friends.find((item) => item.user.id === profile.id); return <FriendProfileModal token={token} person={profile} friendship={friendship} close={() => setProfile(null)} removed={async () => { setProfile(null); await loadRelationships(); notify('Friend removed') }} added={async () => { await loadRelationships(); notify('Friend request sent') }} openShare={openShare} onError={onError} /> }
  return <Modal close={close} size="modal-wide"><ModalHeader eyebrow="Discover public wishlists" title="Find people" close={close} /><div className="social-stack"><Field label="Search by name or username"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search names or usernames" autoFocus /></Field>
    {query.trim().length < 2 ? <p className="hint">Enter at least two characters to find a profile.</p> : results.length ? results.map((person) => <button className="profile-list-row" key={person.id} onClick={() => setProfile(person)}><Avatar name={person.displayName || person.username} userId={person.id} hasAvatar={person.hasAvatar} /><span><strong>{person.displayName || `@${person.username}`}</strong><small>@{person.username}</small></span><ChevronRight /></button>) : <p className="hint">No matching users found.</p>}
  </div></Modal>
}

function FriendProfileModal({ token, friendship, person, close, removed, added, openShare, onError }: { token: string; friendship?: Friendship; person: SocialUser; close: () => void; removed: () => Promise<void>; added: () => Promise<void>; openShare: (share: AccountSharedWishlist) => void; onError: (e: unknown) => void }) {
  const [profile, setProfile] = useState<FriendProfile | null>(null), [opening, setOpening] = useState<string | null>(null), [requested, setRequested] = useState(false), [pinned, setPinned] = useState(false)
  useEffect(() => { Promise.all([api.friendProfile(token, person.id), api.friendRequests(token), api.pins(token)]).then(([p, requests, pins]) => { setProfile(p); setRequested(requests.some((item) => item.user.id === person.id && item.direction === 'outgoing')); setPinned(pins.userIDs.includes(person.id)) }).catch(onError) }, [token, person.id, onError])
  useEffect(() => { if (!requested) return; const timer = window.setInterval(() => { api.friendRequests(token).then(async (requests) => { if (requests.some((item) => item.user.id === person.id && item.direction === 'outgoing')) return; try { await api.friendProfile(token, person.id); setRequested(false) } catch { /* A blocked profile stays unavailable and cannot be requested again. */ } }).catch(() => {}) }, 5000); return () => window.clearInterval(timer) }, [requested, token, person.id])
  async function openPublic(wishlistID: string) { setOpening(wishlistID); try { openShare(await api.openPublicWishlist(token, wishlistID)) } catch (e) { onError(e) } finally { setOpening(null) } }
  const saved = (item: ProfileWishlist): AccountSharedWishlist => ({ id: item.accountShareID!, wishlistID: item.wishlistID, title: item.title, sharedByName: profile?.user.displayName || `@${profile?.user.username || person.username}` })
  return <Modal close={close} size="modal-wide"><ModalHeader eyebrow={`@${person.username}`} title={person.displayName || `@${person.username}`} close={close} />{!profile ? <FullPageLoader embedded /> : <div className="social-stack"><div className="friend-profile-heading"><Avatar name={person.displayName || person.username} userId={person.id} hasAvatar={person.hasAvatar} /><p>Only public wishlists and lists shared specifically with you appear here.</p></div>
    <section><h3>Public wishlists</h3>{profile.publicWishlists.length ? profile.publicWishlists.map((item) => <button className="profile-list-row" key={item.wishlistID} disabled={opening === item.wishlistID} onClick={() => void openPublic(item.wishlistID)}><Gift /><span><strong>{item.title}</strong><small>Public</small></span><ChevronRight /></button>) : <p className="hint">No public wishlists.</p>}</section>
    <section><h3>Shared with you</h3>{profile.sharedWishlists.length ? profile.sharedWishlists.map((item) => <button className="profile-list-row" key={item.wishlistID} onClick={() => openShare(saved(item))}><Users /><span><strong>{item.title}</strong><small>Shared privately with you</small></span><ChevronRight /></button>) : <p className="hint">No private lists have been shared with you.</p>}</section>
    {friendship && <div className="modal-actions spread"><button className="secondary danger-text" onClick={async () => { if (!window.confirm(`Are you sure you want to remove ${person.displayName || `@${person.username}`} as a friend? This cannot be undone.`)) return; try { await api.removeFriendship(token, friendship.id); await removed() } catch (e) { onError(e) } }}><Trash2 /> Remove friend</button><button className="secondary" onClick={async () => { try { await (pinned ? api.unpin(token, 'user', person.id) : api.pin(token, 'user', person.id)); setPinned(!pinned) } catch (e) { onError(e) } }}><Pin /> {pinned ? 'Unpin' : 'Pin person'}</button></div>}
    {!friendship && <div className="modal-actions"><button className="primary" disabled={requested} onClick={async () => { setRequested(true); try { await api.requestFriend(token, person.id); await added() } catch (e) { setRequested(false); onError(e) } }}>{requested ? 'Friend Request Sent' : 'Send Friend Request'}</button></div>}
    <div className="modal-actions"><button className="secondary danger-text" onClick={async () => { if (!window.confirm(`Block ${person.displayName || `@${person.username}`}? You will be removed as friends and neither of you will be able to find or contact the other.`)) return; try { await api.blockUser(token, person.id); await removed() } catch (e) { onError(e) } }}><X /> Block user</button></div>
  </div>}</Modal>
}

function ActivityModal({ token, items, changed, close, onError }: { token: string; items: ActivityItem[]; changed: (items: ActivityItem[]) => void; close: () => void; onError: (e: unknown) => void }) {
  useEffect(() => { if (!items.some((item) => !item.readAt)) return; api.readAllActivity(token).then(() => changed(items.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })))).catch(onError) }, [])
  async function remove(id: string, confirmed = false) { if (!confirmed && !window.confirm('Clear this activity entry? This cannot be undone.')) return; try { await api.deleteActivity(token, id); changed(items.filter((item) => item.id !== id)) } catch (e) { onError(e) } }
  async function resolve(item: ActivityItem, accept: boolean) { if (!item.actorID) return; if (!accept && !window.confirm('Decline this friend request? The request will be removed from your activity.')) return; try { if (accept) await api.acceptFriendFrom(token, item.actorID); else await api.declineFriendFrom(token, item.actorID); await remove(item.id, true) } catch (e) { onError(e) } }
  async function clearAll() { if (!window.confirm('Clear all activity? This cannot be undone.')) return; try { await api.clearActivity(token); changed([]) } catch (e) { onError(e) } }
  return <Modal close={close} size="modal-wide"><ModalHeader eyebrow="What’s new" title="Activity" close={close} /><div className="activity-list">{items.length ? <>{items.map((item) => <article className={`activity-item ${item.readAt ? '' : 'unread'}`} key={item.id}><span className="activity-icon">{item.kind === 'friend_request' || item.kind === 'friend_accepted' ? <Users /> : <Gift />}</span><div><strong>{item.title}</strong><p>{item.message}</p>{item.createdAt && <small>{new Date(item.createdAt).toLocaleString()}</small>}{item.kind === 'friend_request' && <div className="activity-actions"><button className="primary" onClick={() => void resolve(item, true)}>Accept</button><button className="secondary danger-text" onClick={() => void resolve(item, false)}>Decline</button></div>}</div><button className="icon-button" aria-label="Clear activity" onClick={() => void remove(item.id)}><X /></button></article>)}<div className="modal-actions"><button className="secondary danger-text" onClick={() => void clearAll()}><Trash2 /> Clear all</button></div></> : <EmptyState icon={<Bell />} title="You’re all caught up" text="Friend requests and shared-list updates will appear here." />}</div></Modal>
}

function SocialRow({ person, action }: { person: SocialUser; action: ReactNode }) { return <div className="social-row"><Avatar name={person.displayName || person.username} userId={person.id} hasAvatar={person.hasAvatar} /><span><strong>{person.displayName || `@${person.username}`}</strong><small>@{person.username}</small></span>{action}</div> }

function SocialShareModal({ token, wishlist, close, notify, onError }: { token: string; wishlist: Wishlist; close: () => void; notify: (s: string) => void; onError: (e: unknown) => void }) {
  const [friends, setFriends] = useState<Friendship[]>([]), [groups, setGroups] = useState<FriendGroup[]>([]), [audience, setAudience] = useState<WishlistAudience>({ userIDs: [], groupIDs: [] }), [visibility, setVisibility] = useState<'private' | 'public'>('private'), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [shareUrl, setShareUrl] = useState('')
  useEffect(() => { Promise.all([api.friends(token), api.friendGroups(token), api.wishlistAudience(token, wishlist.id), api.wishlistSettings(token, wishlist.id)]).then(([f, g, a, s]) => { setFriends(f); setGroups(g); setAudience(a); setVisibility(s.visibility) }).catch(onError).finally(() => setLoading(false)) }, [token, wishlist.id, onError])
  function toggle(key: keyof WishlistAudience, id: string) { setAudience((old) => ({ ...old, [key]: old[key].includes(id) ? old[key].filter((value) => value !== id) : [...old[key], id] })) }
  async function save() { setSaving(true); try { await Promise.all([api.updateWishlistAudience(token, wishlist.id, audience), api.updateWishlistSettings(token, wishlist.id, { visibility })]); notify('Sharing updated'); close() } catch (e) { onError(e) } finally { setSaving(false) } }
  async function guestLink() { try { const result = await api.createShare(token, wishlist.id); setShareUrl(`${window.location.origin}/share/${result.shareToken}`) } catch (e) { onError(e) } }
  if (shareUrl) return <ShareLinkModal url={shareUrl} title={wishlist.title} close={() => setShareUrl('')} notify={notify} />
  return <Modal close={close} size="modal-wide"><ModalHeader eyebrow="Share without a link" title={`Share “${wishlist.title}”`} close={close} />{loading ? <FullPageLoader embedded /> : <div className="social-stack"><Field label="Wishlist visibility"><select value={visibility} onChange={(e) => setVisibility(e.target.value as 'private' | 'public')}><option value="private">Private</option><option value="public">Public</option></select></Field><p className="muted">{visibility === 'public' ? 'Anyone can view this list, and friends will see it on your profile. Private selections below remain available too.' : 'This list is hidden from the public. Only the friends and groups you select below can open it.'}</p>
    {groups.length > 0 && <section><h3>Groups</h3>{groups.map((group) => <label className="audience-choice" key={group.id}><input type="checkbox" checked={audience.groupIDs.includes(group.id)} onChange={() => toggle('groupIDs', group.id)} /><span>{group.name}<small>{group.members.length} friends</small></span></label>)}</section>}
    <section><h3>Friends</h3>{friends.length ? friends.map((friend) => <label className="audience-choice" key={friend.user.id}><input type="checkbox" checked={audience.userIDs.includes(friend.user.id)} onChange={() => toggle('userIDs', friend.user.id)} /><Avatar name={friend.user.displayName || friend.user.username} userId={friend.user.id} hasAvatar={friend.user.hasAvatar} /><span>{friend.user.displayName || `@${friend.user.username}`}<small>@{friend.user.username}</small></span></label>) : <p className="hint">Add friends first, or use a guest link below.</p>}</section>
    <div className="guest-link-option"><div><strong>Sharing with someone without Hushful?</strong><small>Anyone with a guest link can view, claim wishes, and leave notes without an account. Private lists remain hidden elsewhere in Hushful.</small></div><button className="secondary" onClick={guestLink}><Link2 /> Create guest link</button></div>
    <div className="modal-actions"><button className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={saving} onClick={save}>{saving && <LoaderCircle className="spin" />} Save audience</button></div></div>}</Modal>
}

function WishlistCollaborationModal({ token, wishlist, close, notify, onError }: { token: string; wishlist: Wishlist; close: () => void; notify: (s: string) => void; onError: (e: unknown) => void }) {
  const [mode, setMode] = useState<'our_wishlist' | 'gift_planning'>('our_wishlist')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [friends, setFriends] = useState<Friendship[]>([])
  const [owners, setOwners] = useState<Array<{ id: string; displayName?: string; username?: string; isPrimaryOwner: boolean }>>([])
  const [me, setMe] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const canManage = Boolean(me && owners.some((owner) => owner.id === me.id && owner.isPrimaryOwner))
  useEffect(() => {
    Promise.all([api.wishlistCollaboration(token, wishlist.id), api.friends(token), api.me(token)])
      .then(([collaboration, loadedFriends, current]) => {
        setMode(collaboration.mode); setOwners(collaboration.collaborators); setSelected(new Set(collaboration.collaborators.filter((owner) => !owner.isPrimaryOwner).map((owner) => owner.id))); setFriends(loadedFriends.filter((friend) => friend.status === 'accepted')); setMe(current)
      }).catch(onError).finally(() => setLoading(false))
  }, [token, wishlist.id, onError])
  function toggle(id: string) { setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next }) }
  async function save() { setSaving(true); try { await api.updateWishlistCollaboration(token, wishlist.id, mode, [...selected]); notify('Wishlist owners updated'); close() } catch (error) { onError(error) } finally { setSaving(false) } }
  return <Modal close={close} size="modal-wide"><ModalHeader eyebrow="Plan together" title="Owners & purpose" close={close} />{loading ? <FullPageLoader embedded /> : <div className="stack-form"><Field label="How will you use this list?"><select value={mode} disabled={!canManage} onChange={(event) => setMode(event.target.value as 'our_wishlist' | 'gift_planning')}><option value="our_wishlist">Our Wishlist</option><option value="gift_planning">Gift Planning</option></select></Field><p className="hint">{mode === 'our_wishlist' ? 'The owners are the intended recipients. Purchases and recipient notes stay hidden from every owner.' : 'The owners are planning gifts together and can coordinate purchases and notes.'}</p><fieldset className="public-choice"><legend>Current owners</legend>{owners.map((owner) => <div className="checkbox" key={owner.id}><span><strong>{owner.displayName || (owner.username ? `@${owner.username}` : 'Hushful user')}</strong><small>{owner.isPrimaryOwner ? 'Primary owner' : owner.username ? `@${owner.username}` : 'Co-owner'}</small></span></div>)}</fieldset>{canManage && <fieldset className="public-choice"><legend>Add co-owners from friends</legend>{friends.length ? friends.map((friend) => <label className="checkbox" key={friend.user.id}><input type="checkbox" checked={selected.has(friend.user.id)} onChange={() => toggle(friend.user.id)} /><span><strong>{friend.user.displayName || `@${friend.user.username}`}</strong><small>@{friend.user.username}</small></span></label>) : <p className="hint">No friends available.</p>}</fieldset>}<div className="modal-actions"><button className="secondary" onClick={close}>Cancel</button>{canManage && <button className="primary" disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save owners'}</button>}</div></div>}</Modal>
}

function AccountModal({ token, user, userChanged, close, save, onError, notify, logout }: { token: string; user: CurrentUser; userChanged: (user: CurrentUser) => void; close: () => void; save: (profile: Partial<CurrentUser>) => void; onError: (e: unknown) => void; notify: (s: string) => void; logout: () => void }) {
  const [name, setName] = useState(user.displayName || ''), [discoverable, setDiscoverable] = useState(user.isDiscoverable), [policy, setPolicy] = useState(user.friendRequestPolicy), [avatarVersion, setAvatarVersion] = useState(0), [avatarBusy, setAvatarBusy] = useState(false)
  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof api.metricsSummary>> | null>(null)
  const [feedback, setFeedback] = useState<Awaited<ReturnType<typeof api.adminFeedback>> | null>(null)
  const [feedbackCategory, setFeedbackCategory] = useState('general'), [feedbackMessage, setFeedbackMessage] = useState(''), [feedbackBusy, setFeedbackBusy] = useState(false), [feedbackError, setFeedbackError] = useState('')
  useEffect(() => { api.metricsSummary(token).then(setMetrics).catch(() => undefined); api.adminFeedback(token).then(setFeedback).catch(() => undefined) }, [token])
  async function submitFeedback() { const message = feedbackMessage.trim(); if (!message) return; setFeedbackBusy(true); setFeedbackError(''); try { await api.submitFeedback(token, feedbackCategory, message); setFeedbackMessage(''); notify('Thank you—your feedback was received') } catch (e) { setFeedbackError(e instanceof Error ? e.message : 'Unable to submit feedback.') } finally { setFeedbackBusy(false) } }
  async function upload(file?: File) { if (!file) return; if (file.size > 2 * 1024 * 1024) return onError(new Error('Profile pictures must be 2 MB or smaller.')); if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return onError(new Error('Choose a JPEG, PNG, or WebP image.')); setAvatarBusy(true); try { userChanged(await api.uploadAvatar(token, file)); setAvatarVersion(Date.now()); notify('Profile picture updated') } catch (e) { onError(e) } finally { setAvatarBusy(false) } }
  async function removeAvatar() { if (!window.confirm('Remove your profile picture? This cannot be undone.')) return; setAvatarBusy(true); try { userChanged(await api.removeAvatar(token)); setAvatarVersion(Date.now()); notify('Profile picture removed') } catch (e) { onError(e) } finally { setAvatarBusy(false) } }
  return <Modal close={close}><ModalHeader eyebrow="Your Hushful account" title="Account & privacy" close={close} /><form className="stack-form" onSubmit={(e) => { e.preventDefault(); save({ displayName: name.trim(), isDiscoverable: discoverable, friendRequestPolicy: policy }) }}>
    <div className="avatar-editor"><Avatar name={name || user.email} userId={user.id} hasAvatar={user.hasAvatar} version={avatarVersion} /><div><label className="secondary avatar-upload">{avatarBusy ? 'Uploading…' : user.hasAvatar ? 'Change picture' : 'Add picture'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={avatarBusy} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = '' }} /></label>{user.hasAvatar && <button type="button" className="text-button danger-text" disabled={avatarBusy} onClick={() => void removeAvatar()}>Remove</button>}<small>JPEG, PNG, or WebP · 2 MB maximum</small></div></div>
    <Field label="Display name"><input value={name} onChange={(e) => setName(e.target.value)} /></Field><Field label="Username"><input value={user.username ? `@${user.username}` : 'Not set'} disabled /></Field><p className="hint">Your username is permanent and cannot be changed.</p><label className="checkbox"><input type="checkbox" checked={discoverable} onChange={(e) => setDiscoverable(e.target.checked)} /><span><strong>Let people find my username</strong><small>Your profile picture and username appear in search. Your email never does.</small></span></label><Field label="Friend requests"><select value={policy} onChange={(e) => setPolicy(e.target.value as CurrentUser['friendRequestPolicy'])}><option value="everyone">Anyone who finds me</option><option value="nobody">Nobody</option></select></Field><Field label="Email"><input value={user.email} disabled /></Field>
    <section className="feedback-panel"><div><strong>Send feedback</strong><small>Ideas, problems, and little details all help make Hushful better.</small></div><Field label="Category"><select value={feedbackCategory} onChange={(e) => setFeedbackCategory(e.target.value)}><option value="general">General</option><option value="idea">Idea</option><option value="problem">Problem</option><option value="praise">Praise</option></select></Field><Field label="Your feedback"><textarea rows={4} maxLength={4000} value={feedbackMessage} onChange={(e) => setFeedbackMessage(e.target.value)} placeholder="Tell us what’s on your mind…" /></Field><small className="feedback-count">{feedbackMessage.length}/4,000</small>{feedbackError && <p className="form-error" role="alert">{feedbackError}</p>}<button type="button" className="secondary" disabled={feedbackBusy || !feedbackMessage.trim()} onClick={() => void submitFeedback()}>{feedbackBusy ? <LoaderCircle className="spin" /> : <Send />} Submit feedback</button></section>
    {metrics && <section className="metrics-panel"><div><strong>Hushful metrics</strong><small>Last {metrics.days} days · privacy-preserving</small></div><div className="metric-grid"><span><strong>{metrics.totalAccounts}</strong><small>Total accounts</small></span><span><strong>{metrics.newAccounts}</strong><small>New signups</small></span><span><strong>{metrics.visitors}</strong><small>Web visitors</small></span><span><strong>{metrics.views}</strong><small>Page views</small></span></div><div className="metric-paths">{metrics.topPaths.slice(0, 5).map((entry) => <span key={entry.path}><small>{entry.path}</small><strong>{entry.views}</strong></span>)}</div></section>}
    {feedback && <section className="feedback-admin"><div><strong>User feedback</strong><small>{feedback.length} response{feedback.length === 1 ? '' : 's'}</small></div>{feedback.length === 0 ? <p className="hint">No feedback submitted yet.</p> : <div className="feedback-responses">{feedback.map((entry) => <article key={entry.id}><div><span>{entry.category}</span><small>{entry.platform.toUpperCase()} · {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'Just now'}</small></div><p>{entry.message}</p><small>{entry.userDisplayName ? `${entry.userDisplayName} · ` : ''}{entry.userEmail}</small></article>)}</div>}</section>}
    <div className="modal-actions spread"><button type="button" className="text-button danger-text" onClick={logout}><LogOut /> Log out</button><button className="primary" disabled={!name.trim()}>Save changes</button></div>
    <div className="danger-zone"><strong>Delete account</strong><p>Permanently deletes your wishlists, friendships, groups, activity, and account data.</p><button type="button" className="secondary danger-text" onClick={async () => { const confirmation = window.prompt('This cannot be undone. Type DELETE to permanently delete your account.'); if (confirmation !== 'DELETE') return; try { await api.deleteAccount(token); logout() } catch (e) { onError(e) } }}><Trash2 /> Delete Account</button></div>
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

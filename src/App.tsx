import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Banknote, Bell, CalendarDays, Check, ChevronRight, CircleAlert, CircleHelp, Copy, ExternalLink, Gift, Link2, LoaderCircle, LogOut, Menu, MessageCircle, Moon, PackageCheck, Pencil, Pin, Plus, RefreshCw, Send, Settings, Share2, ShieldCheck, Sparkles, Sun, Trash2, User, Users, X } from 'lucide-react'
import { api, ApiError, CURRENT_TERMS_VERSION } from './api'
import { authStorage, shareStorage } from './storage'
import type { AccountSharedWishlist, ActivityItem, CurrentUser, FriendGroup, FriendProfile, Friendship, GuestShareLink, Pins, ProfileWishlist, RecurringOccasion, ShareViewResponse, SharedItemRow, SharedWishlist, SocialUser, Wishlist, WishlistAudience, WishlistDiscussionComment, WishlistItem } from './types'
import { LegalPage, PublicFooter, legalRoute } from './LegalPages'

import { FREE_LIST_LIMIT, activeOwnedListCount, canCreateWishlist } from './proAccess'

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
  const verificationToken = new URLSearchParams(window.location.search).get('verifyEmailToken')
  const guestShareToken = window.location.pathname.match(/^\/share\/([^/]+)/)?.[1]
  const [token, setToken] = useState<string | null>(authStorage.get())
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(Boolean(token))
  const [toast, setToast] = useState<{ message: string; kind: 'success' | 'error' } | null>(null)
  const notify = useCallback((message: string) => setToast({ message, kind: 'success' }), [])
  const [theme, setTheme] = useState<'light' | 'dark'>(() => { const saved = localStorage.getItem('hushful.theme'); return saved === 'light' || saved === 'dark' ? saved : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' })
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('hushful.theme', theme) }, [theme])
  const themeToggle = <ThemeToggle theme={theme} toggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />

  const [onboardingActive, setOnboardingActive] = useState(false)
  const logout = useCallback(() => { authStorage.clear(); setToken(null); setUser(null); setOnboardingActive(false) }, [])
  const onError = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) return logout()
    setToast({ message: error instanceof Error ? error.message : 'Something went wrong. Please try again.', kind: 'error' })
  }, [logout])

  useEffect(() => {
    if (!token) return
    setLoading(true)
    api.me(token).then((loadedUser) => { setUser(loadedUser); setOnboardingActive(!loadedUser.username || !loadedUser.privacySetupCompleted || loadedUser.onboardingVersion !== 1 || loadedUser.birthdaySetupCompleted !== true) }).catch(onError).finally(() => setLoading(false))
  }, [token, onError])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4200)
    return () => window.clearTimeout(timer)
  }, [toast])
  useEffect(() => {
    const path = guestShareToken ? '/share' : resetToken ? '/reset-password' : verificationToken ? '/verify-email' : token ? '/app' : '/login'
    void api.trackPageView(metricsVisitorID(), path, Boolean(token)).catch(() => undefined)
  }, [guestShareToken, resetToken, verificationToken, token])

  if (publicPage) return <>{themeToggle}<LegalPage page={publicPage} /></>
  if (resetToken) return <>{themeToggle}<ResetPasswordScreen token={resetToken} /></>
  if (verificationToken) return <>{themeToggle}<VerifyEmailScreen token={verificationToken} onAuthenticated={(accessToken) => { window.history.replaceState({}, '', '/'); authStorage.set(accessToken); setLoading(true); setToken(accessToken) }} /></>
  if (guestShareToken) return <>{themeToggle}<GuestShareScreen shareToken={guestShareToken} /></>
  if (loading) return <FullPageLoader />
  if (!token || !user) return <>{themeToggle}<AuthScreen onAuthenticated={(accessToken) => { authStorage.set(accessToken); setToken(accessToken) }} onError={onError} /></>
  if (onboardingActive) return <>{themeToggle}<OnboardingFlow token={token} user={user} userChanged={setUser} finish={async () => { try { setUser(await api.updateProfile(token, { onboardingVersion: 1 })); setOnboardingActive(false) } catch (error) { onError(error) } }} logout={logout} /></>
  return <>
    {themeToggle}
    <Dashboard token={token} user={user} setUser={setUser} logout={logout} onError={onError} notify={notify} />
    {toast && <div className={`toast ${toast.kind}`} role={toast.kind === 'error' ? 'alert' : 'status'}>{toast.kind === 'error' ? <CircleAlert /> : <Check />}{toast.message}</div>}
  </>
}

function ProPlan({ isPro, activeLists }: { isPro: boolean; activeLists?: number }) {
  return <section className="pro-plan">
    <p className="eyebrow"><Sparkles size={16} /> {isPro ? 'Hushful Pro' : 'Hushful Free'}</p>
    <p>{isPro ? 'Your account has access to all Pro features available on the web.' : `Free includes up to ${FREE_LIST_LIMIT} active lists, unlimited wishes, sharing, and gift coordination.`}</p>
    {!isPro && activeLists !== undefined && <p className="hint">{activeLists} of {FREE_LIST_LIMIT} active lists used. Lists owned by someone else don’t count toward your limit.</p>}
    <p>Pro unlocks unlimited active lists, recurring occasions, and cash funds on the web. The iOS app also includes templates, styling, insights, export, and duplication.</p>
    {!isPro && <p>To unlock additional functionality, download the Hushful iOS app and upgrade to Pro once it launches. Use the same Hushful account on both devices.</p>}
    <p className="hint">The iOS app is awaiting App Store approval. Web payments and Android are coming soon.</p>
  </section>
}

function ThemeToggle({ theme, toggle }: { theme: 'light' | 'dark'; toggle: () => void }) {
  return <button className="theme-toggle" onClick={toggle} aria-label={theme === 'dark' ? 'Use light mode' : 'Use dark mode'} title={theme === 'dark' ? 'Use light mode' : 'Use dark mode'}>{theme === 'dark' ? <Sun /> : <Moon />}</button>
}

type OnboardingStep = 'tour' | 'setup' | 'username' | 'privacy' | 'birthday' | 'first-list' | 'guided-list'

function OnboardingFlow({ token, user, userChanged, finish, logout }: { token: string; user: CurrentUser; userChanged: (user: CurrentUser) => void; finish: () => void | Promise<void>; logout: () => void }) {
  const coreSetupComplete = Boolean(user.username && user.privacySetupCompleted && user.onboardingVersion === 1)
  const establishedAccount = Boolean(user.username && user.privacySetupCompleted && user.onboardingVersion === 1)
  const [step, setStep] = useState<OnboardingStep>(() => !user.username ? 'tour' : !user.privacySetupCompleted ? 'privacy' : user.birthdaySetupCompleted !== true ? 'birthday' : 'tour')
  useEffect(() => {
    // The full-screen first-run tour and the dashboard's optional tutorial
    // share the same content. Mark it seen as soon as the first-run flow is
    // entered so completing setup cannot immediately open it a second time.
    localStorage.setItem(`hushful.tutorial.v3.seen.${user.id}`, '1')
  }, [user.id])

  if (step === 'tour') return <OnboardingTour continueToSetup={() => setStep('setup')} />
  if (step === 'setup') return <OnboardingSetupWelcome continueToUsername={() => setStep('username')} />
  if (step === 'username') return <OnboardingUsername token={token} completed={(updated) => { userChanged(updated); setStep('privacy') }} logout={logout} />
  if (step === 'privacy') return <OnboardingPrivacy token={token} completed={(updated) => { userChanged(updated); setStep('birthday') }} logout={logout} />
  if (step === 'birthday') return <OnboardingBirthday token={token} completed={() => { userChanged({ ...user, birthdaySetupCompleted: true }); if (coreSetupComplete || establishedAccount) void finish(); else setStep('first-list') }} logout={logout} />
  if (step === 'first-list') return <OnboardingFirstList guide={() => setStep('guided-list')} explore={finish} />
  return <OnboardingGuidedList token={token} finish={finish} />
}

function OnboardingTour({ continueToSetup }: { continueToSetup: () => void }) {
  const [page, setPage] = useState(0)
  const steps = [
    { title: 'Thanks for downloading Hushful', text: 'Let’s see what Hushful can do. Follow Penny through the real spaces you’ll use to save wishes and make thoughtful gifts happen.', screen: 'lists' },
    { title: 'Penny keeps every wish in one place', text: 'Create public or private lists. My Lists makes the privacy of every list clear, while shared planning lists have their own home.', screen: 'wishes' },
    { title: 'Saving a wish is simple', text: 'Add a link, photo, price, quantity, and note—or share directly from a shopping app. Hushful brings the product price along too.', screen: 'item' },
    { title: 'Share and coordinate without spoilers', text: 'Choose who can view a list, filter shared ideas by price, add a comment under the items, and @mention people who can access it.', screen: 'discussion' },
    { title: 'Plan with Penny’s people', text: 'Find friends, make groups, and build a joint gift-planning list. Claims and private notes stay hidden from the recipient.', screen: 'people' },
    { title: 'Birthday and age-aware sharing', text: 'A birthday is required for age-appropriate features and stays private by default. Adult-only lists are hidden from people under 18, and guests confirm their age before viewing.', screen: 'birthday' },
    { title: 'Safety is built in', text: 'Block or report accounts, lists, comments, and other content. Manage discoverability, friend requests, mentions, notifications, and safety choices from Settings.', screen: 'safety' },
    { title: 'Make the next occasion easier', text: 'Use reminders, insights, and list settings to stay ahead. Hushful keeps the logistics quiet so the surprise stays special.', screen: 'planning' },
  ] as const
  const current = steps[page]
  return <main className="auth-page onboarding-page"><section className="auth-card onboarding-card"><Logo /><OnboardingPreview screen={current.screen} /><p className="eyebrow">Hushful tour · {page + 1} of {steps.length}</p><h1>{current.title}</h1><p className="muted">{current.text}</p><div className="tutorial-dots">{steps.map((_, index) => <span key={index} className={index === page ? 'active' : ''} />)}</div><div className="modal-actions spread"><button className="text-button" onClick={continueToSetup}>Skip tour</button><button className="primary" onClick={() => page === steps.length - 1 ? continueToSetup() : setPage(page + 1)}>{page === steps.length - 1 ? 'Let’s set up your account' : 'Next'} <ChevronRight /></button></div></section></main>
}

function OnboardingPreview({ screen }: { screen: 'lists' | 'wishes' | 'item' | 'discussion' | 'people' | 'birthday' | 'safety' | 'planning' }) {
  const body = screen === 'lists' ? <><TutorialMiniRow title="Penny’s Birthday" detail="Private · My list" /><TutorialMiniRow title="Cozy Favorites" detail="Public · My list" /></>
    : screen === 'wishes' ? <><TutorialMiniRow title="Penny’s Birthday" detail="Private · 12 wishes" /><TutorialMiniRow title="Gift planning for Penny" detail="Joint list · 4 planners" /></>
    : screen === 'item' ? <><TutorialMiniRow title="Cloud-soft blanket" detail="$48 · quantity 1 · product link" /><TutorialMiniRow title="Penny’s note" detail="Cream, please — @sam can help" /></>
    : screen === 'discussion' ? <><TutorialMiniRow title="Discussion" detail="Sam: I’ll take the blanket" /><TutorialMiniRow title="@Morgan" detail="Can you grab the treats? · notified" /></>
    : screen === 'people' ? <><TutorialMiniRow title="Penny Lou" detail="@penny · friend" /><TutorialMiniRow title="Family gift planners" detail="4 friends · joint list access" /></>
    : screen === 'birthday' ? <><TutorialMiniRow title="Birthday" detail="Private by default · reminders optional" /><TutorialMiniRow title="Adult-only list" detail="18+ access control · guest confirmation" /></>
    : screen === 'safety' ? <><TutorialMiniRow title="Block or report" detail="Profiles, lists, comments, and content" /><TutorialMiniRow title="Mention access" detail="Only people who can view the list" /></>
    : <><TutorialMiniRow title="Penny’s birthday" detail="Reminder: October 5" /><TutorialMiniRow title="List insights" detail="$146 saved · 3 wishes claimed" /></>
  const title = screen === 'discussion' ? 'Penny’s Birthday · Discussion' : screen === 'people' ? 'People' : screen === 'birthday' ? 'Birthday & Safety' : screen === 'safety' ? 'Privacy & Safety' : screen === 'planning' ? 'Penny’s Birthday · Insights' : screen === 'item' ? 'Penny’s Birthday' : 'My Lists'
  return <div className="tutorial-preview onboarding-preview"><div className="tutorial-preview-nav"><strong>{title}</strong><div><TutorialCallout icon={screen === 'discussion' ? <MessageCircle /> : screen === 'people' ? <Users /> : screen === 'birthday' || screen === 'safety' ? <ShieldCheck /> : <Gift />} label={screen === 'discussion' ? 'Comment' : screen === 'people' ? 'Friends' : screen === 'birthday' ? 'Age & safety' : screen === 'safety' ? 'Safety' : 'Hushful'} /></div></div><div className="tutorial-preview-body">{body}</div></div>
}

function OnboardingSetupWelcome({ continueToUsername }: { continueToUsername: () => void }) {
  return <main className="auth-page onboarding-page"><section className="auth-card onboarding-card setup-card"><Logo /><User size={58} /><p className="eyebrow">A few quick choices</p><h1>Let’s set up your account</h1><p className="muted">First choose the username friends will use to find you. Then choose the privacy that feels right for you.</p><button className="primary wide" onClick={continueToUsername}>Set up my account <ChevronRight /></button></section></main>
}

function OnboardingUsername({ token, completed, logout }: { token: string; completed: (user: CurrentUser) => void; logout: () => void }) {
  const [username, setUsername] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const valid = /^[a-z0-9_]{3,30}$/.test(username)
  async function save(e: FormEvent) { e.preventDefault(); if (!valid) return; setBusy(true); setError(''); try { completed(await api.updateProfile(token, { username })) } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save that username.') } finally { setBusy(false) } }
  return <main className="auth-page onboarding-page"><div className="auth-brand"><Logo /><p>Your Hushful identity</p></div><section className="auth-card"><h1>Choose your permanent username</h1><p className="muted">Friends use this to find you. Choose carefully—your username cannot be changed later. Your email is never shown in search.</p><form className="stack-form" onSubmit={save}><Field label="Username"><div className="username-input"><span>@</span><input autoFocus value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, '_').replace(/[^a-z0-9_]/g, ''))} placeholder="your_username" /></div></Field><p className="hint">3–30 letters, numbers, or underscores. Spaces become underscores.</p>{error && <p className="auth-error" role="alert">{error}</p>}<button className="primary wide" disabled={busy || !valid}>{busy && <LoaderCircle className="spin" />} Continue <ChevronRight /></button><button type="button" className="text-button auth-switch" onClick={logout}>Log out</button></form></section></main>
}

function OnboardingPrivacy({ token, completed, logout }: { token: string; completed: (user: CurrentUser) => void; logout: () => void }) {
  const [discoverable, setDiscoverable] = useState<boolean | null>(null), [policy, setPolicy] = useState<'everyone' | 'friends_of_friends' | 'nobody' | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('')
  async function save(e: FormEvent) { e.preventDefault(); if (discoverable === null || !policy) return; setBusy(true); setError(''); try { completed(await api.updateProfile(token, { isDiscoverable: discoverable, friendRequestPolicy: policy, privacySetupCompleted: true })) } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save your privacy settings.') } finally { setBusy(false) } }
  return <main className="auth-page onboarding-page"><section className="auth-card onboarding-card"><Logo /><p className="eyebrow">Your privacy</p><h1>Choose how people can find you</h1><p className="muted">You can change these choices anytime in Settings. Your birthday is requested next and stays private unless you choose to share it for birthday reminders.</p><form className="stack-form" onSubmit={save}><fieldset className="public-choice"><legend>Can people search for your username?</legend><label className="checkbox"><input type="radio" checked={discoverable === true} onChange={() => setDiscoverable(true)} /><span><strong>Yes, let people find me</strong><small>Your username and profile picture can appear in search. Your email is never shown.</small></span></label><label className="checkbox"><input type="radio" checked={discoverable === false} onChange={() => setDiscoverable(false)} /><span><strong>No, keep me hidden</strong></span></label></fieldset><fieldset className="public-choice"><legend>Who can send you a friend request?</legend>{[['everyone', 'Anyone'], ['friends_of_friends', 'Friends of friends'], ['nobody', 'Nobody']].map(([value, label]) => <label className="checkbox" key={value}><input type="radio" checked={policy === value} onChange={() => setPolicy(value as typeof policy)} /><span><strong>{label}</strong></span></label>)}</fieldset>{error && <p className="auth-error" role="alert">{error}</p>}<button type="submit" className="primary wide" disabled={busy || discoverable === null || !policy}>{busy && <LoaderCircle className="spin" />} Save and continue <ChevronRight /></button><button type="button" className="text-button auth-switch" onClick={logout}>Log out</button></form></section></main>
}

function OnboardingBirthday({ token, completed, logout }: { token: string; completed: () => void; logout: () => void }) {
  const [birthday, setBirthday] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('private')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function save(body: Parameters<typeof api.updateProfileDetails>[1]) {
    setBusy(true); setError('')
    try { await api.updateProfileDetails(token, body); completed() } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save your birthday.') } finally { setBusy(false) }
  }
  return <main className="auth-page onboarding-page"><section className="auth-card onboarding-card"><Logo /><p className="eyebrow">Your private birthday</p><h1>When is your birthday?</h1><p className="muted">Your birthday is required to provide an age-appropriate experience and power birthday reminders. The full date stays private; only the month and day can be shared, and your birth year is never shown.</p><form className="stack-form" onSubmit={(event) => { event.preventDefault(); const [year, month, day] = birthday.split('-').map(Number); if (year && month && day) void save({ birthdayYear: year, birthdayMonth: month, birthdayDay: day, birthdayVisibility: visibility, birthdaySetupCompleted: true }) }}><Field label="Your birthday"><input type="date" value={birthday} onChange={(event) => setBirthday(event.target.value)} required /></Field><Field label="Who can see it"><select value={visibility} onChange={(event) => setVisibility(event.target.value as typeof visibility)}><option value="private">Only me</option><option value="friends">Friends only</option><option value="public">Everyone who can view my profile</option></select></Field>{error && <p className="auth-error" role="alert">{error}</p>}<button type="submit" className="primary wide" disabled={busy || !birthday}>{busy && <LoaderCircle className="spin" />} Save birthday <ChevronRight /></button><button type="button" className="text-button auth-switch" onClick={logout}>Log out</button></form></section></main>
}

function OnboardingFirstList({ guide, explore }: { guide: () => void; explore: () => void }) {
  return <main className="auth-page onboarding-page"><section className="auth-card onboarding-card setup-card"><Logo /><Gift size={58} /><p className="eyebrow">Your next step</p><h1>Ready for your first list?</h1><p className="muted">Penny begins with one simple list. We can make yours together, or you can explore Hushful at your own pace.</p><button className="primary wide" onClick={guide}>Guide me through my first list <ChevronRight /></button><button className="text-button auth-switch" onClick={explore}>I’ll figure it out on my own</button></section></main>
}

function OnboardingGuidedList({ token, finish }: { token: string; finish: () => void }) {
  const [title, setTitle] = useState(''), [visibility, setVisibility] = useState<'public' | 'private'>('private'), [busy, setBusy] = useState(false), [error, setError] = useState('')
  async function create(e: FormEvent) { e.preventDefault(); if (!title.trim()) return; setBusy(true); setError(''); try { await api.createWishlist(token, title.trim(), visibility); finish() } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create your first list.') } finally { setBusy(false) } }
  return <main className="auth-page onboarding-page"><section className="auth-card onboarding-card"><Logo /><p className="eyebrow">A guided first list</p><h1>Let’s make your first list</h1><p className="muted">Give it a name, then choose whether it starts public or private. New lists start private so you can decide who sees them.</p><form className="stack-form" onSubmit={create}><Field label="1. Name your list"><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Birthday ideas, Cozy home…" /></Field><fieldset className="public-choice"><legend>2. Choose its privacy</legend><label className="checkbox"><input type="radio" checked={visibility === 'public'} onChange={() => setVisibility('public')} /><span><strong>Public</strong><small>Anyone can view it, and it may appear on your profile.</small></span></label><label className="checkbox"><input type="radio" checked={visibility === 'private'} onChange={() => setVisibility('private')} /><span><strong>Private</strong><small>Only people you choose can view it.</small></span></label></fieldset>{visibility === 'public' && <p className="public-warning"><ShieldCheck /> Public means anyone can view this list. Choose Private if you want a smaller circle.</p>}{error && <p className="auth-error" role="alert">{error}</p>}<button className="primary wide" disabled={busy || !title.trim()}>{busy && <LoaderCircle className="spin" />} Create my first list</button></form></section></main>
}

function GuestShareScreen({ shareToken }: { shareToken: string }) {
  const storageKey = `hushful.guest.viewer.${shareToken}`
  const [share, setShare] = useState<ShareViewResponse['wishlist'] | null>(null)
  const [viewerToken, setViewerToken] = useState(() => sessionStorage.getItem(storageKey) || '')
  const [requiresAdultConfirmation, setRequiresAdultConfirmation] = useState(false)
  const [adultConfirmationDeclined, setAdultConfirmationDeclined] = useState(false)
  const [rows, setRows] = useState<SharedItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [identity, setIdentity] = useState<{ itemId: string; purchasedQuantity: number } | null>(null)
  const [noteItem, setNoteItem] = useState<{ itemId: string; note?: string; displayName?: string; shareName?: boolean } | null>(null)
  const [mentionCandidates, setMentionCandidates] = useState<SocialUser[]>([])
  const [minimumPrice, setMinimumPrice] = useState('')
  const [maximumPrice, setMaximumPrice] = useState('')
  const [sort, setSort] = useState<SharedItemSort>('manual')
  const discussionError = useCallback((e: unknown) => setError(e instanceof Error ? e.message : 'Unable to update the discussion.'), [])
  const visibleRows = sortSharedRows(rows.filter((row) => priceMatches(row.item, minimumPrice, maximumPrice)), sort)

  const loadContent = useCallback(async (nextViewerToken: string) => {
    setRows(await api.sharedItems(shareToken, nextViewerToken))
    setMentionCandidates(await api.mentionCandidates(shareToken, nextViewerToken).catch(() => []))
  }, [shareToken])

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const opened = await api.openShare(shareToken, viewerToken || undefined, authStorage.get() || undefined)
      sessionStorage.setItem(storageKey, opened.viewerToken)
      setViewerToken(opened.viewerToken)
      setShare(opened.wishlist)
      setAdultConfirmationDeclined(false)
      setRequiresAdultConfirmation(opened.requiresAdultConfirmation === true)
      if (opened.requiresAdultConfirmation) {
        setRows([])
        setMentionCandidates([])
      } else {
        await loadContent(opened.viewerToken)
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'This share link is unavailable.') }
    finally { setLoading(false) }
  }, [shareToken, storageKey, viewerToken, loadContent])
  useEffect(() => { void load() }, [])

  async function confirmAdult() {
    if (!viewerToken) return
    setLoading(true); setError('')
    try {
      const opened = await api.confirmAdultShare(shareToken, viewerToken, authStorage.get() || undefined)
      setShare(opened.wishlist)
      setRequiresAdultConfirmation(false)
      setAdultConfirmationDeclined(false)
      await loadContent(opened.viewerToken)
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to confirm access to this list.') }
    finally { setLoading(false) }
  }

  async function update(itemId: string, body: { purchasedQuantity?: number; note?: string; displayName?: string; shareName?: boolean }) {
    if (!viewerToken) return
    try {
      const updated = await api.updateSharedItem(shareToken, itemId, viewerToken, body)
      setRows((all) => all.map((row) => row.item.id === itemId ? updated : row))
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to update this wish.'); void load() }
  }

  if (loading) return <FullPageLoader />
  if (adultConfirmationDeclined) return <main className="auth-page onboarding-page"><section className="auth-card onboarding-card setup-card"><Logo /><ShieldCheck size={58} /><p className="eyebrow">List not opened</p><h1>Adult confirmation required</h1><p className="muted">You chose not to continue. No list content was shown.</p><button className="primary wide" onClick={() => window.location.assign('/')}>Return to Hushful <ChevronRight /></button></section></main>
  if (requiresAdultConfirmation) return <main className="auth-page onboarding-page"><section className="auth-card onboarding-card setup-card"><Logo /><ShieldCheck size={58} /><p className="eyebrow">Adult-only wishlist</p><h1>{share?.title || 'This wishlist'} is intended for adults</h1><p className="muted">This list may include content intended for people 18 and older. Nothing from the list is shown until you confirm that you are an adult.</p>{error && <p className="auth-error" role="alert">{error}</p>}<button className="primary wide" onClick={() => void confirmAdult()}>I’m 18 or older <ChevronRight /></button><button className="text-button auth-switch" onClick={() => setAdultConfirmationDeclined(true)}>Go back</button><p className="hint">No Hushful account or app is required to view a guest link.</p></section></main>
  if (error && !share) return <main className="auth-page"><div className="auth-brand"><Logo /><p>This private link may have expired or been revoked.</p></div><section className="auth-card"><h1>Wishlist unavailable</h1><p className="auth-error">{error}</p></section></main>
  async function reportGuestList() {
    if (!viewerToken) return
    const details = window.prompt('Tell us what happened (optional):', '')
    if (details === null) return
    try { await api.reportGuestShareLink(shareToken, viewerToken, 'other', details); window.alert('Thanks. Your report was sent to Hushful administrators for review.') }
    catch (reportError) { setError(reportError instanceof Error ? reportError.message : 'Unable to submit this report.') }
  }
  return <main className="page detail-page shared-detail guest-shared-detail">
    <header className="page-heading"><div><Logo compact /><p className="eyebrow">Shared by {share?.sharedByName || 'Someone'}</p><h1>{share?.title}</h1><p>No account is needed. Claims and notes stay hidden from the list owner.</p></div><div className="heading-actions"><button className="secondary" onClick={() => void load()}><RefreshCw /> Refresh</button>{viewerToken && <button className="icon-button danger" aria-label="Report shared list" onClick={() => void reportGuestList()}><CircleAlert /></button>}</div></header>
    {error && <p className="auth-error" role="alert">{error}</p>}
    <PriceFilter minimum={minimumPrice} maximum={maximumPrice} setMinimum={setMinimumPrice} setMaximum={setMaximumPrice} sort={sort} setSort={setSort} />
    {rows.length ? visibleRows.length ? <div className="items-grid">{visibleRows.map((row) => <SharedItemCard key={row.item.id} row={row} viewerToken={viewerToken || undefined} chooseQuantity={(quantity) => quantity === 0 ? void update(row.item.id, { purchasedQuantity: 0 }) : setIdentity({ itemId: row.item.id, purchasedQuantity: quantity })} editNote={(note) => setNoteItem({ itemId: row.item.id, note: note?.note, displayName: note?.authorDisplayName, shareName: Boolean(note?.authorDisplayName) })} removeNote={() => void update(row.item.id, { note: '', shareName: false })} />)}</div> : <EmptyState icon={<Gift />} title="No wishes match this price filter" text="Try a wider range or clear the filter." /> : <EmptyState icon={<Gift />} title="There’s nothing here yet" text="Check back after the list owner adds a wish." />}
    {viewerToken && <DiscussionPanel shareToken={shareToken} viewerToken={viewerToken} mentionCandidates={mentionCandidates} defaultName="" onError={discussionError} />}
    {identity && <IdentityModal close={() => setIdentity(null)} continueWith={(displayName, shareName) => { void update(identity.itemId, { purchasedQuantity: identity.purchasedQuantity, displayName, shareName }); setIdentity(null) }} />}
    {noteItem && <NoteModal initial={noteItem} candidates={mentionCandidates} defaultName="" close={() => setNoteItem(null)} save={(note, displayName, shareName) => { const itemId = noteItem.itemId; setNoteItem(null); return update(itemId, { note, displayName, shareName }) }} />}
  </main>
}

function AuthScreen({ onAuthenticated, onError }: { onAuthenticated: (token: string) => void; onError: (e: unknown) => void }) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [adminFactorRequired, setAdminFactorRequired] = useState(false)
  const [adminFactor, setAdminFactor] = useState('')
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState('')
  const register = mode === 'register'
  async function submit(e: FormEvent) {
    e.preventDefault(); setFormError('')
    if (register && !termsAccepted) {
      setFormError('Please accept the Terms of Use and Privacy Policy to create an account.')
      return
    }
    if (register && !ageConfirmed) {
      setFormError('Please confirm that you are at least 13 years old to create an account.')
      return
    }
    if (register && password !== confirmPassword) {
      setFormError('The passwords do not match.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'forgot') {
        const response = await api.forgotPassword(email)
        setMessage(response.message)
        return
      }
      if (register) {
        const response = await api.register(email, password, name.trim(), CURRENT_TERMS_VERSION, ageConfirmed)
        setPendingVerificationEmail(response.email)
        setMessage('We sent a verification link to your email. Open it to finish creating your account.')
      } else {
        onAuthenticated((pendingGoogleCredential ? await api.googleLogin(pendingGoogleCredential, undefined, adminFactor) : await api.login(email, password, adminFactorRequired ? adminFactor : undefined)).accessToken)
      }
    } catch (error) {
      if (register && error instanceof ApiError && error.status === 409) {
        setFormError('An account with this email already exists. Sign in instead, or request a verification link if you still need one.')
      } else if (error instanceof ApiError && error.status === 401 && error.message.includes('Admin verification required')) {
        setAdminFactorRequired(true)
        setFormError('Enter the 6-digit code from your authenticator app. A recovery code also works.')
      } else onError(error)
    } finally { setBusy(false) }
  }
  async function resendVerification() {
    setBusy(true)
    try { setMessage((await api.resendEmailVerification(email || pendingVerificationEmail)).message) }
    catch (error) { onError(error) } finally { setBusy(false) }
  }
  return <main className="auth-page">
    <div className="auth-brand"><Logo /><p>All the wishes.<br />None of the spoilers.</p></div>
    <section className="auth-card">
      <div className="eyebrow">{pendingVerificationEmail ? 'One more step' : mode === 'forgot' ? 'Account recovery' : register ? 'A fresh start' : 'Welcome back'}</div>
      <h1>{pendingVerificationEmail ? 'Check your email' : mode === 'forgot' ? 'Reset your password' : register ? 'Create your account' : 'Sign in to Hushful'}</h1>
      <p className="muted">{pendingVerificationEmail ? `We sent a secure verification link to ${pendingVerificationEmail}. Open it to finish creating your account.` : mode === 'forgot' ? 'Enter your email and we’ll send you a secure reset link.' : register ? 'Keep every thoughtful idea in one calm place.' : 'Your wishlists are waiting for you.'}</p>
      {pendingVerificationEmail ? <div className="stack-form">
        {message && <p className="auth-message" role="status">{message}</p>}
        <button className="primary wide" onClick={() => void resendVerification()} disabled={busy}>{busy && <LoaderCircle className="spin" />} Send another link <RefreshCw /></button>
        <button className="text-button auth-switch" onClick={() => { setPendingVerificationEmail(''); setMessage(''); setMode('login') }}>Back to sign in</button>
      </div> : <>
      <form onSubmit={submit} className="stack-form">
        {register && <Field label="Your name"><input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="How friends know you" required /></Field>}
        <Field label="Email"><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></Field>
        {mode !== 'forgot' && <Field label="Password"><input type="password" autoComplete={register ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required /></Field>}
        {mode === 'login' && adminFactorRequired && <Field label="Admin verification code"><input inputMode="numeric" autoComplete="one-time-code" value={adminFactor} onChange={(e) => setAdminFactor(e.target.value)} placeholder="6-digit code or recovery code" required /></Field>}
        {register && <Field label="Confirm password"><input type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required /></Field>}
        {register && confirmPassword && password !== confirmPassword && <p className="auth-error" role="alert">The passwords do not match.</p>}
        {formError && <p className="auth-error" role="alert">{formError}</p>}
        {message && <p className="auth-message" role="status">{message}</p>}
        {register && <label className="checkbox"><input type="checkbox" checked={ageConfirmed} onChange={(event) => setAgeConfirmed(event.target.checked)} /><span>I confirm that I am at least 13 years old.</span></label>}
        {register && <label className="checkbox"><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} /><span>I agree to the <a href="/terms" target="_blank" rel="noreferrer">Terms of Use</a> and <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.</span></label>}
        <button className="primary wide" disabled={busy || (register && (password !== confirmPassword || !termsAccepted || !ageConfirmed))}>{busy && <LoaderCircle className="spin" />} {mode === 'forgot' ? 'Send reset link' : register ? 'Create account' : 'Sign in'} <ChevronRight /></button>
      </form>
      {mode !== 'forgot' && <>
        <div className="auth-divider"><span>or</span></div>
        <GoogleSignInButton onAuthenticated={onAuthenticated} onError={onError} onAdminFactorRequired={(credential) => { setPendingGoogleCredential(credential); setAdminFactorRequired(true); setFormError('Enter the 6-digit code from your authenticator app. A recovery code also works.') }} register={register} termsAccepted={termsAccepted} ageConfirmed={ageConfirmed} />
      </>}
      {mode === 'login' && <button className="text-button auth-switch" onClick={() => { setMessage(''); setFormError(''); setMode('forgot') }}>Forgot password?</button>}
      {mode === 'login' && <button className="text-button auth-switch" onClick={() => void resendVerification()} disabled={busy || !email}>Need a verification link?</button>}
      <button className="text-button auth-switch" onClick={() => { setMessage(''); setFormError(''); setConfirmPassword(''); setAgeConfirmed(false); setTermsAccepted(false); setMode(mode === 'login' ? 'register' : 'login') }}>{mode === 'register' ? 'Already have an account? Sign in' : mode === 'forgot' ? 'Back to sign in' : 'New to Hushful? Create an account'}</button>
      </>}
    <p className="hint">The iOS app is awaiting App Store approval. Web payments and Android are coming soon.</p>
    </section>
    <PublicFooter />
  </main>
}

function GoogleSignInButton({ onAuthenticated, onError, onAdminFactorRequired, register, termsAccepted, ageConfirmed }: { onAuthenticated: (token: string) => void; onError: (e: unknown) => void; onAdminFactorRequired: (credential: string) => void; register: boolean; termsAccepted: boolean; ageConfirmed: boolean }) {
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
          try {
            if (register && !termsAccepted) { onError(new Error('Please accept the Terms of Use and Privacy Policy first.')); return }
            if (register && !ageConfirmed) { onError(new Error('Please confirm that you are at least 13 years old first.')); return }
            onAuthenticated((await api.googleLogin(credential, register ? CURRENT_TERMS_VERSION : undefined, undefined, ageConfirmed)).accessToken)
          }
          catch (error) { if (error instanceof ApiError && error.status === 401 && error.message.includes('Admin verification required')) onAdminFactorRequired(credential); else onError(error) }
        },
      })
      container.current.replaceChildren()
      window.google.accounts.id.renderButton(container.current, {
        type: 'standard', theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: 360,
      })
    }, 50)
    return () => window.clearInterval(timer)
  }, [onAuthenticated, onError, onAdminFactorRequired, register, termsAccepted, ageConfirmed])
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

function VerifyEmailScreen({ token, onAuthenticated }: { token: string; onAuthenticated: (token: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)
  const started = useRef(false)

  async function verify() {
    setBusy(true); setError('')
    try {
      const response = await api.verifyEmail(token)
      setComplete(true)
      onAuthenticated(response.accessToken)
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to verify your email.') }
    finally { setBusy(false) }
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    void verify()
  // The link token is immutable for the lifetime of this screen. This is kept
  // deliberately one-shot so React Strict Mode cannot consume it twice.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <main className="auth-page">
    <div className="auth-brand"><Logo /><p>All the wishes.<br />None of the spoilers.</p></div>
    <section className="auth-card">
      <div className="eyebrow">Account verification</div>
      <h1>{complete ? 'Email verified' : 'Verify your email'}</h1>
      <p className="muted">{complete ? 'You’re all set. Opening Hushful now.' : busy ? 'Confirming your email now…' : 'Confirm that this email belongs to you before starting with Hushful.'}</p>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {!complete && <button className="primary wide" onClick={() => void verify()} disabled={busy}>{busy && <LoaderCircle className="spin" />} Verify email <Check /></button>}
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
  const collaborativeWishlistIDs = new Set(wishlists.filter((wishlist) => wishlist.isCollaborative === true).map((wishlist) => wishlist.id))
  const canShowAgeRestrictedLists = user.ageBand === 'adult' && user.showAgeRestrictedLists === true
  const sharedForDisplay = shared.filter((share) => !share.wishlistID || !collaborativeWishlistIDs.has(share.wishlistID))
    .filter((share) => canShowAgeRestrictedLists || share.matureContentEnabled !== true)
  const [busy, setBusy] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [proOpen, setProOpen] = useState(false)
  const [refreshingPro, setRefreshingPro] = useState(false)
  const creating = useRef(false)
  async function refreshPro() { setRefreshingPro(true); try { const updated = await api.me(token); setUser(updated); notify(updated.isPro ? 'Hushful Pro is active' : 'Your account is on the free plan.') } catch (e) { onError(e) } finally { setRefreshingPro(false) } }
  useEffect(() => { const refresh = () => { void api.me(token).then(setUser).catch(onError) }; window.addEventListener('focus', refresh); return () => window.removeEventListener('focus', refresh) }, [token, setUser, onError])
  const [shareOpen, setShareOpen] = useState(false)
  const [sharedLibraryOpen, setSharedLibraryOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [feedbackFocus, setFeedbackFocus] = useState(false)
  const [friendsOpen, setFriendsOpen] = useState(false)
  const [peopleSearchOpen, setPeopleSearchOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [occasionsOpen, setOccasionsOpen] = useState(false)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [unreadActivityCount, setUnreadActivityCount] = useState(0)
  const [pins, setPins] = useState<Pins>({ wishlistIDs: [], userIDs: [], groupIDs: [] })
  const [socialFriends, setSocialFriends] = useState<Friendship[]>([])
  const [socialGroups, setSocialGroups] = useState<FriendGroup[]>([])
  const [personToOpen, setPersonToOpen] = useState<SocialUser | undefined>()
  const [mobileNav, setMobileNav] = useState(false)
  const tutorialKey = `hushful.tutorial.v3.seen.${user.id}`
  const [tutorialOpen, setTutorialOpen] = useState(() => localStorage.getItem(tutorialKey) !== '1')

  const loadWishlists = useCallback(async () => { try { setWishlists((await api.wishlists(token)).map((wishlist) => ({ ...wishlist, proAccess: user.isPro === true }))) } catch (e) { onError(e) } finally { setBusy(false) } }, [token, user.isPro, onError])
  useEffect(() => { void loadWishlists() }, [loadWishlists])
  const loadAccountShares = useCallback(async () => {
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
        const updated = { shareToken: cached?.shareToken || '', title: share.title, sharedByName: share.sharedByName, accountShareID: share.id, wishlistID: share.wishlistID, matureContentEnabled: share.matureContentEnabled === true }
        if (updated.shareToken) shareStorage.save(user.id, updated, shareStorage.viewerToken(user.id, updated.shareToken) || '')
        return updated
      }).sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })))
    } catch (error) { onError(error) }
  }, [token, user.id, onError])
  const loadActivity = useCallback(async () => { try { const [items, unread] = await Promise.all([api.activity(token), api.unreadActivityCount(token)]); setActivity(items); setUnreadActivityCount(unread.count) } catch (e) { onError(e) } }, [token, onError])
  useEffect(() => { void loadActivity(); const timer = window.setInterval(() => void loadActivity(), 30000); return () => window.clearInterval(timer) }, [loadActivity])
  useEffect(() => { Promise.all([api.pins(token), api.friends(token), api.friendGroups(token)]).then(([p, f, g]) => { setPins(p); setSocialFriends(f); setSocialGroups(g) }).catch(onError) }, [token, onError])
  useEffect(() => { void loadAccountShares() }, [loadAccountShares])
  useEffect(() => {
    const match = window.location.pathname.match(/^\/share\/([^/]+)/)
    if (match) setShareOpen(true)
  }, [])

  function select(next: View) { setView(next); setMobileNav(false) }
  async function toggleWishlistPin(id: string) { try { setPins(await (pins.wishlistIDs.includes(id) ? api.unpin(token, 'wishlist', id) : api.pin(token, 'wishlist', id))); notify(pins.wishlistIDs.includes(id) ? 'Removed from pinned lists' : 'Pinned to home') } catch (e) { onError(e) } }
  function openCreate() { if (!busy && canCreateWishlist(user.isPro === true, wishlists)) setCreateOpen(true); else if (!busy) setProOpen(true) }
  async function createWishlist(title: string, visibility: 'public' | 'private') {
    if (creating.current) return
    creating.current = true
    try {
      const [account, latest] = await Promise.all([api.me(token), api.wishlists(token)])
      setUser(account)
      if (!canCreateWishlist(account.isPro === true, latest)) { setWishlists(latest); setCreateOpen(false); setProOpen(true); return }
      let created = await api.createWishlist(token, title, visibility); if (created.visibility !== visibility) { const settings = await api.updateWishlistSettings(token, created.id, { visibility }); created = { ...created, visibility: settings.visibility } }; created = { ...created, proAccess: account.isPro === true }; setWishlists((old) => [created, ...old]); setCreateOpen(false); select({ kind: 'wishlist', wishlist: created }); notify('Wishlist created') } catch (e) { onError(e) } finally { creating.current = false }
  }
  function saveShare(share: SharedWishlist, viewerToken: string) {
    shareStorage.save(user.id, share, viewerToken); setShared(shareStorage.list(user.id)); setShareOpen(false); select({ kind: 'shared', share })
    if (window.location.pathname.startsWith('/share/')) window.history.replaceState({}, '', '/')
  }
  async function addShareToAccount(share: SharedWishlist) {
    if (!share.shareToken) throw new Error('Open the original share link to add this list to your account.')
    const viewerToken = shareStorage.viewerToken(user.id, share.shareToken) || undefined
    const saved = await api.saveAccountShare(token, share.shareToken, viewerToken)
    const updated = { ...share, title: saved.title, sharedByName: saved.sharedByName, accountShareID: saved.id, wishlistID: saved.wishlistID, matureContentEnabled: saved.matureContentEnabled === true }
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
        <button className="nav-home" onClick={() => { setActivityOpen(true); setMobileNav(false) }}><Bell /> Activity {unreadActivityCount > 0 && <span className="notification-badge">{unreadActivityCount}</span>}</button>
        <button className="nav-home" onClick={() => { setFeedbackFocus(true); setAccountOpen(true); setMobileNav(false) }}><MessageCircle /> Send feedback</button>
        <button className="nav-home" onClick={() => { if (user.isPro) setOccasionsOpen(true); else setProOpen(true); setMobileNav(false) }}><CalendarDays /> Occasions{!user.isPro && <small>Pro</small>}</button>
        <NavGroup title="My wishlists" action={<button aria-label="New wishlist" onClick={openCreate}><Plus /></button>}>
          {wishlists.filter((wishlist) => wishlist.isCollaborative !== true).map((wishlist) => <button key={wishlist.id} className={view.kind === 'wishlist' && view.wishlist.id === wishlist.id ? 'active' : ''} onClick={() => select({ kind: 'wishlist', wishlist })}><span className="nav-dot" />{wishlist.title}</button>)}
        </NavGroup>
        {wishlists.some((wishlist) => wishlist.isCollaborative === true) && <NavGroup title="My collaborations" action={<Users />}>
          {wishlists.filter((wishlist) => wishlist.isCollaborative === true).map((wishlist) => <button key={wishlist.id} className={view.kind === 'wishlist' && view.wishlist.id === wishlist.id ? 'active' : ''} onClick={() => select({ kind: 'wishlist', wishlist })}><span className="nav-dot shared-dot" />{wishlist.title}</button>)}
        </NavGroup>}
        <NavGroup title="Pinned lists" action={<Pin />}>
          {wishlists.filter((wishlist) => pins.wishlistIDs.includes(wishlist.id)).map((wishlist) => <button key={wishlist.id} onClick={() => select({ kind: 'wishlist', wishlist })}><span className="nav-dot" />{wishlist.title}</button>)}
          {sharedForDisplay.filter((share) => share.wishlistID && pins.wishlistIDs.includes(share.wishlistID)).map((share) => <button key={share.accountShareID || share.shareToken} onClick={() => select({ kind: 'shared', share })}><span className="nav-dot shared-dot" />{share.title}</button>)}
        </NavGroup>
        <NavGroup title="Pinned people & groups" action={<Users />}>
          {socialFriends.filter((friend) => pins.userIDs.includes(friend.user.id)).map((friend) => <button key={friend.id} onClick={() => { setPersonToOpen(friend.user); setPeopleSearchOpen(true) }}><span className="nav-dot shared-dot" />{friend.user.displayName || `@${friend.user.username}`}</button>)}
          {socialGroups.filter((group) => pins.groupIDs.includes(group.id)).map((group) => <button key={group.id} onClick={() => setFriendsOpen(true)}><span className="nav-dot shared-dot" />{group.name}</button>)}
        </NavGroup>
        <button className="nav-home" onClick={() => setSharedLibraryOpen(true)}><Link2 /> All shared lists</button>
      </nav>
      <button className="tutorial-button" onClick={() => setProOpen(true)}><Sparkles /> {user.isPro ? 'Hushful Pro active' : 'Explore Hushful Pro'}</button>
      <button className="tutorial-button" onClick={() => setTutorialOpen(true)}><CircleHelp /> How Hushful works</button>
      <button className="profile-chip" onClick={() => setAccountOpen(true)}><Avatar name={user.displayName || user.email} userId={user.id} hasAvatar={user.hasAvatar} /><span><strong>{user.displayName || 'Your account'}</strong><small>{user.email}</small></span><Settings /></button>
    </aside>
    {mobileNav && <button className="scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    <main className="main-panel">
      <header className="mobile-header"><button className="icon-button" onClick={() => setMobileNav(true)}><Menu /></button><Logo compact /><span /></header>
      {busy ? <FullPageLoader embedded /> : view.kind === 'home' ? <Home user={user} wishlists={wishlists} shared={sharedForDisplay.filter((share) => Boolean(share.wishlistID && pins.wishlistIDs.includes(share.wishlistID)))} openWishlist={(w) => select({ kind: 'wishlist', wishlist: w })} openShared={(s) => select({ kind: 'shared', share: s })} newWishlist={openCreate} openShare={() => setShareOpen(true)} /> : view.kind === 'wishlist' ? <WishlistDetail token={token} wishlist={{ ...view.wishlist, proAccess: user.isPro === true }} canUseMatureContent={user.ageBand === 'adult'} onDeleted={() => { setWishlists((all) => all.filter((list) => list.id !== view.wishlist.id)); select({ kind: 'home' }); notify('Wishlist deleted') }} allWishlists={wishlists} pinned={pins.wishlistIDs.includes(view.wishlist.id)} togglePin={() => void toggleWishlistPin(view.wishlist.id)} onRenamed={(updated) => { setWishlists((all) => all.map((item) => item.id === updated.id ? updated : item)); setView({ kind: 'wishlist', wishlist: updated }) }} onError={onError} notify={notify} /> : <SharedDetail token={token} accountId={user.id} defaultNoteName={user.displayName || user.email.split('@')[0]} share={view.share} pinned={Boolean(view.share.wishlistID && pins.wishlistIDs.includes(view.share.wishlistID))} togglePin={() => view.share.wishlistID && void toggleWishlistPin(view.share.wishlistID)} onError={onError} notify={notify} onRemove={() => void removeShare(view.share)} onAdd={() => addShareToAccount(view.share)} />}
    </main>
    {proOpen && <Modal close={() => setProOpen(false)}><ModalHeader eyebrow="Your plan" title={user.isPro ? "Hushful Pro is active" : "Make room for more wishes"} close={() => setProOpen(false)} /><ProPlan isPro={user.isPro === true} activeLists={activeOwnedListCount(wishlists)} /><button className="secondary" disabled={refreshingPro} onClick={() => void refreshPro()}><RefreshCw /> {refreshingPro ? 'Checking…' : 'Refresh Pro status'}</button></Modal>}
    {createOpen && <CreateWishlistModal close={() => setCreateOpen(false)} create={createWishlist} />}
    {shareOpen && <OpenShareModal accessToken={token} accountId={user.id} initialToken={window.location.pathname.match(/^\/share\/([^/]+)/)?.[1]} close={() => setShareOpen(false)} save={saveShare} onError={onError} />}
    {sharedLibraryOpen && <Modal close={() => setSharedLibraryOpen(false)} size="modal-wide"><ModalHeader eyebrow="Your complete library" title="All shared lists" close={() => setSharedLibraryOpen(false)} /><div className="social-stack">{sharedForDisplay.length ? [...sharedForDisplay].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })).map((share) => <button className="profile-list-row" key={share.accountShareID || share.shareToken} onClick={() => { setSharedLibraryOpen(false); select({ kind: 'shared', share }) }}><Gift /><span><strong>{share.title}</strong><small>Shared by {share.sharedByName || 'Someone'}</small></span><ChevronRight /></button>) : <p className="hint">No lists have been shared with you yet.</p>}<div className="modal-actions"><button className="secondary" onClick={() => { setSharedLibraryOpen(false); setShareOpen(true) }}><Link2 /> Open a link</button></div></div></Modal>}
    {friendsOpen && <FriendsModal token={token} close={() => setFriendsOpen(false)} onError={onError} notify={notify} openShare={(saved) => { const share = { shareToken: '', title: saved.title, sharedByName: saved.sharedByName, accountShareID: saved.id, wishlistID: saved.wishlistID }; setShared((all) => all.some((item) => item.accountShareID === saved.id) ? all : [...all, share]); setFriendsOpen(false); select({ kind: 'shared', share }) }} />}
    {peopleSearchOpen && <UserSearchModal token={token} initialPerson={personToOpen} close={() => { setPeopleSearchOpen(false); setPersonToOpen(undefined) }} onError={onError} notify={notify} openShare={(saved) => { const share = { shareToken: '', title: saved.title, sharedByName: saved.sharedByName, accountShareID: saved.id, wishlistID: saved.wishlistID }; setShared((all) => all.some((item) => item.accountShareID === saved.id) ? all : [...all, share]); setPeopleSearchOpen(false); setPersonToOpen(undefined); select({ kind: 'shared', share }) }} />}
    {activityOpen && <ActivityModal token={token} items={activity} changed={(next) => { setActivity(next); setUnreadActivityCount(next.filter((item) => !item.readAt).length) }} close={() => setActivityOpen(false)} onError={onError} />}
    {user.isPro === true && occasionsOpen && <OccasionsModal token={token} close={() => setOccasionsOpen(false)} onError={onError} notify={notify} createWishlist={createWishlist} />}
    {accountOpen && <AccountModal token={token} user={user} userChanged={setUser} onSharedListsPreferenceChanged={() => void loadAccountShares()} focusFeedback={feedbackFocus} close={() => { setAccountOpen(false); setFeedbackFocus(false) }} onError={onError} notify={notify} logout={logout} />}
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
        <div className="card-grid">{owned.map((wishlist, index) => <button className="wishlist-card" key={wishlist.id} onClick={() => openWishlist({ ...wishlist, proAccess: user.isPro === true })}><div className={`card-art art-${index % 4}`}><Gift /></div><div><span className="card-kicker">Wishlist</span><h3>{wishlist.title}</h3><p>{wishlist.visibility === 'public' ? 'Public' : 'Private'}</p></div><ChevronRight /></button>)}</div>
      </section>
      {collaborations.length > 0 && <section><SectionTitle title="My collaborations" subtitle={`${collaborations.length} co-owned ${collaborations.length === 1 ? 'list' : 'lists'}`} action={<Users />} /><div className="card-grid">{collaborations.map((wishlist, index) => <button className="wishlist-card" key={wishlist.id} onClick={() => openWishlist({ ...wishlist, proAccess: user.isPro === true })}><div className={`card-art art-${(index + 1) % 4}`}><Users /></div><div><span className="card-kicker">Collaborative list</span><h3>{wishlist.title}</h3><p>{wishlist.visibility === 'public' ? 'Public' : 'Private'}</p></div><ChevronRight /></button>)}</div></section>}
      {user.isPro === true && archived.length > 0 && <section><SectionTitle title="Archived" subtitle={`${archived.length} saved ${archived.length === 1 ? 'list' : 'lists'}`} action={<Gift />} /><div className="card-grid">{archived.map((wishlist, index) => <button className="wishlist-card" key={wishlist.id} onClick={() => openWishlist({ ...wishlist, proAccess: true })}><div className={`card-art art-${(index + 2) % 4}`}><Gift /></div><div><span className="card-kicker">Archived wishlist</span><h3>{wishlist.title}</h3><p>View or restore</p></div><ChevronRight /></button>)}</div></section>}
      <section><SectionTitle title="Shared with me" subtitle="Gift ideas from your favorite people" action={<button className="text-button" onClick={openShare}>Open a link <Link2 /></button>} />
        {shared.length ? <div className="shared-row">{[...shared].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })).map((share) => <button className="shared-card" key={share.accountShareID || share.shareToken} onClick={() => openShared(share)}><Avatar name={share.sharedByName || 'Someone'} /><span><strong>{share.title}</strong><small>From {share.sharedByName || 'Someone'}</small></span><ChevronRight /></button>)}</div> : <button className="share-placeholder" onClick={openShare}><Link2 /><span><strong>Have a Hushful link?</strong><small>Paste it here to keep the list close.</small></span></button>}
      </section>
    </>}
  </div>
}

function WishlistDetail({ token, wishlist, allWishlists, canUseMatureContent, pinned, togglePin, onRenamed, onDeleted, onError, notify }: { token: string; wishlist: Wishlist; allWishlists: Wishlist[]; canUseMatureContent: boolean; pinned: boolean; togglePin: () => void; onRenamed: (wishlist: Wishlist) => void; onDeleted: () => void; onError: (e: unknown) => void; notify: (s: string) => void }) {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [planningRows, setPlanningRows] = useState<Record<string, SharedItemRow>>({})
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [deletingList, setDeletingList] = useState(false)
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null)
  const [sharing, setSharing] = useState(false)
  const [guestLinksOpen, setGuestLinksOpen] = useState(false)
  const [collaborating, setCollaborating] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'manual' | 'name' | 'price-low' | 'price-high' | 'newest'>('manual')
  const [pricedOnly, setPricedOnly] = useState(false)
  const [mentionCandidates, setMentionCandidates] = useState<SocialUser[]>([])
  const load = useCallback(async () => { setLoading(true); try { const [loadedItems, planning] = await Promise.all([api.items(token, wishlist.id), wishlist.collaborationMode === 'gift_planning' ? api.giftPlanningItems(token, wishlist.id) : Promise.resolve([])]); setItems(loadedItems); setPlanningRows(Object.fromEntries(planning.map((row) => [row.item.id, row]))) } catch (e) { onError(e) } finally { setLoading(false) } }, [token, wishlist.id, wishlist.collaborationMode, onError])
  useEffect(() => { void load() }, [load])
  useEffect(() => { api.wishlistMentionCandidates(token, wishlist.id).then(setMentionCandidates).catch(() => setMentionCandidates([])) }, [token, wishlist.id])
  async function remove(item: WishlistItem) { if (!window.confirm(`Remove “${item.title}” from this wishlist? If it is linked to other wishlists, it will remain there.`)) return; const old = items; setItems((all) => all.filter((i) => i.id !== item.id)); try { await api.deleteItem(token, wishlist.id, item.id); notify('Item removed') } catch (e) { setItems(old); onError(e) } }
  const visibleItems = items.filter((item) => (!pricedOnly || item.price != null) && (!query.trim() || item.title.toLowerCase().includes(query.toLowerCase()) || item.ownerNote?.toLowerCase().includes(query.toLowerCase()))).sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title) : sort === 'price-low' ? (a.price ?? Infinity) - (b.price ?? Infinity) : sort === 'price-high' ? (b.price ?? -Infinity) - (a.price ?? -Infinity) : sort === 'newest' ? Date.parse(b.createdAt) - Date.parse(a.createdAt) : 0)
  return <div className="page detail-page">
    <header className="page-heading"><div><p className="eyebrow">{wishlist.isPrimaryOwner === false ? 'Collaborative wishlist' : 'My wishlist'}</p><h1>{wishlist.title}</h1><p>{wishlist.description || `${items.length} ${items.length === 1 ? 'wish' : 'wishes'} tucked away`} · {wishlist.visibility === 'public' ? 'Public' : 'Private'}</p></div><div className="heading-actions"><button className="secondary" onClick={() => setRenaming(true)}><Pencil /> Rename</button><button className="secondary" onClick={() => setEditingDescription(true)}><Pencil /> Description</button><button className="secondary" onClick={() => setCollaborating(true)}><Users /> Owners & purpose</button><button className="secondary" onClick={togglePin}><Pin /> {pinned ? 'Unpin' : 'Pin'}</button>{wishlist.isPrimaryOwner !== false && <><button className="secondary" onClick={() => setSharing(true)}><Share2 /> Sharing & privacy</button><button className="secondary" onClick={() => setGuestLinksOpen(true)}><Link2 /> Guest links</button></>}<button className="primary" onClick={() => setAddOpen(true)}><Plus /> Add item</button></div></header>
    <div className="heading-actions"><input aria-label="Search this list" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this list" /><select aria-label="Sort items" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}><option value="manual">Manual order</option><option value="name">Name</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="newest">Newest</option></select><label className="checkbox"><input type="checkbox" checked={pricedOnly} onChange={(e) => setPricedOnly(e.target.checked)} /><span>Priced items only</span></label></div>
    {wishlist.isCollaborative && <DiscussionPanel token={token} wishlistID={wishlist.id} defaultName={''} onError={onError} />}
    {loading ? <FullPageLoader embedded /> : visibleItems.length ? <div className="items-grid">{visibleItems.map((item) => <OwnerItemCard key={item.id} token={token} item={item} planningRow={planningRows[item.id]} edit={() => setEditingItem(item)} remove={() => remove(item)} />)}</div> : <EmptyState icon={<Gift />} title={items.length ? "No wishes match those filters" : "This list is ready for a first wish"} text={items.length ? "Try a different search or clear the price filter." : "Add an item, a thoughtful note, and an optional link or price."} action={!items.length ? <button className="primary" onClick={() => setAddOpen(true)}><Plus /> Add your first item</button> : undefined} />}
    {addOpen && <AddItemModal token={token} wishlist={wishlist} allWishlists={allWishlists} candidates={mentionCandidates} close={() => setAddOpen(false)} save={async (item, image) => { const created = await api.createItem(token, wishlist.id, item); if (image.file) await api.uploadItemImage(token, wishlist.id, created.id, image.file); setItems((all) => [created, ...all]); setAddOpen(false); notify('Wish added') }} />}
    {editingItem && <AddItemModal token={token} wishlist={wishlist} allWishlists={allWishlists} candidates={mentionCandidates} initial={editingItem} close={() => setEditingItem(null)} save={async (changes, image) => { const updated = await api.updateItem(token, wishlist.id, editingItem.id, changes); if (image.file) await api.uploadItemImage(token, wishlist.id, editingItem.id, image.file); else if (image.remove) await api.removeItemImage(token, wishlist.id, editingItem.id); setItems((all) => all.map((item) => item.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : item)); setEditingItem(null); notify('Wish updated') }} />}
    {sharing && <SocialShareModal token={token} wishlist={wishlist} canUseMatureContent={canUseMatureContent} close={() => setSharing(false)} notify={notify} onError={onError} />}
    {guestLinksOpen && <GuestLinksModal token={token} wishlistID={wishlist.id} title={wishlist.title} close={() => setGuestLinksOpen(false)} onError={onError} notify={notify} />}
    {collaborating && <WishlistCollaborationModal token={token} wishlist={wishlist} close={() => setCollaborating(false)} notify={notify} onError={onError} />}
    {renaming && <RenameWishlistModal initial={wishlist.title} close={() => setRenaming(false)} save={async (title) => { try { const updated = await api.renameWishlist(token, wishlist.id, title); onRenamed(updated); setRenaming(false); notify('Wishlist renamed') } catch (e) { onError(e) } }} />}
    {wishlist.isPrimaryOwner !== false && <div className="danger-zone"><button className="text-button danger-text" disabled={deletingList} onClick={async () => { if (!window.confirm(`Permanently delete “${wishlist.title}” and its contents? This cannot be undone.`)) return; setDeletingList(true); try { await api.deleteWishlist(token, wishlist.id); onDeleted() } catch (e) { onError(e); setDeletingList(false) } }}><Trash2 /> {deletingList ? 'Deleting…' : 'Delete wishlist'}</button><p className="hint">Deleting an active list frees a place on your free plan.</p></div>}
    {editingDescription && <DescriptionModal initial={wishlist.description || ''} close={() => setEditingDescription(false)} save={async (description) => { try { await api.updateWishlistSettings(token, wishlist.id, { description }); onRenamed({ ...wishlist, description }); setEditingDescription(false); notify('Description saved') } catch (e) { onError(e) } }} />}
  </div>
}

function priceMatches(item: WishlistItem, minimum: string, maximum: string) {
  const min = minimum.trim() ? Number(minimum.replace(',', '.')) : undefined
  const max = maximum.trim() ? Number(maximum.replace(',', '.')) : undefined
  if (!Number.isFinite(min) && !Number.isFinite(max)) return true
  const price = item.price ?? item.contributionGoal
  if (price == null) return false
  return (!Number.isFinite(min) || price >= (min as number)) && (!Number.isFinite(max) || price <= (max as number))
}

type SharedItemSort = 'manual' | 'name' | 'price-low' | 'price-high'
function sortSharedRows(rows: SharedItemRow[], sort: SharedItemSort) {
  return [...rows].sort((a, b) => sort === 'name' ? a.item.title.localeCompare(b.item.title) : sort === 'price-low' ? ((a.item.price ?? a.item.contributionGoal ?? Infinity) - (b.item.price ?? b.item.contributionGoal ?? Infinity)) : sort === 'price-high' ? ((b.item.price ?? b.item.contributionGoal ?? -Infinity) - (a.item.price ?? a.item.contributionGoal ?? -Infinity)) : 0)
}

function PriceFilter({ minimum, maximum, setMinimum, setMaximum, sort, setSort }: { minimum: string; maximum: string; setMinimum: (value: string) => void; setMaximum: (value: string) => void; sort: SharedItemSort; setSort: (value: SharedItemSort) => void }) {
  const active = minimum.trim() || maximum.trim()
  return <details className="price-filter"><summary><Settings /> Sort &amp; filter {active && <small>Price filter active</small>}</summary><div className="price-filter-content"><Field label="Sort wishes"><select value={sort} onChange={(event) => setSort(event.target.value as SharedItemSort)}><option value="manual">Original order</option><option value="name">Name</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></Field><div className="field-row"><Field label="Minimum"><input inputMode="decimal" value={minimum} onChange={(event) => setMinimum(event.target.value)} placeholder="No minimum" aria-label="Minimum price" /></Field><Field label="Maximum / limit"><input inputMode="decimal" value={maximum} onChange={(event) => setMaximum(event.target.value)} placeholder="No maximum" aria-label="Maximum price or spending limit" /></Field></div><small>Leave Min blank to use Max as a spending limit.</small>{active && <button className="text-button" onClick={() => { setMinimum(''); setMaximum('') }}>Clear price filter</button>}</div></details>
}

function SharedDetail({ token, accountId, defaultNoteName, share, pinned, togglePin, onError, notify, onRemove, onAdd }: { token: string; accountId: string; defaultNoteName: string; share: SharedWishlist; pinned: boolean; togglePin: () => void; onError: (e: unknown) => void; notify: (message: string) => void; onRemove: () => void; onAdd: () => Promise<void> }) {
  const viewerToken = shareStorage.viewerToken(accountId, share.shareToken)
  const [rows, setRows] = useState<SharedItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [identity, setIdentity] = useState<{ itemId: string; purchasedQuantity?: number; note?: string } | null>(null)
  const [noteItem, setNoteItem] = useState<{ itemId: string; note?: string; displayName?: string; shareName?: boolean } | null>(null)
  const [mentionCandidates, setMentionCandidates] = useState<SocialUser[]>([])
  const [minimumPrice, setMinimumPrice] = useState('')
  const [maximumPrice, setMaximumPrice] = useState('')
  const [sort, setSort] = useState<SharedItemSort>('manual')
  const [saving, setSaving] = useState(false)
  const visibleRows = sortSharedRows(rows.filter((row) => priceMatches(row.item, minimumPrice, maximumPrice)), sort)
  const load = useCallback(async () => { if (!viewerToken && !share.accountShareID) return; setLoading(true); try { setRows(share.accountShareID ? await api.accountSharedItems(token, share.accountShareID) : await api.sharedItems(share.shareToken, viewerToken!)) } catch (e) { onError(e) } finally { setLoading(false) } }, [token, viewerToken, share.shareToken, share.accountShareID, onError])
  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (share.accountShareID) api.accountMentionCandidates(token, share.accountShareID).then(setMentionCandidates).catch(() => setMentionCandidates([]))
    else if (viewerToken) api.mentionCandidates(share.shareToken, viewerToken).then(setMentionCandidates).catch(() => setMentionCandidates([]))
    else setMentionCandidates([])
  }, [token, share.accountShareID, share.shareToken, viewerToken])
  async function update(itemId: string, body: { purchased?: boolean; purchasedQuantity?: number; note?: string; displayName?: string; shareName?: boolean }) { if (!viewerToken && !share.accountShareID) return; try { const row = share.accountShareID ? await api.updateAccountSharedItem(token, share.accountShareID, itemId, body) : await api.updateSharedItem(share.shareToken, itemId, viewerToken!, body); setRows((all) => all.map((r) => r.item.id === itemId ? row : r)) } catch (e) { onError(e); void load() } }
  async function reportList() { const details = window.prompt('Tell us what happened (optional):', ''); if (details === null) return; try { await api.reportSharedWishlist(token, share.accountShareID, share.shareToken, 'other', details); window.alert('Thanks. Your report was sent to Hushful administrators for review.') } catch (error) { onError(error) } }
  return <div className="page detail-page shared-detail">
    <header className="page-heading"><div><p className="eyebrow">Shared by {share.sharedByName || 'Someone'}</p><h1>{share.title}</h1><p>Claims stay hidden from the person who made this list.</p></div><div className="heading-actions"><button className="secondary" disabled={!share.wishlistID} onClick={togglePin}><Pin /> {pinned ? 'Unpin' : 'Pin'}</button><button className="secondary" onClick={() => void load()}><RefreshCw /> Refresh</button><button className="icon-button danger" aria-label="Report shared list" onClick={() => void reportList()}><CircleAlert /></button><button className="icon-button danger" aria-label="Remove saved list" onClick={onRemove}><Trash2 /></button></div></header>
    <section className="save-shared-panel">
      <div><strong>{share.accountShareID ? 'Saved to your account' : 'Keep this list close'}</strong><span>{share.accountShareID ? 'You can save it again to verify the account connection.' : 'Add it to Shared With Me so it follows you across devices and sign-ins.'}</span></div>
      <div className="save-shared-actions">
        {share.shareToken ? <button className="primary" disabled={saving} onClick={async () => { setSaving(true); try { await onAdd() } catch (e) { onError(e) } finally { setSaving(false) } }}>{saving ? <LoaderCircle className="spin" /> : <Plus />}{saving ? 'Saving…' : 'Add to Shared With Me'}</button> : <span className="saved-account-label"><Check /> Saved to Shared With Me</span>}
        {share.accountShareID && share.shareToken && <button className="secondary danger-text" onClick={onRemove}><Trash2 /> Remove from account</button>}
      </div>
    </section>
    <PriceFilter minimum={minimumPrice} maximum={maximumPrice} setMinimum={setMinimumPrice} setMaximum={setMaximumPrice} sort={sort} setSort={setSort} />
    {loading ? <FullPageLoader embedded /> : rows.length ? visibleRows.length ? <div className="items-grid">{visibleRows.map((row) => <SharedItemCard key={row.item.id} accessToken={token} row={row} onError={onError} notify={notify} chooseQuantity={(quantity) => quantity === 0 ? void update(row.item.id, { purchasedQuantity: 0 }) : setIdentity({ itemId: row.item.id, purchasedQuantity: quantity })} editNote={(note) => setNoteItem({ itemId: row.item.id, note: note?.note, displayName: note?.authorDisplayName, shareName: Boolean(note?.authorDisplayName) })} removeNote={async () => { await update(row.item.id, { note: '', shareName: false }); await load() }} />)}</div> : <EmptyState icon={<Gift />} title="No wishes match this price filter" text="Try a wider range or clear the filter." /> : <EmptyState icon={<Gift />} title="There’s nothing here yet" text="Check back after the list owner adds a wish." />}
    <DiscussionPanel token={token} shareToken={share.shareToken} viewerToken={viewerToken || undefined} accountShareID={share.accountShareID} mentionCandidates={mentionCandidates} defaultName={defaultNoteName} onError={onError} />
    {identity && <IdentityModal close={() => setIdentity(null)} continueWith={(displayName, shareName) => { void update(identity.itemId, { purchasedQuantity: identity.purchasedQuantity, note: identity.note, displayName, shareName }); setIdentity(null) }} />}
    {noteItem && <NoteModal initial={noteItem} candidates={mentionCandidates} defaultName={defaultNoteName} close={() => setNoteItem(null)} save={async (note, displayName, shareName) => { const itemId = noteItem.itemId; setNoteItem(null); await update(itemId, { note, displayName, shareName }); await load() }} />}
  </div>
}

function MentionTextarea({ value, onChange, candidates, placeholder, rows = 3, maxLength }: { value: string; onChange: (value: string) => void; candidates: SocialUser[]; placeholder: string; rows?: number; maxLength?: number }) {
  const at = value.lastIndexOf('@')
  const query = at >= 0 && (at === 0 || !/[A-Za-z0-9_]/.test(value[at - 1]))
    ? value.slice(at + 1).match(/^[A-Za-z0-9_]*$/)?.[0]
    : undefined
  const suggestions = query === undefined ? [] : candidates.filter((candidate) => candidate.username.toLowerCase().startsWith(query.toLowerCase())).slice(0, 5)
  function insert(username: string) { if (at < 0) return; onChange(`${value.slice(0, at)}@${username} `) }
  return <div className="mention-editor">
    <textarea value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} />
    {suggestions.length > 0 && <div className="mention-suggestions" aria-label="Mention suggestions">{suggestions.map((candidate) => <button type="button" key={candidate.id} onClick={() => insert(candidate.username)}>@{candidate.username}</button>)}</div>}
  </div>
}

function DiscussionPanel({ token, wishlistID, shareToken = '', viewerToken, accountShareID, mentionCandidates: suppliedCandidates, defaultName, onError, notify }: { token?: string; wishlistID?: string; shareToken?: string; viewerToken?: string; accountShareID?: string; mentionCandidates?: SocialUser[]; defaultName: string; onError: (error: unknown) => void; notify?: (message: string) => void }) {
  const [comments, setComments] = useState<WishlistDiscussionComment[]>([])
  const [message, setMessage] = useState('')
  const [name, setName] = useState(() => defaultName || localStorage.getItem('hushful.displayName') || '')
  const [anonymous, setAnonymous] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [loadedCandidates, setLoadedCandidates] = useState<SocialUser[]>(suppliedCandidates || [])

  useEffect(() => { setLoadedCandidates(suppliedCandidates || []) }, [suppliedCandidates])

  useEffect(() => {
    if (suppliedCandidates) return
    if (wishlistID && token) api.wishlistDiscussionMentionCandidates(token, wishlistID).then(setLoadedCandidates).catch(() => setLoadedCandidates([]))
    else if (accountShareID && token) api.accountMentionCandidates(token, accountShareID).then(setLoadedCandidates).catch(() => setLoadedCandidates([]))
    else if (shareToken && viewerToken) api.mentionCandidates(shareToken, viewerToken).then(setLoadedCandidates).catch(() => setLoadedCandidates([]))
    else setLoadedCandidates([])
  }, [suppliedCandidates, wishlistID, token, accountShareID, shareToken, viewerToken])

  const load = useCallback(async () => {
    if (!wishlistID && !accountShareID && (!shareToken || !viewerToken)) return
    setLoading(true)
    try {
      setComments(wishlistID && token
        ? await api.wishlistDiscussion(token, wishlistID)
        : accountShareID && token
        ? await api.accountDiscussion(token, accountShareID)
        : await api.discussion(shareToken, viewerToken!))
    } catch (error) { onError(error) }
    finally { setLoading(false) }
  }, [token, wishlistID, shareToken, viewerToken, accountShareID, onError])

  useEffect(() => { void load() }, [load])

  async function post(event: FormEvent) {
    event.preventDefault()
    const trimmed = message.trim()
    if (!trimmed || (!anonymous && !name.trim())) return
    setSending(true)
    try {
      const body = { message: trimmed, displayName: anonymous ? undefined : name.trim(), shareName: !anonymous }
      const created = wishlistID && token
        ? await api.createWishlistDiscussionComment(token, wishlistID, body)
        : accountShareID && token
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
      if (wishlistID && token) await api.deleteWishlistDiscussionComment(token, wishlistID, comment.id)
      else if (accountShareID && token) await api.deleteAccountDiscussionComment(token, accountShareID, comment.id)
      else await api.deleteDiscussionComment(shareToken, viewerToken!, comment.id)
      setComments((all) => all.filter((item) => item.id !== comment.id))
    } catch (error) { onError(error) }
  }

  return <section className="discussion-panel">
    <div className="discussion-heading">
      <div className="discussion-title"><span><MessageCircle /></span><div><strong>{wishlistID ? 'Joint wishlist discussion' : 'Gift-planning discussion'}</strong><small>{wishlistID ? 'Visible to everyone in this joint wishlist' : 'Private from every wishlist owner'}</small></div></div>
      <button className="text-button" onClick={() => void load()}><RefreshCw /> Refresh</button>
    </div>
    <div className="discussion-comments" aria-live="polite">
      {loading && !comments.length ? <div className="discussion-empty"><LoaderCircle className="spin" /> Loading discussion…</div> : comments.length ? comments.map((comment) => <article className="discussion-comment" key={comment.id}>
        <div><strong>{comment.authorDisplayName || 'Anonymous'}</strong><time>{comment.createdAt ? new Date(comment.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : ''}</time></div>
        <p>{comment.message}</p>
        {comment.isMine ? <button className="text-button danger-text" onClick={() => void remove(comment)}><Trash2 /> Delete</button> : token && <button className="text-button" onClick={async () => { try { await api.reportDiscussionComment(token, comment.id); notify?.('Thanks—your report was sent to Hushful.') } catch (error) { onError(error) } }}>Report</button>}
      </article>) : <div className="discussion-empty">No comments yet. Start the conversation with the other gift planners.</div>}
    </div>
    <form className="discussion-composer" onSubmit={post}>
      <MentionTextarea value={message} onChange={setMessage} candidates={loadedCandidates} placeholder="Write a comment…" rows={3} maxLength={1000} />
      <div className="discussion-identity">
        <label className="checkbox"><input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} /><span><strong>Post anonymously</strong></span></label>
        {!anonymous && <input aria-label="Your name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" maxLength={80} />}
        <button className="primary" disabled={sending || !message.trim() || (!anonymous && !name.trim())}>{sending ? <LoaderCircle className="spin" /> : <Send />}{sending ? 'Posting…' : 'Post comment'}</button>
      </div>
    </form>
  </section>
}

function OwnerItemCard({ token, item, planningRow, edit, remove }: { token: string; item: WishlistItem; planningRow?: SharedItemRow; edit: () => void; remove: () => void }) {
  const cash = item.itemType === 'cash_fund'
  const claimed = planningRow?.purchasedQuantity ?? (planningRow?.purchased ? 1 : 0)
  const mine = planningRow?.purchasedQuantityByMe ?? (planningRow?.purchasedByMe ? 1 : 0)
  const boughtByAnotherPlanner = planningRow?.purchasedByOthers ?? claimed > mine
  const purchaserLabel = planningRow?.purchasedByNames?.length ? `Bought by ${planningRow.purchasedByNames.join(', ')}` : 'Bought by another planner'
  return <article className={`item-card ${cash ? 'cash-fund-card' : ''}`}>{cash ? <div className="item-icon item-artwork"><Banknote /></div> : <ItemArtwork item={item} claimed={boughtByAnotherPlanner} accessToken={token} />}<div className="item-copy"><div className="item-title-row"><h3>{item.title}</h3>{cash ? item.contributionGoal != null && <strong>Goal: {currency(item.contributionGoal)}</strong> : item.price != null && <strong>{currency(item.price)}</strong>}</div>{!cash && <small>Quantity: {item.quantity || 1}</small>}{boughtByAnotherPlanner && <small className="planning-purchase-status"><PackageCheck /> {purchaserLabel}</small>}{item.ownerNote && <p>{item.ownerNote}</p>}{item.url && <a href={safeUrl(item.url)} target="_blank" rel="noreferrer">{cash ? 'Open contribution link' : 'View item'} <ExternalLink /></a>}{cash && <small>Hushful does not process or hold funds.</small>}</div><div className="item-card-actions"><button className="edit-button" aria-label={`Edit ${item.title}`} onClick={edit}><Pencil /></button><button className="delete-button" aria-label={`Delete ${item.title}`} onClick={remove}><Trash2 /></button></div></article>
}

function SharedItemCard({ row, accessToken, viewerToken, chooseQuantity, editNote, removeNote, onError, notify }: { row: SharedItemRow; accessToken?: string; viewerToken?: string; chooseQuantity: (quantity: number) => void; editNote: (note?: SharedItemRow['notes'][number]) => void; removeNote: () => void; onError?: (error: unknown) => void; notify?: (message: string) => void }) {
  const requested = row.item.quantity || 1
  const claimed = row.purchasedQuantity ?? (row.purchased ? 1 : 0)
  const mine = row.purchasedQuantityByMe ?? (row.purchasedByMe ? 1 : 0)
  const maximumForMe = Math.max(0, requested - claimed + mine)
  const myNote = row.notes.find((note) => note.isMine)
  const purchaserLabel = row.purchasedByNames?.length ? `Bought by ${row.purchasedByNames.join(', ')}` : 'Bought by another planner'
  if (row.item.itemType === 'cash_fund') return <article className="item-card shared-item cash-fund-card"><div className="item-icon item-artwork"><Banknote /></div><div className="item-copy"><div className="item-title-row"><h3>{row.item.title}</h3>{row.item.contributionGoal != null && <strong>Goal: {currency(row.item.contributionGoal)}</strong>}</div>{row.item.ownerNote && <p>{row.item.ownerNote}</p>}{row.item.url && <a className="primary contribution-link" href={safeUrl(row.item.url)} target="_blank" rel="noreferrer">Contribute <ExternalLink /></a>}<small>Payment is completed through the recipient’s selected service. Hushful does not process or hold funds.</small></div></article>
  return <article className={`item-card shared-item ${claimed >= requested ? 'purchased' : ''}`}><ItemArtwork item={row.item} claimed={claimed >= requested} accessToken={accessToken} viewerToken={viewerToken} /><div className="item-copy"><div className="item-title-row"><h3>{row.item.title}</h3>{row.item.price != null && <strong>{currency(row.item.price)}</strong>}</div><small>{claimed} of {requested} claimed</small>{row.purchasedByNames !== undefined && row.purchasedByOthers && <small className="planning-purchase-status"><PackageCheck /> {purchaserLabel}</small>}{row.item.ownerNote && <p>{row.item.ownerNote}</p>}{row.item.url && <a href={safeUrl(row.item.url)} target="_blank" rel="noreferrer">View item <ExternalLink /></a>}<div className="item-actions"><label className="quantity-choice"><span>You’re buying</span><select value={mine} onChange={(event) => chooseQuantity(Number(event.target.value))}>{Array.from({ length: maximumForMe + 1 }, (_, quantity) => <option key={quantity} value={quantity}>{quantity}</option>)}</select></label><button className="text-button" onClick={() => editNote(myNote)}>{myNote ? 'Edit your note' : 'Add a note'}</button></div>{row.notes.length > 0 && <div className="notes"><span>Notes</span>{row.notes.map((note, i) => <div className="note-row" key={`${note.updatedAt}-${i}`}><p><strong>{note.authorDisplayName || 'Anonymous'} · </strong>{note.note}</p>{note.isMine ? <div><button className="text-button" onClick={() => editNote(note)}>Edit</button><button className="text-button danger-text" onClick={() => { if (window.confirm('Remove your note?')) removeNote() }}>Remove</button></div> : note.stateID && accessToken && <button className="text-button" onClick={async () => { try { await api.reportItemNote(accessToken, note.stateID as string); notify?.('Thanks—your report was sent to Hushful.') } catch (error) { onError?.(error) } }}>Report</button>}</div>)}</div>}</div></article>
}

function ItemArtwork({ item, claimed = false, accessToken, viewerToken }: { item: WishlistItem; claimed?: boolean; accessToken?: string; viewerToken?: string }) {
  const [failed, setFailed] = useState(false)
  return <div className="item-icon item-artwork">{claimed ? <PackageCheck /> : <Gift />}{!failed && <ProtectedImage path={`/v1/items/${item.id}/image${item.updatedAt ? `?v=${encodeURIComponent(item.updatedAt)}` : ''}`} accessToken={accessToken} viewerToken={viewerToken} onError={() => setFailed(true)} />}{claimed && !failed && <span className="item-claimed-badge"><Check /></span>}</div>
}

function ProtectedImage({ path, accessToken, viewerToken, onError }: { path: string; accessToken?: string; viewerToken?: string; onError?: () => void }) {
  const [source, setSource] = useState('')
  useEffect(() => {
    let active = true
    let objectURL = ''
    api.protectedImage(path, accessToken, viewerToken).then((blob) => {
      if (!active) return
      objectURL = URL.createObjectURL(blob)
      setSource(objectURL)
    }).catch(() => { if (active) onError?.() })
    return () => { active = false; if (objectURL) URL.revokeObjectURL(objectURL) }
  }, [path, accessToken, viewerToken])
  return source ? <img src={source} alt="" /> : null
}

function Modal({ children, close, size = '' }: { children: ReactNode; close: () => void; size?: string }) { return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}><section className={`modal ${size}`} role="dialog" aria-modal="true">{children}</section></div> }
function ModalHeader({ eyebrow, title, close }: { eyebrow?: string; title: string; close: () => void }) { return <header className="modal-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div><button className="icon-button" onClick={close}><X /></button></header> }
function TutorialModal({ close }: { close: () => void }) {
  const [page, setPage] = useState(0)
  const steps = [
    { title: 'Thanks for downloading Hushful', text: 'Let’s see what Hushful can do. Penny’s My Lists page makes every public and private list easy to scan at a glance.' },
    { title: 'Build Penny’s list', text: 'Add a link, photo, price, quantity, and note. One wish can live on several lists while its purchase status stays synchronized.' },
    { title: 'Save from shopping apps', text: 'On iPhone, share from a store to Hushful, then review the title, image, and price before adding it to Penny’s list.' },
    { title: 'Share on Penny’s terms', text: 'Public lists live on Penny’s profile. Private lists go only to the people and groups she chooses. Shared lists can be filtered by price.' },
    { title: 'Plan with Penny’s people', text: 'Find friends, make groups, and create joint gift-planning lists. @mentions only offer people who can access the list and notify them.' },
    { title: 'Coordinate without spoilers', text: 'Claims and recipient notes stay hidden from Penny. Gift-planning lists have an inline discussion below the wishes so planners can communicate together.' },
    { title: 'Birthday and age-aware sharing', text: 'A birthday is required for age-appropriate features and stays private by default. Adult-only lists are hidden from people under 18, and guests confirm their age before viewing.' },
    { title: 'Safety is built in', text: 'Block or report accounts, lists, comments, and other content. Manage discoverability, friend requests, mentions, notifications, and safety choices from Settings.' },
  ]
  const step = steps[page]
  return <Modal close={close} size="modal-wide"><div className="tutorial"><Logo compact /><TutorialPreview page={page} /><p className="eyebrow">Step {page + 1} of {steps.length}</p><h2>{step.title}</h2><p>{step.text}</p><div className="tutorial-dots">{steps.map((_, index) => <span key={index} className={index === page ? 'active' : ''} />)}</div><div className="modal-actions spread"><button className="text-button" onClick={close}>{page === steps.length - 1 ? 'Close' : 'Skip'}</button><button className="primary" onClick={() => page === steps.length - 1 ? close() : setPage(page + 1)}>{page === steps.length - 1 ? 'Start using Hushful' : 'Next'} <ChevronRight /></button></div></div></Modal>
}

function TutorialPreview({ page }: { page: number }) {
  const titles = ['Hushful', 'Penny’s Wishes', 'Share to Hushful', 'Sharing & privacy', 'Find Penny', 'Owners & purpose', 'Birthday & safety', 'Privacy & safety']
  const controls = page === 0 ? <><TutorialCallout icon={<Users />} label="People" /><TutorialCallout icon={<Bell />} label="Activity" /></> : page === 1 ? <><TutorialCallout icon={<Gift />} label="Image" /><TutorialCallout icon={<Plus />} label="Add item" /></> : page === 2 ? <><TutorialCallout icon={<Share2 />} label="iPhone Share" /><TutorialCallout icon={<Sparkles />} label="Hushful" /></> : page === 3 ? <><TutorialCallout icon={<User />} label="Private" /><TutorialCallout icon={<Link2 />} label="Guest link" /></> : page === 4 ? <TutorialCallout icon={<User />} label="Search" /> : page === 5 ? <TutorialCallout icon={<Users />} label="Co-owners" /> : page === 6 ? <><TutorialCallout icon={<CalendarDays />} label="Birthday" /><TutorialCallout icon={<ShieldCheck />} label="Age-aware" /></> : <><TutorialCallout icon={<ShieldCheck />} label="Block" /><TutorialCallout icon={<Settings />} label="Safety" /></>
  const content = page === 0 ? <><TutorialMiniRow title="Penny’s Birthday" detail="Your wishlist" /><TutorialMiniRow title="Penny’s Cozy Home" detail="A collaboration" /></> : page === 1 ? <><TutorialMiniRow title="Cozy blanket" detail="Image · $48 · Quantity 1" /><TutorialMiniRow title="Also on Christmas" detail="One item linked across lists" /></> : page === 2 ? <><TutorialMiniRow title="Amazon" detail="Share → More → Hushful" /><TutorialMiniRow title="Penny’s Wishes" detail="Title and product image found" /></> : page === 3 ? <><TutorialMiniRow title="Penny’s Birthday" detail="Private · Shared with Family" /><small>Friends, groups, public access, or a guest link—you choose.</small></> : page === 4 ? <><TutorialMiniRow title="Penny Lou" detail="@penny · View profile" /><div className="tutorial-detail-actions"><button>Send friend request</button></div></> : page === 5 ? <><TutorialMiniRow title="Our Wishlist" detail="Owners never see recipient claims" /><TutorialMiniRow title="Gift Planning" detail="Owners coordinate purchases" /></> : page === 6 ? <><TutorialMiniRow title="Birthday" detail="Private by default · reminders optional" /><TutorialMiniRow title="Adult-only list" detail="18+ access control · guest confirmation" /></> : <><TutorialMiniRow title="Block or report" detail="Profiles, lists, comments, and content" /><TutorialMiniRow title="Mention access" detail="Only people who can view the list" /></>
  return <div className="tutorial-preview"><div className="tutorial-preview-nav"><strong>{titles[page]}</strong><div>{controls}</div></div><div className="tutorial-preview-body">{content}</div></div>
}
function TutorialCallout({ icon, label }: { icon: ReactNode; label: string }) { return <span className="tutorial-callout"><i>{icon}</i><small>{label}</small></span> }
function TutorialMiniRow({ title, detail }: { title: string; detail: string }) { return <div className="tutorial-mini-row"><i><Gift /></i><span><strong>{title}</strong><small>{detail}</small></span><ChevronRight /></div> }
function CreateWishlistModal({ close, create }: { close: () => void; create: (title: string, visibility: 'public' | 'private') => void }) { const [title, setTitle] = useState(''), [visibility, setVisibility] = useState<'public' | 'private'>('private'); return <Modal close={close}><ModalHeader eyebrow="A new collection" title="Create a wishlist" close={close} /><form className="stack-form" onSubmit={(e) => { e.preventDefault(); if (visibility === 'public' && !window.confirm('Make this list public? Anyone can view it, and it may appear on your profile.')) return; create(title.trim(), visibility) }}><Field label="Wishlist name"><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Birthday ideas, Cozy home…" /></Field><Field label="Visibility"><select value={visibility} onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}><option value="private">Private — only people you choose</option><option value="public">Public — anyone can view</option></select></Field>{visibility === 'public' ? <p className="public-warning"><ShieldCheck /> Public means anyone can view this list. It may also appear on your profile.</p> : <p className="hint">Private lists stay hidden from public profiles. You can share them with selected people, groups, or a guest link.</p>}<div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={!title.trim()}>Create wishlist</button></div></form></Modal> }

function OccasionsModal({ token, close, onError, notify, createWishlist }: { token: string; close: () => void; onError: (e: unknown) => void; notify: (s: string) => void; createWishlist: (title: string, visibility: 'public' | 'private') => Promise<void> }) {
  const blank = (): RecurringOccasion => ({ name: '', eventMonth: new Date().getMonth() + 1, eventDay: new Date().getDate(), reminderMonth: new Date().getMonth() + 1, reminderDay: new Date().getDate(), icon: 'gift', colorHex: '786A82' })
  const [values, setValues] = useState<RecurringOccasion[]>([]), [editing, setEditing] = useState<RecurringOccasion>(blank()), [busy, setBusy] = useState(true)
  const dateValue = (month: number, day: number) => `2028-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const changeDate = (key: 'event' | 'reminder', raw: string) => { const [, month, day] = raw.split('-').map(Number); setEditing((old) => key === 'event' ? { ...old, eventMonth: month, eventDay: day } : { ...old, reminderMonth: month, reminderDay: day }) }
  useEffect(() => { api.occasions(token).then(setValues).catch(onError).finally(() => setBusy(false)) }, [token, onError])
  async function save(event: FormEvent) { event.preventDefault(); try { const saved = editing.id ? await api.updateOccasion(token, editing) : await api.createOccasion(token, editing); setValues((all) => [...all.filter((item) => item.id !== saved.id), saved]); setEditing(blank()); notify('Occasion saved') } catch (error) { onError(error) } }
  async function remove(value: RecurringOccasion) { if (!value.id || !window.confirm(`Delete “${value.name}”?`)) return; try { await api.deleteOccasion(token, value.id); setValues((all) => all.filter((item) => item.id !== value.id)); if (editing.id === value.id) setEditing(blank()); notify('Occasion deleted') } catch (error) { onError(error) } }
  async function startList(value: RecurringOccasion) { const title = value.name.toLowerCase().includes('wishlist') ? value.name : `${value.name} Wishlist`; await createWishlist(title, 'private'); const year = new Date().getFullYear(); if (value.id) { const updated = await api.updateOccasion(token, { ...value, lastCreatedYear: year }); setValues((all) => all.map((item) => item.id === updated.id ? updated : item)) }; setOccasionSafeClose() }
  function setOccasionSafeClose() { close() }
  return <Modal close={close} size="modal-wide"><ModalHeader eyebrow="Plan every year" title="Recurring occasions" close={close} />{busy ? <FullPageLoader embedded /> : <><div className="social-stack">{values.length === 0 ? <p className="hint">No recurring occasions yet. Add a birthday, holiday, anniversary, or special date.</p> : values.map((value) => <div className="profile-list-row" key={value.id}><CalendarDays /><span><strong>{value.name}</strong><small>Every {new Date(2028, value.eventMonth - 1, value.eventDay).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} · reminder {new Date(2028, value.reminderMonth - 1, value.reminderDay).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</small></span><button className="icon-button" aria-label={`Create list for ${value.name}`} onClick={() => void startList(value)}><Plus /></button><button className="icon-button" aria-label={`Edit ${value.name}`} onClick={() => setEditing(value)}><Pencil /></button><button className="icon-button danger" aria-label={`Delete ${value.name}`} onClick={() => void remove(value)}><Trash2 /></button></div>)}</div><form className="stack-form" onSubmit={save}><Field label="Name"><input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} placeholder="Birthday, anniversary…" /></Field><div className="field-row"><Field label="Repeats every"><input type="date" value={dateValue(editing.eventMonth, editing.eventDay)} onChange={(event) => changeDate('event', event.target.value)} /></Field><Field label="Reminder date"><input type="date" value={dateValue(editing.reminderMonth, editing.reminderDay)} onChange={(event) => changeDate('reminder', event.target.value)} /></Field></div><p className="hint">Mobile devices schedule their own 9:00 AM notifications from these synced dates.</p><div className="modal-actions"><button type="button" className="secondary" onClick={() => setEditing(blank())}>New</button><button className="primary" disabled={!editing.name.trim()}>{editing.id ? 'Save changes' : 'Add occasion'}</button></div></form></>}</Modal>
}
function RenameWishlistModal({ initial, close, save }: { initial: string; close: () => void; save: (title: string) => void }) { const [title, setTitle] = useState(initial); return <Modal close={close}><ModalHeader eyebrow="A thoughtful adjustment" title="Rename wishlist" close={close} /><form className="stack-form" onSubmit={(event) => { event.preventDefault(); save(title.trim()) }}><Field label="Wishlist name"><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} /></Field><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={!title.trim()}>Save name</button></div></form></Modal> }
function DescriptionModal({ initial, close, save }: { initial: string; close: () => void; save: (description: string) => void }) { const [description, setDescription] = useState(initial); return <Modal close={close}><ModalHeader eyebrow="A little context" title="List description" close={close} /><form className="stack-form" onSubmit={(event) => { event.preventDefault(); save(description.trim()) }}><Field label="Description"><textarea autoFocus value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What is this list for?" /></Field><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary">Save description</button></div></form></Modal> }
type ItemFormValue = { title: string; url?: string; price?: number; ownerNote?: string; quantity: number; linkedWishlistIDs: string[]; itemType?: 'wish' | 'cash_fund'; contributionGoal?: number }

function AddItemModal({ token, wishlist, allWishlists, candidates, initial, close, save }: { token: string; wishlist: Wishlist; allWishlists: Wishlist[]; candidates: SocialUser[]; initial?: WishlistItem; close: () => void; save: (item: ItemFormValue, image: { file?: File; remove: boolean }) => Promise<void> }) {
  const editing = Boolean(initial)
  const [title, setTitle] = useState(initial?.title || ''), [url, setUrl] = useState(initial?.url || ''), [price, setPrice] = useState(initial?.price?.toString() || ''), [note, setNote] = useState(initial?.ownerNote || ''), [quantity, setQuantity] = useState(initial?.quantity || 1)
  const [cashFund, setCashFund] = useState(initial?.itemType === 'cash_fund'), [goal, setGoal] = useState(initial?.contributionGoal?.toString() || '')
  const [linked, setLinked] = useState<Set<string>>(new Set([wishlist.id]))
  const [imageFile, setImageFile] = useState<File>(), [imagePreview, setImagePreview] = useState(''), [removeImage, setRemoveImage] = useState(false)
  const [saving, setSaving] = useState(false), [error, setError] = useState('')
  useEffect(() => { if (initial) api.itemLinks(token, wishlist.id, initial.id).then((value) => setLinked(new Set(value.wishlistIDs))).catch(() => undefined) }, [token, wishlist.id, initial])
  useEffect(() => {
    if (!initial) return
    let active = true
    let objectURL = ''
    api.protectedImage(`/v1/items/${initial.id}/image`, token).then((blob) => { if (active) { objectURL = URL.createObjectURL(blob); setImagePreview(objectURL) } }).catch(() => undefined)
    return () => { active = false; if (objectURL) URL.revokeObjectURL(objectURL) }
  }, [initial, token])
  function toggle(id: string) { setLinked((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); next.add(wishlist.id); return next }) }
  function chooseImage(file?: File) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Choose a JPEG, PNG, or WebP image no larger than 5 MB.'); return }
    setImageFile(file); setRemoveImage(false); setImagePreview(URL.createObjectURL(file)); setError('')
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('')
    if (cashFund && !wishlist.proAccess) { setError('Cash funds require Hushful Pro.'); setSaving(false); return }
    if (cashFund && !/^https:\/\//i.test(url.trim())) { setError('Enter a valid payment link beginning with https://.'); setSaving(false); return }
    try { await save({ title: title.trim(), url: url.trim() || undefined, price: cashFund ? undefined : price ? Number(price.replace(',', '.')) : undefined, ownerNote: note.trim() || undefined, quantity: cashFund ? 1 : quantity, linkedWishlistIDs: [...linked], itemType: cashFund ? 'cash_fund' : 'wish', contributionGoal: cashFund && goal ? Number(goal.replace(',', '.')) : undefined }, { file: imageFile, remove: removeImage }) }
    catch (problem) { setError(problem instanceof Error ? problem.message : 'The wish could not be saved.'); setSaving(false) }
  }
  return <Modal close={close} size="modal-wide"><ModalHeader eyebrow={editing ? 'A thoughtful adjustment' : 'One more lovely thing'} title={editing ? 'Edit this wish' : 'Add a wish'} close={close} /><form className="stack-form" onSubmit={submit}>
    {!editing && !wishlist.proAccess && <p className="hint">Cash funds require Hushful Pro. Upgrade in the Hushful iOS app once it launches. The iOS app, web payments, and Android are coming soon.</p>}
    {!editing && wishlist.proAccess && <fieldset className="public-choice"><legend>What would you like to add?</legend><label className="checkbox"><input type="radio" checked={!cashFund} onChange={() => setCashFund(false)} /><span><strong>Wish</strong><small>A product or gift idea</small></span></label><label className="checkbox"><input type="radio" checked={cashFund} onChange={() => setCashFund(true)} /><span><strong>Cash Fund</strong><small>An external contribution link</small></span></label></fieldset>}
    <Field label="Image (optional)"><div className="item-image-editor"><div className="item-image-preview">{imagePreview && !removeImage ? <img src={imagePreview} alt="Item preview" onError={() => setImagePreview('')} /> : <Gift />}</div><div><label className="secondary image-upload">{imagePreview && !removeImage ? 'Change image' : 'Choose image'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { chooseImage(event.target.files?.[0]); event.target.value = '' }} /></label>{imagePreview && !removeImage && <button type="button" className="text-button danger-text" onClick={() => { setImageFile(undefined); setImagePreview(''); setRemoveImage(Boolean(initial)) }}>Remove image</button>}<small>JPEG, PNG, or WebP · 5 MB maximum</small></div></div></Field>
    <Field label="Item title"><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you wishing for?" /></Field>
    <div className="field-row"><Field label={cashFund ? 'Payment link' : 'Link (optional)'}><input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></Field><Field label={cashFund ? 'Goal (optional)' : 'Price (optional)'}><div className="money-input"><span>$</span><input inputMode="decimal" value={cashFund ? goal : price} onChange={(e) => cashFund ? setGoal(e.target.value) : setPrice(e.target.value)} placeholder="0.00" /></div></Field></div>
    {!cashFund && <Field label="Quantity"><input type="number" min="1" max="999" value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))} /></Field>}<Field label={cashFund ? 'What will this fund help with? (optional)' : 'A note (optional)'}><MentionTextarea value={note} onChange={setNote} candidates={candidates} placeholder={cashFund ? 'Diapers, childcare, a college fund…' : 'Size, color, or why you love it…'} rows={3} /></Field>
    {cashFund && <p className="hint">Payments happen through the recipient’s selected service. Hushful does not process or hold funds.</p>}
    {allWishlists.length > 1 && <fieldset className="public-choice"><legend>Show on lists</legend>{allWishlists.map((list) => <label className="checkbox" key={list.id}><input type="checkbox" checked={linked.has(list.id)} disabled={list.id === wishlist.id} onChange={() => toggle(list.id)} /><span><strong>{list.title}</strong><small>{list.id === wishlist.id ? 'Current list' : 'Purchase status stays synchronized'}</small></span></label>)}</fieldset>}
    <p className="hint">Recipient notes remain private to the list where they were written.</p>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={!title.trim() || saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add to wishlist'}</button></div>
  </form></Modal>
}
/* Deep-link initialization intentionally runs once with the token from the first URL. */
/* eslint-disable react-hooks/exhaustive-deps */
function OpenShareModal({ accessToken, accountId, initialToken, close, save, onError }: { accessToken: string; accountId: string; initialToken?: string; close: () => void; save: (s: SharedWishlist, vt: string) => void; onError: (e: unknown) => void }) { const [input, setInput] = useState(initialToken || ''); const [busy, setBusy] = useState(false); useEffect(() => { if (initialToken) void open() }, []); async function open(e?: FormEvent) { e?.preventDefault(); const shareToken = extractToken(input); if (!shareToken) return; setBusy(true); try { const existingViewerToken = shareStorage.viewerToken(accountId, shareToken) || undefined; const response = await api.openShare(shareToken, existingViewerToken, accessToken); save({ shareToken, title: response.wishlist.title, sharedByName: response.wishlist.sharedByName, wishlistID: response.wishlist.id }, response.viewerToken) } catch (error) { onError(error) } finally { setBusy(false) } } return <Modal close={close}><ModalHeader eyebrow="Something thoughtful awaits" title="Open a shared wishlist" close={close} /><form className="stack-form" onSubmit={open}><Field label="Private link or token"><input autoFocus value={input} onChange={(e) => setInput(e.target.value)} placeholder="Paste a Hushful link here" /></Field><p className="hint">Open the list, then choose Add to Shared With Me to save it to your account.</p><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={busy || !input.trim()}>{busy && <LoaderCircle className="spin" />} Open wishlist</button></div></form></Modal> }
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
  if (profile) return <FriendProfileModal token={token} person={profile.user} friendship={profile.status === 'accepted' ? profile : undefined} close={() => setProfile(null)} removed={async () => { setProfile(null); await load(); notify('Friend removed') }} added={async () => { await load(); notify('Friend request sent') }} openShare={openShare} onError={onError} notify={notify} />
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
  if (profile) { const friendship = friends.find((item) => item.user.id === profile.id); return <FriendProfileModal token={token} person={profile} friendship={friendship} close={() => setProfile(null)} removed={async () => { setProfile(null); await loadRelationships(); notify('Friend removed') }} added={async () => { await loadRelationships(); notify('Friend request sent') }} openShare={openShare} onError={onError} notify={notify} /> }
  return <Modal close={close} size="modal-wide"><ModalHeader eyebrow="Discover public wishlists" title="Find people" close={close} /><div className="social-stack"><Field label="Search by name or username"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search names or usernames" autoFocus /></Field>
    {query.trim().length < 2 ? <p className="hint">Enter at least two characters to find a profile.</p> : results.length ? results.map((person) => <button className="profile-list-row" key={person.id} onClick={() => setProfile(person)}><Avatar name={person.displayName || person.username} userId={person.id} hasAvatar={person.hasAvatar} /><span><strong>{person.displayName || `@${person.username}`}</strong><small>@{person.username}</small></span><ChevronRight /></button>) : <p className="hint">No matching users found.</p>}
  </div></Modal>
}

function FriendProfileModal({ token, friendship, person, close, removed, added, openShare, onError, notify }: { token: string; friendship?: Friendship; person: SocialUser; close: () => void; removed: () => Promise<void>; added: () => Promise<void>; openShare: (share: AccountSharedWishlist) => void; onError: (e: unknown) => void; notify: (s: string) => void }) {
  const [profile, setProfile] = useState<FriendProfile | null>(null), [blockedReason, setBlockedReason] = useState(''), [opening, setOpening] = useState<string | null>(null), [requested, setRequested] = useState(false), [pinned, setPinned] = useState(false)
  useEffect(() => { Promise.all([api.friendProfile(token, person.id), api.friendRequests(token), api.pins(token)]).then(([p, requests, pins]) => { setProfile(p); setRequested(requests.some((item) => item.user.id === person.id && item.direction === 'outgoing')); setPinned(pins.userIDs.includes(person.id)) }).catch((error) => { if (error instanceof ApiError && error.status === 403) setBlockedReason('This profile is not available to your account.'); else onError(error) }) }, [token, person.id, onError])
  useEffect(() => { if (!requested) return; const timer = window.setInterval(() => { api.friendRequests(token).then(async (requests) => { if (requests.some((item) => item.user.id === person.id && item.direction === 'outgoing')) return; try { await api.friendProfile(token, person.id); setRequested(false) } catch { /* A blocked profile stays unavailable and cannot be requested again. */ } }).catch(() => {}) }, 5000); return () => window.clearInterval(timer) }, [requested, token, person.id])
  async function openPublic(wishlistID: string) { setOpening(wishlistID); try { openShare(await api.openPublicWishlist(token, wishlistID)) } catch (e) { onError(e) } finally { setOpening(null) } }
  async function toggleBirthdayAlert() { if (!profile?.birthdayMonth || !profile.birthdayDay) return; try { const updated = await api.updateBirthdayAlert(token, person.id, !profile.birthdayAlertEnabled, profile.birthdayAlertDaysBefore ?? 7); setProfile({ ...profile, birthdayAlertEnabled: updated.enabled, birthdayAlertDaysBefore: updated.reminderDaysBefore }); notify(updated.enabled ? 'Birthday alert enabled' : 'Birthday alert disabled') } catch (e) { onError(e) } }
  const saved = (item: ProfileWishlist): AccountSharedWishlist => ({ id: item.accountShareID!, wishlistID: item.wishlistID, title: item.title, sharedByName: profile?.user.displayName || `@${profile?.user.username || person.username}` })
  const birthdayLabel = profile?.birthdayMonth && profile.birthdayDay ? new Date(2028, profile.birthdayMonth - 1, profile.birthdayDay).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) : ''
  return <Modal close={close} size="modal-wide"><ModalHeader eyebrow={`@${person.username}`} title={person.displayName || `@${person.username}`} close={close} />{!profile ? blockedReason ? <div className="empty-state"><ShieldCheck /><h3>Profile unavailable</h3><p>{blockedReason}</p></div> : <FullPageLoader embedded /> : <div className="social-stack"><div className="friend-profile-heading"><Avatar name={person.displayName || person.username} userId={person.id} hasAvatar={person.hasAvatar} /><p>Only public wishlists and lists shared specifically with you appear here.</p></div>
    {profile.birthdayMonth && profile.birthdayDay && <section className="profile-details-panel"><div><strong>Birthday</strong><small>{birthdayLabel}</small></div><button className={profile.birthdayAlertEnabled ? 'secondary' : 'primary'} onClick={() => void toggleBirthdayAlert()}><Bell /> {profile.birthdayAlertEnabled ? 'Birthday alert on' : 'Alert me about this birthday'}</button><small>{profile.birthdayAlertEnabled ? `Alert saved for ${profile.birthdayAlertDaysBefore === 0 ? 'the day of the birthday' : `${profile.birthdayAlertDaysBefore} days before`}. iOS and Android will notify you.` : 'Only you will see this setting.'}</small></section>}
    {profile.attributes?.length ? <section><h3>Profile details</h3><div className="profile-attribute-list">{profile.attributes.map((attribute) => <div className="profile-attribute-row" key={attribute.id}><strong>{attribute.label}</strong><span>{attribute.value}</span></div>)}</div></section> : null}
    <section><h3>Public wishlists</h3>{profile.publicWishlists.length ? profile.publicWishlists.map((item) => <button className="profile-list-row" key={item.wishlistID} disabled={opening === item.wishlistID} onClick={() => void openPublic(item.wishlistID)}><Gift /><span><strong>{item.title}</strong><small>Public</small></span><ChevronRight /></button>) : <p className="hint">No public wishlists.</p>}</section>
    <section><h3>Shared with you</h3>{profile.sharedWishlists.length ? profile.sharedWishlists.map((item) => <button className="profile-list-row" key={item.wishlistID} onClick={() => openShare(saved(item))}><Users /><span><strong>{item.title}</strong><small>Shared privately with you</small></span><ChevronRight /></button>) : <p className="hint">No private lists have been shared with you.</p>}</section>
    {friendship && <div className="modal-actions spread"><button className="secondary danger-text" onClick={async () => { if (!window.confirm(`Are you sure you want to remove ${person.displayName || `@${person.username}`} as a friend? This cannot be undone.`)) return; try { await api.removeFriendship(token, friendship.id); await removed() } catch (e) { onError(e) } }}><Trash2 /> Remove friend</button><button className="secondary" onClick={async () => { try { await (pinned ? api.unpin(token, 'user', person.id) : api.pin(token, 'user', person.id)); setPinned(!pinned) } catch (e) { onError(e) } }}><Pin /> {pinned ? 'Unpin' : 'Pin person'}</button></div>}
    {!friendship && <div className="modal-actions"><button className="primary" disabled={requested} onClick={async () => { setRequested(true); try { await api.requestFriend(token, person.id); await added() } catch (e) { setRequested(false); onError(e) } }}>{requested ? 'Friend Request Sent' : 'Send Friend Request'}</button></div>}
    <div className="modal-actions"><button className="secondary danger-text" onClick={async () => { if (!window.confirm(`Block ${person.displayName || `@${person.username}`}? You will be removed as friends and neither of you will be able to find or contact the other.`)) return; try { await api.blockUser(token, person.id); await removed() } catch (e) { onError(e) } }}><X /> Block user</button></div>
    <div className="modal-actions"><button className="text-button danger-text" onClick={async () => { const details = window.prompt('Tell us what happened (optional):', ''); if (details === null) return; try { await api.reportUser(token, person.id, 'other', details); notify('Report submitted'); } catch (e) { onError(e) } }}>Report user</button></div>
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

function SocialShareModal({ token, wishlist, canUseMatureContent, close, notify, onError }: { token: string; wishlist: Wishlist; canUseMatureContent: boolean; close: () => void; notify: (s: string) => void; onError: (e: unknown) => void }) {
  const [friends, setFriends] = useState<Friendship[]>([]), [groups, setGroups] = useState<FriendGroup[]>([]), [audience, setAudience] = useState<WishlistAudience>({ userIDs: [], groupIDs: [] }), [visibility, setVisibility] = useState<'private' | 'public'>('private'), [matureContentEnabled, setMatureContentEnabled] = useState(false), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [ready, setReady] = useState(false), [shareUrl, setShareUrl] = useState('')
  useEffect(() => { Promise.all([api.friends(token), api.friendGroups(token), api.wishlistAudience(token, wishlist.id), api.wishlistSettings(token, wishlist.id)]).then(([f, g, a, s]) => { setFriends(f); setGroups(g); setAudience(a); setVisibility(s.visibility); setMatureContentEnabled(s.matureContentEnabled === true); setReady(true) }).catch(onError).finally(() => setLoading(false)) }, [token, wishlist.id, onError])
  async function persist(nextAudience: WishlistAudience, nextVisibility: 'private' | 'public', nextMatureContent = matureContentEnabled) { setSaving(true); try { await Promise.all([api.updateWishlistAudience(token, wishlist.id, nextAudience), api.updateWishlistSettings(token, wishlist.id, { visibility: nextVisibility, matureContentEnabled: nextMatureContent })]); notify('Sharing updated') } catch (e) { onError(e) } finally { setSaving(false) } }
  function toggle(key: keyof WishlistAudience, id: string) { const next = { ...audience, [key]: audience[key].includes(id) ? audience[key].filter((value) => value !== id) : [...audience[key], id] }; setAudience(next); if (ready) void persist(next, visibility) }
  async function guestLink() { try { const result = await api.createShare(token, wishlist.id); setShareUrl(`${window.location.origin}/share/${result.shareToken}`) } catch (e) { onError(e) } }
  if (shareUrl) return <ShareLinkModal url={shareUrl} title={wishlist.title} close={() => setShareUrl('')} notify={notify} />
  return <Modal close={close} size="modal-wide"><ModalHeader eyebrow="Share without a link" title={`Share “${wishlist.title}”`} close={close} />{loading ? <FullPageLoader embedded /> : <div className="social-stack"><Field label="Wishlist visibility"><select value={visibility} onChange={(e) => { const next = e.target.value as 'private' | 'public'; if (next === 'public' && visibility !== 'public' && !window.confirm('Make this list public? Anyone can view it, and it may appear on your profile.')) return; setVisibility(next); if (ready) void persist(audience, next) }}><option value="private">Private</option><option value="public">Public</option></select></Field>{visibility === 'public' ? <p className="public-warning"><ShieldCheck /> Public means anyone can view this list, and it may appear on your profile.</p> : <p className="muted">This list is hidden from the public. Only the friends and groups you select below can open it.</p>}<label className="checkbox"><input type="checkbox" checked={matureContentEnabled} disabled={!canUseMatureContent || saving} onChange={(event) => { const next = event.target.checked; setMatureContentEnabled(next); if (ready) void persist(audience, visibility, next) }} /><span><strong>Limit this list to adults</strong><small>Use this when the list may include content intended for adults. People under 18 cannot open it. Adult guests without the app will be asked to confirm they are 18 or older.</small></span></label>{!canUseMatureContent && <p className="hint">This option becomes available after an adult birthday is saved.</p>}
    {groups.length > 0 && <section><h3>Groups</h3>{groups.map((group) => <label className="audience-choice" key={group.id}><input type="checkbox" checked={audience.groupIDs.includes(group.id)} onChange={() => toggle('groupIDs', group.id)} /><span>{group.name}<small>{group.members.length} friends</small></span></label>)}</section>}
    <section><h3>Friends</h3>{friends.length ? friends.map((friend) => <label className="audience-choice" key={friend.user.id}><input type="checkbox" checked={audience.userIDs.includes(friend.user.id)} onChange={() => toggle('userIDs', friend.user.id)} /><Avatar name={friend.user.displayName || friend.user.username} userId={friend.user.id} hasAvatar={friend.user.hasAvatar} /><span>{friend.user.displayName || `@${friend.user.username}`}<small>@{friend.user.username}</small></span></label>) : <p className="hint">Add friends first, or use a guest link below.</p>}</section>
    <div className="guest-link-option"><div><strong>Sharing with someone without Hushful?</strong><small>Anyone with a guest link can view, claim wishes, and leave notes without an account. Adult-only lists show an age confirmation first. Private lists remain hidden elsewhere in Hushful.</small></div><button className="secondary" onClick={guestLink}><Link2 /> Create guest link</button></div>
    <div className="modal-actions"><span className="hint">{saving ? 'Saving…' : 'Changes save automatically.'}</span><button className="secondary" onClick={close}>Done</button></div></div>}</Modal>
}

function WishlistCollaborationModal({ token, wishlist, close, notify, onError }: { token: string; wishlist: Wishlist; close: () => void; notify: (s: string) => void; onError: (e: unknown) => void }) {
  const [mode, setMode] = useState<'our_wishlist' | 'gift_planning'>('our_wishlist')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [friends, setFriends] = useState<Friendship[]>([])
  const [owners, setOwners] = useState<Array<{ id: string; displayName?: string; username?: string; isPrimaryOwner: boolean }>>([])
  const [me, setMe] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [ready, setReady] = useState(false)
  const canManage = Boolean(me && owners.some((owner) => owner.id === me.id && owner.isPrimaryOwner))
  useEffect(() => {
    Promise.all([api.wishlistCollaboration(token, wishlist.id), api.friends(token), api.me(token)])
      .then(([collaboration, loadedFriends, current]) => {
        setMode(collaboration.mode); setOwners(collaboration.collaborators); setSelected(new Set(collaboration.collaborators.filter((owner) => !owner.isPrimaryOwner).map((owner) => owner.id))); setFriends(loadedFriends.filter((friend) => friend.status === 'accepted')); setMe(current); setReady(true)
      }).catch(onError).finally(() => setLoading(false))
  }, [token, wishlist.id, onError])
  async function persist(nextMode: 'our_wishlist' | 'gift_planning', nextSelected: Set<string>) { setSaving(true); try { const updated = await api.updateWishlistCollaboration(token, wishlist.id, nextMode, [...nextSelected]); setMode(updated.mode); setOwners(updated.collaborators); setSelected(new Set(updated.collaborators.filter((owner) => !owner.isPrimaryOwner).map((owner) => owner.id))); notify('Wishlist owners updated') } catch (error) { onError(error) } finally { setSaving(false) } }
  function toggle(id: string) { const next = new Set(selected); if (next.has(id)) next.delete(id); else next.add(id); setSelected(next); if (ready && canManage) void persist(mode, next) }
  function changeMode(next: 'our_wishlist' | 'gift_planning') { setMode(next); if (ready && canManage) void persist(next, selected) }
  return <Modal close={close} size="modal-wide"><ModalHeader eyebrow="Plan together" title="Owners & purpose" close={close} />{loading ? <FullPageLoader embedded /> : <div className="stack-form"><Field label="How will you use this list?"><select value={mode} disabled={!canManage || saving} onChange={(event) => changeMode(event.target.value as 'our_wishlist' | 'gift_planning')}><option value="our_wishlist">Our Wishlist</option><option value="gift_planning">Gift Planning</option></select></Field><p className="hint">{mode === 'our_wishlist' ? 'The owners are the intended recipients. Purchases and recipient notes stay hidden from every owner.' : 'The owners are planning gifts together and can coordinate purchases and notes.'}</p><fieldset className="public-choice"><legend>Current owners</legend>{owners.map((owner) => <div className="checkbox" key={owner.id}><span><strong>{owner.displayName || (owner.username ? `@${owner.username}` : 'Hushful user')}</strong><small>{owner.isPrimaryOwner ? 'Primary owner' : owner.username ? `@${owner.username}` : 'Co-owner'}</small></span></div>)}</fieldset>{canManage && <fieldset className="public-choice"><legend>Add co-owners from friends</legend>{friends.length ? friends.map((friend) => <label className="checkbox" key={friend.user.id}><input type="checkbox" checked={selected.has(friend.user.id)} disabled={saving} onChange={() => toggle(friend.user.id)} /><span><strong>{friend.user.displayName || `@${friend.user.username}`}</strong><small>@{friend.user.username}</small></span></label>) : <p className="hint">No friends available.</p>}</fieldset>}<div className="modal-actions"><span className="hint">{saving ? 'Saving…' : 'Changes save automatically.'}</span><button className="secondary" onClick={close}>Done</button></div></div>}</Modal>
}

function AccountModal({ token, user, userChanged, onSharedListsPreferenceChanged, focusFeedback = false, close, onError, notify, logout }: { token: string; user: CurrentUser; userChanged: (user: CurrentUser) => void; onSharedListsPreferenceChanged?: () => void; focusFeedback?: boolean; close: () => void; onError: (e: unknown) => void; notify: (s: string) => void; logout: () => void }) {
  const [name, setName] = useState(user.displayName || ''), [discoverable, setDiscoverable] = useState(user.isDiscoverable), [policy, setPolicy] = useState(user.friendRequestPolicy), [avatarVersion, setAvatarVersion] = useState(0), [avatarBusy, setAvatarBusy] = useState(false)
  const [details, setDetails] = useState<Awaited<ReturnType<typeof api.profileDetails>> | null>(null)
  const [newAttributeLabel, setNewAttributeLabel] = useState(''), [newAttributeValue, setNewAttributeValue] = useState(''), [newAttributeVisibility, setNewAttributeVisibility] = useState<'public' | 'friends' | 'private'>('private')
  const saveProfile = useCallback(async (profile: Partial<CurrentUser>) => { try { userChanged(await api.updateProfile(token, profile)); notify('Profile updated') } catch (e) { onError(e) } }, [token, userChanged, notify, onError])
  useEffect(() => { const trimmed = name.trim(); if (!trimmed || trimmed === (user.displayName || '')) return; const timer = window.setTimeout(() => void saveProfile({ displayName: trimmed }), 450); return () => window.clearTimeout(timer) }, [name, user.displayName, saveProfile])
  const feedbackPanelRef = useRef<HTMLElement>(null)
  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof api.metricsSummary>> | null>(null)
  const [feedback, setFeedback] = useState<Awaited<ReturnType<typeof api.adminFeedback>> | null>(null)
  const [accounts, setAccounts] = useState<Awaited<ReturnType<typeof api.adminAccounts>> | null>(null)
  const [proGrants, setProGrants] = useState<Awaited<ReturnType<typeof api.adminProGrants>> | null>(null)
  const [proGrantBusy, setProGrantBusy] = useState<string | null>(null)
  const [accountSearch, setAccountSearch] = useState('')
  const [reports, setReports] = useState<Awaited<ReturnType<typeof api.adminReports>> | null>(null)
  const [audit, setAudit] = useState<Awaited<ReturnType<typeof api.adminAudit>> | null>(null)
  const [adminTotp, setAdminTotp] = useState<{ enabled: boolean; recoveryCodesRemaining: number } | null>(null)
  const [adminTotpSetup, setAdminTotpSetup] = useState<Awaited<ReturnType<typeof api.enrollAdminTOTP>> | null>(null)
  const [adminTotpCode, setAdminTotpCode] = useState('')
  const [feedbackCategory, setFeedbackCategory] = useState('general'), [feedbackMessage, setFeedbackMessage] = useState(''), [feedbackBusy, setFeedbackBusy] = useState(false), [feedbackError, setFeedbackError] = useState('')
  useEffect(() => { api.metricsSummary(token).then(setMetrics).catch(() => undefined); api.adminFeedback(token).then(setFeedback).catch(() => undefined); api.adminReports(token).then(setReports).catch(() => undefined); api.adminAudit(token).then(setAudit).catch(() => undefined); api.adminProGrants(token).then(setProGrants).catch(() => undefined) }, [token])
  useEffect(() => { api.adminTOTPStatus(token).then(setAdminTotp).catch(() => undefined) }, [token])
  useEffect(() => { api.profileDetails(token).then(setDetails).catch(onError) }, [token, onError])
  useEffect(() => { if (focusFeedback) window.setTimeout(() => feedbackPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0) }, [focusFeedback])
  useEffect(() => { const timer = window.setTimeout(() => { void api.adminAccounts(token, accountSearch.trim()).then(setAccounts).catch(() => undefined) }, 250); return () => window.clearTimeout(timer) }, [token, accountSearch])
  async function submitFeedback() { const message = feedbackMessage.trim(); if (!message) return; setFeedbackBusy(true); setFeedbackError(''); try { await api.submitFeedback(token, feedbackCategory, message); setFeedbackMessage(''); notify('Thank you—your feedback was received') } catch (e) { setFeedbackError(e instanceof Error ? e.message : 'Unable to submit feedback.') } finally { setFeedbackBusy(false) } }
  async function saveDetails(body: Parameters<typeof api.updateProfileDetails>[1]) { try { setDetails(await api.updateProfileDetails(token, body)); notify('Profile details updated') } catch (e) { onError(e) } }
  async function addAttribute() { const label = newAttributeLabel.trim(), value = newAttributeValue.trim(); if (!label || !value) return; try { const attribute = await api.createProfileAttribute(token, { label, value, visibility: newAttributeVisibility }); setDetails((current) => current ? { ...current, attributes: [...current.attributes, attribute].sort((a, b) => a.label.localeCompare(b.label)) } : current); setNewAttributeLabel(''); setNewAttributeValue(''); notify('Profile detail added') } catch (e) { onError(e) } }
  async function updateAttribute(attribute: Awaited<ReturnType<typeof api.profileDetails>>['attributes'][number], changes: Partial<typeof attribute>) { if (!attribute.id) return; try { const updated = await api.updateProfileAttribute(token, attribute.id, { label: changes.label ?? attribute.label, value: changes.value ?? attribute.value, visibility: changes.visibility ?? attribute.visibility }); setDetails((current) => current ? { ...current, attributes: current.attributes.map((item) => item.id === updated.id ? updated : item) } : current) } catch (e) { onError(e) } }
  async function deleteAttribute(id?: string) { if (!id) return; try { await api.deleteProfileAttribute(token, id); setDetails((current) => current ? { ...current, attributes: current.attributes.filter((attribute) => attribute.id !== id) } : current) } catch (e) { onError(e) } }
  async function beginAdminTOTP() { try { setAdminTotpSetup(await api.enrollAdminTOTP(token)); setAdminTotpCode(''); notify('Enrollment started') } catch (e) { onError(e) } }
  async function confirmAdminTOTP() { if (!adminTotpCode.trim()) return; try { setAdminTotp(await api.confirmAdminTOTP(token, adminTotpCode.trim())); setAdminTotpCode(''); notify('Admin verification enabled. Sign out and sign back in with your code.') } catch (e) { onError(e) } }
  async function disableAdminTOTP() { if (!window.confirm('Disable admin verification? Your admin account will no longer require an authenticator code at sign-in.')) return; try { setAdminTotp(await api.disableAdminTOTP(token)); setAdminTotpSetup(null); notify('Admin verification disabled') } catch (e) { onError(e) } }
  async function grantProAccess(account: Awaited<ReturnType<typeof api.adminAccounts>>[number]) { const reason = window.prompt('Why should Pro access be granted for this account?', 'Paid for Hushful Pro but access did not unlock')?.trim(); if (!reason) return; setProGrantBusy(account.id); try { const grant = await api.grantProAccess(token, account.id, reason); setProGrants((current) => [...(current || []).filter((item) => item.userID !== account.id || !item.active), grant]); setAccounts((current) => current ? current.map((item) => item.id === account.id ? { ...item, isPro: true } : item) : current); notify('Pro access granted') } catch (e) { onError(e) } finally { setProGrantBusy(null) } }
  async function revokeProAccess(grant: Awaited<ReturnType<typeof api.adminProGrants>>[number]) { if (!window.confirm(`Revoke the manual Pro grant for ${grant.userEmail}? A paid store entitlement, if present, will remain active.`)) return; setProGrantBusy(grant.userID); try { await api.revokeProAccess(token, grant.id); setProGrants(await api.adminProGrants(token)); setAccounts(await api.adminAccounts(token, accountSearch.trim())); notify('Manual Pro grant revoked') } catch (e) { onError(e) } finally { setProGrantBusy(null) } }
  async function upload(file?: File) { if (!file) return; if (file.size > 2 * 1024 * 1024) return onError(new Error('Profile pictures must be 2 MB or smaller.')); if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return onError(new Error('Choose a JPEG, PNG, or WebP image.')); setAvatarBusy(true); try { userChanged(await api.uploadAvatar(token, file)); setAvatarVersion(Date.now()); notify('Profile picture updated') } catch (e) { onError(e) } finally { setAvatarBusy(false) } }
  async function removeAvatar() { if (!window.confirm('Remove your profile picture? This cannot be undone.')) return; setAvatarBusy(true); try { userChanged(await api.removeAvatar(token)); setAvatarVersion(Date.now()); notify('Profile picture removed') } catch (e) { onError(e) } finally { setAvatarBusy(false) } }
  return <Modal close={close}><ModalHeader eyebrow="Your Hushful account" title="Account & privacy" close={close} /><form className="stack-form" onSubmit={(e) => e.preventDefault()}>
    <ProPlan isPro={user.isPro === true} />
    {user.ageBand === 'adult' && <label className="checkbox"><input type="checkbox" checked={user.showAgeRestrictedLists === true} onChange={async (event) => { try { const updated = await api.updateProfile(token, { showAgeRestrictedLists: event.target.checked }); userChanged(updated); onSharedListsPreferenceChanged?.() } catch (e) { onError(e) } }} /><span><strong>Show lists intended for adults (18+)</strong><small>Adult-only lists stay hidden from shared-list collections unless you turn this on. This does not change who can access a list.</small></span></label>}
    <section className="safety-panel"><div className="safety-panel-heading"><ShieldCheck /><div><strong>Community safety & privacy</strong><small>These choices are yours, and they save automatically.</small></div></div><ul><li>Public lists can be viewed by anyone. Private lists are only for people you choose; anyone with a guest link can forward it.</li><li>Discoverability is off unless you turn it on. Your email is never shown in search.</li><li>Your birthday is stored privately to help Hushful provide an age-appropriate experience and birthday reminders. Only its month and day can be shared.</li><li>Some profile and list experiences may vary based on the age range derived from your private birth year.</li><li>Block or report someone from their profile. Reports are reviewed by Hushful administrators.</li></ul><p className="hint">Private content is not automatically scanned. If something feels unsafe, block the account and report it.</p><a className="text-button" href="/safety">Read the full community safety guide <ChevronRight /></a></section>
    <div className="avatar-editor"><Avatar name={name || user.email} userId={user.id} hasAvatar={user.hasAvatar} version={avatarVersion} /><div><label className="secondary avatar-upload">{avatarBusy ? 'Uploading…' : user.hasAvatar ? 'Change picture' : 'Add picture'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={avatarBusy} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = '' }} /></label>{user.hasAvatar && <button type="button" className="text-button danger-text" disabled={avatarBusy} onClick={() => void removeAvatar()}>Remove</button>}<small>JPEG, PNG, or WebP · 2 MB maximum</small></div></div>
    <Field label="Display name"><input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => { if (name.trim()) void saveProfile({ displayName: name.trim() }) }} /></Field><Field label="Username"><input value={user.username ? `@${user.username}` : 'Not set'} disabled /></Field><p className="hint">Your username is permanent and cannot be changed.</p><label className="checkbox"><input type="checkbox" checked={discoverable} onChange={(e) => { const value = e.target.checked; setDiscoverable(value); void saveProfile({ isDiscoverable: value }) }} /><span><strong>Let people find my username</strong><small>Your profile picture and username appear in search. Your email never does.</small></span></label><Field label="Friend requests"><select value={policy} onChange={(e) => { const value = e.target.value as CurrentUser['friendRequestPolicy']; setPolicy(value); void saveProfile({ friendRequestPolicy: value }) }}><option value="everyone">Anyone who finds me</option><option value="nobody">Nobody</option></select></Field><Field label="Email"><input value={user.email} disabled /></Field><p className="hint">Profile and privacy changes save automatically.</p>
    {details && <section className="profile-details-panel"><div><strong>Birthday</strong><small>Your birthday stays private by default. Share only the month and day if you want people to set reminders.</small></div>{details.birthdayMonth != null && details.birthdayDay != null && details.birthdayYear != null && <><input type="date" value={`${details.birthdayYear}-${String(details.birthdayMonth).padStart(2, '0')}-${String(details.birthdayDay).padStart(2, '0')}`} onChange={(event) => { const [year, month, day] = event.target.value.split('-').map(Number); if (year && month && day) void saveDetails({ birthdayYear: year, birthdayMonth: month, birthdayDay: day, birthdayVisibility: details.birthdayVisibility }) }} /><select value={details.birthdayVisibility} onChange={(event) => void saveDetails({ birthdayYear: details.birthdayYear, birthdayMonth: details.birthdayMonth, birthdayDay: details.birthdayDay, birthdayVisibility: event.target.value as typeof details.birthdayVisibility })}><option value="private">Only me</option><option value="friends">Friends only</option><option value="public">Everyone who can view my profile</option></select></>}{user.ageBand === 'adult' && <label className="checkbox"><input type="checkbox" checked={details.matureProfileEnabled === true} onChange={(event) => void saveDetails({ matureProfileEnabled: event.target.checked })} /><span><strong>Limit this profile to adults</strong><small>Use this when your profile may include content intended for adults. People under 18 will not see this profile.</small></span></label>}<hr /><div><strong>Custom profile details</strong><small>Share sizes, preferences, or any other helpful trait.</small></div>{details.attributes.map((attribute) => <article className="profile-attribute-editor" key={attribute.id}><input value={attribute.label} onChange={(event) => setDetails({ ...details, attributes: details.attributes.map((item) => item.id === attribute.id ? { ...item, label: event.target.value } : item) })} onBlur={() => void updateAttribute(attribute, { label: attribute.label })} /><input value={attribute.value} onChange={(event) => setDetails({ ...details, attributes: details.attributes.map((item) => item.id === attribute.id ? { ...item, value: event.target.value } : item) })} onBlur={() => void updateAttribute(attribute, { value: attribute.value })} /><select value={attribute.visibility} onChange={(event) => void updateAttribute(attribute, { visibility: event.target.value as typeof details.attributes[number]['visibility'] })}><option value="public">Public</option><option value="friends">Friends only</option><option value="private">Only me</option></select><button type="button" className="text-button danger-text" onClick={() => void deleteAttribute(attribute.id)}>Remove</button></article>)}<div className="profile-attribute-editor"><input placeholder="Attribute (e.g. Shoe size)" value={newAttributeLabel} onChange={(event) => setNewAttributeLabel(event.target.value)} /><input placeholder="Value (e.g. 10.5)" value={newAttributeValue} onChange={(event) => setNewAttributeValue(event.target.value)} /><select value={newAttributeVisibility} onChange={(event) => setNewAttributeVisibility(event.target.value as typeof newAttributeVisibility)}><option value="public">Public</option><option value="friends">Friends only</option><option value="private">Only me</option></select><button type="button" className="secondary" disabled={!newAttributeLabel.trim() || !newAttributeValue.trim()} onClick={() => void addAttribute()}>Add</button></div></section>}
    <section ref={feedbackPanelRef} className="feedback-panel"><div><strong>Send feedback</strong><small>Ideas, problems, and little details all help make Hushful better.</small></div><Field label="Category"><select value={feedbackCategory} onChange={(e) => setFeedbackCategory(e.target.value)}><option value="general">General</option><option value="idea">Idea</option><option value="problem">Problem</option><option value="praise">Praise</option></select></Field><Field label="Your feedback"><textarea rows={4} maxLength={4000} value={feedbackMessage} onChange={(e) => setFeedbackMessage(e.target.value)} placeholder="Tell us what’s on your mind…" /></Field><small className="feedback-count">{feedbackMessage.length}/4,000</small>{feedbackError && <p className="form-error" role="alert">{feedbackError}</p>}<button type="button" className="secondary" disabled={feedbackBusy || !feedbackMessage.trim()} onClick={() => void submitFeedback()}>{feedbackBusy ? <LoaderCircle className="spin" /> : <Send />} Submit feedback</button></section>
    {adminTotp && <section className="safety-panel"><div className="safety-panel-heading"><ShieldCheck /><div><strong>Admin sign-in verification</strong><small>Protects moderation, metrics, account directory, and feedback access.</small></div></div>{adminTotp.enabled ? <><p className="hint">Enabled. At the next sign-in, enter the 6-digit code from your authenticator app after your password. {adminTotp.recoveryCodesRemaining} recovery code{adminTotp.recoveryCodesRemaining === 1 ? '' : 's'} remain.</p><button type="button" className="secondary danger-text" onClick={() => void disableAdminTOTP()}>Disable admin verification</button></> : adminTotpSetup ? <><p>Enter this setup key into your authenticator app:</p><div className="copy-field"><span>{adminTotpSetup.secret}</span><button type="button" onClick={() => void navigator.clipboard.writeText(adminTotpSetup.secret)}>Copy</button></div><p className="hint">If your app accepts provisioning URIs, use this one: <code>{adminTotpSetup.provisioningURI}</code></p><p className="hint">Save these recovery codes somewhere secure. They are shown only during setup and each one works once.</p><div className="feedback-responses">{adminTotpSetup.recoveryCodes.map((code) => <code key={code}>{code}</code>)}</div><Field label="Authenticator code"><input inputMode="numeric" autoComplete="one-time-code" value={adminTotpCode} onChange={(event) => setAdminTotpCode(event.target.value)} placeholder="6-digit code" /></Field><button type="button" className="primary" disabled={!adminTotpCode.trim()} onClick={() => void confirmAdminTOTP()}>Confirm and enable</button></> : <><p className="hint">Add an authenticator app to require a time-based code after your password. You will receive one-time recovery codes during setup.</p><button type="button" className="secondary" onClick={() => void beginAdminTOTP()}>Set up admin verification</button></>}</section>}
    {metrics && <section className="metrics-panel"><div><strong>Hushful metrics</strong><small>Last {metrics.days} days · privacy-preserving</small></div><div className="metric-grid"><span><strong>{metrics.totalAccounts}</strong><small>Total accounts</small></span><span><strong>{metrics.newAccounts}</strong><small>New signups</small></span><span><strong>{metrics.visitors}</strong><small>Web visitors</small></span><span><strong>{metrics.views}</strong><small>Page views</small></span></div><div className="metric-paths">{metrics.topPaths.slice(0, 5).map((entry) => <span key={entry.path}><small>{entry.path}</small><strong>{entry.views}</strong></span>)}</div></section>}
    {accounts && <section className="feedback-admin"><div><strong>Account directory</strong><small>{accounts.length} account{accounts.length === 1 ? '' : 's'} · newest first</small></div><p className="hint">If a user paid but Pro did not unlock, find the account below and grant a manual recovery entitlement. This does not transfer or alter the store purchase.</p><input value={accountSearch} onChange={(event) => setAccountSearch(event.target.value)} placeholder="Search name, username, or email" />{accounts.length === 0 ? <p className="hint">No accounts created yet.</p> : <div className="feedback-responses">{accounts.map((account) => { const manualGrant = proGrants?.find((grant) => grant.userID === account.id && grant.active); return <article key={account.id}><div><strong>{account.displayName || 'No display name'}</strong><small>{account.createdAt ? new Date(account.createdAt).toLocaleString() : 'Unknown signup date'} · {account.emailVerified === false ? 'unverified' : 'verified'}{account.isPro ? ' · Pro active' : ''}{account.suspicious ? ' · review' : ''}</small></div><small>{account.email}{account.username ? ` · @${account.username}` : ''}</small>{manualGrant ? <><small>Manual grant: {manualGrant.reason}</small><button type="button" className="text-button danger-text" disabled={proGrantBusy === account.id} onClick={() => void revokeProAccess(manualGrant)}>{proGrantBusy === account.id ? 'Revoking…' : 'Revoke manual Pro grant'}</button></> : <button type="button" className="secondary" disabled={proGrantBusy === account.id} onClick={() => void grantProAccess(account)}>{proGrantBusy === account.id ? 'Granting…' : 'Grant Pro access'}</button>}</article> })}</div>}</section>}
    {feedback && <section className="feedback-admin"><div><strong>User feedback</strong><small>{feedback.length} response{feedback.length === 1 ? '' : 's'}</small></div>{feedback.length === 0 ? <p className="hint">No feedback submitted yet.</p> : <div className="feedback-responses">{feedback.map((entry) => <article key={entry.id}><div><span>{entry.category}</span><small>{entry.platform.toUpperCase()} · {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'Just now'}</small></div><p>{entry.message}</p><small>{entry.userDisplayName ? `${entry.userDisplayName} · ` : ''}{entry.userEmail || 'Anonymous'}</small></article>)}</div>}</section>}
    {reports && <section className="feedback-admin"><div><strong>User reports</strong><small>{reports.length} report{reports.length === 1 ? '' : 's'}</small></div>{reports.length === 0 ? <p className="hint">No reports submitted.</p> : <div className="feedback-responses">{reports.map((report) => <article key={report.id}><div><span>{report.reason}</span><small>{report.status} · {report.createdAt ? new Date(report.createdAt).toLocaleString() : 'Just now'}</small></div><p>{report.details || 'No details provided.'}</p><small>{report.reporterEmail || 'Guest viewer'} reported {report.reportedEmail}</small>{report.status === 'open' && <div className="modal-actions"><button type="button" className="secondary" onClick={async () => { try { await api.removeReportedContent(token, report.id); setReports(await api.adminReports(token)) } catch (error) { onError(error) } }}>Remove content</button><button type="button" className="secondary" onClick={async () => { try { await api.suspendReportedUser(token, report.id); setReports(await api.adminReports(token)) } catch (error) { onError(error) } }}>Suspend account</button><button type="button" className="text-button" onClick={async () => { try { await api.dismissReport(token, report.id); setReports(await api.adminReports(token)) } catch (error) { onError(error) } }}>Dismiss</button></div>}</article>)}</div>}</section>}
    {audit && <section className="feedback-admin"><div><strong>Moderation audit</strong><small>{audit.length} recent event{audit.length === 1 ? '' : 's'}</small></div>{audit.length === 0 ? <p className="hint">No moderation activity yet.</p> : <div className="feedback-responses">{audit.slice(0, 50).map((event) => <article key={event.id}><div><strong>{event.action.replaceAll('_', ' ')}</strong><small>{event.createdAt ? new Date(event.createdAt).toLocaleString() : 'Just now'}</small></div><small>{event.adminEmail || 'Deleted admin'}{event.targetType ? ` · ${event.targetType}` : ''}{event.targetID ? ` · ${event.targetID}` : ''}</small></article>)}</div>}</section>}
    <div className="modal-actions spread"><button type="button" className="text-button danger-text" onClick={logout}><LogOut /> Log out</button></div>
    <div className="danger-zone"><strong>Delete account</strong><p>Permanently deletes your wishlists, friendships, groups, activity, and account data.</p><button type="button" className="secondary danger-text" onClick={async () => { const confirmation = window.prompt('This cannot be undone. Type DELETE to permanently delete your account.'); if (confirmation !== 'DELETE') return; try { await api.deleteAccount(token); logout() } catch (e) { onError(e) } }}><Trash2 /> Delete Account</button></div>
  </form></Modal>
}
function ShareLinkModal({ url, title, close, notify }: { url: string; title: string; close: () => void; notify: (s: string) => void }) { async function copy() { await navigator.clipboard.writeText(url); notify('Link copied') } async function nativeShare() { if (navigator.share) await navigator.share({ title, text: `A Hushful wishlist: ${title}`, url }); else await copy() } return <Modal close={close}><ModalHeader eyebrow="Keep it in the circle" title="Your private share link" close={close} /><p className="muted modal-copy">Anyone with this link can see the list and privately coordinate gifts.</p><div className="copy-field"><span>{url}</span><button onClick={copy}><Copy /></button></div><div className="modal-actions"><button className="secondary" onClick={copy}><Copy /> Copy link</button><button className="primary" onClick={nativeShare}><Send /> Share</button></div></Modal> }
function GuestLinksModal({ token, wishlistID, title, close, onError, notify }: { token: string; wishlistID: string; title: string; close: () => void; onError: (error: unknown) => void; notify: (message: string) => void }) {
  const [links, setLinks] = useState<GuestShareLink[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [rotatedURL, setRotatedURL] = useState('')
  useEffect(() => { api.guestShareLinks(token, wishlistID).then(setLinks).catch(onError).finally(() => setLoading(false)) }, [token, wishlistID, onError])
  async function revoke(link: GuestShareLink) { if (!window.confirm('Revoke this guest link? Anyone using it will lose guest-only access.')) return; setBusy(true); try { await api.revokeGuestShareLink(token, wishlistID, link.id); setLinks((all) => all.filter((item) => item.id !== link.id)); notify('Guest link revoked') } catch (error) { onError(error) } finally { setBusy(false) } }
  async function rotate(link: GuestShareLink) { setBusy(true); try { const result = await api.rotateGuestShareLink(token, wishlistID, link.id); const url = `${window.location.origin}/share/${result.shareToken}`; setRotatedURL(url); await navigator.clipboard?.writeText(url); notify('New guest link copied') ; setLinks(await api.guestShareLinks(token, wishlistID)) } catch (error) { onError(error) } finally { setBusy(false) } }
  return <Modal close={close}><ModalHeader eyebrow="Control access" title="Guest links" close={close} /><p className="muted modal-copy">Anyone with a guest link can view the list. Revoke a link if it has been shared too widely. Rotating invalidates the old URL.</p>{loading ? <FullPageLoader embedded /> : links.length ? <div className="social-stack">{links.map((link) => <div className="profile-list-row" key={link.id}><Link2 /><span><strong>Guest link</strong><small>Expires {link.expiresAt ? new Date(link.expiresAt).toLocaleDateString() : 'soon'}</small></span><button className="text-button" disabled={busy} onClick={() => void rotate(link)}>Rotate</button><button className="text-button danger-text" disabled={busy} onClick={() => void revoke(link)}>Revoke</button></div>)}</div> : <p className="hint">No guest links are active.</p>}{rotatedURL && <div className="copy-field"><span>{rotatedURL}</span><button onClick={() => void navigator.clipboard?.writeText(rotatedURL)}><Copy /></button></div>}<div className="modal-actions"><button className="secondary" onClick={close}>Done</button><button className="primary" disabled={!rotatedURL} onClick={() => { if (navigator.share) void navigator.share({ title, url: rotatedURL }); else void navigator.clipboard?.writeText(rotatedURL) }}><Send /> Share new link</button></div></Modal>
}
function IdentityModal({ close, continueWith }: { close: () => void; continueWith: (name: string, shareName: boolean) => void }) { const [name, setName] = useState(localStorage.getItem('hushful.displayName') || ''); const [shareName, setShareName] = useState(false); return <Modal close={close}><ModalHeader eyebrow="Just between gifters" title="What should we call you?" close={close} /><form className="stack-form" onSubmit={(e) => { e.preventDefault(); localStorage.setItem('hushful.displayName', name.trim()); continueWith(name.trim(), shareName) }}><Field label="Your name"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" /></Field><label className="checkbox"><input type="checkbox" checked={shareName} onChange={(e) => setShareName(e.target.checked)} /><span><strong>Show my name on notes</strong><small>Your purchase is still hidden from the wishlist owner.</small></span></label><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={!name.trim()}>Continue</button></div></form></Modal> }
function NoteModal({ initial, candidates, defaultName, close, save }: { initial?: { note?: string; displayName?: string; shareName?: boolean }; candidates: SocialUser[]; defaultName: string; close: () => void; save: (note: string, displayName: string | undefined, shareName: boolean) => void }) { const editing = Boolean(initial?.note); const [note, setNote] = useState(initial?.note || ''); const [shareName, setShareName] = useState(editing ? Boolean(initial?.shareName) : true); const [name, setName] = useState(initial?.displayName || localStorage.getItem('hushful.displayName') || defaultName); return <Modal close={close}><ModalHeader eyebrow="For fellow gifters" title={editing ? 'Edit your note' : 'Add a note'} close={close} /><form className="stack-form" onSubmit={(e) => { e.preventDefault(); if (shareName) localStorage.setItem('hushful.displayName', name.trim()); save(note.trim(), shareName ? name.trim() : undefined, shareName) }}><Field label="Note"><MentionTextarea value={note} onChange={setNote} candidates={candidates} placeholder="I can pick this up, or want to split it?" rows={4} /></Field><label className="checkbox"><input type="checkbox" checked={!shareName} onChange={(e) => setShareName(!e.target.checked)} /><span><strong>Post anonymously</strong><small>{shareName ? `Your note will display as ${name || defaultName}.` : 'This note will appear as Anonymous.'}</small></span></label>{shareName && <Field label="Your name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" autoComplete="name" /></Field>}<div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={!note.trim() || (shareName && !name.trim())}>{editing ? 'Save changes' : 'Add note'}</button></div></form></Modal> }

function Logo({ compact = false }: { compact?: boolean }) { return <div className={`logo ${compact ? 'compact' : ''}`}><span><Sparkles /></span><strong>hushful</strong></div> }
function Avatar({ name, userId, hasAvatar = false, version = 0 }: { name: string; userId?: string; hasAvatar?: boolean; version?: number }) { return <span className={`avatar ${hasAvatar ? 'has-image' : ''}`}>{hasAvatar && userId ? <ProtectedImage path={`/v1/users/${userId}/avatar${version ? `?v=${version}` : ''}`} accessToken={authStorage.get() || undefined} /> : name.trim().charAt(0).toUpperCase() || <User />}</span> }
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

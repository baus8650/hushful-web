import { useState } from 'react'
import { ArrowRight, Check, ExternalLink, Gift, Link2, LockKeyhole, Sparkles } from 'lucide-react'
import { APP_STORE_URL } from './appLinks'
import { PublicFooter } from './LegalPages'
import './landing.css'

const signup = '/login?signup=1'

function SignupLink({ children = 'Make my free wishlist' }: { children?: React.ReactNode }) {
  return <a className="primary" href={signup}>{children}<ArrowRight aria-hidden="true" /></a>
}

function ClaimDemo() {
  const [claimed, setClaimed] = useState(false)
  return <div className="landing-demo">
    <div className="landing-demo-heading"><span className="eyebrow">Interactive example</span><span><LockKeyhole aria-hidden="true" /> Gift-giver’s view</span></div>
    <h3>Jamie’s birthday wishlist</h3>
    <div className="landing-demo-item"><span className="landing-gift"><Gift aria-hidden="true" /></span><div><strong>A really good coffee grinder</strong><span>A little upgrade for the morning routine.</span></div></div>
    <button type="button" className={claimed ? 'secondary' : 'primary'} aria-pressed={claimed} onClick={() => setClaimed(!claimed)}>{claimed ? <Check aria-hidden="true" /> : <Gift aria-hidden="true" />}{claimed ? 'Claimed by you · Undo' : 'Try claiming this gift'}</button>
    <p className="landing-demo-status" role="status">{claimed ? 'Other gift-givers would see it’s covered. Jamie would still see an unclaimed wish.' : 'Tap to see how Hushful helps prevent two people buying the same gift.'}</p>
    <div className="landing-owner-view"><LockKeyhole aria-hidden="true" /><span><strong>The wishlist owner’s view stays the same.</strong> Claims and gift-planning notes stay hidden from them.</span></div>
  </div>
}

export function LandingPage() {
  return <div className="public-shell landing-shell">
    <a className="landing-skip" href="#main">Skip to content</a>
    <header className="public-header">
      <a className="public-logo" href="/" aria-label="Hushful home"><span><Sparkles /></span><strong>hushful</strong></a>
      <nav aria-label="Main navigation"><a className="landing-how-link" href="#how-it-works">How it works</a><a className="landing-login" href="/login">Log in</a><a className="primary" href={signup}>Start free<ArrowRight aria-hidden="true" /></a></nav>
    </header>
    <main id="main" className="landing-page">
      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="landing-hero-copy">
          <p className="eyebrow">Shared wishlists. Secret gift claims.</p>
          <h1 id="hero-title">Give them ideas.<br />Keep the surprise.</h1>
          <p className="landing-intro">Save what you’d love from any store. Share your wishlist. Friends and family can secretly claim gifts, so nobody buys the same thing twice.</p>
          <div className="landing-actions"><SignupLink /><a className="landing-text-link" href="#how-it-works">See how it works <ArrowRight aria-hidden="true" /></a></div>
          <p className="landing-reassurance">3 free lists · Unlimited wishes · No credit card needed</p>
          <a className="landing-store-link" href={APP_STORE_URL} target="_blank" rel="noreferrer">Prefer the app? Get Hushful for iPhone & iPad <ExternalLink aria-hidden="true" /></a>
          <p className="landing-reassurance">Android app coming soon.</p>
        </div>
        <figure className="landing-product">
          <div className="landing-phone"><img src="/images/hushful-wishlist.jpg" width="1320" height="2868" fetchPriority="high" alt="Hushful on iPhone showing a birthday wishlist with gift links, prices, and personal notes." /></div>
          <figcaption><span><Gift aria-hidden="true" /> Your ideas, ready to share.</span><small>Actual Hushful app</small></figcaption>
        </figure>
      </section>
      <section id="how-it-works" className="landing-process" aria-labelledby="process-title">
        <p className="eyebrow">From “what do you want?” to “I’ve got it.”</p>
        <h2 id="process-title">A list for you. Less guesswork for them.</h2>
        <ol className="landing-steps">
          <li><span className="landing-step-number">01</span><h3>Save a few ideas.</h3><p>Add links from any store, plus prices and notes. Everything you’d love, together in one list.</p></li>
          <li><span className="landing-step-number">02</span><h3>Send your list.</h3><p>Share a link in the family chat. Friends can open it in their browser without downloading Hushful or creating an account.</p></li>
          <li><span className="landing-step-number">03</span><h3>Let them handle the surprise.</h3><p>Gift-givers can claim items and coordinate privately. You won’t see who’s buying what.</p></li>
        </ol>
      </section>
      <section className="landing-claims" aria-labelledby="claims-title">
        <div><p className="eyebrow">The part you don’t get to see</p><h2 id="claims-title">A shared list.<br />A secret plan.</h2><p>You know what’s on your wishlist. You don’t need to know what’s getting wrapped.</p><p>Private gift claims help everyone else avoid duplicates, while keeping the surprise for you.</p><a className="landing-text-link" href={signup}>Create a list of your own <ArrowRight aria-hidden="true" /></a></div>
        <ClaimDemo />
      </section>
      <section className="landing-occasions" aria-labelledby="occasions-title">
        <p className="eyebrow">Whatever’s coming up</p><h2 id="occasions-title">Have an answer when they ask.</h2>
        <div className="landing-occasion-list"><span>Birthdays</span><span>Holidays</span><span>Wedding registries</span><span>Baby showers</span><span>Just because</span></div>
        <p>Make a wishlist for yourself, build a joint list, or plan a gift for someone else. Keep the links out of your message history and somewhere you can find them.</p>
      </section>
      <section className="landing-free" aria-labelledby="free-title">
        <div><p className="eyebrow">Start with Hushful Free</p><h2 id="free-title">Your first list starts here.</h2><p>Three active lists, unlimited wishes, sharing, collaboration, and private gift coordination. Free.</p><ul><li><Check aria-hidden="true" /> Ideas from any store</li><li><Link2 aria-hidden="true" /> Share with people who don’t have the app</li><li><LockKeyhole aria-hidden="true" /> Keep gift claims a secret</li></ul><SignupLink /><p className="landing-reassurance">Use it in your browser. No download required.</p></div>
        <aside><h3>Need more later?</h3><p>Hushful Pro adds unlimited active lists, recurring occasions, and cash funds. It’s an optional lifetime upgrade purchased in the iOS app. No subscription.</p><p>You don’t need Pro to share your list or coordinate gifts.</p></aside>
      </section>
      <section className="landing-faq" aria-labelledby="faq-title"><h2 id="faq-title">A few things you might be wondering</h2>
        <details><summary>Is Hushful free?</summary><p>Yes. Free accounts include up to three active lists, unlimited wishes, sharing, collaboration, and gift coordination. No credit card is needed. Pro is an optional one-time purchase for additional features.</p></details>
        <details><summary>Do my friends need an account?</summary><p>No. Send a guest share link and they can view your wishlist and coordinate gifts in their browser without downloading Hushful or creating an account. Anyone with that link can access the list; you can revoke or replace it in your sharing settings.</p></details>
        <details><summary>Will I see which gifts have been claimed?</summary><p>No. Gift claims and recipient coordination notes are hidden from wishlist owners. The shared list’s gift-planning discussion is hidden too. Discussions inside a joint list are visible to its collaborators.</p></details>
        <details><summary>Can I add gifts from different stores?</summary><p>Yes. Add product links from any store, with photos, prices, and notes. On iOS, you can also save products through the share sheet.</p></details>
        <details><summary>Can I use Hushful on my computer?</summary><p>Yes. Create and manage your wishlists in your browser, or use the same account in the iPhone and iPad app.</p></details>
      </section>
      <section className="landing-final" aria-labelledby="final-title"><p className="eyebrow">Next time they ask, send your list.</p><h2 id="final-title">What would you love?</h2><SignupLink /><p className="landing-reassurance">Free to start. The surprises are theirs to plan.</p></section>
    </main>
    <PublicFooter />
  </div>
}

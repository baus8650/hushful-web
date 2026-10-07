import { ExternalLink, Sparkles } from 'lucide-react'
import { APP_STORE_URL } from './appLinks'
import { PublicFooter } from './LegalPages'

export function LandingPage() {
  return <div className="public-shell landing-shell">
    <header className="public-header">
      <a className="public-logo" href="/" aria-label="Hushful home"><span><Sparkles /></span><strong>hushful</strong></a>
      <a className="secondary" href="/login">Log in</a>
    </header>
    <main className="legal-page landing-page">
      <section className="landing-hero">
        <p className="eyebrow">Wishlists for iPhone, iPad, and the web</p>
        <h1>Your wishlist. Shared with anyone.</h1>
        <p className="landing-intro">For birthdays, holidays, wedding registries, baby showers, and everything worth celebrating. Save gift ideas from any store, share your wishlist with family and friends, and let them coordinate gifts without spoiling the surprise.</p>
        <div className="landing-actions"><a className="primary" href={APP_STORE_URL} target="_blank" rel="noreferrer">Download on the App Store <ExternalLink aria-hidden="true" /></a><a className="secondary" href="/login?signup=1">Create an account</a></div>
        <p className="hint">Free to use. Optional lifetime Pro upgrade. No subscription.</p>
      </section>
      <section><h2>A wishlist for every occasion</h2><p>From birthdays and holidays to wedding registries and baby showers, Hushful brings gift ideas from any store into one shared wishlist. Keep links, photos, prices, and notes together instead of scattered across messages.</p></section>
      <section className="landing-features" aria-label="Wishlist occasions">
        <article><h2>Birthdays</h2><p>Share the things you would love with friends and family, and help them coordinate birthday gifts.</p></article>
        <article><h2>Holidays</h2><p>Bring holiday gift ideas together so everyone can plan without duplicate gifts.</p></article>
        <article><h2>Wedding registries</h2><p>Create a wedding gift wishlist from different stores, or use it alongside your registry for bridal showers and your new home.</p></article>
        <article><h2>Baby showers</h2><p>Collect gift ideas for a new arrival and share them with guests.</p></article>
      </section>
      <section><h2>Share wishlists inside and outside the app</h2><p>Create public or private wishlists, share with friends and groups in Hushful, or send a guest share link to someone outside the app. They can view the list and coordinate gifts in their browser without downloading Hushful or creating an account.</p><p>Keep a public wishlist easy to share, or invite people to a private list through a guest link. Anyone who has that guest link can access the list. You can revoke a guest link or replace it with a new one when you need to change access.</p></section>
      <section><h2>Your list, a joint list, or a surprise for someone else</h2><div className="landing-features">
        <article><h3>Your own wishlists</h3><p>Collect the things you would love and let friends and family plan gifts privately. Choose who can see each list.</p></article>
        <article><h3>Joint wishlists</h3><p>Co-own a list with other people and add or manage wishes together. Build a shared list for a couple, household, or group celebration.</p></article>
        <article><h3>Gift-planning lists for other people</h3><p>Collaborate on gift ideas for someone else. Keep the planning in one place so everyone knows which ideas are being considered and which gifts are already covered.</p></article>
        <article><h3>Private comment threads</h3><p>Discuss a shared wishlist with other gift-givers in a comment thread the wishlist owners cannot see. Coordinate plans, ask questions, and use @mentions to bring eligible planners into the conversation. Joint-list discussions are visible to everyone collaborating on that joint list.</p></article>
      </div></section>
      <section><h2>Everything you need to collect wishes and coordinate gifts</h2><div className="landing-features">
        <article><h3>Gift ideas from any store</h3><p>Add product links, photos, prices, quantities, and notes. On iOS, save products from other apps through the share sheet.</p></article>
        <article><h3>Private claims and item notes</h3><p>Claim gifts or quantities to help prevent duplicate purchases. Add coordination notes with your name or anonymously. Gift claims and recipient notes stay hidden from the wishlist owners.</p></article>
        <article><h3>Friends, groups, and profiles</h3><p>Find friends by username, organize people into groups, and choose audiences for your profile details and lists. Share useful gift preferences with the people you choose.</p></article>
        <article><h3>Keep important lists handy</h3><p>Save shared wishlists, pin lists and friends for quick access, and archive lists when an occasion is finished.</p></article>
        <article><h3>Activity and reminders</h3><p>Follow activity and mentions, and enable birthday reminders. The iOS app supports push notifications so you can keep up with the people and lists you care about.</p></article>
        <article><h3>Privacy and control</h3><p>Manage discoverability, friend requests, and sharing audiences. Block accounts or report profiles, lists, and comments when needed.</p></article>
      </div></section>
      <section><h2>More planning tools with Hushful Pro</h2><p>Free includes up to three active lists, unlimited wishes, sharing, collaboration, and gift coordination. Pro is an optional lifetime upgrade purchased in the iOS app, with no subscription. Use the same Hushful account to access supported Pro features on the web.</p><div className="landing-features">
        <article><h3>Unlimited active lists</h3><p>Keep separate wishlists for more people and occasions without the free plan’s active-list limit.</p></article>
        <article><h3>Recurring occasions</h3><p>Plan annual dates and set flexible reminders for the celebrations you want to remember.</p></article>
        <article><h3>Cash funds</h3><p>Add a contribution goal and an external payment link for a shared gift or experience. Contributions happen through your chosen service; Hushful does not process or hold money.</p></article>
        <article><h3>Templates and styling on iOS</h3><p>Start with templates and personalize your lists with custom icons and colors.</p></article>
        <article><h3>Totals and insights on iOS</h3><p>See list counts, totals, and average prices to help plan your gifts.</p></article>
        <article><h3>Export and duplicate on iOS</h3><p>Export a wishlist as a PDF or duplicate a list to reuse it for another occasion.</p></article>
      </div></section>
      <section><h2>Questions about Hushful</h2>
        <h3>Is Hushful free?</h3><p>Yes. Free accounts include up to three active lists, unlimited wishes, sharing, and gift coordination. An optional one-time Pro purchase unlocks additional features.</p>
        <h3>Do friends need the app to use my wishlist?</h3><p>No. Share a guest link so they can open your wishlist in a web browser without an app or account.</p>
        <h3>Can I use Hushful on a computer?</h3><p>Yes. <a href="/login">Log in</a> to create and manage your wishlists in your browser.</p>
        <h3>Can the wishlist owner see who claimed a gift?</h3><p>Gift claims, item coordination notes, and the shared list’s gift-planning discussion are hidden from every wishlist owner. Discussions inside a joint list are visible to its collaborators.</p>
      </section>
      <section><h2>Start your next wishlist</h2><p>Get ready for the holidays or your next celebration.</p><a className="primary" href="/login?signup=1">Create an account</a></section>
    </main>
    <PublicFooter />
  </div>
}

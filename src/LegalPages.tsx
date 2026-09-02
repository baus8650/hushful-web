import { ArrowLeft, ExternalLink, Gift, Mail, ShieldCheck, Sparkles } from 'lucide-react'

export type PublicPage = 'privacy' | 'terms' | 'support' | 'press'

export function legalRoute(pathname: string): PublicPage | null {
  const route = pathname.replace(/\/+$/, '') || '/'
  if (route === '/privacy') return 'privacy'
  if (route === '/terms') return 'terms'
  if (route === '/support' || route === '/account-deletion') return 'support'
  if (route === '/press') return 'press'
  return null
}

export function PublicFooter() {
  return <footer className="public-footer">
    <span>Private by design · Share only with the people you choose</span>
    <nav aria-label="Legal and support">
      <a href="/privacy">Privacy</a>
      <a href="/terms">Terms</a>
      <a href="/support">Support</a>
      <a href="/press">Press</a>
    </nav>
  </footer>
}

export function LegalPage({ page }: { page: PublicPage }) {
  const content = page === 'privacy' ? <Privacy /> : page === 'terms' ? <Terms /> : page === 'support' ? <Support /> : <Press />
  return <div className="public-shell">
    <header className="public-header">
      <a className="public-logo" href="/" aria-label="Hushful home"><span><Sparkles /></span><strong>hushful</strong></a>
      <a className="secondary" href="/"><ArrowLeft /> Back to Hushful</a>
    </header>
    {content}
    <PublicFooter />
  </div>
}

function PageIntro({ eyebrow, title, summary }: { eyebrow: string; title: string; summary: string }) {
  return <div className="legal-intro"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{summary}</p><small>Effective September 2, 2026</small></div>
}

function Privacy() {
  return <main className="legal-page">
    <PageIntro eyebrow="Your information" title="Privacy Policy" summary="Hushful is built for thoughtful sharing without spoiling surprises. This policy explains what information we collect, why we use it, and the choices you have." />
    <section><h2>Who this policy covers</h2><p>This policy applies to the Hushful iOS, Android, and web apps and the services that power them (together, the “Service”). “Hushful,” “we,” “us,” and “our” refer to the operator of the Hushful Service. If you do not agree with this policy, do not use the Service.</p></section>
    <section><h2>Information we collect</h2><h3>Account and profile information</h3><p>When you create an account, we collect your email address, password in hashed form, display name, username, profile picture if you add one, discoverability setting, friend-request setting, and account creation and update dates. If you continue with Google, Google provides an identity identifier, verified email address, and may provide your name. We do not receive your Google password.</p><h3>Content and social activity</h3><p>We store the wishlists, item titles, links, prices, quantities, images, notes, cash-fund details, recurring occasions, sharing choices, collaborators, friendships, groups, blocks, pins, gift claims, recipient notes, and activity notifications you create or receive. Guest visitors to a shared list receive a random viewer token so their claims and notes remain associated with that browser.</p><h3>Purchases</h3><p>Apple processes Hushful Pro purchases. We receive purchase status, product and transaction identifiers, and an app-account identifier needed to unlock or restore Pro. We do not receive your full payment-card details.</p><h3>Device, notification, and usage information</h3><p>If you enable push notifications, we store a device push token, platform, and app environment. On the web, we create a random browser identifier and record page paths, whether the visitor was signed in, and timestamps to understand aggregate use. Hushful does not use this information for cross-app tracking or targeted advertising. Local preferences, access tokens, guest-viewer tokens, and reminder information may be stored on your device or browser.</p><h3>Information collected automatically by infrastructure</h3><p>Our hosting, content-delivery, security, and email providers may process ordinary network information such as IP address, request time, user agent, and diagnostic logs to deliver and protect the Service. We do not sell this information.</p></section>
    <section><h2>How we use information</h2><ul><li>Provide accounts, wishlists, sharing, collaboration, reminders, notifications, and Hushful Pro.</li><li>Authenticate users, prevent abuse, secure the Service, troubleshoot, and maintain reliability.</li><li>Send password-reset and service messages you request or that are necessary to operate the Service.</li><li>Measure aggregate product use and improve features.</li><li>Comply with law and enforce our Terms.</li></ul></section>
    <section><h2>How information is shared</h2><p>We share information only as needed to provide the Service, when you direct us, or when legally required.</p><ul><li><strong>With people you choose.</strong> Public profile and wishlist information is visible according to your settings. Private lists are shared only with selected friends, groups, collaborators, or people who have a guest link. A guest link should be treated as private: anyone with the link can access that list.</li><li><strong>Gift coordination.</strong> Claims and recipient notes are intended to remain hidden from a wishlist’s recipient but may be visible to other eligible gift planners. No online service can guarantee that another person will not reveal or capture information.</li><li><strong>Service providers.</strong> Hosting/database providers, Apple, Google, email delivery providers, and notification providers process information for us under their own terms and privacy commitments.</li><li><strong>Legal and safety reasons.</strong> We may disclose information to comply with valid legal process, protect people, investigate abuse, or defend legal rights.</li><li><strong>Business changes.</strong> Information may transfer as part of a merger, financing, reorganization, or sale, subject to this policy or notice of materially different terms.</li></ul><p>We do not sell personal information and do not share it for cross-context behavioral advertising.</p></section>
    <section><h2>Retention and deletion</h2><p>We keep account information and content while your account is active and as needed to provide the Service. You can delete individual content in the app. You can permanently delete your account in Hushful by opening <strong>Account → Delete Account</strong>. Account deletion removes your account and associated wishlists, social relationships, groups, activity, images, and other account data from active systems. Limited records may remain temporarily in encrypted backups, security logs, or where retention is required for fraud prevention, accounting, dispute resolution, or law, after which they are deleted or de-identified.</p><p>Guest content may remain until the associated list owner deletes the list or revokes the share. You may also contact us for help with access, correction, or deletion.</p></section>
    <section><h2>Your choices</h2><ul><li>Change your display name, profile picture, discoverability, friend-request, sharing, and notification choices in the app.</li><li>Revoke a guest link or remove list access at any time.</li><li>Disable system notifications in device settings.</li><li>Delete your account in the app without contacting support.</li><li>Request access, correction, or deletion by emailing us. We may need to verify your identity.</li></ul></section>
    <section><h2>Security and international processing</h2><p>We use administrative, technical, and organizational safeguards designed to protect information, including encrypted network connections and hashed passwords. No method of storage or transmission is completely secure. The Service and its providers may process information in the United States and other countries, where privacy laws may differ from those where you live.</p></section>
    <section><h2>Children</h2><p>Hushful is not directed to children under 13, and we do not knowingly collect personal information from children under 13. If local law requires a higher age for a person to consent to data processing, a parent or guardian must authorize use. Contact us if you believe a child provided information without appropriate permission.</p></section>
    <section><h2>Changes and contact</h2><p>We may update this policy as the Service changes. We will post the revised policy here and update the effective date; we will provide additional notice when required. Questions or privacy requests can be sent to <a href="mailto:support@hushful-app.com">support@hushful-app.com</a>.</p></section>
  </main>
}

function Terms() {
  return <main className="legal-page">
    <PageIntro eyebrow="The ground rules" title="Terms of Use" summary="These terms are a straightforward agreement for using Hushful responsibly." />
    <section><h2>Accepting these terms</h2><p>By downloading, accessing, or using Hushful, you agree to these Terms and our <a href="/privacy">Privacy Policy</a>. If you do not agree, do not use Hushful. You must be at least 13 and legally able to agree to these Terms. If you use Hushful for an organization, you represent that you can bind that organization.</p></section>
    <section><h2>Your account</h2><p>Provide accurate information, protect your credentials, and tell us promptly if you believe your account has been compromised. You are responsible for activity through your account. Usernames may be permanent. You may delete your account at any time in Account settings.</p></section>
    <section><h2>Your content and permission to operate Hushful</h2><p>You retain ownership of content you submit. You give Hushful a worldwide, non-exclusive, royalty-free license to host, store, reproduce, format, transmit, and display that content only as needed to operate, secure, and improve the Service and to share it according to your settings. This license ends when the content is deleted, except for temporary backups, content others independently retained, or records we must lawfully keep.</p><p>You represent that you have the rights needed to submit your content. Product names, images, and links may belong to their respective owners; Hushful is not affiliated with or endorsed by linked merchants unless stated.</p></section>
    <section><h2>Acceptable use</h2><p>Do not use Hushful to violate law or another person’s rights; harass, threaten, defraud, or impersonate others; publish illegal, infringing, deceptive, or malicious content; expose another person’s sensitive information without permission; probe or bypass security; scrape or overload the Service; distribute malware or spam; manipulate purchases or gift claims; or help anyone do these things. We may remove content, limit access, or suspend accounts to protect the Service and its users.</p></section>
    <section><h2>Sharing, merchants, and gifts</h2><p>You control your sharing settings and are responsible for people you invite and links you distribute. Anyone who receives a guest link may be able to forward it. Hushful helps people organize ideas and coordinate gifts; it is not a merchant, payment processor, escrow service, or party to transactions with third-party stores. Prices, availability, links, delivery, refunds, taxes, and product quality are controlled by third parties. Gift claims and notes are coordination aids and are not guarantees of purchase or secrecy.</p></section>
    <section><h2>Hushful Pro and Apple terms</h2><p>Hushful Pro is currently offered as a one-time, non-consumable in-app purchase. The displayed price is provided by Apple and may vary by country. Payment is charged to your Apple Account. Purchases are processed under Apple’s terms and refund policies and can be restored for an eligible Apple Account. Features may evolve, but we will not convert a completed one-time purchase into a recurring charge.</p><p>For the iOS app, Apple’s standard end-user license agreement applies unless a custom agreement is presented in App Store Connect. Apple is not responsible for providing maintenance or support for Hushful.</p></section>
    <section><h2>Service changes and termination</h2><p>We may change, suspend, or discontinue features, introduce reasonable limits, or end the Service. We aim to provide notice of material changes when practical. You may stop using Hushful at any time. We may suspend or terminate access for material or repeated violations, legal requirements, security threats, or harm to others. Sections that by their nature should survive termination—including ownership, disclaimers, liability limits, and dispute provisions—will survive.</p></section>
    <section><h2>Disclaimers</h2><p>To the fullest extent permitted by law, Hushful is provided “as is” and “as available.” We do not warrant that it will always be uninterrupted, error-free, secure, or that wish, price, merchant, reminder, notification, or gift-coordination information will be accurate or timely. Nothing in these Terms limits warranties or consumer rights that cannot legally be excluded.</p></section>
    <section><h2>Limitation of liability</h2><p>To the fullest extent permitted by law, Hushful and its operator will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, lost profits, lost data, failed gifts, or third-party conduct arising from the Service. Our total liability for claims relating to the Service will not exceed the greater of the amount you paid Hushful during the 12 months before the claim or US $50. These limits do not apply where prohibited by law.</p></section>
    <section><h2>General terms</h2><p>If a provision is unenforceable, the rest remains effective. Failure to enforce a provision is not a waiver. You may not transfer these Terms without our consent; we may transfer them as part of a business transaction. These Terms and the Privacy Policy are the entire agreement about the Service. Applicable law and forum will be determined by the law where the Hushful operator is established, except where your local consumer law requires otherwise.</p></section>
    <section><h2>Changes and contact</h2><p>We may update these Terms. Material changes apply prospectively after reasonable notice where required. Continued use after the effective date means you accept the revised Terms. Questions can be sent to <a href="mailto:support@hushful-app.com">support@hushful-app.com</a>.</p></section>
  </main>
}

function Support() {
  return <main className="legal-page support-page">
    <PageIntro eyebrow="We’re here to help" title="Hushful Support" summary="Get help with your account, sharing, purchases, privacy, or deleting your information." />
    <div className="support-grid">
      <section className="support-card"><Mail /><h2>Contact support</h2><p>Email us with the address on your Hushful account and a short description of the issue. Never send your password.</p><a className="primary" href="mailto:support@hushful-app.com?subject=Hushful%20support">Email support <ExternalLink /></a></section>
      <section className="support-card"><ShieldCheck /><h2>Delete your account</h2><p>In Hushful, open <strong>Account</strong>, choose <strong>Delete Account</strong>, type <strong>DELETE</strong>, and confirm. This permanently removes the account and associated account data. If you cannot sign in, email support from the account’s email address.</p></section>
      <section className="support-card"><Gift /><h2>Restore Hushful Pro</h2><p>Sign in to the Hushful account you used for Pro, open the Pro screen, and choose <strong>Restore Purchase</strong>. Use the Apple Account that made the original purchase.</p></section>
    </div>
    <section><h2>Common questions</h2><h3>Who can see a private wishlist?</h3><p>Only people you select and people who possess an active guest link. Revoke a guest link if it was shared more widely than intended.</p><h3>Can the list owner see gift claims?</h3><p>Hushful is designed to hide claims and recipient notes from the gift recipient while allowing eligible gift planners to coordinate.</p><h3>How do I control notifications?</h3><p>Use Hushful’s notification settings for list updates and reminders. You can also disable Hushful notifications in iOS Settings.</p><h3>How do I report a safety or privacy issue?</h3><p>Email <a href="mailto:support@hushful-app.com?subject=Hushful%20privacy%20or%20safety">support@hushful-app.com</a>. Include the relevant username or share link, but do not include passwords or payment-card details.</p></section>
  </main>
}

function Press() {
  return <main className="legal-page press-page">
    <PageIntro eyebrow="Press & creators" title="Hushful makes gifting thoughtful—not awkward." summary="A private, collaborative wishlist for families, friends, and every occasion worth remembering." />
    <section className="press-boilerplate"><h2>About Hushful</h2><p>Hushful is a calm place to collect wishes and coordinate gifts without spoiling the surprise. People can build public or private wishlists, save products from shopping apps, share with friends or groups, plan gifts together, and privately claim what they’re buying. Guest links let family and friends participate without creating an account.</p></section>
    <section><h2>At a glance</h2><ul><li>Public and private wishlists with fine-grained sharing</li><li>Private gift claims and notes hidden from the recipient</li><li>Collaborative lists for couples, families, and planning groups</li><li>Save products through the iPhone share sheet</li><li>Recurring occasions and optional reminders</li><li>Guest coordination without requiring an account</li><li>One-time Hushful Pro upgrade—no subscription</li></ul></section>
    <section><h2>Suggested short description</h2><blockquote>Hushful keeps every wish in one calm place and lets friends coordinate gifts without ruining the surprise.</blockquote><h2>Suggested one-line description</h2><blockquote>All the wishes. None of the spoilers.</blockquote></section>
    <section><h2>Press contact</h2><p>For interviews, product information, review access, or brand assets, email <a href="mailto:support@hushful-app.com?subject=Hushful%20press%20inquiry">support@hushful-app.com</a>.</p></section>
  </main>
}

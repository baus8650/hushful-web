import { useEffect, useState } from 'react'
import { APP_STORE_URL } from './appLinks'
import { chooseUsage, privacySignal, trackUsage, usagePreference } from './usageMetrics'
export function UsagePrivacy() {
  const [open, setOpen] = useState(() => usagePreference() === null && !privacySignal())
  useEffect(() => {
    const click = (event: MouseEvent) => { const link = (event.target as Element)?.closest?.('a'); if (link?.href === APP_STORE_URL) trackUsage(location.pathname, 'app_store_click') }
    document.addEventListener('click', click)
    return () => document.removeEventListener('click', click)
  }, [])
  return <><button type="button" className="usage-privacy-button" onClick={() => setOpen(true)}>Usage privacy</button>{open && <section className="usage-consent" aria-label="Optional usage analytics"><strong>Help improve Hushful</strong><p>Optionally share device and browser details, language, time zone, referral site, and approximate country, region, and city. Only Hushful administrators see these details. Wishlist contents, account identifiers, precise location, and raw IP addresses are excluded. Anonymous traffic counts are recorded without these details.</p>{privacySignal() && <p>Your browser’s privacy preference keeps detailed analytics off.</p>}<a href="/privacy">Privacy policy</a><div className="modal-actions"><button type="button" onClick={() => { chooseUsage(false); setOpen(false) }}>No thanks</button>{!privacySignal() && <button type="button" className="primary" onClick={() => { chooseUsage(true); setOpen(false) }}>Share usage analytics</button>}</div></section>}</>
}

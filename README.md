# Hushful web

The React + TypeScript web client for Hushful. It mirrors the iOS app's owner and recipient flows:

- Register, sign in, edit your display name, and log out
- Create wishlists, add or remove items, and generate private share links
- Open and save shared wishlists
- Privately claim gifts and coordinate with notes

## Run locally

```bash
npm install
npm run dev
```

Vite proxies `/v1` to the production WishlistAPI during development. To use another API, copy `.env.example` to `.env.local` and set `VITE_API_URL`.

## Build

```bash
npm run build
```

The production host should serve `dist/` and serve existing files and directories first, and rewrite unknown routes (including `/share/:token`) to `app.html`. The included `_redirects` file configures this for hosts that support it. Do not rewrite every request to `index.html`, because that would bypass the generated public pages and serve homepage metadata on guest routes.

For an Android release deployment, generate the App Links file from the certificate shown under Google Play Console → App integrity → App signing:

```bash
ANDROID_APP_SIGNING_SHA256='AA:BB:…:FF' npm run build:release
```

This writes `/.well-known/assetlinks.json` into the production bundle. Do not substitute the local upload-key fingerprint.

Viewer tokens and saved shared lists are scoped to the signed-in account and stored in browser local storage. Authentication uses the same bearer-token API as iOS.

## Free and Pro

Free accounts have three active primary-owned lists. Archived lists and lists owned by other people do not count. Pro access comes from the server's `isPro` account field and refreshes when the browser regains focus or the user selects Refresh Pro status. Mobile builds provide the store purchase flow; web payments are not available.

Run the Free/Pro policy tests with `npm test` using Node 22.6 or newer. See `../WishlistAPI/PRO_ROLLOUT.md` before deploying the coordinated API and iOS changes; purchases made by the old iOS build are only stored locally until synced by an updated build.

## Search discovery

The build prerenders the homepage and all public information pages as HTML, with page-specific titles, descriptions, and canonical URLs. It also generates `sitemap.xml`, `robots.txt`, and a `noindex` SPA fallback for account/guest routes. The preferred production origin is `https://www.hushful-app.com`, matching the existing canonical URL; configure the hosting provider to redirect the bare domain to this origin.

After deployment:

1. Verify `/`, `/support`, and `/press` return their own HTML with readable content before JavaScript runs. Verify `/login` and `/share/example` use the noindex app shell.
2. Add the domain to Google Search Console and verify ownership (usually through a DNS TXT record). Submit `https://www.hushful-app.com/sitemap.xml`, inspect the homepage, and request indexing.
3. Submit the same sitemap to Bing Webmaster Tools.
4. Monitor indexing and search queries. Indexing and rankings are determined by search engines and are not immediate.

Run `npm run test:seo` after building to validate the generated search-facing pages and fallback.

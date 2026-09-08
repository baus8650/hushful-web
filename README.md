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

The production host should serve `dist/` and rewrite unknown routes (including `/share/:token`) to `index.html`.

Viewer tokens and saved shared lists are scoped to the signed-in account and stored in browser local storage. Authentication uses the same bearer-token API as iOS.

## Free and Pro

Free accounts have three active primary-owned lists. Archived lists and lists owned by other people do not count. Pro access comes from the server's `isPro` account field and refreshes when the browser regains focus or the user selects Refresh Pro status. The upgrade panel explains the plans and the pending iOS, web payments, and Android launches.

Run the Free/Pro policy tests with `npm test` using Node 22.6 or newer. See `../WishlistAPI/PRO_ROLLOUT.md` before deploying the coordinated API and iOS changes; purchases made by the old iOS build are only stored locally until synced by an updated build.

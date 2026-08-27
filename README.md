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

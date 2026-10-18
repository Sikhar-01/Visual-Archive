# Visual Library

The app now uses Next.js, React, and TypeScript. Its React interface is in `src/app`, its typed data model is in `src/lib/model.ts`, and persistence and image backup code is in `src/lib/storage.ts`.

## Run locally

Install dependencies with `npm install`, start the development server with `npm run dev`, then open [http://localhost:3000](http://localhost:3000). Run `npm run build` to create a production build and `npm run typecheck` to check the TypeScript source.

## Existing browser data

The migration keeps the existing localStorage keys and IndexedDB database/store names. Existing libraries, card IDs, and stored image blobs remain readable in the same browser profile. Older cards with embedded data URL images are copied into the existing image store the first time the new app loads them. Browser-local data is still local to that browser profile; JSON export/import remains available for backups and moving data.

Appearance choices, including background and accent color, are stored in this browser. The Dark Veil background is adapted from React Bits; see `THIRD_PARTY_NOTICES.md` for attribution and license terms.

## Legacy static files

The previous HTML/CSS/JavaScript version is kept under `legacy/` as a fallback reference. The Next.js app is the active version.

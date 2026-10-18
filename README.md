# The Visual Archive

The Visual Archive is a local-first place to collect visual references. Organize links and images into libraries, browse them as cards, and customize the workspace to suit your style.

## Features

- Create, rename, reorder, and delete libraries. Each library has its own clean URL based on its name.
- Add reference cards with a title, destination link, and image. Drag cards to reorder them.
- Search library names, card titles, and links.
- Import and export a library as a JSON backup, including its images.
- Choose a background, accent color, and card size for the home page and individual libraries.
- Install the site as a progressive web app (PWA) in supported browsers.

## Getting started

### Requirements

- Node.js 20.9 or newer
- npm

### Run locally

```bash
git clone https://github.com/Sikhar-01/Visual-Archive.git
cd Visual-Archive
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server. |
| `npm run build` | Create a production build. |
| `npm run start` | Serve the production build locally. |
| `npm run typecheck` | Check TypeScript types without emitting files. |

## Using the app

1. Create a library from the home page and give it a name.
2. Open the library and add cards for the references you want to keep.
3. Add an image by choosing a file or dropping it into the image area when editing a card.
4. Search within a library, adjust its card size, or drag cards to change their order.
5. Open **Appearance** to pick a background and accent color. Home page and library appearance settings are saved separately.
6. Export a library periodically to keep a portable backup.

Importing a backup replaces the cards in the selected library. Export the current contents first if you need to preserve them.

## Data and privacy

Libraries, card details, and appearance preferences are stored in this browser. Images are stored in the browser's IndexedDB database. The app does not currently provide accounts, cloud backup, or automatic synchronization across devices.

Browser storage belongs to the browser profile and site address. For example, data saved at `localhost` is separate from data saved on your deployed domain. Clearing the site's browser data can remove locally stored libraries and images, so use **Export** to keep backups.

## Install the app

In a supported browser, use the app's **Install app** control when it is available, or choose the browser's install option from its menu. On iPhone or iPad, open the site in Safari, tap **Share**, then **Add to Home Screen**.

## Project structure

```text
src/
  app/                   Next.js routes, document layout, and global styles
  components/            App shell, library UI, dialogs, appearance, backgrounds
  hooks/                 Reusable React hooks
  lib/                   Library models, storage, and shared utilities
public/
  icons/                 PWA icons
  sw.js                  Service worker
legacy/                  Earlier implementation retained for reference
```

The app is built with Next.js, React, and TypeScript. The Dark Veil background uses OGL.

## License and notices

The project is licensed under the MIT License; see [LICENSE](LICENSE). The Dark Veil background is adapted from React Bits and has additional attribution and license terms; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

# The Learning Table

A React + Material UI American Mahjong trainer with mobile installation, offline play, and saved card imports. Built with Vite.

## Run

```sh
npm ci
npm run dev
npm test
npm run build
npm run test:ui
npm run test:pwa
```

The build outputs a self-contained `docs/index.html` for gameplay, plus the manifest, icons, and service worker needed for installation. There are no external CDN or API dependencies. Open the HTML directly to play, or serve the entire `docs` directory for the installable app. Use `npm run preview` to preview the production build locally; service workers are disabled in the Vite development server.

## Install on a phone or computer

1. Host the entire `docs` directory on **HTTPS** (for example, GitHub Pages). Localhost also works for development. Project subpaths such as `/mahjong/` are supported. Installation and service workers do not work from a `file://` link.
2. Open the site and choose **Install app**. Android and supported desktop browsers offer an install prompt or an **Install app / Add to Home screen** browser-menu option.
3. On iPhone or iPad, open the site in Safari, choose **Share → Add to Home Screen → Add**, and enable **Open as Web App** if prompted.
4. Keep the app connected until **Ready for offline play** appears. After this first successful load, the installed app can open and play without an internet connection.

The app includes home-screen icons, a standalone window, safe-area spacing for mobile screens, and shortcuts to the card and field guide where supported. When an update is available, choose **Update available → Update now** when ready: the current hand restarts, but the saved card is kept. Updates can also take effect after all app windows close.

See [MDN’s installation guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) for browser requirements.

## Obtain and import the 2026 card

**The official card information is not freely distributable and is not included in the repository or HTML bundle.** The app starts with clearly labeled original practice patterns. End users must obtain their own official 2026 card from the [National Mah Jongg League](https://www.nationalmahjonggleague.org/) and separately obtain an authorized JSON transcription or prepare one from their card.

`card.json` is excluded by `.gitignore` and must be obtained separately. Keep copyrighted card data out of commits, deployments, and distributed app bundles. Compare your JSON definitions against your physical card before using them.

1. Obtain your private `card.json`, or use **Manage card → Download example JSON** as a formatting starting point. The downloadable example contains only original practice hands.
2. Follow [CARD_FORMAT.md](CARD_FORMAT.md) to transcribe your card. Use exact tile codes and separate groups totaling 14; expand every permitted suit/number variation with a unique ID. Preserve natural singles/pairs and all printed restrictions. Group variants using the optional `family` field.
3. Optionally check the file with `npm run validate:card -- card.json`.
4. Open `docs/index.html`, choose **Manage card → Import 2026 JSON**, and select the file. No server or account is needed.
5. Confirm the imported title above the table. Open **The card** to inspect its lines and select suit/number variations. Importing starts a new hand and makes those definitions the targets for human coaching, computer play, exposures, and Mahjong checks.

Imported cards are saved in local device storage and restored automatically after reloading or reopening. Each new launch starts a fresh hand using the saved card. Import another JSON file to replace it, or choose **Manage card → Forget saved card** to remove it and return to practice mode. Invalid imports leave the current game and saved card intact. The importer checks structure, not official-card fidelity or completeness.

Nothing is uploaded or synchronized between devices. Storage belongs to this browser/app and hosting directory; an installed app may have separate storage from its browser tab. If it opens in practice mode, import your file once inside the installed app. Keep the original file as a backup: clearing website data, private browsing, or device storage cleanup can remove saved cards. Direct `file://` storage support varies by browser; use the hosted app for reliable persistence. If saving fails, the app clearly marks the imported card as session-only and offers **Save card on this device** to retry; an older saved card remains intact.

The full field definitions, tile-code table, original practice example, grouping rules, and validation limits are documented in [CARD_FORMAT.md](CARD_FORMAT.md).

## Learning features

- All four racks stay visible; click opponents’ tiles or enable **Inspect tiles** on your rack for explanations.
- Mandatory right/across/left Charleston, optional second Charleston, and no joker passing.
- Draw/discard play with an explicit call window after every discard.
- Exposable sets, concealed hands, Mahjong priority, natural singles/pairs, joker substitutions and exchanges, wall games.
- Computer explanations, human suggestions, closest-card-hand inspection, and a decision journal.
- One action per click and undo for the last 40 decisions.
- Responsive table, card browser and field guide.
- Mobile installation, offline access, and automatic restoration of saved card imports.

The computer is a teaching heuristic. It minimizes missing tiles, favors holding jokers, and mildly penalizes discarding tiles in opponents’ exposures. It does not examine opponents’ concealed racks. It does not calculate live-tile availability or expert winning probabilities. All players begin with shuffled random racks; some hands end with an exhausted wall.

Deliberate learning simplifications: direct Charleston passes only (no blind passes), no optional courtesy pass, all computer players agree to the optional second Charleston, East always belongs to the human, no payout settlement, tournament penalties, or multi-hand scoring. These limits are also described in the app. This is an independent trainer, not an NMJL-affiliated product.

## Verification

`npm test` covers game rules and complete simulations, plus saved-card validation, replacement, removal, storage scoping, and storage failures.

`npm run test:ui` tests the built HTML in jsdom, covering offline loading, Charleston, player/computer turns, undo, inspectors, the guide, successful/invalid card imports, reopening with a saved card, and storage-failure recovery. To additionally exercise your local private card and confirm its IDs/title are absent from the bundle, run `MAHJONG_CARD_FILE=card.json npm run test:ui` (POSIX shell). The default tests do not require or contain official-card data.

`npm run test:browser` exercises the built file through Playwright. Run `npm run build` first and install Playwright’s Chromium with `npx playwright install chromium`, or set `CHROMIUM_PATH` to an existing Chromium executable. The tests cover gameplay, tile and card details, imports, and mobile layout.

`npm run test:pwa` checks the production manifest and icon sizes, offline routes, scoped cache cleanup, update activation, and exclusion of private card data from the service-worker cache. Run `npm run build` before either UI or PWA tests. For device verification, install the hosted build, import a card, close/reopen, then enable airplane mode and reopen again.

Public installation files live in `public/`; the build creates a versioned `docs/sw.js`. Regenerate the original app icons with `npm run icons`. Never place private card data in `public/` or `docs/`.

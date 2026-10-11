# The Learning Table

A React + Material UI American Mahjong trainer, built with Vite into a single offline HTML file.

## Run

```sh
npm ci
npm run dev
npm test
npm run build
npm run test:ui
```

Open `docs/index.html` directly in a modern browser or serve the `docs` directory. JavaScript, CSS, and the UI are bundled inline; there are no runtime CDN, font, image, or API requests.

## Obtain and import the 2026 card

**The official card information is not freely distributable and is not included in the repository or HTML bundle.** The app starts with clearly labeled original practice patterns. End users must obtain their own official 2026 card from the [National Mah Jongg League](https://www.nationalmahjonggleague.org/) and separately obtain an authorized JSON transcription or prepare one from their card.

`card.json` is excluded by `.gitignore` and must be obtained separately. Keep copyrighted card data out of commits, deployments, and distributed app bundles. Compare your JSON definitions against your physical card before using them.

1. Obtain your private `card.json`, or use **Manage card → Download example JSON** as a formatting starting point. The downloadable example contains only original practice hands.
2. Follow [CARD_FORMAT.md](CARD_FORMAT.md) to transcribe your card. Use exact tile codes and separate groups totaling 14; expand every permitted suit/number variation with a unique ID. Preserve natural singles/pairs and all printed restrictions. Group variants using the optional `family` field.
3. Optionally check the file with `npm run validate:card -- card.json`.
4. Open `docs/index.html`, choose **Manage card → Import 2026 JSON**, and select the file. No server or account is needed.
5. Confirm the imported title above the table. Open **The card** to inspect its lines and select suit/number variations. Importing starts a new hand and makes those definitions the targets for human coaching, computer play, exposures, and Mahjong checks.

Imported data stays in memory in the browser tab and is never uploaded. Reloading restores practice mode; import your private file again each session. Invalid files produce an error without replacing the current game. The importer checks structure, not official-card fidelity or completeness.

The full field definitions, tile-code table, original practice example, grouping rules, and validation limits are documented in [CARD_FORMAT.md](CARD_FORMAT.md).

## Learning features

- All four racks stay visible; click opponents’ tiles or enable **Inspect tiles** on your rack for explanations.
- Mandatory right/across/left Charleston, optional second Charleston, and no joker passing.
- Draw/discard play with an explicit call window after every discard.
- Exposable sets, concealed hands, Mahjong priority, natural singles/pairs, joker substitutions and exchanges, wall games.
- Computer explanations, human suggestions, closest-card-hand inspection, and a decision journal.
- One action per click and undo for the last 40 decisions.
- Responsive table, card browser and field guide.

The computer is a teaching heuristic. It minimizes missing tiles, favors holding jokers, and mildly penalizes discarding tiles in opponents’ exposures. It does not examine opponents’ concealed racks. It does not calculate live-tile availability or expert winning probabilities. All players begin with shuffled random racks; some hands end with an exhausted wall.

Deliberate learning simplifications: direct Charleston passes only (no blind passes), no optional courtesy pass, all computer players agree to the optional second Charleston, East always belongs to the human, no payout settlement, tournament penalties, or multi-hand scoring. These limits are also described in the app. This is an independent trainer, not an NMJL-affiliated product.

## Verification

`npm test` covers deal/pass conservation, joker eligibility, exposures, concealed hands, discard claims, win priority, joker exchanges, imports, and complete simulated games.

`npm run test:ui` tests the built HTML in jsdom, covering offline loading, Charleston, player/computer turns, undo, inspectors, the guide, and successful/invalid card imports. To additionally exercise your local private card and confirm its IDs/title are absent from the bundle, run `MAHJONG_CARD_FILE=card.json npm run test:ui` (POSIX shell). The default tests do not require or contain official-card data.

`npm run test:browser` exercises the built file through Playwright. Run `npm run build` first and install Playwright’s Chromium with `npx playwright install chromium`, or set `CHROMIUM_PATH` to an existing Chromium executable. The tests cover gameplay, tile and card details, imports, and mobile layout.

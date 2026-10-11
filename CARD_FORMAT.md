# Card JSON format (version 1)

This format describes exact target hands for the American Mahjong trainer. The public app supplies original practice patterns only. Obtain the official card information separately, transcribe it from your card or use an authorized transcription, and import the resulting JSON. Do not commit or distribute copyrighted card data with the app.

Save as UTF-8 `card.json`. Comments and trailing commas are not valid JSON. The import limit is 2 MB and 5,000 expanded hands.

## Document fields

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `schemaVersion` | integer | Recommended | `1`. Omitted versions are treated as version 1. |
| `year` | integer | Yes | `2026`; other years are currently rejected. |
| `title` | string | No | Name displayed above the table after import. |
| `source` | object | No | Optional provenance, such as the private source filenames and a rights notice. Not used by the engine. |
| `hands` | array | Yes | 1–5,000 exact hand variations. |

## Hand fields

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | string | Yes | Unique nonempty identifier for this exact variation. |
| `family` | string | No | Shared identifier for all variations of a printed card line. The card browser groups them and provides a variation selector. Without it, each `id` is displayed as its own line. |
| `label` | string | Yes | Display name, preferably section and line number. |
| `section` | string | Yes | Card section name, used by the section filter. |
| `value` | number | Yes | Positive printed card value. The app displays this value but does not calculate settlement payments. |
| `concealed` | boolean | Yes | `true` for C, `false` for X. Concealed hands cannot expose sets but may claim their final winning discard. |
| `notes` | string | No | Explain the printed restrictions, permitted variations, and grouping. |
| `groups` | array | Yes | Exact tile identities and group sizes, totaling 14 tiles. |

Each group is `{ "tile": "B3", "count": 3 }`. `count` is an integer from 1 through 6. A group is **one rule unit**, not merely a count of every occurrence of that tile in the whole hand.

| Count | Name | Joker eligibility |
| --- | --- | --- |
| 1 | Single | Never |
| 2 | Pair | Never |
| 3 | Pung | Allowed |
| 4 | Kong | Allowed |
| 5 | Quint | Allowed |
| 6 | Sextet | Allowed |

## Tile codes

| Code | Tile |
| --- | --- |
| `B1`–`B9` | 1–9 bams (bamboo) |
| `C1`–`C9` | 1–9 craks (characters) |
| `D1`–`D9` | 1–9 dots (circles) |
| `E`, `S`, `W`, `N` | East, South, West, North winds |
| `GD` | Green dragon; matches bams |
| `RD` | Red dragon; matches craks |
| `WD` | White dragon/soap; matches dots; also zero |
| `F` | Flower; all flowers are interchangeable |

`J` is a playable joker tile, but **must not appear in a target group**. Enter the natural tile it may represent. The engine permits joker substitution only for groups of three or more. There are four of each natural numbered/honor tile, eight flowers, and eight jokers in the game.

## Transcribing a printed card

1. Enter each printed line with its section, value, C/X status, and explanatory notes.
2. Expand **every permitted choice** into a separate hand with a unique `id`: suit assignments, starting numbers, alternate arrangements, wind/dragon choices, and other printed alternatives. Give variations of the same line the same `family`.
3. Card colors indicate relative suits. Do not assume green print always means bams. Expand all allowed assignments while preserving which groups share a suit and which require distinct suits.
4. Apply restrictions literally. “These numbers only” is not a sliding run. “Matching dragon” means GD with bams, RD with craks, WD with dots. An opposite dragon is one of the other two dragons. “Any like number” requires the same selected number wherever that restriction applies.
5. Split mixed sequences into **natural single groups**. A year motif such as `2026` is four groups: numbered 2, `WD`, numbered 2, numbered 6. Its two twos are not a pair, and zeros appearing in separate motifs must not be combined into a joker-eligible pung.
6. Represent NEWS as four singles. Keep separate printed groups separate even if they use the same tile: two flower pungs are two `{ "tile": "F", "count": 3 }` groups, not one sextet. This affects legal exposures.
7. Check that every variation totals 14 tiles. Check against the physical card; structural validation cannot detect every transcription mistake or missing legal variation.

## Example (original practice hand, not an official-card transcription)

```json
{
  "schemaVersion": 1,
  "year": 2026,
  "title": "Original practice example",
  "hands": [
    {
      "id": "practice-even-bams",
      "family": "practice-even-steps",
      "label": "Even steps",
      "section": "Practice",
      "value": 25,
      "concealed": false,
      "notes": "Flower pair and three numbered kongs. The flower pair cannot use jokers.",
      "groups": [
        { "tile": "F", "count": 2 },
        { "tile": "B2", "count": 4 },
        { "tile": "B4", "count": 4 },
        { "tile": "B6", "count": 4 }
      ]
    }
  ]
}
```

For another permitted suit assignment, add a second entry with a different `id` and the same `family`, replacing the numbered tile codes as required. Do not assume that the engine expands shorthand: it matches only the concrete variations supplied.

## Validate and import

Developers can run:

```sh
npm run validate:card -- card.json
```

Validation checks the year/schema version, required field types, unique IDs, tile codes, group sizes, 14-tile totals, and basic natural-tile feasibility. It does not certify fidelity to the official card, verify rights, or prove all legal variations have been supplied.

In the app, choose **Manage card → Import 2026 JSON**, select your file, then check the title in the banner. Importing starts a new hand. Open **The card** to inspect the section filter, card lines, and each line’s suit/number variations. Data remains in memory in that browser tab; nothing is uploaded. Reloading restores the bundled practice card, so import your file again each session.

`card.json` is ignored by Git. Keep other private transcriptions and source images ignored too. Do not put these files in `src`, `public`, or `docs`, import them into application code, or copy them into a deployment. The build must remain independent of them.

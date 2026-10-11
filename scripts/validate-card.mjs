import fs from "node:fs";
import { validateCard } from "../src/engine.js";
const path = process.argv[2] || "card.json";
try {
  const data = JSON.parse(fs.readFileSync(path, "utf8"));
  const hands = validateCard(data);
  const families = new Set(hands.map((h) => h.family || h.id));
  console.log(
    `Valid ${data.year} card: ${families.size} lines, ${hands.length} expanded hands.`,
  );
  console.log(
    "Structure validated; compare the transcription and permitted variations against your physical card.",
  );
} catch (error) {
  console.error(`Card validation failed: ${error.message}`);
  process.exitCode = 1;
}

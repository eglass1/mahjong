import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
await page.addInitScript(() => {
  let seed = 12345;
  Math.random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(new URL("../docs/index.html", import.meta.url).href);
await page.getByRole("heading", { name: "Your seat at the table." }).waitFor();
assert.equal(await page.locator(".opponent").count(), 3);
for (let n = 0; n < 3; n++) {
  await page.locator(".suggestion .tile").first().click();
  await page.getByRole("button", { name: "Pass 3 tiles" }).click();
}
await page.getByRole("button", { name: "Start play" }).click();
await page.locator(".suggestion .tile").first().click();
await page.getByRole("button", { name: "Discard selected" }).click();
assert.equal(await page.locator(".discard-pool .tile").count(), 1);
await page.getByRole("button", { name: "Resolve calls" }).click();
await page.getByRole("button", { name: "Next computer decision" }).click();
await page.getByRole("button", { name: "Next computer decision" }).click();
assert.match(await page.locator(".log").innerText(), /Rose/);
await page.locator(".opponent .tile").first().click();
await page.getByRole("dialog").waitFor();
await page.getByRole("button", { name: "Back to the table" }).click();
await page.getByRole("button", { name: "The card", exact: true }).click();
assert.equal(await page.locator(".pattern-card").count(), 9);
await page.locator(".pattern-card").first().click();
assert.equal(await page.locator(".detail-group").count(), 4);
await page.getByRole("button", { name: "Back to the table" }).click();
await page.getByRole("button", { name: "Field guide", exact: true }).click();
await page
  .getByRole("heading", { name: "The Charleston", exact: true })
  .waitFor();
await page.getByRole("button", { name: "Play & learn", exact: true }).click();
await page.screenshot({ path: "/tmp/mahjong-desktop.png", fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
assert.equal(
  await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  ),
  true,
  "no mobile horizontal overflow",
);
await page.screenshot({ path: "/tmp/mahjong-mobile.png", fullPage: true });
await page.getByRole("button", { name: "Manage card" }).click();
const data = {
  year: 2026,
  title: "Browser test card",
  hands: [
    {
      id: "test",
      label: "Imported hand",
      section: "Test",
      concealed: false,
      value: 25,
      groups: [
        { tile: "F", count: 2 },
        { tile: "B2", count: 4 },
        { tile: "B4", count: 4 },
        { tile: "B6", count: 4 },
      ],
    },
  ],
};
await page.locator("input[type=file]").setInputFiles({
  name: "card.json",
  mimeType: "application/json",
  buffer: Buffer.from(JSON.stringify(data)),
});
await page.getByText("Browser test card", { exact: true }).waitFor();
assert.equal(errors.length, 0, errors.join("\n"));
console.log(
  "Browser checks passed: offline file load, Charleston, discard, computer turn, tile details, card details, guide, import, mobile layout; no page errors.",
);
await browser.close();

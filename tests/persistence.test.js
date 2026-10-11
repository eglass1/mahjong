import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { JSDOM, VirtualConsole } from "jsdom";
import { PRACTICE } from "../src/engine.js";
import { cardStorageKey } from "../src/card-storage.js";
const windows = new Set();
afterEach(() => {
  for (const w of windows) w.close();
  windows.clear();
});
const html = fs.readFileSync(
  new URL("../docs/index.html", import.meta.url),
  "utf8",
);
const key = cardStorageKey("https://example.com/mahjong/");
const tick = () => new Promise((resolve) => setTimeout(resolve, 70));
async function mount(
  saved,
  blocked = false,
  url = "https://example.com/mahjong/",
) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (e) => errors.push(e.message));
  const dom = new JSDOM(html, {
    url,
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole,
  });
  const w = dom.window;
  windows.add(w);
  w.structuredClone = structuredClone;
  Object.defineProperty(w, "isSecureContext", {
    value: url.startsWith("https:"),
  });
  if (saved) w.localStorage.setItem(key, saved);
  if (blocked)
    w.Storage.prototype.setItem = () => {
      throw new Error("QuotaExceededError");
    };
  for (const script of w.document.querySelectorAll("script"))
    w.eval(script.textContent);
  await tick();
  const click = async (text) => {
    const b = [...w.document.querySelectorAll("button")].find((b) =>
      b.textContent.includes(text),
    );
    assert.ok(b, `button ${text}`);
    b.click();
    await tick();
  };
  const importFile = async (data) => {
    await click("Manage card");
    const input = w.document.querySelector("input[type=file]");
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [{ size: 1000, text: async () => JSON.stringify(data) }],
    });
    input.dispatchEvent(new w.Event("change", { bubbles: true }));
    await tick();
  };
  return { dom, w, errors, click, importFile };
}
const card = { year: 2026, title: "Remembered card", hands: PRACTICE };
test("imported card is restored after reopening, replaced, and explicitly forgotten", async () => {
  let app = await mount();
  await app.importFile(card);
  assert.match(
    app.w.document.querySelector(".notice").textContent,
    /Saved on this device/,
  );
  const saved = app.w.localStorage.getItem(key);
  assert.equal(JSON.parse(saved).card.title, card.title);
  assert.deepEqual(app.errors, []);
  app.dom.window.close();
  app = await mount(saved);
  assert.match(
    app.w.document.querySelector(".notice").textContent,
    /Remembered card/,
  );
  await app.importFile({ ...card, title: "Replacement card" });
  assert.equal(
    JSON.parse(app.w.localStorage.getItem(key)).card.title,
    "Replacement card",
  );
  await app.importFile({ ...card, year: 2025 });
  assert.equal(
    JSON.parse(app.w.localStorage.getItem(key)).card.title,
    "Replacement card",
  );
  await app.click("Back to the table");
  await app.click("Manage card");
  await app.click("Forget saved card");
  await app.click("Forget and use practice");
  assert.equal(app.w.localStorage.getItem(key), null);
  assert.match(
    app.w.document.querySelector(".notice").textContent,
    /Original practice card/,
  );
  assert.deepEqual(app.errors, []);
  app.dom.window.close();
  app = await mount();
  assert.match(
    app.w.document.querySelector(".notice").textContent,
    /Original practice card/,
  );
  app.dom.window.close();
});
test("storage failure is visible and preserves the prior saved card", async () => {
  const saved = JSON.stringify({ version: 1, card });
  const app = await mount(saved, true);
  await app.importFile({ ...card, title: "Session card" });
  assert.match(
    app.w.document.querySelector(".notice").textContent,
    /Session card/,
  );
  assert.match(
    app.w.document.querySelector(".storage-notice").textContent,
    /session only/,
  );
  assert.equal(app.w.localStorage.getItem(key), saved);
  assert.deepEqual(app.errors, []);
  app.dom.window.close();
});
test("damaged storage recovers to practice, and file mode can still import", async () => {
  let app = await mount("not JSON");
  assert.match(
    app.w.document.querySelector(".notice").textContent,
    /Original practice card/,
  );
  assert.ok(app.w.document.querySelector(".storage-notice"));
  assert.deepEqual(app.errors, []);
  app.dom.window.close();
  app = await mount(undefined, false, "file:///trainer/index.html");
  await app.importFile(card);
  assert.match(
    app.w.document.querySelector(".notice").textContent,
    /Remembered card/,
  );
  assert.match(
    app.w.document.querySelector(".notice").textContent,
    /session only/,
  );
  await app.click("Install app");
  assert.ok(
    [...app.w.document.querySelectorAll("[role=dialog]")].some((dialog) =>
      dialog.textContent.includes("HTTPS"),
    ),
  );
  assert.deepEqual(app.errors, []);
  app.dom.window.close();
});

test("install prompt can be opened on supported browsers", async () => {
  const app = await mount();
  let prompted = 0;
  const event = new app.w.Event("beforeinstallprompt", { cancelable: true });
  event.prompt = async () => {
    prompted++;
  };
  event.userChoice = Promise.resolve({ outcome: "accepted" });
  app.w.dispatchEvent(event);
  await tick();
  assert.equal(event.defaultPrevented, true);
  await app.click("Install app");
  await app.click("Install on this device");
  assert.equal(prompted, 1);
  assert.match(app.w.document.body.textContent, /Installation requested/);
  app.w.dispatchEvent(new app.w.Event("appinstalled"));
  await tick();
  assert.ok(
    [...app.w.document.querySelectorAll("button")].some(
      (b) => b.textContent === "App settings",
    ),
  );
  assert.deepEqual(app.errors, []);
});

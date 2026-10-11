import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { JSDOM, VirtualConsole } from "jsdom";

test("built HTML runs offline and supports learning interactions", async () => {
  const html = fs.readFileSync(
    new URL("../docs/index.html", import.meta.url),
    "utf8",
  );
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push(e.message));
  const dom = new JSDOM(html, {
    runScripts: "outside-only",
    pretendToBeVisual: true,
    url: "file:///trainer/index.html",
    virtualConsole: vc,
  });
  const { window: w } = dom;
  w.structuredClone = structuredClone;
  let seed = 12345;
  w.Math.random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  assert.equal(
    w.document.querySelectorAll("script[src],link[rel=stylesheet],img[src]")
      .length,
    0,
  );
  for (const script of w.document.querySelectorAll("script"))
    w.eval(script.textContent);
  const tick = () => new Promise((r) => setTimeout(r, 60));
  await tick();
  function click(label) {
    const b = [...w.document.querySelectorAll("button")].find((b) =>
      b.textContent.includes(label),
    );
    assert.ok(b, `button ${label}`);
    assert.equal(b.disabled, false, `${label} enabled`);
    b.click();
  }
  assert.match(w.document.body.textContent, /Your seat at the table/);
  assert.equal(w.document.querySelectorAll(".opponent").length, 3);
  for (let n = 0; n < 3; n++) {
    w.document.querySelector(".suggestion .tile").click();
    await tick();
    click("Pass 3 tiles");
    await tick();
  }
  click("Start play");
  await tick();
  w.document.querySelector(".suggestion .tile").click();
  await tick();
  click("Discard selected");
  await tick();
  assert.equal(w.document.querySelectorAll(".discard-pool .tile").length, 1);
  click("Resolve calls");
  await tick();
  click("Next computer decision");
  await tick();
  click("Next computer decision");
  await tick();
  assert.match(w.document.querySelector(".log").textContent, /Rose/);
  click("Undo last decision");
  await tick();
  assert.match(
    w.document.querySelector(".table-toolbar").textContent,
    /Rose · discard/,
  );
  w.document.querySelector(".opponent .tile").click();
  await tick();
  assert.ok(w.document.querySelector("[role=dialog]"));
  click("Back to the table");
  await tick();
  click("The card");
  await tick();
  assert.equal(w.document.querySelectorAll(".pattern-card").length, 9);
  w.document.querySelector(".pattern-card").click();
  await tick();
  assert.equal(w.document.querySelectorAll(".detail-group").length, 4);
  click("Back to the table");
  await tick();
  click("Field guide");
  await tick();
  assert.match(
    w.document.querySelector(".guide-grid").textContent,
    /The Charleston/,
  );
  click("Manage card");
  await tick();
  const input = w.document.querySelector("input[type=file]");
  Object.defineProperty(input, "files", {
    configurable: true,
    value: [{ size: 15, text: async () => '{"year":2025}' }],
  });
  input.dispatchEvent(new w.Event("change", { bubbles: true }));
  await tick();
  assert.match(
    w.document.querySelector("[role=dialog]").textContent,
    /Use year 2026/,
  );
  const data = {
    year: 2026,
    title: "Imported test",
    hands: [
      {
        id: "t",
        label: "Imported pattern",
        section: "Test",
        value: 25,
        concealed: false,
        groups: [
          { tile: "F", count: 2 },
          { tile: "B2", count: 4 },
          { tile: "B4", count: 4 },
          { tile: "B6", count: 4 },
        ],
      },
    ],
  };
  Object.defineProperty(input, "files", {
    configurable: true,
    value: [{ size: 100, text: async () => JSON.stringify(data) }],
  });
  input.dispatchEvent(new w.Event("change", { bubbles: true }));
  await tick();
  assert.match(
    w.document.querySelector(".notice").textContent,
    /Imported test/,
  );
  if (process.env.MAHJONG_CARD_FILE) {
    const privateText = fs.readFileSync(process.env.MAHJONG_CARD_FILE, "utf8");
    const privateCard = JSON.parse(privateText);
    assert.ok(
      !html.includes(privateCard.title),
      "private title is not bundled",
    );
    for (const hand of privateCard.hands)
      assert.ok(!html.includes(hand.id), "private target is not bundled");
    click("Manage card");
    await tick();
    const privateInput = w.document.querySelector("input[type=file]");
    Object.defineProperty(privateInput, "files", {
      value: [
        { size: Buffer.byteLength(privateText), text: async () => privateText },
      ],
    });
    privateInput.dispatchEvent(new w.Event("change", { bubbles: true }));
    await tick();
    assert.ok(
      w.document
        .querySelector(".notice")
        .textContent.includes(privateCard.title),
    );
    click("The card");
    await tick();
    assert.equal(
      w.document.querySelectorAll(".pattern-card").length,
      new Set(privateCard.hands.map((h) => h.family || h.id)).size,
    );
    w.document.querySelector(".pattern-card").click();
    await tick();
    const variants = w.document.querySelector(".variation-picker select");
    assert.ok(variants.options.length > 1);
    variants.selectedIndex = 0;
    variants.dispatchEvent(new w.Event("change", { bubbles: true }));
    await tick();
    click("Back to the table");
    await tick();
    click("Play & learn");
    await tick();
    for (let i = 0; i < 3; i++) {
      w.document.querySelector(".suggestion .tile").click();
      await tick();
      click("Pass 3 tiles");
      await tick();
    }
    click("Start play");
    await tick();
    w.document.querySelector(".suggestion .tile").click();
    await tick();
    click("Discard selected");
    await tick();
    assert.equal(w.document.querySelectorAll(".discard-pool .tile").length, 1);
  }
  assert.deepEqual(errors, []);
  dom.window.close();
});

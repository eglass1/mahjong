import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const worker = fs.readFileSync(
  new URL("../docs/sw.js", import.meta.url),
  "utf8",
);
function harness() {
  const listeners = new Map(),
    stores = new Map(),
    network = [];
  let skipped = 0,
    claimed = 0;
  const cache = {
    addAll: async (requests) => {
      for (const request of requests)
        stores.set(request.url, `cached:${request.url}`);
    },
    match: async (key) => stores.get(key),
  };
  const deleted = [];
  const scope = "https://example.com/project/";
  const context = {
    URL,
    Request,
    Promise,
    fetch: async (r) => {
      network.push(r);
      return "network";
    },
    caches: {
      open: async () => cache,
      keys: async () => [
        "learning-table:/project/:old",
        "learning-table:/other/:old",
        "unrelated",
      ],
      delete: async (key) => deleted.push(key),
    },
    self: {
      registration: { scope },
      clients: { claim: async () => claimed++ },
      skipWaiting: async () => skipped++,
      addEventListener: (name, fn) => listeners.set(name, fn),
    },
  };
  vm.runInNewContext(worker, context);
  async function lifecycle(name, data) {
    let result;
    listeners.get(name)({ data, waitUntil: (p) => (result = p) });
    await result;
  }
  async function fetch(url, method = "GET") {
    let response;
    listeners.get("fetch")({
      request: { url, method },
      respondWith: (p) => (response = p),
    });
    return response ? await response : undefined;
  }
  return {
    lifecycle,
    fetch,
    stores,
    deleted,
    network,
    get skipped() {
      return skipped;
    },
    get claimed() {
      return claimed;
    },
  };
}
test("manifest, icons and worker support installation under a project subpath", () => {
  const manifest = JSON.parse(
    fs.readFileSync(new URL("../docs/manifest.webmanifest", import.meta.url)),
  );
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.icons.some((i) => i.sizes === "192x192"));
  assert.ok(
    manifest.icons.some(
      (i) => i.sizes === "512x512" && i.purpose.includes("maskable"),
    ),
  );
  for (const icon of manifest.icons) {
    const png = fs.readFileSync(
      new URL("../docs/" + icon.src, import.meta.url),
    );
    const size = Number(icon.sizes.split("x")[0]);
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
  const html = fs.readFileSync(
    new URL("../docs/index.html", import.meta.url),
    "utf8",
  );
  assert.match(html, /rel="manifest" href="\.\/manifest.webmanifest"/);
  assert.match(html, /viewport-fit=cover/);
  assert.ok(!worker.includes("__BUILD_ID__"));
});
test("offline cache serves root/index/shortcut pages and excludes private cards", async () => {
  const h = harness();
  await h.lifecycle("install");
  assert.equal(h.stores.size, 5);
  for (const url of [
    "https://example.com/project/",
    "https://example.com/project/index.html",
    "https://example.com/project/?view=card",
  ])
    assert.equal(
      await h.fetch(url),
      "cached:https://example.com/project/index.html",
    );
  assert.equal(
    await h.fetch("https://example.com/project/icons/icon-192.png"),
    "cached:https://example.com/project/icons/icon-192.png",
  );
  for (const url of [
    "https://example.com/project/card.json",
    "https://example.com/other/",
    "https://other.example/project/",
  ])
    assert.equal(await h.fetch(url), undefined);
  assert.equal(
    await h.fetch("https://example.com/project/", "POST"),
    undefined,
  );
  assert.equal(h.network.length, 0);
});
test("updates wait for consent and clean only this app’s older cache", async () => {
  const h = harness();
  await h.lifecycle("install");
  assert.equal(h.skipped, 0);
  await h.lifecycle("message", { type: "OTHER" });
  assert.equal(h.skipped, 0);
  await h.lifecycle("message", { type: "APPLY_UPDATE" });
  assert.equal(h.skipped, 1);
  await h.lifecycle("activate");
  assert.deepEqual(h.deleted, ["learning-table:/project/:old"]);
  assert.equal(h.claimed, 1);
});

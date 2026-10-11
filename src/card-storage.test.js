import { test } from "node:test";
import assert from "node:assert/strict";
import { PRACTICE } from "./engine.js";
import {
  cardStorageKey,
  readSavedCard,
  saveCard,
  forgetCard,
} from "./card-storage.js";
const data = {
  schemaVersion: 1,
  year: 2026,
  title: "Private test card",
  hands: PRACTICE,
};
function target(href = "https://example.com/mahjong/index.html") {
  const values = new Map();
  return {
    location: { href },
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  };
}
test("saved card survives a fresh load, replaces atomically, and can be forgotten", () => {
  const t = target();
  assert.equal(readSavedCard(t).data, null);
  saveCard(data, t);
  assert.deepEqual(readSavedCard(t).data, data);
  saveCard({ ...data, title: "Replacement" }, t);
  assert.equal(readSavedCard(t).data.title, "Replacement");
  assert.throws(() => saveCard({ ...data, year: 2025 }, t));
  assert.equal(readSavedCard(t).data.title, "Replacement");
  forgetCard(t);
  assert.equal(readSavedCard(t).data, null);
});
test("index.html, home-screen root and shortcut URLs share storage; other apps do not", () => {
  const key = cardStorageKey("https://example.com/mahjong/index.html");
  assert.equal(key, cardStorageKey("https://example.com/mahjong/"));
  assert.equal(key, cardStorageKey("https://example.com/mahjong/?view=card"));
  assert.notEqual(key, cardStorageKey("https://example.com/another-app/"));
});
test("unavailable, damaged, and unsupported saved data fail safely", () => {
  const blocked = {
    location: target().location,
    get localStorage() {
      throw new Error("SecurityError");
    },
  };
  assert.equal(readSavedCard(blocked).data, null);
  assert.ok(readSavedCard(blocked).warning);
  assert.throws(() => saveCard(data, blocked));
  assert.throws(() => forgetCard(blocked));
  const t = target(),
    key = cardStorageKey(t.location.href);
  for (const bad of [
    "broken JSON",
    JSON.stringify({ version: 2, card: data }),
    JSON.stringify({ version: 1, card: { year: 2025 } }),
  ]) {
    t.localStorage.setItem(key, bad);
    assert.equal(readSavedCard(t).data, null);
    assert.ok(readSavedCard(t).warning);
  }
});
test("storage quota failure does not destroy the previous saved card", () => {
  const t = target();
  saveCard(data, t);
  t.localStorage.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  assert.throws(() => saveCard({ ...data, title: "New" }, t));
  assert.equal(readSavedCard(t).data.title, data.title);
});

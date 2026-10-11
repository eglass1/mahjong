import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "./engine.js";
const pat = {
  id: "test",
  label: "Test",
  section: "Test",
  value: 25,
  concealed: false,
  groups: [
    { tile: "F", count: 2 },
    { tile: "B2", count: 4 },
    { tile: "B4", count: 4 },
    { tile: "B6", count: 4 },
  ],
};
const complete = [
  "F",
  "F",
  "B2",
  "B2",
  "B2",
  "B2",
  "B4",
  "B4",
  "B4",
  "B4",
  "B6",
  "B6",
  "B6",
  "B6",
];
function game() {
  return E.newGame([pat], () => 0.42);
}
function conservation(s) {
  const tiles = [
    ...s.wall,
    ...s.discards.map((d) => d.tile),
    ...s.players.flatMap((p) => [
      ...p.hand,
      ...p.exposed.flatMap((e) => e.tiles),
    ]),
  ];
  assert.equal(tiles.length, 152);
  for (const t of E.TYPES)
    assert.equal(
      tiles.filter((x) => x === t).length,
      t === "J" || t === "F" ? 8 : 4,
      t,
    );
}
test("deal and every Charleston pass conserve tiles and correct rack sizes", () => {
  let s = game();
  conservation(s);
  for (let i = 0; i < 6; i++) {
    if (i === 3) s = E.finishCharleston(s, true);
    s = E.passTiles(
      s,
      s.players[0].hand
        .map((t, i) => ({ t, i }))
        .filter((x) => x.t !== "J")
        .slice(0, 3)
        .map((x) => x.i),
    );
    conservation(s);
    assert.deepEqual(
      s.players.map((p) => p.hand.length),
      [14, 13, 13, 13],
    );
  }
  assert.equal(s.phase, "discard");
});
test("joker can complete a kong but cannot fill a pair", () => {
  assert.equal(E.evaluate(complete, [], pat).missing, 0);
  const kong = complete.slice();
  kong[2] = "J";
  assert.equal(E.evaluate(kong, [], pat).missing, 0);
  const pair = complete.slice();
  pair[0] = "J";
  assert.equal(E.evaluate(pair, [], pat).missing, 1);
});
test("concealed patterns reject exposures and mismatched groups are impossible", () => {
  assert.equal(
    E.evaluate([], [{ tile: "B2", tiles: Array(4).fill("B2") }], {
      ...pat,
      concealed: true,
    }).missing,
    99,
  );
  assert.equal(
    E.evaluate([], [{ tile: "B3", tiles: Array(3).fill("B3") }], pat).missing,
    99,
  );
});
test("calling a kong uses natural tiles and jokers, skips drawing, removes discard", () => {
  let s = game();
  s.phase = "claim";
  s.last = { tile: "B2", from: 3 };
  s.discards = [s.last];
  s.players[0].hand = ["B2", "B2", "J", ...Array(10).fill("C1")];
  s = E.takeClaim(s, 0, 4);
  assert.equal(s.phase, "discard");
  assert.equal(s.turn, 0);
  assert.equal(s.players[0].hand.length, 10);
  assert.deepEqual(s.players[0].exposed[0].tiles, ["B2", "B2", "B2", "J"]);
  assert.equal(s.discards.length, 0);
});
test("discarded joker cannot be called even for a winning hand", () => {
  let s = game();
  s.phase = "claim";
  s.last = { tile: "J", from: 1 };
  s.players[0].hand = complete.slice(1);
  assert.deepEqual(E.claims(s, 0), []);
  assert.throws(() => E.declareWin(s, 0, true));
});
test("Mahjong claims outrank exposures and concealed hands may claim the final pair", () => {
  let s = game();
  s.phase = "claim";
  s.last = { tile: "F", from: 3 };
  s.discards = [s.last];
  s.card = [{ ...pat, concealed: true }];
  s.players[0].hand = complete.slice(1);
  assert.equal(E.resolveClaims(s, "win").winner, 0);
  s.last = { tile: "B2", from: 3 };
  s.players[0].hand = ["B2", "B2", "B2", ...Array(10).fill("C1")];
  s.players[1].hand = complete.filter((_, i) => i !== 2);
  s.card = [pat];
  assert.equal(E.resolveClaims(s, 4).winner, 1);
});
test("joker exchanges require own discard phase and natural match", () => {
  let s = game();
  s.phase = "discard";
  s.players[0].hand = ["B2"];
  s.players[1].exposed = [{ tile: "B2", tiles: ["B2", "B2", "B2", "J"] }];
  s = E.exchange(s, 1, 0);
  assert.deepEqual(s.players[0].hand, ["J"]);
  assert.deepEqual(s.players[1].exposed[0].tiles, Array(4).fill("B2"));
  s.phase = "draw";
  assert.throws(() => E.exchange(s, 1, 0));
});
test("card validation rejects invalid definitions", () => {
  assert.equal(E.validateCard({ year: 2026, hands: [pat] }).length, 1);
  assert.throws(() => E.validateCard({ year: 2025, hands: [pat] }));
  assert.throws(() => E.validateCard({ year: 2026, hands: [pat, pat] }));
  assert.throws(() =>
    E.validateCard({
      year: 2026,
      hands: [{ ...pat, groups: [{ tile: "J", count: 14 }] }],
    }),
  );
});
test("full games terminate while preserving all 152 tiles and rack counts", () => {
  for (let run = 0; run < 15; run++) {
    let s = E.newGame();
    for (let i = 0; i < 3; i++)
      s = E.passTiles(
        s,
        E.advice(s, 0)
          .filter((a) => a.tile !== "J")
          .slice(0, 3)
          .map((a) => a.i),
      );
    s = E.finishCharleston(s, false);
    let steps = 0;
    while (s.phase !== "over" && steps++ < 650) {
      if (s.phase === "discard" && s.turn === 0)
        s = E.winPattern(s, 0)
          ? E.declareWin(s, 0)
          : E.discard(s, E.advice(s, 0)[0].i);
      else s = E.step(s);
      conservation(s);
      for (let i = 0; i < 4; i++) {
        const count =
          s.players[i].hand.length +
          s.players[i].exposed.reduce((n, e) => n + e.tiles.length, 0);
        assert.equal(
          count,
          (s.phase === "discard" && s.turn === i) ||
            (s.phase === "over" && s.winner === i)
            ? 14
            : 13,
        );
      }
    }
    assert.equal(s.phase, "over");
  }
});

test("large imported cards accept grouped variations and reject unsafe metadata", () => {
  const hands = Array.from({ length: 1080 }, (_, i) => ({
    ...pat,
    id: `variation-${i}`,
    family: "example-line",
  }));
  assert.equal(
    E.validateCard({ schemaVersion: 1, year: 2026, hands }).length,
    1080,
  );
  assert.throws(() =>
    E.validateCard({ year: 2026, title: { bad: "value" }, hands: [pat] }),
  );
  assert.throws(() =>
    E.validateCard({ year: 2026, hands: [{ ...pat, notes: {} }] }),
  );
  assert.throws(() =>
    E.validateCard({ year: 2026, hands: [{ ...pat, family: 4 }] }),
  );
  assert.throws(() =>
    E.validateCard({ year: 2026, hands: [{ ...pat, groups: [null] }] }),
  );
});

export const TYPES = [
  ...["B", "C", "D"].flatMap((s) =>
    Array.from({ length: 9 }, (_, i) => s + (i + 1)),
  ),
  "E",
  "S",
  "W",
  "N",
  "RD",
  "GD",
  "WD",
  "F",
  "J",
];
export const names = {
  B: "Bam",
  C: "Crak",
  D: "Dot",
  E: "East wind",
  S: "South wind",
  W: "West wind",
  N: "North wind",
  RD: "Red dragon",
  GD: "Green dragon",
  WD: "White dragon (soap)",
  F: "Flower",
  J: "Joker",
};
export const tileName = (t) => names[t] || `${t.slice(1)} ${names[t[0]]}`;
export const sortTiles = (h) =>
  h.slice().sort((a, b) => TYPES.indexOf(a) - TYPES.indexOf(b));
const group = (tile, count) => ({ tile, count });
export const PRACTICE = ["B", "C", "D"].flatMap((s, i) => [
  {
    id: `p${i}a`,
    section: "Even numbers",
    label: `Even steps · ${names[s]}s`,
    value: 25,
    concealed: false,
    notes:
      "An original teaching pattern: a flower pair and three kongs. Any joker may fill a kong, but never the flower pair.",
    groups: [
      group("F", 2),
      group(s + "2", 4),
      group(s + "4", 4),
      group(s + "6", 4),
    ],
  },
  {
    id: `p${i}b`,
    section: "Like numbers",
    label: `Lucky sevens · ${names[s]}s`,
    value: 25,
    concealed: false,
    notes:
      "Original teaching pattern. The dragon pair must be natural. Each numbered group is a kong.",
    groups: [
      group(["GD", "RD", "WD"][i], 2),
      ...["B", "C", "D"].map((x) => group(x + "7", 4)),
    ],
  },
  {
    id: `p${i}c`,
    section: "Consecutive run",
    label: `A little run · ${names[s]}s`,
    value: 30,
    concealed: true,
    notes:
      "Original concealed teaching pattern. Do not expose sets; you may call a discard only when it completes Mahjong.",
    groups: [
      group("F", 2),
      group(s + "1", 3),
      group(s + "2", 3),
      group(s + "3", 3),
      group(s + "4", 3),
    ],
  },
]);
export function validateCard(data) {
  if (
    !data ||
    typeof data !== "object" ||
    (data.schemaVersion !== undefined && data.schemaVersion !== 1) ||
    data.year !== 2026 ||
    !Array.isArray(data.hands) ||
    !data.hands.length ||
    data.hands.length > 5000
  )
    throw Error("Use year 2026 and 1–5000 expanded hands.");
  if (data.title !== undefined && typeof data.title !== "string")
    throw Error("Card title must be a string.");
  const ids = new Set();
  for (const h of data.hands) {
    if (
      !h ||
      typeof h !== "object" ||
      typeof h.id !== "string" ||
      !h.id.trim() ||
      (h.family !== undefined &&
        (typeof h.family !== "string" || !h.family.trim())) ||
      (h.notes !== undefined && typeof h.notes !== "string") ||
      ids.has(h.id) ||
      typeof h.label !== "string" ||
      typeof h.section !== "string" ||
      typeof h.concealed !== "boolean" ||
      !Number.isFinite(h.value) ||
      h.value <= 0 ||
      !Array.isArray(h.groups) ||
      !h.groups.length
    )
      throw Error(
        "Each hand needs a unique id, label, section, value, concealed flag and groups.",
      );
    ids.add(h.id);
    if (
      h.groups.reduce((n, g) => n + (g?.count ?? 0), 0) !== 14 ||
      h.groups.some(
        (g) =>
          !g ||
          typeof g !== "object" ||
          !TYPES.includes(g.tile) ||
          g.tile === "J" ||
          !Number.isInteger(g.count) ||
          g.count < 1 ||
          g.count > 6,
      )
    )
      throw Error(
        `${h.label}: groups must total 14 valid tiles, with counts 1–6.`,
      );
    const needed = {};
    h.groups.forEach(
      (g) =>
        (needed[g.tile] = (needed[g.tile] || 0) + (g.count < 3 ? g.count : 1)),
    );
    if (Object.entries(needed).some(([t, n]) => n > (t === "F" ? 8 : 4)))
      throw Error(`${h.label}: impossible natural tile requirements.`);
  }
  return data.hands;
}
const orderedGroups = new WeakMap();
export function evaluate(hand, exposed, pattern, details = true) {
  if (!orderedGroups.has(pattern))
    orderedGroups.set(
      pattern,
      pattern.groups.slice().sort((a, b) => (a.count >= 3) - (b.count >= 3)),
    );
  let groups = orderedGroups.get(pattern);
  if (exposed.length) groups = groups.slice();
  if (pattern.concealed && exposed.length) return { missing: 99 };
  for (const e of exposed) {
    const i = groups.findIndex(
      (g) => g.tile === e.tile && g.count === e.tiles.length,
    );
    if (i < 0) return { missing: 99 };
    groups.splice(i, 1);
  }
  const counts = {};
  hand.forEach((t) => (counts[t] = (counts[t] || 0) + 1));
  let jokers = counts.J || 0,
    missing = 0;
  const needs = [];
  for (const g of groups) {
    let n = Math.min(counts[g.tile] || 0, g.count);
    counts[g.tile] = (counts[g.tile] || 0) - n;
    let j = g.count >= 3 ? Math.min(jokers, g.count - n) : 0;
    jokers -= j;
    let deficit = g.count - n - j;
    missing += deficit;
    if (details && deficit) needs.push({ ...g, missing: deficit });
  }
  return { missing, needs, groups };
}
export function ranked(p, card) {
  return card
    .map((pattern) => ({
      pattern,
      ...evaluate(p.hand, p.exposed, pattern, false),
    }))
    .sort((a, b) => a.missing - b.missing);
}
function closest(p, card) {
  let best = { missing: Infinity, pattern: card[0] };
  for (const pattern of card) {
    const score = evaluate(p.hand, p.exposed, pattern, false);
    if (score.missing < best.missing)
      best = { pattern, missing: score.missing };
  }
  return best;
}
export function advice(state, index) {
  const p = state.players[index];
  return p.hand
    .map((tile, i) => {
      const hand = p.hand.filter((_, n) => n !== i);
      const best = closest({ ...p, hand }, state.card);
      const danger = state.players.some(
        (q, j) => j !== index && q.exposed.some((e) => e.tile === tile),
      );
      return {
        tile,
        i,
        missing: best.missing,
        pattern: best.pattern,
        danger,
        score: best.missing + (tile === "J" ? 1 : 0) + (danger ? 0.15 : 0),
      };
    })
    .sort((a, b) => a.score - b.score);
}
const copyState = (state) => ({
  ...structuredClone({ ...state, card: undefined }),
  card: state.card,
});
const log = (s, text) => s.log.unshift({ id: s.serial++, text });
export function newGame(card = PRACTICE, rng = Math.random) {
  const wall = TYPES.flatMap((t) =>
    Array(t === "F" || t === "J" ? 8 : 4).fill(t),
  );
  for (let i = wall.length - 1; i > 0; i--) {
    let j = Math.floor(rng() * (i + 1));
    [wall[i], wall[j]] = [wall[j], wall[i]];
  }
  const players = ["You", "Rose", "Jules", "Mina"].map((name, i) => ({
    name,
    hand: sortTiles(wall.splice(0, i ? 13 : 14)),
    exposed: [],
    reason: "Choosing a direction from the tiles in my rack.",
  }));
  return {
    players,
    wall,
    card,
    turn: 0,
    phase: "charleston",
    pass: 0,
    discards: [],
    last: null,
    log: [
      {
        id: 0,
        text: "East receives 14 tiles; everyone else receives 13. First, pass three tiles right, across, then left.",
      },
    ],
    serial: 1,
    winner: null,
  };
}
export function passTiles(state, indices) {
  const s = copyState(state);
  if (
    s.phase !== "charleston" ||
    indices.length !== 3 ||
    new Set(indices).size !== 3 ||
    indices.some((i) => !s.players[0].hand[i] || s.players[0].hand[i] === "J")
  )
    throw Error("Select three non-joker tiles to pass.");
  const bundles = s.players.map((p, i) => {
    const picks = i
      ? advice(s, i)
          .filter((a) => a.tile !== "J")
          .slice(0, 3)
          .map((a) => a.i)
      : indices;
    const b = picks.map((n) => p.hand[n]);
    if (i)
      p.reason = `Passed ${b.map(tileName).join(", ")}: these tiles contribute least to my closest pattern. I keep jokers and connected groups.`;
    p.hand = p.hand.filter((_, n) => !picks.includes(n));
    return b;
  });
  const offsets = [1, 2, 3, 3, 2, 1];
  const offset = offsets[s.pass];
  bundles.forEach((b, i) => s.players[(i + offset) % 4].hand.push(...b));
  s.players.forEach((p) => (p.hand = sortTiles(p.hand)));
  log(
    s,
    `Charleston ${["right", "across", "left", "left", "across", "right"][s.pass]}: you passed ${bundles[0].map(tileName).join(", ")}. Keep tiles that work together; never pass jokers.`,
  );
  s.pass++;
  if (s.pass === 3) s.phase = "charleston-choice";
  if (s.pass === 6) {
    s.phase = "discard";
    log(
      s,
      "Charleston finished. Courtesy pass is omitted in this trainer. East starts by discarding.",
    );
  }
  return s;
}
export function finishCharleston(state, again) {
  const s = copyState(state);
  s.phase = again ? "charleston" : "discard";
  log(
    s,
    again
      ? "All players agree to a second Charleston: left, across, right."
      : "You stopped the optional second Charleston. Courtesy pass is omitted in this trainer. Discard one tile to begin.",
  );
  return s;
}
export function winPattern(s, i, tile) {
  const p = s.players[i];
  return ranked({ ...p, hand: tile ? [...p.hand, tile] : p.hand }, s.card).find(
    (r) => r.missing === 0,
  )?.pattern;
}
export function claims(s, i) {
  if (s.phase !== "claim" || s.last.from === i || s.last.tile === "J")
    return [];
  const p = s.players[i],
    t = s.last.tile;
  const found = [];
  for (const pattern of s.card) {
    if (
      pattern.concealed ||
      evaluate(p.hand, p.exposed, pattern).missing === 99
    )
      continue;
    let remaining = pattern.groups.slice();
    for (const e of p.exposed) {
      let k = remaining.findIndex(
        (g) => g.tile === e.tile && g.count === e.tiles.length,
      );
      remaining.splice(k, 1);
    }
    for (const g of remaining.filter((g) => g.tile === t && g.count >= 3)) {
      const nat = p.hand.filter((x) => x === t).length,
        j = p.hand.filter((x) => x === "J").length;
      if (nat + j >= g.count - 1 && !found.some((x) => x.count === g.count))
        found.push({ ...g, pattern });
    }
  }
  return found;
}
export function discard(state, index) {
  const s = copyState(state);
  if (s.phase !== "discard" || !s.players[s.turn].hand[index])
    throw Error("Draw before discarding.");
  const p = s.players[s.turn],
    tile = p.hand[index];
  const a = advice(s, s.turn).find((x) => x.i === index);
  p.hand.splice(index, 1);
  p.reason = `Discarded ${tileName(tile)}: leaves ${a.missing} tiles to improve toward ${a.pattern.label}.${a.danger ? " An opponent has exposed this tile; be cautious." : ""}`;
  s.last = { tile, from: s.turn };
  s.discards.push({ ...s.last });
  s.phase = "claim";
  log(s, `${p.name}: ${p.reason}`);
  return s;
}
export function declareWin(state, i, fromDiscard = false) {
  const s = copyState(state);
  if (
    fromDiscard
      ? s.phase !== "claim" || s.last.from === i || s.last.tile === "J"
      : s.phase !== "discard" || s.turn !== i
  )
    throw Error("Mahjong is unavailable now.");
  const pattern = winPattern(s, i, fromDiscard ? s.last.tile : null);
  if (!pattern)
    throw Error("This rack does not yet match a complete card hand.");
  if (fromDiscard) {
    s.players[i].hand.push(s.last.tile);
    s.discards.pop();
  }
  s.phase = "over";
  s.winner = i;
  log(
    s,
    `${s.players[i].name} declared Mahjong: ${pattern.label}, card value ${pattern.value}. All 14 tiles match, including natural singles and pairs. Payouts are not simulated.`,
  );
  return s;
}
export function takeClaim(state, i, count) {
  const option = claims(state, i).find((g) => g.count === count);
  if (!option) throw Error("No legal exposure.");
  const s = copyState(state),
    p = s.players[i],
    tiles = [s.last.tile];
  for (let n = 1; n < count; n++) {
    let k = p.hand.indexOf(s.last.tile);
    if (k < 0) k = p.hand.indexOf("J");
    tiles.push(p.hand.splice(k, 1)[0]);
  }
  p.exposed.push({ tile: s.last.tile, tiles });
  s.discards.pop();
  s.turn = i;
  s.phase = "discard";
  p.reason = `Called ${tileName(s.last.tile)} for a ${count === 3 ? "pung" : count === 4 ? "kong" : count === 5 ? "quint" : "sextet"} toward ${option.pattern.label}. The exposure now commits me to compatible hands.`;
  log(s, `${p.name}: ${p.reason}`);
  return s;
}
export function resolveClaims(state, human = null) {
  const order = [1, 2, 3].map((d) => (state.last.from + d) % 4);
  for (const i of order)
    if (
      (i !== 0 || human === "win") &&
      state.last.tile !== "J" &&
      winPattern(state, i, state.last.tile)
    )
      return declareWin(state, i, true);
  for (const i of order) {
    if (i === 0) {
      if (typeof human === "number") return takeClaim(state, 0, human);
      continue;
    }
    const before = ranked(state.players[i], state.card)[0].missing;
    for (const c of claims(state, i)) {
      const next = takeClaim(state, i, c.count);
      if (ranked(next.players[i], next.card)[0].missing < before) return next;
    }
  }
  const s = copyState(state);
  s.turn = (s.last.from + 1) % 4;
  s.phase = "draw";
  return s;
}
export function exchanges(s, i) {
  if (s.phase !== "discard" || s.turn !== i) return [];
  return s.players.flatMap((p, pi) =>
    p.exposed.flatMap((e, ei) =>
      e.tiles.includes("J") && s.players[i].hand.includes(e.tile)
        ? [{ pi, ei, tile: e.tile }]
        : [],
    ),
  );
}
export function exchange(state, pi, ei) {
  const s = copyState(state),
    p = s.players[s.turn];
  if (!exchanges(s, s.turn).some((x) => x.pi === pi && x.ei === ei))
    throw Error("No matching natural tile to exchange now.");
  const e = s.players[pi].exposed[ei];
  p.hand[p.hand.indexOf(e.tile)] = "J";
  e.tiles[e.tiles.indexOf("J")] = e.tile;
  log(
    s,
    `${p.name} exchanged ${tileName(e.tile)} for an exposed joker. That joker can now help another set of three or more.`,
  );
  return s;
}
export function draw(state) {
  const s = copyState(state);
  if (s.phase !== "draw") throw Error("Cannot draw now.");
  if (!s.wall.length) {
    s.phase = "over";
    log(s, "Wall game: no tiles remain. No one wins this hand.");
    return s;
  }
  const t = s.wall.pop();
  s.players[s.turn].hand.push(t);
  s.phase = "discard";
  const best = ranked(s.players[s.turn], s.card)[0];
  s.players[s.turn].reason =
    `Drew ${tileName(t)}. ${best.pattern.label} is now ${best.missing} tiles away. I will check Mahjong and joker exchanges before choosing a discard.`;
  log(
    s,
    `${s.players[s.turn].name} drew ${tileName(t)} from the wall. Check for Mahjong and joker exchanges before discarding.`,
  );
  return s;
}
export function step(state) {
  if (state.phase === "claim") return resolveClaims(state);
  if (state.phase === "draw") return draw(state);
  if (state.phase === "discard" && state.turn !== 0) {
    if (winPattern(state, state.turn)) return declareWin(state, state.turn);
    const ex = exchanges(state, state.turn);
    if (ex.length) return exchange(state, ex[0].pi, ex[0].ei);
    return discard(state, advice(state, state.turn)[0].i);
  }
  return state;
}

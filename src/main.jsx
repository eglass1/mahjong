import React, { useState, useMemo } from "react";
import { createRoot } from "react-dom/client";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tooltip,
  Switch,
  FormControlLabel,
} from "@mui/material";
import * as E from "./engine";
import "./style.css";
import { readSavedCard, saveCard, forgetCard } from "./card-storage.js";
import { AppInstallation } from "./pwa.jsx";
const theme = createTheme({
  palette: {
    primary: { main: "#245e4c" },
    secondary: { main: "#ac7041" },
    background: { default: "#f6f4ee" },
  },
  typography: {
    fontFamily: "Arial, sans-serif",
    button: { textTransform: "none", fontWeight: 700 },
  },
  shape: { borderRadius: 10 },
});
const glyph = (t) =>
  t === "F"
    ? "✿"
    : t === "J"
      ? "★"
      : { E: "東", S: "南", W: "西", N: "北", RD: "中", GD: "發", WD: "▯" }[
          t
        ] || t.slice(1);
function Tile({
  tile,
  small = false,
  selected = false,
  hint = false,
  onClick,
}) {
  return (
    <Tooltip title={E.tileName(tile)}>
      <button
        aria-label={E.tileName(tile)}
        aria-pressed={selected}
        className={`tile ${small ? "small" : ""} ${selected ? "selected" : ""} ${hint ? "hint" : ""} suit-${tile[0]}`}
        onClick={onClick}
      >
        <strong>{glyph(tile)}</strong>
        <span>
          {tile.length === 2 && /\d/.test(tile[1])
            ? E.names[tile[0]]
            : tile === "J"
              ? "JOKER"
              : tile === "F"
                ? "FLOWER"
                : tile === "WD"
                  ? "SOAP"
                  : tile.endsWith("D")
                    ? "DRAGON"
                    : "WIND"}
        </span>
      </button>
    </Tooltip>
  );
}
const lessons = [
  [
    "The goal",
    "Build one exact 14-tile hand from the active card. American Mahjong is not the generic four-sets-and-a-pair game. The card determines the winning shape.",
  ],
  [
    "Read a card",
    "Repeated symbols describe groups: 2 is a single, 22 a pair, 222 a pung, 2222 a kong, and five alike a quint. Different card colors usually identify different suits, not the physical color of a tile. Follow each line’s printed restrictions. X permits exposures; C means concealed.",
  ],
  [
    "The Charleston",
    "Before play, pass three tiles right, across, then left. Do not pass jokers. Any player may stop the second Charleston; if everyone agrees, pass left, across, right. This trainer uses direct passes, without blind passes, and omits the optional courtesy pass.",
  ],
  [
    "Draw, then discard",
    "East starts with 14 tiles and discards first. After that, draw a tile, check for Mahjong or a joker exchange, then discard. Play progresses East → South → West → North. A legal call interrupts this order.",
  ],
  [
    "Call a discard",
    "Only the latest discard is available. Call it to expose a complete pung, kong, quint or sextet compatible with your hand. Singles and pairs may only be called for Mahjong. A concealed hand cannot expose sets but can call its final winning tile. Mahjong takes priority over an exposure; competing equal claims use turn order.",
  ],
  [
    "Jokers & dragons",
    "Jokers substitute in groups of three or more identical tiles, never singles or pairs. A discarded joker cannot be called. On your turn after drawing or calling, replace a joker in an exposure with its matching natural tile. White dragons are soap and represent zero when a card says so. Green dragons pair with bams, red with craks, and white with dots when matching dragons are required.",
  ],
  [
    "Learn from the open table",
    "All racks are visible for learning. The computer’s discard suggestions use its own tiles, the active card and visible exposures; they do not use opponents’ concealed tiles. The coach ranks progress toward a hand, then favors holding jokers and avoiding tiles seen in exposures. It is a simple teaching heuristic, not an expert odds calculation.",
  ],
];
function App() {
  const [initialCard] = useState(readSavedCard);
  const [cardData, setCardData] = useState(initialCard.data);
  const [cardSaved, setCardSaved] = useState(!!initialCard.data);
  const [storageNotice, setStorageNotice] = useState(initialCard.warning);
  const [confirmForget, setConfirmForget] = useState(false);
  const [card, setCard] = useState(initialCard.data?.hands || E.PRACTICE),
    [cardTitle, setCardTitle] = useState(
      initialCard.data?.title ||
        (initialCard.data ? "Imported 2026 card" : "Original practice card"),
    ),
    [game, setGame] = useState(() =>
      E.newGame(initialCard.data?.hands || E.PRACTICE),
    ),
    [selected, setSelected] = useState([]),
    [detail, setDetail] = useState(null),
    [tab, setTab] = useState(() => {
      const view = new URL(location.href).searchParams.get("view");
      return ["card", "guide"].includes(view) ? view : "table";
    }),
    [cardSection, setCardSection] = useState("All sections"),
    [error, setError] = useState(""),
    [hints, setHints] = useState(true),
    [history, setHistory] = useState([]),
    [inspect, setInspect] = useState(false),
    [confirm, setConfirm] = useState(false);
  const human = game.players[0],
    best = useMemo(() => {
      const seen = new Set();
      return E.ranked(human, card)
        .filter((r) => {
          const key = r.pattern.family || r.pattern.id;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, 3);
    }, [human, card]),
    suggestions = useMemo(() => E.advice(game, 0), [game]),
    isPass = game.phase === "charleston",
    humanTurn = game.turn === 0 && game.phase === "discard",
    callOptions = E.claims(game, 0),
    canWin =
      game.phase === "claim" &&
      game.last.from !== 0 &&
      game.last.tile !== "J" &&
      E.winPattern(game, 0, game.last.tile),
    availableEx = E.exchanges(game, 0);
  const cardLines = useMemo(
    () => [...new Map(card.map((p) => [p.family || p.id, p])).values()],
    [card],
  );
  const variants = detail?.pattern
    ? card.filter(
        (p) =>
          (p.family || p.id) === (detail.pattern.family || detail.pattern.id),
      )
    : [];
  function act(fn) {
    try {
      const next = fn(game);
      setHistory((h) => [...h.slice(-39), game]);
      setGame(next);
      setSelected([]);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  function infoTile(t) {
    setDetail({
      title: E.tileName(t),
      tile: t,
      text:
        t === "J"
          ? lessons[5][1]
          : t === "F"
            ? "All eight flowers are interchangeable in this trainer. A flower pair requires two real flowers; a group of three or more may use jokers."
            : t === "WD"
              ? "The white dragon is also called soap. It belongs to the dragon family and can mean zero in year-based patterns when the card specifies it."
              : /^[BCD]\d$/.test(t)
                ? `${E.tileName(t)} is a numbered suit tile. There are four copies of each number from 1 to 9 in each of three suits: bams (bamboo), craks (characters), and dots (circles). The number and suit both matter when matching a hand.`
                : "This is an honor tile. There are four copies of each wind and each dragon. Different winds or dragons are different tiles; NEWS is four singles, not a pung or kong.",
    });
  }
  function clickTile(t, i) {
    if (inspect || (!isPass && !humanTurn)) {
      infoTile(t);
      return;
    }
    setSelected((s) =>
      s.includes(i)
        ? s.filter((n) => n !== i)
        : isPass
          ? s.length < 3
            ? [...s, i]
            : s
          : [i],
    );
  }
  function reset() {
    setGame(E.newGame(card));
    setHistory([]);
    setSelected([]);
    setConfirm(false);
    setError("");
  }
  async function importCard(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 2000000)
        throw Error("Choose a JSON card smaller than 2 MB.");
      const data = JSON.parse(await file.text());
      const hands = E.validateCard(data);
      setCardData(data);
      rememberCard(data);
      setCard(hands);
      setCardSection("All sections");
      setCardTitle(data.title || "Imported 2026 card");
      setGame(E.newGame(hands));
      setHistory([]);
      setSelected([]);
      setDetail(null);
      setError("");
    } catch (e) {
      setError(`Card import: ${e.message}`);
    }
    event.target.value = "";
  }
  function rememberCard(data) {
    try {
      saveCard(data);
      setCardSaved(true);
      setStorageNotice("");
    } catch {
      setCardSaved(false);
      setStorageNotice(
        "This card is loaded for this session only: device storage could not save it. Allow website storage or free space, then choose Save card in Manage card. Any previously saved card will still be used when you reopen the app.",
      );
    }
  }
  function removeSavedCard() {
    try {
      forgetCard();
      setCardData(null);
      setCardSaved(false);
      setStorageNotice("");
      setCard(E.PRACTICE);
      setCardTitle("Original practice card");
      setGame(E.newGame());
      setHistory([]);
      setSelected([]);
      setError("");
      setCardSection("All sections");
      setDetail(null);
      setConfirmForget(false);
    } catch {
      setStorageNotice(
        "The saved card could not be removed. Allow website storage and try again, or remove this site’s data in your browser settings.",
      );
      setConfirmForget(false);
    }
  }
  function download() {
    const a = document.createElement("a");
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              year: 2026,
              title:
                "Original practice card — replace with your 2026 definitions",
              hands: E.PRACTICE,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    a.href = url;
    a.download = "card-template.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const phaseLabel = isPass
    ? `Charleston · ${["right", "across", "left", "left", "across", "right"][game.pass]}`
    : game.phase === "charleston-choice"
      ? "Choose the next pass"
      : game.phase === "over"
        ? "Hand complete"
        : game.phase === "claim"
          ? "Discard · call window"
          : `${game.players[game.turn].name} · ${game.phase}`;
  return (
    <>
      <header>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("table");
          }}
        >
          <span className="brand-icon">發</span>
          <span>
            the learning table<small>AMERICAN MAHJONG</small>
          </span>
        </a>
        <nav>
          {[
            ["table", "Play & learn"],
            ["card", "The card"],
            ["guide", "Field guide"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <AppInstallation />
          <Button variant="outlined" onClick={() => setConfirm(true)}>
            New hand ↗
          </Button>
        </div>
      </header>
      <main>
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              A LITTLE GUIDANCE. ONE TILE AT A TIME.
            </div>
            <h1>
              {tab === "table"
                ? "Your seat at the table."
                : tab === "card"
                  ? "Every hand has a story."
                  : "Get to know the game."}
            </h1>
            <p>
              {tab === "table"
                ? "An open table, thoughtful opponents, and a coach in your corner."
                : tab === "card"
                  ? "Explore the patterns. Click a hand to understand how it fits together."
                  : "Small lessons to bring back to your next turn."}
            </p>
          </div>
          <span className="edition">
            2026 CARD WORKSPACE
            <br />
            <b>{card === E.PRACTICE ? "Practice mode" : "Imported card"}</b>
          </span>
        </div>
        <div className="notice">
          <span>ⓘ</span>
          <div>
            <b>{cardTitle}</b> ·{" "}
            {card === E.PRACTICE
              ? "These teaching patterns are not the official 2026 NMJL card. Import your transcribed or licensed definitions to play those hands."
              : `Playing your supplied 2026 definitions. ${cardSaved ? "Saved on this device for next time." : "Not saved; this session only."}`}
          </div>
          <Button
            size="small"
            onClick={() =>
              setDetail({ title: "Use your 2026 card", import: true })
            }
          >
            Manage card →
          </Button>
        </div>
        {storageNotice && (
          <Alert severity="warning" className="storage-notice">
            {storageNotice}
          </Alert>
        )}
        {error && (
          <Alert severity="error" onClose={() => setError("")}>
            {error}
          </Alert>
        )}
        {tab === "table" ? (
          <div className="layout">
            <div>
              <div className="table-toolbar">
                <span>
                  <i className="status-dot" /> {phaseLabel}
                </span>
                <span>
                  {game.wall.length} tiles in wall{" "}
                  <span className="separator">|</span> All hands visible
                </span>
              </div>
              <section className="felt" aria-label="Open Mahjong table">
                <div className="table-caption">
                  THE OPEN TABLE{" "}
                  <span>See the thinking behind every tile.</span>
                </div>
                <div className="opponents">
                  {[2, 1, 3].map((i) => (
                    <div
                      key={i}
                      className={`opponent ${game.turn === i ? "current" : ""}`}
                    >
                      <div className="player-heading">
                        <span className="avatar">
                          {game.players[i].name[0]}
                        </span>
                        <b>{game.players[i].name}</b>
                        <span>{["East", "South", "West", "North"][i]}</span>
                        <small>
                          {game.players[i].hand.length +
                            game.players[i].exposed.reduce(
                              (n, e) => n + e.tiles.length,
                              0,
                            )}{" "}
                          tiles
                        </small>
                      </div>
                      <div className="rack compact">
                        {E.sortTiles(game.players[i].hand).map((t, j) => (
                          <Tile
                            key={j}
                            tile={t}
                            small
                            onClick={() => infoTile(t)}
                          />
                        ))}
                      </div>
                      {game.players[i].exposed.map((e, j) => (
                        <div className="exposure" key={j}>
                          <span>EXPOSED</span>
                          {e.tiles.map((t, k) => (
                            <Tile
                              key={k}
                              tile={t}
                              small
                              onClick={() => infoTile(t)}
                            />
                          ))}
                        </div>
                      ))}
                      <p className="thought">“{game.players[i].reason}”</p>
                    </div>
                  ))}
                </div>
                <div className="center-table">
                  <div>
                    <span className="eyebrow">DISCARD POOL</span>
                    <span className="pool-count">
                      {game.discards.length} on the table
                    </span>
                  </div>
                  {game.discards.length ? (
                    <div className="discard-pool">
                      {game.discards.map((d, i) => (
                        <Tile
                          key={i}
                          tile={d.tile}
                          small
                          hint={
                            i === game.discards.length - 1 &&
                            game.phase === "claim"
                          }
                          onClick={() => infoTile(d.tile)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="empty-pool">
                      <span>✦</span> A fresh hand. A world of possibilities.
                      <small>Discards will collect here as you play.</small>
                    </div>
                  )}
                </div>
                <div className="human">
                  <div className="player-heading">
                    <span className="avatar you">Y</span>
                    <b>Your rack</b>
                    <span>East · dealer</span>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={inspect}
                          onChange={(e) => setInspect(e.target.checked)}
                        />
                      }
                      label="Inspect tiles"
                    />
                  </div>
                  <div className="rack">
                    {human.hand.map((t, i) => (
                      <Tile
                        key={i}
                        tile={t}
                        selected={selected.includes(i)}
                        hint={
                          hints &&
                          (isPass
                            ? suggestions
                                .filter((a) => a.tile !== "J")
                                .slice(0, 3)
                                .some((a) => a.i === i)
                            : humanTurn && suggestions[0]?.i === i)
                        }
                        onClick={() => clickTile(t, i)}
                      />
                    ))}
                  </div>
                  {human.exposed.map((e, j) => (
                    <div className="exposure" key={j}>
                      <span>EXPOSED</span>
                      {e.tiles.map((t, k) => (
                        <Tile
                          key={k}
                          tile={t}
                          small
                          onClick={() => infoTile(t)}
                        />
                      ))}
                    </div>
                  ))}
                  <div className="rack-caption">
                    {inspect
                      ? "Click any tile to learn its name and role."
                      : isPass
                        ? "Select three tiles to pass. Gold marks the coach’s suggestions."
                        : humanTurn
                          ? "Select a tile to discard, or turn on Inspect tiles to explore."
                          : "Follow the turn above. You can inspect any tile while you wait."}
                  </div>
                </div>
              </section>
              <div className="action-bar">
                <div>
                  <b>
                    {game.phase === "over"
                      ? game.winner === null
                        ? "A wall game. Time to reflect."
                        : `${game.players[game.winner].name} won this hand!`
                      : isPass
                        ? `Pass ${["right", "across", "left", "left", "across", "right"][game.pass]}`
                        : game.phase === "claim"
                          ? `${game.players[game.last.from].name} discarded ${E.tileName(game.last.tile)}`
                          : humanTurn
                            ? "Your move. Take your time."
                            : game.phase === "charleston-choice"
                              ? "One Charleston complete."
                              : `${game.players[game.turn].name}’s turn`}
                  </b>
                  <small>
                    {isPass
                      ? `${selected.length} of 3 tiles selected`
                      : game.phase === "claim"
                        ? "Resolve calls before the next player draws."
                        : "One click advances one decision."}
                  </small>
                </div>
                <div className="actions">
                  {isPass ? (
                    <Button
                      variant="contained"
                      disabled={
                        selected.length !== 3 ||
                        selected.some((i) => human.hand[i] === "J")
                      }
                      onClick={() => act((s) => E.passTiles(s, selected))}
                    >
                      Pass 3 tiles →
                    </Button>
                  ) : game.phase === "charleston-choice" ? (
                    <>
                      <Button
                        onClick={() => act((s) => E.finishCharleston(s, true))}
                      >
                        Second Charleston
                      </Button>
                      <Button
                        variant="contained"
                        onClick={() => act((s) => E.finishCharleston(s, false))}
                      >
                        Start play →
                      </Button>
                    </>
                  ) : game.phase === "claim" ? (
                    <>
                      {canWin && (
                        <Button
                          onClick={() => act((s) => E.resolveClaims(s, "win"))}
                        >
                          Mahjong!
                        </Button>
                      )}
                      {callOptions.map((c) => (
                        <Button
                          key={c.count}
                          onClick={() =>
                            act((s) => E.resolveClaims(s, c.count))
                          }
                        >
                          Call{" "}
                          {c.count === 3
                            ? "pung"
                            : c.count === 4
                              ? "kong"
                              : c.count === 5
                                ? "quint"
                                : "sextet"}
                        </Button>
                      ))}
                      <Button
                        variant="contained"
                        onClick={() => act(E.resolveClaims)}
                      >
                        {game.last.from === 0
                          ? "Resolve calls"
                          : "Pass / continue"}{" "}
                        →
                      </Button>
                    </>
                  ) : humanTurn ? (
                    <>
                      <Button
                        disabled={!E.winPattern(game, 0)}
                        onClick={() => act((s) => E.declareWin(s, 0))}
                      >
                        Mahjong!
                      </Button>
                      <Button
                        variant="contained"
                        disabled={selected.length !== 1}
                        onClick={() => act((s) => E.discard(s, selected[0]))}
                      >
                        Discard selected →
                      </Button>
                    </>
                  ) : game.phase === "over" ? (
                    <Button variant="contained" onClick={reset}>
                      Play another hand
                    </Button>
                  ) : (
                    <Button variant="contained" onClick={() => act(E.step)}>
                      {game.turn === 0
                        ? "Draw a tile"
                        : "Next computer decision"}{" "}
                      →
                    </Button>
                  )}
                </div>
              </div>
              {availableEx.length > 0 && (
                <div className="exchanges">
                  {availableEx.map((ex) => (
                    <Button
                      key={`${ex.pi}-${ex.ei}`}
                      onClick={() => act((s) => E.exchange(s, ex.pi, ex.ei))}
                    >
                      Exchange {E.tileName(ex.tile)} for{" "}
                      {game.players[ex.pi].name}’s joker
                    </Button>
                  ))}
                </div>
              )}
              <div className="below-table">
                <Button
                  disabled={!history.length}
                  onClick={() => {
                    setGame(history.at(-1));
                    setHistory((h) => h.slice(0, -1));
                    setSelected([]);
                  }}
                >
                  ↶ Undo last decision
                </Button>
                <span>Learning mode · no timer · no pressure</span>
              </div>
            </div>
            <aside>
              <section className="coach panel">
                <div className="panel-heading">
                  <span>✦ YOUR TABLE COACH</span>
                  <Switch
                    size="small"
                    checked={hints}
                    onChange={(e) => setHints(e.target.checked)}
                    inputProps={{ "aria-label": "Show coaching suggestions" }}
                  />
                </div>
                <h2>
                  {isPass
                    ? "Find your direction."
                    : game.phase === "claim"
                      ? "Pause before the next draw."
                      : game.phase === "over"
                        ? "Every hand teaches you."
                        : "Build on what you have."}
                </h2>
                {hints ? (
                  <>
                    <p>
                      {isPass
                        ? "Keep connected groups. Pass tiles that do the least for your closest card pattern."
                        : game.phase === "claim"
                          ? canWin
                            ? "You have a complete hand! Declare Mahjong to claim the winning tile."
                            : callOptions.length
                              ? "You can complete an exposed set. Check that the commitment still suits your plan."
                              : "You have no compatible exposure or winning claim on this discard. Continue to the next decision."
                          : humanTurn
                            ? `Consider discarding ${E.tileName(suggestions[0].tile)}. You will remain ${suggestions[0].missing} tiles away from ${suggestions[0].pattern.label}.`
                            : "Watch how each draw changes the computer’s choices. Its explanation updates when it discards or calls."}
                    </p>
                    {(humanTurn || isPass) && (
                      <div className="suggestion">
                        <span>
                          {isPass ? "SUGGESTED PASS" : "SUGGESTED DISCARD"}
                        </span>
                        <div>
                          {(isPass
                            ? suggestions
                                .filter((a) => a.tile !== "J")
                                .slice(0, 3)
                            : suggestions.slice(0, 1)
                          ).map((a) => (
                            <Tile
                              key={a.i}
                              tile={a.tile}
                              small
                              onClick={() =>
                                setSelected(
                                  isPass
                                    ? suggestions
                                        .filter((x) => x.tile !== "J")
                                        .slice(0, 3)
                                        .map((x) => x.i)
                                    : [a.i],
                                )
                              }
                            />
                          ))}
                          <small>
                            Click to select
                            <br />
                            the suggestion
                          </small>
                        </div>
                      </div>
                    )}
                    <p className="coach-foot">
                      Suggestions are based on your tiles and public exposures.
                      Try a different move, then undo to compare.
                    </p>
                  </>
                ) : (
                  <p>
                    Coaching is paused. Switch it on whenever you’d like a
                    second opinion.
                  </p>
                )}
              </section>
              <section className="panel targets">
                <div className="panel-heading">
                  YOUR CLOSEST HANDS{" "}
                  <span>{card === E.PRACTICE ? "PRACTICE" : "2026"}</span>
                </div>
                {best.map((r, i) => (
                  <button
                    className="target"
                    key={r.pattern.id}
                    onClick={() =>
                      setDetail({ title: r.pattern.label, pattern: r.pattern })
                    }
                  >
                    <span className="rank">0{i + 1}</span>
                    <span>
                      <b>{r.pattern.label}</b>
                      <small>
                        {r.pattern.concealed ? "Concealed" : "Exposable"} ·{" "}
                        {r.pattern.value} points
                      </small>
                    </span>
                    <span className="distance">
                      {r.missing === 99 ? "—" : r.missing}
                      <small>away</small>
                    </span>
                  </button>
                ))}
                <small className="footnote">
                  “Away” counts missing tiles, allowing eligible jokers. It does
                  not estimate winning odds.
                </small>
              </section>
              <section className="panel journal">
                <div className="panel-heading">
                  TABLE NOTES <span>{game.log.length}</span>
                </div>
                <div className="log" aria-live="polite">
                  {game.log.slice(0, 25).map((l, i) => (
                    <div key={l.id} className={i === 0 ? "latest" : ""}>
                      <span className="log-dot" />
                      <p>{l.text}</p>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        ) : tab === "card" ? (
          <div>
            <div className="card-controls">
              <label>
                Section{" "}
                <select
                  value={cardSection}
                  onChange={(e) => setCardSection(e.target.value)}
                >
                  <option>All sections</option>
                  {[...new Set(card.map((p) => p.section))].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <span>
                {cardLines.length} card lines · {card.length} expanded
                variations
              </span>
            </div>
            <p className="footnote">
              Each line shows one suit/number example. Click it to explore the
              permitted variations. Green = bams, red = craks, blue = dots; the
              card’s colors indicate relative suits.
            </p>
            <section className="card-grid">
              {cardLines
                .filter(
                  (p) =>
                    cardSection === "All sections" || p.section === cardSection,
                )
                .map((p) => (
                  <button
                    className="pattern-card"
                    key={p.id}
                    onClick={() => setDetail({ title: p.label, pattern: p })}
                  >
                    <div className="eyebrow">{p.section}</div>
                    <h2>{p.label}</h2>
                    <div className="pattern-groups">
                      {p.groups.map((g, i) => (
                        <span key={i} className={`pattern suit-${g.tile[0]}`}>
                          {Array(g.count)
                            .fill(
                              g.tile === "F"
                                ? "F"
                                : g.tile === "WD"
                                  ? "0"
                                  : g.tile.length === 2
                                    ? g.tile.slice(1)
                                    : g.tile,
                            )
                            .join("")}
                        </span>
                      ))}
                    </div>
                    <p>
                      {p.concealed ? "C · Concealed" : "X · Exposable"}
                      <span>{p.value} points ↗</span>
                    </p>
                  </button>
                ))}
            </section>
          </div>
        ) : (
          <section className="guide-grid">
            {lessons.map(([title, text], i) => (
              <article className="panel" key={title}>
                <div className="eyebrow">LESSON 0{i + 1}</div>
                <h2>{title}</h2>
                <p>{text}</p>
              </article>
            ))}
            <article className="panel">
              <div className="eyebrow">YOUR REFERENCE</div>
              <h2>The official card</h2>
              <p>
                Keep your current card beside you. This trainer is independent
                of the National Mah Jongg League and does not supply or verify
                its official 2026 hand list.
              </p>
              <a
                href="https://www.nationalmahjonggleague.org/"
                target="_blank"
                rel="noreferrer"
              >
                Visit the National Mah Jongg League ↗
              </a>
            </article>
          </section>
        )}
        <footer>
          <span>✦ The learning table</span>
          <span>Made for the joy of figuring it out.</span>
          <Button size="small" onClick={() => setTab("guide")}>
            Rules & learning notes ↗
          </Button>
        </footer>
      </main>
      <Dialog
        open={!!detail}
        onClose={() => setDetail(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{detail?.title}</DialogTitle>
        <DialogContent>
          {detail?.tile && (
            <div className="detail-tile">
              <Tile tile={detail.tile} onClick={() => {}} />
            </div>
          )}
          {detail?.text && <p>{detail.text}</p>}
          {detail?.pattern && (
            <>
              <Chip
                label={
                  detail.pattern.concealed ? "C · Concealed" : "X · Exposable"
                }
              />
              <p>
                {detail.pattern.notes ||
                  "Match every group exactly. These are expanded tile identities; suit choices and number alternatives must be imported as separate hands."}
              </p>
              {variants.length > 1 && (
                <label className="variation-picker">
                  Suit / number variation ({variants.length})
                  <select
                    value={detail.pattern.id}
                    onChange={(e) =>
                      setDetail({
                        title: detail.title,
                        pattern: variants.find((p) => p.id === e.target.value),
                      })
                    }
                  >
                    {variants.map((p, i) => (
                      <option key={p.id} value={p.id}>
                        {i + 1}.{" "}
                        {p.groups.map((g) => `${g.count}×${g.tile}`).join(" ")}{" "}
                        · {E.evaluate(human.hand, human.exposed, p).missing}{" "}
                        away
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {detail.pattern.groups.map((g, i) => (
                <div className="detail-group" key={i}>
                  <div>
                    {Array.from({ length: g.count }, (_, j) => (
                      <Tile
                        key={j}
                        tile={g.tile}
                        small
                        onClick={() => infoTile(g.tile)}
                      />
                    ))}
                  </div>
                  <span>
                    {
                      ["", "Single", "Pair", "Pung", "Kong", "Quint", "Sextet"][
                        g.count
                      ]
                    }{" "}
                    · {g.count < 3 ? "natural tiles only" : "jokers allowed"}
                  </span>
                </div>
              ))}
              <p>
                {E.evaluate(human.hand, human.exposed, detail.pattern)
                  .missing === 99
                  ? "Your current exposures are incompatible with this hand."
                  : `Your rack is ${E.evaluate(human.hand, human.exposed, detail.pattern).missing} tiles away from this hand.`}
              </p>
              <p className="footnote">
                Card value: {detail.pattern.value}. Settlement payments and
                penalties are not simulated.
              </p>
            </>
          )}
          {detail?.import && (
            <>
              {error && <Alert severity="error">{error}</Alert>}
              <Alert severity="info">
                Obtain your private card.json separately, then import it here.
                Import starts a new game. Official card data is not bundled.
              </Alert>
              <p>
                Transcribe your card into the template or use data you are
                authorized to use. Each legal suit/number variation needs a
                separate expanded hand. Imported cards are saved on this device
                and restored when you reopen the app. Nothing is uploaded; no
                account is needed.
              </p>
              <p>
                Tile codes: B1–B9 (bams), C1–C9 (craks), D1–D9 (dots), E/S/W/N
                (winds), GD/RD/WD (dragons), F (flowers). A zero is WD. Groups
                must total 14. Never combine unrelated singles into a
                joker-eligible group.
              </p>
              {cardData && (
                <Alert severity={cardSaved ? "success" : "warning"}>
                  {cardSaved
                    ? `Saved on this device: ${cardTitle}`
                    : "This card has not been saved. It is available for this session only."}
                </Alert>
              )}
              {storageNotice && (
                <Alert severity="warning">{storageNotice}</Alert>
              )}
              <Button onClick={download}>Download example JSON</Button>
              <Button variant="contained" component="label">
                Import 2026 JSON
                <input
                  hidden
                  type="file"
                  accept=".json,application/json"
                  onChange={importCard}
                />
              </Button>
              {cardData && !cardSaved && (
                <Button onClick={() => rememberCard(cardData)}>
                  Save card on this device
                </Button>
              )}
              {(cardData || storageNotice) && (
                <Button color="error" onClick={() => setConfirmForget(true)}>
                  Forget saved card
                </Button>
              )}
              <p className="footnote">
                The importer validates structure, not fidelity to the official
                card. Include every permitted variation to make the active card
                complete. Keep the original JSON file as a backup: clearing
                website data, private browsing, or device storage cleanup can
                remove saved cards. Installed apps may have separate storage;
                import once inside the app if needed. Reopening starts a new
                hand with your saved card.
              </p>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail(null)}>Back to the table</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={confirmForget} onClose={() => setConfirmForget(false)}>
        <DialogTitle>Forget the saved card?</DialogTitle>
        <DialogContent>
          This removes the saved card from this browser or app and starts a new
          practice hand. Keep your original JSON file if you want to import it
          again.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmForget(false)}>Keep card</Button>
          <Button color="error" onClick={removeSavedCard}>
            Forget and use practice
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={confirm} onClose={() => setConfirm(false)}>
        <DialogTitle>Deal a new hand?</DialogTitle>
        <DialogContent>
          The current hand will be replaced. Your active card stays selected.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(false)}>Keep playing</Button>
          <Button onClick={reset}>Deal new hand</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
createRoot(document.getElementById("root")).render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <App />
  </ThemeProvider>,
);

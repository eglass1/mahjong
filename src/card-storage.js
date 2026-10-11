import { validateCard } from "./engine.js";

// Scope storage to this app's hosting directory (including project subpaths).
export function cardStorageKey(href) {
  return `learning-table:card:v1:${new URL(".", href).pathname}`;
}

export function readSavedCard(target = window) {
  try {
    const raw = target.localStorage.getItem(
      cardStorageKey(target.location.href),
    );
    if (!raw) return { data: null, warning: "" };
    const saved = JSON.parse(raw);
    if (saved.version !== 1) throw new Error("Unsupported saved-card version");
    validateCard(saved.card);
    return { data: saved.card, warning: "" };
  } catch {
    return {
      data: null,
      warning:
        "The saved card could not be restored. Use Manage card to import it again. Device storage may be unavailable, or the saved data may be damaged.",
    };
  }
}

export function saveCard(data, target = window) {
  validateCard(data);
  // setItem is atomic: a quota/security failure preserves the previous card.
  target.localStorage.setItem(
    cardStorageKey(target.location.href),
    JSON.stringify({ version: 1, card: data }),
  );
}

export function forgetCard(target = window) {
  target.localStorage.removeItem(cardStorageKey(target.location.href));
}

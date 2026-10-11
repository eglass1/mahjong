import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";

export function AppInstallation() {
  const [open, setOpen] = useState(false);
  const [installEvent, setInstallEvent] = useState(null);
  const [installed, setInstalled] = useState(
    () =>
      window.matchMedia?.("(display-mode: standalone)").matches ||
      navigator.standalone === true,
  );
  const [offline, setOffline] = useState(navigator.onLine === false);
  const [ready, setReady] = useState(false);
  const [waiting, setWaiting] = useState(null);
  const [message, setMessage] = useState("");
  const [updating, setUpdating] = useState(false);
  const refreshRequested = useRef(false);
  const installBusy = useRef(false);
  const secure =
    window.isSecureContext && ["https:", "http:"].includes(location.protocol);
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  useEffect(() => {
    const prompt = (e) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    const complete = () => {
      setInstalled(true);
      setInstallEvent(null);
      setMessage(
        "App installed. Open it from your home screen or app launcher.",
      );
    };
    const online = () => setOffline(navigator.onLine === false);
    window.addEventListener("beforeinstallprompt", prompt);
    window.addEventListener("appinstalled", complete);
    window.addEventListener("online", online);
    window.addEventListener("offline", online);
    const media = window.matchMedia?.("(display-mode: standalone)");
    const mode = (e) =>
      setInstalled(e.matches || navigator.standalone === true);
    media?.addEventListener?.("change", mode);
    return () => {
      window.removeEventListener("beforeinstallprompt", prompt);
      window.removeEventListener("appinstalled", complete);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", online);
      media?.removeEventListener?.("change", mode);
    };
  }, []);

  useEffect(() => {
    if (!secure || !("serviceWorker" in navigator) || !import.meta.env.PROD)
      return;
    let disposed = false;
    let registration;
    const cleanups = [];
    const onController = () => {
      if (refreshRequested.current) window.location.reload();
      else setReady(true);
    };
    navigator.serviceWorker.addEventListener("controllerchange", onController);
    navigator.serviceWorker
      .register(new URL("./sw.js", location.href), {
        scope: "./",
        updateViaCache: "none",
      })
      .then((reg) => {
        if (disposed) return;
        registration = reg;
        setReady(!!reg.active);
        if (reg.waiting) setWaiting(reg.waiting);
        const track = () => {
          const worker = reg.installing;
          if (!worker) return;
          const change = () => {
            if (disposed) return;
            if (worker.state === "installed" && reg.active)
              setWaiting(reg.waiting || worker);
            if (worker.state === "activated") setReady(true);
            if (worker.state === "redundant")
              setMessage(
                "Offline setup could not finish. Reconnect and reopen the app to try again.",
              );
          };
          worker.addEventListener("statechange", change);
          cleanups.push(() =>
            worker.removeEventListener("statechange", change),
          );
        };
        track();
        reg.addEventListener("updatefound", track);
        cleanups.push(() => reg.removeEventListener("updatefound", track));
      })
      .catch(() => {
        if (!disposed)
          setMessage(
            "Offline setup is unavailable. You can keep playing; reconnect and reopen the app to try again.",
          );
      });
    const check = () => {
      if (document.visibilityState === "visible")
        registration?.update().catch(() => {});
    };
    document.addEventListener("visibilitychange", check);
    return () => {
      disposed = true;
      cleanups.forEach((fn) => fn());
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onController,
      );
      document.removeEventListener("visibilitychange", check);
    };
  }, [secure]);

  async function install() {
    if (!installEvent || installBusy.current) return;
    installBusy.current = true;
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      setInstallEvent(null);
      setMessage(
        choice.outcome === "accepted"
          ? "Installation requested. Follow your browser’s instructions."
          : "Installation dismissed. You can install later from the browser menu.",
      );
    } catch {
      setInstallEvent(null);
      setMessage("Use your browser menu to install this app.");
    } finally {
      installBusy.current = false;
    }
  }
  function update() {
    refreshRequested.current = true;
    setUpdating(true);
    waiting.postMessage({ type: "APPLY_UPDATE" });
  }
  return (
    <>
      <div className="install-status">
        <span aria-live="polite">
          {offline ? "Offline" : ready ? "Ready for offline play" : ""}
        </span>
        <Button size="small" onClick={() => setOpen(true)}>
          {waiting
            ? "Update available"
            : installed
              ? "App settings"
              : "Install app"}
        </Button>
      </div>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {installed ? "Your installed app" : "Install The Learning Table"}
        </DialogTitle>
        <DialogContent>
          {message && <Alert severity="info">{message}</Alert>}
          {!secure ? (
            <p>
              Open this app from an HTTPS website to install it and enable
              offline support. A local HTML file can be played directly;
              installation is unavailable from a file link.
            </p>
          ) : (
            <>
              <p>
                Add The Learning Table to your home screen for a dedicated
                window and quick access.{" "}
                {ready
                  ? "The app is ready for offline play."
                  : "Keep the app open while connected to prepare offline play."}
              </p>
              {!installed &&
                (installEvent ? (
                  <Button variant="contained" onClick={install}>
                    Install on this device
                  </Button>
                ) : ios ? (
                  <p>
                    On iPhone or iPad, open this site in Safari, tap{" "}
                    <b>Share</b>, then <b>Add to Home Screen</b> and <b>Add</b>.
                    If asked, enable <b>Open as Web App</b>.
                  </p>
                ) : (
                  <p>
                    Open your browser menu and choose <b>Install app</b> or{" "}
                    <b>Add to Home screen</b>. On desktop, look for the install
                    icon in the address bar. Installation options depend on your
                    browser.
                  </p>
                ))}
              {waiting && (
                <Alert
                  severity="info"
                  action={
                    <Button disabled={updating} onClick={update}>
                      {updating ? "Updating…" : "Update now"}
                    </Button>
                  }
                >
                  A new version is ready. Updating restarts your current hand;
                  your saved card is kept. Close this dialog to keep playing.
                </Alert>
              )}
            </>
          )}
          <p>
            Imported cards are saved only on this device, in this browser or
            installed app. Nothing is uploaded. If the installed app starts in
            practice mode, import your card once inside it.
          </p>
          <p>
            Keep your original card file as a backup. Clearing website data,
            private browsing, or device storage cleanup can remove saved data. A
            new hand starts when you reopen or reload the app.
          </p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

import { AmbilightEngine, ZONE_NAMES } from "../core/color-engine.sys.mjs";

const NS = "zen-ambilight";
const SETTINGS_PREFIX = "zen-ambilight.";
const DEFAULTS = {
  enabled: true, pageAmbilight: false, sidebarAmbilight: true, tabAmbilight: true,
  newTab: false, privateWindow: false, fullscreen: true, onlyActiveTab: true, debug: false,
  intensity: 0.58, saturation: 1.08, brightness: 1, blur: 42, smoothness: 0.55,
  updateRate: 10, edgeSpread: 1, minimumBrightness: 0.06, maximumBrightness: 0.94,
};

const windows = new WeakMap();

function pref(name, fallback) {
  const key = SETTINGS_PREFIX + name;
  try {
    if (typeof fallback === "boolean") return Services.prefs.getBoolPref(key, fallback);
    if (Number.isInteger(fallback)) return Services.prefs.getIntPref(key, fallback);
    return Services.prefs.getFloatPref(key, fallback);
  } catch { return fallback; }
}

function getSettings() {
  return Object.fromEntries(Object.entries(DEFAULTS).map(([k, v]) => [k, pref(k, v)]));
}

function stateFor(win) {
  let state = windows.get(win);
  if (!state) {
    state = {
      engine: new AmbilightEngine(getSettings()),
      source: null,
      viewport: null,
      busy: false,
      timer: null,
      lastFrame: 0,
      generation: 0,
    };
    windows.set(win, state);
  }
  return state;
}

function clearCSS(win) {
  const root = win?.document?.documentElement;
  if (!root) return;
  root.removeAttribute("zen-ambilight-active");
  root.removeAttribute("zen-ambilight-debug");
  root.removeAttribute("zen-ambilight-tabs");
  root.removeAttribute("zen-ambilight-sidebar");
  root.removeAttribute("zen-ambilight-page");
  for (const zone of ZONE_NAMES) root.style.removeProperty(`--zen-ambilight-${zone}`);
  root.style.removeProperty("--zen-ambilight-blur");
  root.style.removeProperty("--zen-ambilight-edge-spread");
}

function applyCSS(win, state) {
  const root = win?.document?.documentElement;
  if (!root) return;
  root.setAttribute("zen-ambilight-active", "true");
  if (state.engine.settings.sidebarAmbilight) root.setAttribute("zen-ambilight-sidebar", "true");
  else root.removeAttribute("zen-ambilight-sidebar");
  root.toggleAttribute("zen-ambilight-tabs", !!state.engine.settings.tabAmbilight && !!state.engine.settings.sidebarAmbilight);
  if (state.engine.settings.pageAmbilight) root.setAttribute("zen-ambilight-page", "true");
  else root.removeAttribute("zen-ambilight-page");
  if (state.engine.settings.debug) root.setAttribute("zen-ambilight-debug", "true");
  else root.removeAttribute("zen-ambilight-debug");
  const field = state.engine.cssField();
  for (const zone of ZONE_NAMES) root.style.setProperty(`--zen-ambilight-${zone}`, field[zone]);
  root.style.setProperty("--zen-ambilight-blur", `${state.engine.settings.blur}px`);
  root.style.setProperty("--zen-ambilight-edge-spread", String(state.engine.settings.edgeSpread));
}

async function sample(win, state) {
  const freshSettings = getSettings();
  state.engine.setSettings(freshSettings);
  if (!freshSettings.enabled || (!freshSettings.sidebarAmbilight && !freshSettings.pageAmbilight)) {
    stop(win, state);
    return;
  }
  if (state.busy || !state.source || !state.viewport) return;
  const browser = win.gBrowser?.selectedBrowser;
  if (!browser || browser !== state.source.browser) return;
  const wgp = browser.browsingContext?.currentWindowGlobal;
  if (!wgp || !wgp.isCurrentGlobal) return;
  state.busy = true;
  const generation = state.generation;
  try {
    const bitmap = await wgp.drawSnapshot(null, 0.18, "rgb(0 0 0)");
    if (generation !== state.generation || !bitmap) {
      bitmap?.close?.();
      return;
    }
    const canvas = win.document.createElementNS("http://www.w3.org/1999/xhtml", "canvas");
    canvas.width = 192;
    canvas.height = 108;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const vp = state.viewport;
    const r = state.source.rect;
    const sx = Math.max(0, (r.x / Math.max(1, vp.width)) * bitmap.width);
    const sy = Math.max(0, (r.y / Math.max(1, vp.height)) * bitmap.height);
    const sw = Math.min(bitmap.width - sx, (r.width / Math.max(1, vp.width)) * bitmap.width);
    const sh = Math.min(bitmap.height - sy, (r.height / Math.max(1, vp.height)) * bitmap.height);
    if (sw < 2 || sh < 2) {
      bitmap.close?.();
      return;
    }
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    state.engine.sample(data.data, data.width, data.height);
    bitmap.close?.();
    applyCSS(win, state);
  } catch (error) {
    if (state.engine.settings.debug) console.warn(`[${NS}] snapshot failed`, error);
  } finally {
    state.busy = false;
  }
}

function stop(win, state) {
  state.generation++;
  if (state.timer) win.clearInterval(state.timer);
  state.timer = null;
  state.source = null;
  state.viewport = null;
  state.busy = false;
  clearCSS(win);
}

function start(win, source) {
  const state = stateFor(win);
  const settings = getSettings();
  state.engine.setSettings(settings);
  if (!settings.enabled || (!settings.sidebarAmbilight && !settings.pageAmbilight)) {
    stop(win, state);
    return;
  }
  const isPrivate = !!win.PrivateBrowsingUtils?.isWindowPrivate?.(win);
  const isFullscreen = !!win.document?.documentElement?.hasAttribute("inFullscreen");
  if ((isPrivate && !settings.privateWindow) || (isFullscreen && !settings.fullscreen)) {
    stop(win, state);
    return;
  }
  state.source = source;
  state.viewport = source.viewport;
  if (state.timer) win.clearInterval(state.timer);
  const interval = Math.max(50, Math.round(1000 / state.engine.settings.updateRate));
  state.timer = win.setInterval(() => sample(win, state), interval);
  sample(win, state);
}

export function handleContentMessage(win, messageName, data, browser) {
  const state = stateFor(win);
  if (messageName === "source") {
    if (!data || !data.rect || data.rect.width < 2 || data.rect.height < 2) {
      stop(win, state);
      return;
    }
    start(win, { browser, rect: data.rect, viewport: data.viewport });
    return;
  }
  if (messageName === "page") {
    const settings = getSettings();
    if (!settings.enabled || !settings.pageAmbilight || !data?.rect || !data?.viewport) {
      stop(win, state);
      return;
    }
    start(win, { browser, rect: data.rect, viewport: data.viewport, kind: "page" });
    return;
  }
  if (messageName === "clear") stop(win, state);
}

export function shutdownWindow(win) {
  const state = windows.get(win);
  if (state) stop(win, state);
  windows.delete(win);
}

export { getSettings };

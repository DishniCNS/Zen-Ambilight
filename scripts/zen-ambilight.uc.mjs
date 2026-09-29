import { shutdownWindow } from "chrome://zen-ambilight/content/actors/ZenAmbilightParent.sys.mjs";

const win = window;
const TAB_EVENT = "TabSelect";

const clearWhenNotEligible = () => {
  try {
    shutdownWindow(win);
  } catch {}
};

const onTabSelect = () => clearWhenNotEligible();
win.gBrowser?.tabContainer?.addEventListener(TAB_EVENT, onTabSelect, true);

const progressListener = {
  onLocationChange() {
    clearWhenNotEligible();
  },
  onStateChange() {},
  onProgressChange() {},
  onStatusChange() {},
  onSecurityChange() {},
  onContentBlockingEvent() {},
};

try {
  win.gBrowser?.addProgressListener?.(progressListener, Ci.nsIWebProgressListener.LOCATION_CHANGE);
} catch {}

const cleanup = () => {
  try {
    win.gBrowser?.tabContainer?.removeEventListener(TAB_EVENT, onTabSelect, true);
  } catch {}
  try {
    win.gBrowser?.removeProgressListener?.(progressListener);
  } catch {}
  try {
    shutdownWindow(win);
  } catch {}
};

if (typeof win.addUnloadListener === "function") {
  win.addUnloadListener(cleanup);
} else {
  win.addEventListener("unload", cleanup, { once: true });
}

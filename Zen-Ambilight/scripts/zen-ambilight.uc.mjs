import { registerActor, unregisterActor } from "chrome://zen-ambilight/content/actors/ZenAmbilightActorRegistration.sys.mjs";
import { shutdownWindow } from "chrome://zen-ambilight/content/actors/ZenAmbilightParent.sys.mjs";

const KEY = "__zenAmbilightLifecycle_v1";
const shared = Services.appShell.hiddenDOMWindow;
let lifecycle = shared[KEY];
if (!lifecycle) {
  lifecycle = { refs: 0, registered: false };
  shared[KEY] = lifecycle;
}

if (!lifecycle.registered) lifecycle.registered = registerActor();
lifecycle.refs++;

const win = window;
const onUnload = () => {
  try { shutdownWindow(win); } catch {}
  lifecycle.refs = Math.max(0, lifecycle.refs - 1);
  if (lifecycle.refs === 0 && lifecycle.registered) {
    unregisterActor();
    lifecycle.registered = false;
  }
};

if (typeof window.addUnloadListener === "function") {
  window.addUnloadListener(onUnload);
} else {
  window.addEventListener("unload", onUnload, { once: true });
}

const selectedBrowser = () => win.gBrowser?.selectedBrowser ?? null;

function clearWhenNotEligible() {
  try { shutdownWindow(win); } catch {}
}


// The actor itself is responsible for content discovery. This listener only nudges the
// selected browser when Zen changes tabs or navigates through its browser-chrome lifecycle.
win.gBrowser?.tabContainer?.addEventListener("TabSelect", clearWhenNotEligible, true);
win.gBrowser?.addProgressListener?.({
  onLocationChange() { clearWhenNotEligible(); },
  onStateChange() {},
  onProgressChange() {},
  onStatusChange() {},
  onSecurityChange() {},
  onContentBlockingEvent() {},
}, Ci.nsIWebProgressListener.LOCATION_CHANGE);

win.addEventListener("unload", () => {
  try { win.gBrowser?.tabContainer?.removeEventListener("TabSelect", clearWhenNotEligible, true); } catch {}
  try { shutdownWindow(win); } catch {}
}, { once: true });

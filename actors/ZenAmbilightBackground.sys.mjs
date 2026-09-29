import { registerActor, unregisterActor } from "./ZenAmbilightActorRegistration.sys.mjs";

// Sine loads .sys.mjs modules once in the privileged browser process. Registering the
// Window Actor here guarantees that content actors exist before browser tabs start
// navigating. The browser-window .uc.mjs is responsible only for chrome rendering.
registerActor();

const unload = () => {
  try {
    unregisterActor();
  } catch (error) {
    console.warn("[Zen Ambilight] background unload failed:", error);
  }
};

try {
  const manager = Services.wm.getMostRecentWindow("navigator:browser");
  if (manager && typeof manager.addUnloadListener === "function") {
    manager.addUnloadListener(unload);
  }
} catch {}

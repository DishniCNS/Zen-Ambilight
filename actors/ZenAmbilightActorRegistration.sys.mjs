const ACTOR = "ZenAmbilight";
const ROOT = "chrome://zen-ambilight/content/actors/";
let registered = false;

export function registerActor() {
  if (registered) return true;
  try {
    ChromeUtils.registerWindowActor(ACTOR, {
      parent: { esModuleURI: `${ROOT}ZenAmbilightActorParent.sys.mjs` },
      child: { esModuleURI: `${ROOT}ZenAmbilightActorChild.sys.mjs` },
      allFrames: false,
      safeForUntrustedWebProcess: true,
      matches: ["http://*/*", "https://*/*"],
    });
    registered = true;
    return true;
  } catch (error) {
    const message = String(error);
    if (message.includes("already registered") || message.includes("NS_ERROR_XPC_GS_RETURNED_FAILURE")) {
      registered = true;
      return true;
    }
    console.error("[Zen Ambilight] Window Actor registration failed:", error);
    return false;
  }
}

export function unregisterActor() {
  if (!registered) return;
  try {
    ChromeUtils.unregisterWindowActor(ACTOR);
  } catch (error) {
    console.warn("[Zen Ambilight] Window Actor unregister failed:", error);
  } finally {
    registered = false;
  }
}

registerActor();

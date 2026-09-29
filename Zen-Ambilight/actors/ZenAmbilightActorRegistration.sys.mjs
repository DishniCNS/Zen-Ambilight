const ACTOR = "ZenAmbilight";
const ROOT = "chrome://zen-ambilight/content/actors/";

export function registerActor() {
  try {
    ChromeUtils.registerWindowActor(ACTOR, {
      parent: { esModuleURI: `${ROOT}ZenAmbilightActorParent.sys.mjs` },
      child: { esModuleURI: `${ROOT}ZenAmbilightActorChild.sys.mjs` },
      allFrames: false,
      safeForUntrustedWebProcess: true,
      matches: ["http://*/*", "https://*/*"],
    });
    return true;
  } catch (error) {
    if (String(error).includes("already registered") || String(error).includes("NS_ERROR_XPC_GS_RETURNED_FAILURE")) return false;
    console.warn("[Zen Ambilight] Window Actor registration failed:", error);
    return false;
  }
}

export function unregisterActor() {
  try { ChromeUtils.unregisterWindowActor(ACTOR); } catch {}
}

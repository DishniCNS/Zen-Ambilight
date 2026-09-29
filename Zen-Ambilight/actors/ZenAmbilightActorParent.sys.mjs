import { JSWindowActorParent } from "resource://gre/modules/ActorParent.sys.mjs";
import { handleContentMessage } from "./ZenAmbilightParent.sys.mjs";

export class ZenAmbilightActorParent extends JSWindowActorParent {
  receiveMessage(message) {
    const browser = this.browsingContext?.embedderElement;
    const win = browser?.ownerGlobal;
    if (!win || !browser) return;
    const settings = (() => {
      try { return Services.prefs.getBoolPref("zen-ambilight.onlyActiveTab", true); } catch { return true; }
    })();
    if (settings && win.gBrowser?.selectedBrowser !== browser) return;
    handleContentMessage(win, message.name, message.data, browser);
  }

  didDestroy() {
    const browser = this.browsingContext?.embedderElement;
    const win = browser?.ownerGlobal;
    if (!win) return;
    try {
      handleContentMessage(win, "clear", null, browser);
    } catch {}
  }
}

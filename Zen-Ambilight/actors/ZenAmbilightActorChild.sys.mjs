import { JSWindowActorChild } from "resource://gre/modules/ActorChild.sys.mjs";

const VIDEO_SELECTOR = "video";

function visibleScore(video, viewportWidth, viewportHeight) {
  if (!video || video.localName !== "video") return -1;
  const rect = video.getBoundingClientRect();
  if (rect.width < 32 || rect.height < 32) return -1;
  const vw = Math.max(1, viewportWidth), vh = Math.max(1, viewportHeight);
  const visibleW = Math.max(0, Math.min(rect.right, vw) - Math.max(rect.left, 0));
  const visibleH = Math.max(0, Math.min(rect.bottom, vh) - Math.max(rect.top, 0));
  const visibleArea = visibleW * visibleH;
  if (visibleArea < 1024) return -1;
  const playingBonus = !video.paused && !video.ended ? 2 : 0;
  const audibleBonus = !video.muted ? 0.25 : 0;
  return visibleArea * (1 + playingBonus + audibleBonus);
}

export class ZenAmbilightActorChild extends JSWindowActorChild {
  #timer = null;
  #video = null;
  #listeners = [];

  actorCreated() {
    this.#scan();
    this.#timer = this.contentWindow.setInterval(() => this.#scan(), 1000);
    this.contentWindow.addEventListener("pagehide", this.#onPageHide, true);
    this.contentWindow.addEventListener("pageshow", this.#scan, true);
  }

  #onPageHide = () => this.sendAsyncMessage("clear");

  #detach() {
    if (!this.#video) return;
    for (const [event, handler] of this.#listeners) this.#video.removeEventListener(event, handler);
    this.#listeners = [];
    this.#video = null;
  }

  #attach(video) {
    if (video === this.#video) return;
    this.#detach();
    this.#video = video;
    const notify = () => this.#report();
    for (const event of ["play", "pause", "ended", "emptied", "loadedmetadata", "resize"]) {
      video.addEventListener(event, notify, { passive: true });
      this.#listeners.push([event, notify]);
    }
    this.#report();
  }

  #scan = () => {
    const doc = this.contentWindow?.document;
    if (!doc) return;
    const width = this.contentWindow.innerWidth;
    const height = this.contentWindow.innerHeight;
    let best = null;
    let bestScore = -1;
    for (const video of doc.querySelectorAll(VIDEO_SELECTOR)) {
      const score = visibleScore(video, width, height);
      if (score > bestScore) { bestScore = score; best = video; }
    }
    if (best) {
      this.#attach(best);
      this.#report();
    } else {
      this.#detach();
      this.sendAsyncMessage("page", {
        rect: { x: 0, y: 0, width, height },
        viewport: { width, height },
        url: this.contentWindow.location.href,
      });
    }
  };

  #report = () => {
    const video = this.#video;
    if (!video || video.readyState < 2) return;
    const rect = video.getBoundingClientRect();
    const viewport = {
      width: this.contentWindow.innerWidth,
      height: this.contentWindow.innerHeight,
    };
    if (rect.width < 2 || rect.height < 2) return;
    this.sendAsyncMessage("source", {
      rect: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
      viewport,
      playing: !video.paused && !video.ended,
      url: this.contentWindow.location.href,
    });
  };

  didDestroy() {
    if (this.#timer) this.contentWindow?.clearInterval(this.#timer);
    this.#timer = null;
    this.#detach();
    try { this.contentWindow?.removeEventListener("pagehide", this.#onPageHide, true); } catch {}
    try { this.contentWindow?.removeEventListener("pageshow", this.#scan, true); } catch {}
  }
}

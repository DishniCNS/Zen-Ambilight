# Audit

## Verified

- Sine supports `chromeManifest` and registers it through the component registrar.
- Sine loads `.sys.mjs` background modules and `.uc.js`/`.uc.mjs` chrome scripts from a mod's `scripts` tree.
- Firefox exposes `ChromeUtils.registerWindowActor()` and `unregisterWindowActor()` to privileged parent code.
- Firefox exposes `WindowGlobalParent.drawSnapshot()` in the parent process and returns `Promise<ImageBitmap>`.
- Zen's vertical-tabs implementation contains `#navigator-toolbox`, `#tabbrowser-tabs`, `#zen-tabs-wrapper`, `#zen-sidebar-top-buttons`, `#zen-sidebar-foot-buttons`, and state attributes such as `zen-sidebar-expanded` and `zen-right-side`.

## Inferred

- Snapshotting the active tab at a deliberately low update rate is a more robust pixel source than drawing a cross-origin YouTube video into a content canvas.
- Zen's current selectors can be isolated behind a small compatibility layer.

## Not tested in this environment

- Live Zen + Sine runtime.
- Visual output on the user's current Zen build.
- CPU/GPU cost of `drawSnapshot()` on a real machine.
- Sine disable/re-enable/uninstall lifecycle in a live browser.
- Private-window behavior.

## Known architectural tradeoff

The current implementation uses a low-rate parent-process `drawSnapshot()` of the active content viewport and crops the selected video rectangle when a video is available. This deliberately avoids cross-origin canvas reads. The snapshot is reduced to a small 192x108 analysis surface before pixel sampling.

The page renderer is implemented but disabled by default.


### 1.1.0 corrective audit

The first package had two concrete implementation problems: browser-window actor registration was coupled to the per-window script lifecycle, and the renderer was painting a pseudo-element behind Zen's toolbox rather than the background layer Zen actually uses. The corrected package registers the Window Actor from the Sine background module and drives the native Zen background pipeline through `#zen-toolbar-background` / `--zen-main-browser-background-toolbar` and exposes the same gradient through `--zen-navigator-toolbox-background`. The smoothing engine is also advanced after each captured frame.

Current Zen source was checked against the public repository. Zen Release is currently based on Firefox 156.0.1, according to the repository README. The relevant current source defines `#navigator-toolbox` with `background: var(--zen-navigator-toolbox-background, transparent) !important`, and the vertical sidebar contains `#zen-tabs-wrapper` plus `#zen-sidebar-foot-buttons`.

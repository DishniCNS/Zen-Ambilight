# Zen Ambilight

Standalone Sine mod for Zen Browser. It samples the rendered content of the active tab from the privileged browser process, derives a multi-zone ambient field, and projects that field into Zen's browser chrome.

It does not depend on ZenDara or youtube-ambilight.

## Status

Production-oriented implementation, but runtime validation on a live Zen/Sine installation is still required. See `docs/TEST-MATRIX.md` and `docs/AUDIT.md`.

## Installation

Install the repository through Sine using the repository URL. For manual testing, place this directory in the Sine mods directory as `zen-ambilight` and reload Sine.

A browser restart may be required after the first installation because Window Actor registration is process-global.

## Settings

Settings are exposed through Sine's mod preferences:
- Enable
- Intensity
- Saturation
- Brightness
- Blur
- Smoothness
- Update Rate
- Edge Spread
- Minimum Brightness
- Maximum Brightness
- Page Ambilight
- Sidebar Ambilight
- Tab Ambilight
- New Tab
- Private Window
- Fullscreen
- Only Active Tab
- Debug Mode

## Architecture

`core/` contains the rendering-independent sampling and color engine.
`actors/` contains the Firefox JSWindowActor bridge.
`scripts/` contains the Zen chrome adapter and lifecycle manager.
`styles/` contains only namespaced browser-chrome CSS.

The engine samples rendered pixels rather than reading cross-origin video pixels directly.


## 1.1.0 fixes

- Window Actor registration now happens from the Sine background module, before content actors are needed.
- Browser-window lifecycle no longer depends on a per-window actor registration race.
- The sidebar renderer feeds Zen's native chrome background pipeline: `#zen-toolbar-background` consumes `--zen-main-browser-background-toolbar`, while `#navigator-toolbox` consumes `--zen-navigator-toolbox-background`. No ambient-light overlay layer is injected into the toolbox.
- Zen's native `#zen-toolbar-background` is also integrated.
- Temporal smoothing is now actually advanced on every rendered frame.
- Progress listeners are removed cleanly when the browser window unloads.

This version is still not runtime-tested inside the user's exact Zen build in this environment.

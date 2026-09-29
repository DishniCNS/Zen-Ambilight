export const ZONE_NAMES = [
  "top-left", "top", "top-right",
  "left", "right",
  "bottom-left", "bottom", "bottom-right",
];

const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h /= 6;
    if (h < 0) h += 1;
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const hue = (n) => (n + h * 12) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(hue(n) - 3, Math.min(9 - hue(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

function luminance(r, g, b) {
  const c = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function adjustColor([r, g, b], settings) {
  let [h, s, l] = rgbToHsl(r, g, b);
  s = clamp(s * settings.saturation);
  l = clamp(l * settings.brightness);
  const minL = clamp(settings.minimumBrightness);
  const maxL = clamp(settings.maximumBrightness);
  l = minL + (maxL - minL) * l;
  return hslToRgb(h, s, l).map(Math.round);
}

function sampleZone(data, width, height, x0, y0, x1, y1) {
  const sx = Math.max(1, Math.floor((x1 - x0) * width));
  const sy = Math.max(1, Math.floor((y1 - y0) * height));
  const startX = Math.floor(x0 * width);
  const startY = Math.floor(y0 * height);
  const stepX = Math.max(1, Math.floor(sx / 12));
  const stepY = Math.max(1, Math.floor(sy / 8));
  const pixels = [];
  let sumR = 0, sumG = 0, sumB = 0, count = 0;
  for (let y = startY; y < startY + sy && y < height; y += stepY) {
    for (let x = startX; x < startX + sx && x < width; x += stepX) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3] / 255;
      if (a < 0.05) continue;
      const l = luminance(r, g, b);
      pixels.push([r, g, b, l]);
      sumR += r; sumG += g; sumB += b; count++;
    }
  }
  if (!count) return [0, 0, 0];
  pixels.sort((a, b) => a[3] - b[3]);
  const trim = Math.floor(pixels.length * 0.08);
  const selected = pixels.slice(trim, Math.max(trim + 1, pixels.length - trim));
  let r = 0, g = 0, b = 0;
  for (const p of selected) { r += p[0]; g += p[1]; b += p[2]; }
  const n = selected.length || count;
  return [r / n, g / n, b / n];
}

export class AmbilightEngine {
  constructor(settings = {}) {
    this.settings = { ...AmbilightEngine.defaults, ...settings };
    this.target = Object.fromEntries(ZONE_NAMES.map(z => [z, [0, 0, 0]]));
    this.rendered = Object.fromEntries(ZONE_NAMES.map(z => [z, [0, 0, 0]]));
  }

  setSettings(settings) {
    this.settings = { ...this.settings, ...settings };
  }

  sample(imageData, width, height) {
    if (!imageData?.length || width < 2 || height < 2) return this.target;
    const boxes = {
      "top-left": [0, 0, 0.34, 0.28],
      "top": [0.22, 0, 0.78, 0.22],
      "top-right": [0.66, 0, 1, 0.28],
      "left": [0, 0.22, 0.20, 0.78],
      "right": [0.80, 0.22, 1, 0.78],
      "bottom-left": [0, 0.72, 0.34, 1],
      "bottom": [0.22, 0.78, 0.78, 1],
      "bottom-right": [0.66, 0.72, 1, 1],
    };
    for (const zone of ZONE_NAMES) {
      this.target[zone] = adjustColor(sampleZone(imageData, width, height, ...boxes[zone]), this.settings);
    }
    return this.target;
  }

  tick(dtMs) {
    const alphaBase = 1 - Math.exp(-Math.max(1, dtMs) / Math.max(1, this.settings.smoothness * 100));
    const alpha = clamp(alphaBase, 0.02, 1);
    for (const zone of ZONE_NAMES) {
      const from = this.rendered[zone];
      const to = this.target[zone];
      this.rendered[zone] = from.map((v, i) => Math.round(v + (to[i] - v) * alpha));
    }
    return this.rendered;
  }

  cssField() {
    const out = {};
    for (const zone of ZONE_NAMES) {
      const [r, g, b] = this.rendered[zone];
      out[zone] = `rgb(${r} ${g} ${b} / ${this.settings.intensity})`;
    }
    return out;
  }
}

AmbilightEngine.defaults = {
  intensity: 0.58,
  saturation: 1.08,
  brightness: 1.0,
  blur: 42,
  smoothness: 0.55,
  updateRate: 10,
  edgeSpread: 1.0,
  minimumBrightness: 0.06,
  maximumBrightness: 0.94,
};

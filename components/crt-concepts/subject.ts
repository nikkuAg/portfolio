// Shared by the "you, drawn in a medium you can break" concepts: what the
// picture is of. It's the portrait at /portrait.jpg when one has been added,
// otherwise the name set in the display face.

export function identFont() {
  const host = document.querySelector("[data-tv-fonts]") ?? document.documentElement;
  return getComputedStyle(host).getPropertyValue("--font-ident").trim() || "sans-serif";
}

export function sigFont() {
  return getComputedStyle(document.documentElement).getPropertyValue("--font-signature").trim() || "cursive";
}

let portrait: Promise<HTMLImageElement | null> | null = null;

export function loadPortrait() {
  if (!portrait) {
    portrait = new Promise((res) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = "/portrait.jpg";
    });
  }
  return portrait;
}

/** Fonts plus portrait, so a canvas can draw its subject once both are in. */
export function ready() {
  return Promise.all([document.fonts.ready, loadPortrait()]).then(([, img]) => img);
}

/**
 * Paint the subject into a w×h context as ink: white on black, where white
 * means "more ink". A portrait is cover-fitted around the face and inverted
 * so dark features carry the ink; the name is set to fill the box.
 */
export function paintSubject(o: CanvasRenderingContext2D, w: number, h: number, img: HTMLImageElement | null, opts: { lines?: 1 | 2; initials?: boolean } = {}) {
  o.fillStyle = "#000";
  o.fillRect(0, 0, w, h);
  if (img && !opts.initials) {
    // the face sits in the upper-middle of a selfie: crop to it
    const crop = Math.min(img.width, img.height * 0.62);
    const sx = (img.width - crop) / 2;
    const sy = img.height * 0.16;
    const k = Math.min(w, h) / crop;
    const dw = crop * k;
    o.save();
    o.filter = "grayscale(1) contrast(1.35) invert(1)";
    o.drawImage(img, sx, sy, crop, crop, (w - dw) / 2, (h - dw) / 2, dw, dw);
    o.restore();
    return;
  }
  o.fillStyle = "#fff";
  o.fontStretch = "expanded";
  o.textAlign = "center";
  o.textBaseline = "middle";
  if (opts.initials) {
    const fs = Math.min(w * 0.62, h * 0.9);
    o.font = `800 ${fs}px ${identFont()}`;
    o.fillText("DA", w / 2, h / 2 + fs * 0.04);
    return;
  }
  if (opts.lines === 1) {
    const fs = Math.min(w * 0.13, h * 0.6);
    o.font = `800 ${fs}px ${identFont()}`;
    o.fillText("Divyansh", w / 2, h / 2);
    return;
  }
  const fs = Math.min(w * 0.19, h * 0.36);
  o.font = `800 ${fs}px ${identFont()}`;
  o.fillText("Divyansh", w / 2, h / 2 - fs * 0.5);
  o.fillText("Agarwal", w / 2, h / 2 + fs * 0.5);
}

/** The ink amount (0..1) of a painted subject, sampled on a grid. */
export function inkGrid(w: number, h: number, img: HTMLImageElement | null, opts: { lines?: 1 | 2; initials?: boolean } = {}) {
  const c = document.createElement("canvas");
  c.width = Math.max(2, Math.round(w));
  c.height = Math.max(2, Math.round(h));
  const o = c.getContext("2d", { willReadFrequently: true })!;
  paintSubject(o, c.width, c.height, img, opts);
  const d = o.getImageData(0, 0, c.width, c.height).data;
  const g = new Float32Array(c.width * c.height);
  for (let i = 0; i < g.length; i++) g[i] = d[i * 4] / 255;
  return { g, w: c.width, h: c.height, canvas: c };
}

/** The right-hand stage box beside the copy (or the lower half on phones). */
export function stageBox(w: number, h: number) {
  return w < 768 ? { x: 12, y: h * 0.4, w: w - 24, h: h * 0.42 } : { x: w * 0.42, y: h * 0.12, w: w * 0.54, h: h * 0.76 };
}

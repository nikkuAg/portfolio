// Renders the "entry screen" overlay on top of the snake game canvas:
// big typewritten name + smaller typewritten tagline + a blinking hint.
// Snake plays in auto-pilot underneath; this overlay fades out on dismiss.

export const HERO_NAME = "DIVYANSH AGARWAL";
export const HERO_TAGLINE = "Interfaces, services, and the wires between them.";
// hint text varies by input affordance — desktop has the bezel knob, mobile
// has the on-screen MobileGamepad below the CRT
export const HERO_HINT_DESKTOP = "▸  TURN  KNOB  TO  PLAY";
export const HERO_HINT_MOBILE = "▸  TAP  D-PAD  TO  PLAY";

const PHOSPHOR = "200,255,61"; // matches CRT accent

export function renderHeroOverlay(
  ctx: CanvasRenderingContext2D,
  opacity: number,
  typeProgress: number, // 0..1 over TYPE_DURATION
  w: number,
  h: number,
  time: number,
  hint: string = HERO_HINT_DESKTOP,
) {
  if (opacity <= 0.005) return;

  // fully cover the snake beneath while the overlay is up — only when the
  // overlay starts fading does the game become visible. Same green/black
  // palette as the game so the screen identity stays consistent.
  ctx.fillStyle = `rgba(3,22,8,${opacity})`;
  ctx.fillRect(0, 0, w, h);

  // typewriter phases — name first, then a short pause, then tagline
  const namePhase = Math.min(typeProgress / 0.4, 1);
  const taglinePhase = Math.max(0, Math.min((typeProgress - 0.5) / 0.5, 1));

  const nameVisible = HERO_NAME.slice(
    0,
    Math.floor(namePhase * HERO_NAME.length),
  );
  const taglineVisible = HERO_TAGLINE.slice(
    0,
    Math.floor(taglinePhase * HERO_TAGLINE.length),
  );

  const blink = Math.floor(time * 2) % 2 === 0 ? "▌" : " ";

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // name (large, bright)
  ctx.fillStyle = `rgba(${PHOSPHOR},${opacity})`;
  ctx.font = "700 56px monospace";
  let nameText = nameVisible;
  if (namePhase < 1) nameText += blink;
  ctx.fillText(nameText, w / 2, h * 0.45);

  // separator rule
  if (namePhase >= 1 && opacity > 0.1) {
    ctx.fillStyle = `rgba(${PHOSPHOR},${opacity * 0.4})`;
    ctx.fillRect(w * 0.32, h * 0.5, w * 0.36, 1);
  }

  // tagline (smaller, dimmer phosphor)
  if (taglinePhase > 0) {
    ctx.fillStyle = `rgba(${PHOSPHOR},${opacity * 0.78})`;
    ctx.font = "400 22px monospace";
    let taglineText = taglineVisible;
    if (taglinePhase < 1 && namePhase >= 1) taglineText += blink;
    ctx.fillText(taglineText, w / 2, h * 0.6);
  }

  // hint at bottom — only after typewriter completes, gentle pulse
  if (typeProgress >= 1) {
    const hintAlpha = opacity * (0.45 + Math.sin(time * 2.5) * 0.25);
    ctx.fillStyle = `rgba(${PHOSPHOR},${Math.max(0, hintAlpha)})`;
    ctx.font = "500 13px monospace";
    ctx.fillText(hint, w / 2, h * 0.86);
  }
}

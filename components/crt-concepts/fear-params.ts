// Live knobs the HTML copy turns and the canvases read every frame.
export const fearParams = { k: 0.6 };

// E · Signature: how many rotating circles draw the signature
export const sigParams = { k: 6, max: 700, touched: false };

// F · Terrain: the numbers in the code card, read by the shader each frame
export const terrainParams = { lift: 0.6, bands: 14, warp: 1.2, flow: 0.06 };

// J · Ecosystem: the canvas registers this so the copy's button can call it
export const ecoControl = { addPredator: null as null | (() => void) };

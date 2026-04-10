// =============================================================================
// Image Metadata Resolution — object-fit/object-position geometry
// =============================================================================
// Computes sourceRect (crop in image-pixel coordinates) and destRect
// (placement within the container) for CSS object-fit rendering.

import type { ImageResolved } from './types.js';

type ParsedPos = { fraction: number } | { px: number };

function parsePosSingle(s: string): ParsedPos {
  const t = s.trim().toLowerCase();
  if (t === 'left' || t === 'top') return { fraction: 0 };
  if (t === 'center') return { fraction: 0.5 };
  if (t === 'right' || t === 'bottom') return { fraction: 1 };
  if (t.endsWith('%')) return { fraction: parseFloat(t) / 100 };
  return { px: parseFloat(t) || 0 };
}

function applyPos(pos: ParsedPos, slack: number): number {
  return 'fraction' in pos ? pos.fraction * slack : pos.px;
}

function posToFraction(pos: ParsedPos, slack: number): number {
  if ('fraction' in pos) return pos.fraction;
  if (Math.abs(slack) < 0.001) return 0.5;
  return Math.max(0, Math.min(1, pos.px / slack));
}

/**
 * Compute resolved image metadata for an `<img>` element within a container.
 * Handles cover, contain, none, scale-down, and fill object-fit modes.
 * Returns null if the image has no natural dimensions or the container is
 * degenerate (zero width/height).
 */
export function computeImageResolved(
  img: HTMLImageElement,
  resolved: { x: number; y: number; w: number; h: number },
): ImageResolved | null {
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  const cw = resolved.w;
  const ch = resolved.h;
  if (!nw || !nh || cw <= 0 || ch <= 0) return null;

  const computed = getComputedStyle(img);
  let objectFit = computed.objectFit || 'fill';

  const opStr = computed.objectPosition || '50% 50%';
  const opParts = opStr.trim().split(/\s+/);
  const posX = opParts.length >= 1 ? parsePosSingle(opParts[0]) : { fraction: 0.5 } as ParsedPos;
  const posY = opParts.length >= 2 ? parsePosSingle(opParts[1]) : { fraction: 0.5 } as ParsedPos;

  if (objectFit === 'scale-down') {
    objectFit = (nw <= cw && nh <= ch) ? 'none' : 'contain';
  }

  let sourceRect: { x: number; y: number; w: number; h: number };
  let destRect: { x: number; y: number; w: number; h: number };
  let slackX = 0, slackY = 0;

  if (objectFit === 'cover') {
    const scale = Math.max(cw / nw, ch / nh);
    const objW = nw * scale, objH = nh * scale;
    slackX = cw - objW; slackY = ch - objH;
    const offX = applyPos(posX, slackX), offY = applyPos(posY, slackY);
    let sx = -offX / scale, sy = -offY / scale;
    let sw = cw / scale, sh = ch / scale;
    sx = Math.max(0, Math.min(nw - sw, sx));
    sy = Math.max(0, Math.min(nh - sh, sy));
    sw = Math.min(sw, nw - sx); sh = Math.min(sh, nh - sy);
    sourceRect = { x: sx, y: sy, w: sw, h: sh };
    destRect = { x: 0, y: 0, w: cw, h: ch };
  } else if (objectFit === 'contain') {
    const scale = Math.min(cw / nw, ch / nh);
    const objW = nw * scale, objH = nh * scale;
    slackX = cw - objW; slackY = ch - objH;
    const offX = applyPos(posX, slackX), offY = applyPos(posY, slackY);
    sourceRect = { x: 0, y: 0, w: nw, h: nh };
    destRect = { x: offX, y: offY, w: objW, h: objH };
  } else if (objectFit === 'none') {
    slackX = cw - nw; slackY = ch - nh;
    const offX = applyPos(posX, slackX), offY = applyPos(posY, slackY);
    const visX = Math.max(0, -offX), visY = Math.max(0, -offY);
    const visW = Math.min(nw - visX, cw - Math.max(0, offX));
    const visH = Math.min(nh - visY, ch - Math.max(0, offY));
    if (visW <= 0 || visH <= 0) return null;
    sourceRect = { x: visX, y: visY, w: visW, h: visH };
    destRect = { x: Math.max(0, offX), y: Math.max(0, offY), w: visW, h: visH };
  } else {
    sourceRect = { x: 0, y: 0, w: nw, h: nh };
    destRect = { x: 0, y: 0, w: cw, h: ch };
  }

  return {
    src: img.getAttribute('src') || img.src,
    naturalWidth: nw, naturalHeight: nh,
    objectFit,
    objectPosition: [posToFraction(posX, slackX), posToFraction(posY, slackY)],
    sourceRect, destRect,
  };
}

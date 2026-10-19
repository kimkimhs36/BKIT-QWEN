import type { InkPoint, InkStroke, AnnotationLayer } from './paperModel';
export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
export function inkPoint(
  e: Pick<PointerEvent, 'pressure' | 'tiltX' | 'tiltY' | 'timeStamp' | 'pointerType'>,
  x: number,
  y: number,
): InkPoint {
  return {
    x,
    y,
    pressure:
      e.pointerType === 'pen' && Number.isFinite(e.pressure) && e.pressure > 0
        ? clamp(e.pressure, 0.05, 1)
        : 0.5,
    tiltX: Number.isFinite(e.tiltX) ? clamp(e.tiltX, -90, 90) : 0,
    tiltY: Number.isFinite(e.tiltY) ? clamp(e.tiltY, -90, 90) : 0,
    time: e.timeStamp,
  };
}
export function acceptsInk(type: string, penOnly: boolean) {
  return type === 'pen' || type === 'mouse' || (!penOnly && type === 'touch');
}
export function pageToView(x: number, y: number, w: number, h: number, rotation: number) {
  switch (rotation) {
    case 90:
      return { x: h - y, y: x };
    case 180:
      return { x: w - x, y: h - y };
    case 270:
      return { x: y, y: w - x };
    default:
      return { x, y };
  }
}
export function viewToPage(x: number, y: number, w: number, h: number, rotation: number) {
  switch (rotation) {
    case 90:
      return { x: y, y: h - x };
    case 180:
      return { x: w - x, y: h - y };
    case 270:
      return { x: w - y, y: x };
    default:
      return { x, y };
  }
}
export function insidePolygon(p: { x: number; y: number }, polygon: { x: number; y: number }[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
      inside = !inside;
  }
  return inside;
}
export function strokeHit(s: InkStroke, p: { x: number; y: number }, radius: number) {
  const pts = shapePoints(s);
  return pts.some((a, i) => {
    const b = pts[Math.max(0, i - 1)],
      dx = a.x - b.x,
      dy = a.y - b.y,
      t = clamp(((p.x - b.x) * dx + (p.y - b.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    return Math.hypot(p.x - b.x - t * dx, p.y - b.y - t * dy) <= radius + s.width / 2;
  });
}
export function shapePoints(s: InkStroke): InkPoint[] {
  const a = s.points[0],
    b = s.points.at(-1)!;
  if (s.tool === 'line') return [a, b];
  if (s.tool === 'rectangle') return [a, { ...a, x: b.x }, b, { ...b, x: a.x }, a];
  if (s.tool === 'ellipse') {
    const cx = (a.x + b.x) / 2,
      cy = (a.y + b.y) / 2;
    return Array.from({ length: 65 }, (_, i) => ({
      ...a,
      x: cx + (Math.abs(b.x - a.x) / 2) * Math.cos((i * Math.PI) / 32),
      y: cy + (Math.abs(b.y - a.y) / 2) * Math.sin((i * Math.PI) / 32),
    }));
  }
  return s.points;
}
export function drawInk(ctx: CanvasRenderingContext2D, s: InkStroke, selected = false) {
  const pts = shapePoints(s);
  if (!pts.length) return;
  ctx.save();
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = s.tool === 'highlighter' ? 0.28 : 1;
  const width = (p: InkPoint) =>
    s.tool === 'fountain'
      ? s.width * (0.35 + 1.3 * p.pressure) * (1 + Math.abs(p.tiltX) / 360)
      : s.width;
  if (selected) {
    ctx.shadowColor = '#c67442';
    ctx.shadowBlur = 4;
  }
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, width(pts[0]) / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Midpoint quadratic smoothing stays within the raw path and never modifies saved samples.
  if (s.tool === 'highlighter' || ['line', 'rectangle', 'ellipse'].includes(s.tool)) {
    ctx.lineWidth = s.width;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  } else
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1],
        b = pts[i],
        prev = pts[Math.max(0, i - 2)];
      ctx.lineWidth = (width(a) + width(b)) / 2;
      ctx.beginPath();
      ctx.moveTo(i === 1 ? a.x : (prev.x + a.x) / 2, i === 1 ? a.y : (prev.y + a.y) / 2);
      ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
      ctx.stroke();
      if (i === pts.length - 1) {
        ctx.beginPath();
        ctx.moveTo((a.x + b.x) / 2, (a.y + b.y) / 2);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  ctx.restore();
}

/** The most recently edited working attempt is visible; older attempt layers remain preserved. */
export function currentInkLayers(layers: AnnotationLayer[]) {
  const latest = new Map<string, string | undefined>();
  for (const l of layers) if (l.problemId) latest.set(l.problemId, l.attemptKey);
  return layers.filter((l) => !l.problemId || l.attemptKey === latest.get(l.problemId));
}

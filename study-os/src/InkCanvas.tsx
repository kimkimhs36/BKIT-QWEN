import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { uid } from './model';
import type {
  AnnotationLayer,
  DocumentPage,
  InkStroke,
  InkPoint,
  ProblemRegion,
} from './paperModel';
import {
  acceptsInk,
  drawInk,
  inkPoint,
  insidePolygon,
  strokeHit,
  viewToPage,
  clamp,
} from './paperInk';
export type InkTool = InkStroke['tool'] | 'eraser' | 'lasso' | 'region' | 'pan';
export function InkCanvas({
  page,
  scale,
  viewRef,
  layers,
  activeLayer,
  tool,
  color,
  width,
  penOnly,
  hidden,
  onStrokes,
  onRegion,
  onGesture,
}: {
  page: DocumentPage;
  scale: number;
  viewRef: RefObject<HTMLDivElement | null>;
  layers: AnnotationLayer[];
  activeLayer: AnnotationLayer;
  tool: InkTool;
  color: string;
  width: number;
  penOnly: boolean;
  hidden: boolean;
  onStrokes: (strokes: InkStroke[], record?: boolean) => void;
  onRegion: (r: Omit<ProblemRegion, 'id' | 'problemId' | 'pageId'>) => void;
  onGesture: (dx: number, dy: number, ratio: number, center?: { x: number; y: number }) => void;
}) {
  const saved = useRef<HTMLCanvasElement>(null),
    live = useRef<HTMLCanvasElement>(null),
    active = useRef<{
      pointerId: number;
      points: InkPoint[];
      stroke: InkStroke;
      mode: 'draw' | 'select' | 'move' | 'erase' | 'region';
      pointerType: string;
      changed: boolean;
      original: InkStroke[];
      start: InkPoint;
    } | null>(null);
  const [selection, setSelection] = useState<string[]>([]),
    selectionRef = useRef<string[]>([]),
    touches = useRef(new Map<number, { x: number; y: number }>()),
    drag = useRef<{ x: number; y: number } | null>(null),
    frame = useRef(0);
  const factor = Math.min(
    3,
    (window.devicePixelRatio || 1) * scale,
    4096 / Math.max(page.width, page.height),
  );
  function context(canvas: HTMLCanvasElement | null) {
    if (!canvas) return null;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(factor, 0, 0, factor, 0, 0);
    return ctx;
  }
  function clear(canvas: HTMLCanvasElement | null) {
    const ctx = context(canvas);
    ctx?.clearRect(0, 0, page.width, page.height);
    return ctx;
  }
  useEffect(() => {
    const ctx = clear(saved.current);
    if (!ctx || hidden) return;
    for (const l of layers) for (const s of l.strokes) drawInk(ctx, s, selection.includes(s.id));
  }, [layers, hidden, selection, factor, page.width, page.height]);
  useEffect(() => {
    selectionRef.current = [];
    setSelection([]);
  }, [page.id, activeLayer.id]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  useEffect(() => {
    const flush = (e: Event) => {
      const a = active.current;
      if (!a) return;
      if (a.mode === 'draw') {
        active.current = null;
        onStrokes([...a.original, { ...a.stroke, points: a.points }]);
        clear(live.current);
        e.preventDefault();
      }
    };
    const hide = () => {
      if (document.visibilityState === 'hidden') {
        flush(new Event('visibilitychange'));
        document.dispatchEvent(new Event('bkit:flush-learning-draft', { cancelable: true }));
      }
    };
    document.addEventListener('bkit:flush-learning-draft', flush);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', hide);
    return () => {
      document.removeEventListener('bkit:flush-learning-draft', flush);
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', hide);
    };
  });
  function point(e: PointerEvent | ReactPointerEvent<HTMLCanvasElement>) {
    const rect = viewRef.current!.getBoundingClientRect(),
      p = viewToPage(
        (e.clientX - rect.left) / scale,
        (e.clientY - rect.top) / scale,
        page.width,
        page.height,
        page.rotation,
      );
    return inkPoint(e, clamp(p.x, 0, page.width), clamp(p.y, 0, page.height));
  }
  function preview() {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const ctx = clear(live.current),
        a = active.current;
      if (!ctx || !a) return;
      if (a.mode === 'draw') drawInk(ctx, { ...a.stroke, points: a.points });
      if (a.mode === 'select' || a.mode === 'region') {
        ctx.strokeStyle = '#9b572f';
        ctx.lineWidth = 1 / scale;
        ctx.setLineDash([5 / scale, 3 / scale]);
        ctx.beginPath();
        if (a.mode === 'region') {
          const b = a.points.at(-1)!;
          ctx.rect(a.start.x, a.start.y, b.x - a.start.x, b.y - a.start.y);
        } else {
          ctx.moveTo(a.start.x, a.start.y);
          for (const p of a.points) ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
    });
  }
  function finish(e: ReactPointerEvent<HTMLCanvasElement>, canceled = false) {
    touches.current.delete(e.pointerId);
    drag.current = null;
    const a = active.current;
    if (!a || a.pointerId !== e.pointerId) return;
    if (!canceled) {
      const last = point(e);
      if (Math.hypot(last.x - a.points.at(-1)!.x, last.y - a.points.at(-1)!.y) > 0.12 / scale)
        a.points.push(last);
    }
    active.current = null;
    cancelAnimationFrame(frame.current);
    clear(live.current);
    if (a.mode === 'draw') onStrokes([...a.original, { ...a.stroke, points: a.points }]);
    else if (a.mode === 'select' && !canceled) {
      const ids = a.original
        .filter((s) => s.points.some((p) => insidePolygon(p, a.points)))
        .map((s) => s.id);
      selectionRef.current = ids;
      setSelection(ids);
    } else if (a.mode === 'region' && !canceled) {
      const b = a.points.at(-1)!;
      const r = {
        x: Math.min(a.start.x, b.x),
        y: Math.min(a.start.y, b.y),
        width: Math.abs(a.start.x - b.x),
        height: Math.abs(a.start.y - b.y),
      };
      if (r.width > 5 && r.height > 5) onRegion(r);
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  }
  function down(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === 'touch') {
      if (active.current?.pointerType === 'pen') return;
      const was = touches.current.size;
      touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (penOnly || was > 0 || tool === 'pan') {
        // A second finger cancels the tentative finger stroke, never a pen stroke.
        if (
          active.current?.pointerType === 'touch' &&
          active.current.pointerId !== e.pointerId &&
          was > 0 &&
          active.current.stroke.points[0]
        ) {
          active.current = null;
          clear(live.current);
        }
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
    }
    if (e.button !== 0 || active.current || hidden) return;
    if (tool === 'pan') {
      drag.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    if (!acceptsInk(e.pointerType, penOnly)) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = point(e),
      stroke: InkStroke = {
        id: uid(),
        pageId: page.id,
        layerId: activeLayer.id,
        tool: ['eraser', 'lasso', 'region', 'pan'].includes(tool)
          ? 'ballpoint'
          : (tool as InkStroke['tool']),
        color,
        width,
        points: [p],
      };
    const selected =
      tool === 'lasso' &&
      activeLayer.strokes.some(
        (s) => selectionRef.current.includes(s.id) && strokeHit(s, p, 8 / scale),
      );
    active.current = {
      pointerId: e.pointerId,
      points: [p],
      stroke,
      original: activeLayer.strokes,
      start: p,
      pointerType: e.pointerType,
      changed: false,
      mode:
        tool === 'eraser'
          ? 'erase'
          : tool === 'region'
            ? 'region'
            : tool === 'lasso'
              ? selected
                ? 'move'
                : 'select'
              : 'draw',
    };
    if (tool === 'eraser')
      onStrokes(activeLayer.strokes.filter((s) => !strokeHit(s, p, 10 / scale)));
    preview();
  }
  function move(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === 'touch' && active.current?.pointerType === 'pen') return;
    const touch = touches.current.get(e.pointerId);
    if (touch && (penOnly || touches.current.size > 1 || tool === 'pan')) {
      const before = [...touches.current.values()],
        center = (ps: typeof before) => ({
          x: ps.reduce((n, p) => n + p.x, 0) / ps.length,
          y: ps.reduce((n, p) => n + p.y, 0) / ps.length,
        });
      touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const after = [...touches.current.values()],
        a = center(before),
        b = center(after);
      const dist = (ps: typeof before) =>
        ps.length > 1 ? Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) : 0;
      onGesture(
        b.x - a.x,
        b.y - a.y,
        before.length > 1 && dist(before) > 5 ? dist(after) / dist(before) : 1,
        b,
      );
      return;
    }
    if (drag.current) {
      onGesture(e.clientX - drag.current.x, e.clientY - drag.current.y, 1);
      drag.current = { x: e.clientX, y: e.clientY };
      return;
    }
    const a = active.current;
    if (!a || a.pointerId !== e.pointerId) return;
    e.preventDefault();
    const events = e.nativeEvent.getCoalescedEvents?.() || [],
      samples = events.length ? events : [e.nativeEvent];
    for (const event of samples) {
      const p = point(event);
      if (Math.hypot(p.x - a.points.at(-1)!.x, p.y - a.points.at(-1)!.y) > 0.12 / scale)
        a.points.push(p);
    }
    if (a.points.length > 100000) {
      finish(e);
      return;
    }
    if (a.mode === 'erase') {
      onStrokes(
        activeLayer.strokes.filter((s) => !samples.some((e) => strokeHit(s, point(e), 10 / scale))),
        false,
      );
    }
    if (a.mode === 'move') {
      const p = a.points.at(-1)!,
        chosen = a.original
          .filter((s) => selectionRef.current.includes(s.id))
          .flatMap((s) => s.points);
      if (chosen.length) {
        const bounds = chosen.reduce(
          (b, p) => ({
            minX: Math.min(b.minX, p.x),
            maxX: Math.max(b.maxX, p.x),
            minY: Math.min(b.minY, p.y),
            maxY: Math.max(b.maxY, p.y),
          }),
          { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
        );
        const dx = clamp(p.x - a.start.x, -bounds.minX, page.width - bounds.maxX),
          dy = clamp(p.y - a.start.y, -bounds.minY, page.height - bounds.maxY);
        onStrokes(
          a.original.map((s) =>
            selectionRef.current.includes(s.id)
              ? { ...s, points: s.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })) }
              : s,
          ),
          !a.changed,
        );
        a.changed = true;
      }
    }
    preview();
  }
  return (
    <>
      <canvas
        className="paper-ink saved"
        ref={saved}
        width={Math.ceil(page.width * factor)}
        height={Math.ceil(page.height * factor)}
        style={{ width: page.width, height: page.height }}
        aria-hidden="true"
      />
      <canvas
        className="paper-ink live"
        data-testid="ink-canvas"
        ref={live}
        width={Math.ceil(page.width * factor)}
        height={Math.ceil(page.height * factor)}
        style={{
          width: page.width,
          height: page.height,
          touchAction: 'none',
          cursor: tool === 'pan' ? 'grab' : 'crosshair',
        }}
        aria-label="디지털 종이 필기 영역"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={(e) => finish(e)}
        onPointerCancel={(e) => finish(e, true)}
        onLostPointerCapture={(e) => finish(e, true)}
      />
      {selection.length > 0 && tool === 'lasso' && (
        <button
          className="paper-delete-selection"
          onClick={() => {
            onStrokes(activeLayer.strokes.filter((s) => !selection.includes(s.id)));
            selectionRef.current = [];
            setSelection([]);
          }}
        >
          선택 획 삭제 ({selection.length})
        </button>
      )}
    </>
  );
}

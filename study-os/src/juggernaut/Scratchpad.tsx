import { useRef, useState, useEffect } from 'react';
import { InkCanvas, type InkTool } from '../InkCanvas';
import type { AnnotationLayer } from '../paperModel';
/** Existing BKIT ink engine; intentionally ephemeral and independent of answer storage. */
export default function Scratchpad() {
  const view = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(400),
    [tool, setTool] = useState<InkTool>('ballpoint'),
    [penOnly, setPenOnly] = useState(true),
    [expanded, setExpanded] = useState(false);
  const [layer, setLayer] = useState<AnnotationLayer>({
    id: 'scratch',
    pageId: 'scratch',
    problemId: null,
    strokes: [],
  });
  useEffect(() => {
    const observer = new ResizeObserver((e) => setWidth(Math.max(200, e[0].contentRect.width)));
    if (view.current) observer.observe(view.current);
    return () => observer.disconnect();
  }, []);
  const scale = width / 600;
  const paperHeight = expanded ? 760 : 440;
  return (
    <section className="jg-scratch">
      <div className="jg-section-heading">
        <h2>생각을 펼치는 종이</h2>
        <span>임시 필기 · 저장 안 됨</span>
      </div>
      <div className="jg-scratch-tools">
        <button aria-pressed={tool === 'ballpoint'} onClick={() => setTool('ballpoint')}>
          펜
        </button>
        <button aria-pressed={tool === 'eraser'} onClick={() => setTool('eraser')}>
          지우개
        </button>
        <button
          disabled={!layer.strokes.length}
          onClick={() => setLayer((l) => ({ ...l, strokes: l.strokes.slice(0, -1) }))}
        >
          되돌리기
        </button>
        <button
          onClick={() => {
            if (!layer.strokes.length || window.confirm('저장되지 않은 임시 필기를 모두 지울까요?'))
              setLayer((l) => ({ ...l, strokes: [] }));
          }}
        >
          비우기
        </button>
        <button aria-pressed={expanded} onClick={() => setExpanded((v) => !v)}>
          {expanded ? '기본 종이' : '넓은 종이'}
        </button>
        <label>
          <input type="checkbox" checked={penOnly} onChange={(e) => setPenOnly(e.target.checked)} />
          펜만 · 손터치 무시
        </label>
      </div>
      <div ref={view} className="jg-scratch-viewport" style={{ height: paperHeight * scale }}>
        <div
          className="jg-scratch-sheet"
          style={{
            width: 600,
            height: paperHeight,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <InkCanvas
            page={{
              id: 'scratch',
              index: 0,
              width: 600,
              height: paperHeight,
              rotation: 0,
              bookmarked: false,
            }}
            scale={scale}
            viewRef={view}
            layers={[layer]}
            activeLayer={layer}
            tool={tool}
            color="#283c37"
            width={2}
            penOnly={penOnly}
            hidden={false}
            onStrokes={(strokes) => setLayer((l) => ({ ...l, strokes }))}
            onRegion={() => {}}
            onGesture={() => {}}
          />
        </div>
      </div>
      <small>
        페이지 이동·새로고침·문제 변경 시 사라집니다. 제출할 풀이는 ‘풀이 설명’에 적어주세요.
      </small>
    </section>
  );
}

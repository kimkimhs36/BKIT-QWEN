import { flushLearning } from './learningFlush';
import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type {
  PaperDocument,
  AnnotationLayer,
  InkStroke,
  DocumentPage,
  ProblemRegion,
} from './paperModel';
import { uid } from './model';
import { readPaperFile, listPaperDocuments } from './paperStorage';
import { usePaperDocument } from './usePaperDocument';
import { downloadPaperBlob, exportInkedPdf, openPdf } from './paperPdf';
import { sha256 } from './localZip';
import { InkCanvas, type InkTool } from './InkCanvas';
import { clamp, pageToView, currentInkLayers } from './paperInk';
import './digital-paper.css';
function SourceCanvas({
  pdf,
  image,
  page,
  small = false,
}: {
  pdf: PDFDocumentProxy | null;
  image: string;
  page: DocumentPage;
  small?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null),
    [error, setError] = useState('');
  useEffect(() => {
    let canceled = false,
      task: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | undefined;
    void (async () => {
      const c = ref.current;
      if (!c) return;
      const factor = small
        ? 100 / page.width
        : Math.min(2, 4096 / Math.max(page.width, page.height));
      c.width = Math.ceil(page.width * factor);
      c.height = Math.ceil(page.height * factor);
      const ctx = c.getContext('2d')!;
      if (pdf) {
        const p = await pdf.getPage(page.index + 1);
        if (canceled) return;
        task = p.render({
          canvasContext: ctx,
          viewport: p.getViewport({ scale: factor, rotation: 0 }),
        });
        await task.promise;
      } else if (image) {
        const img = new Image();
        img.src = image;
        await img.decode();
        if (!canceled) ctx.drawImage(img, 0, 0, c.width, c.height);
      }
    })().catch((e) => {
      if (!canceled) setError('페이지 렌더링 실패: ' + e.message);
    });
    return () => {
      canceled = true;
      task?.cancel();
    };
  }, [pdf, image, page.id, small]);
  return (
    <>
      {error && <p role="alert">{error}</p>}
      <canvas
        className={small ? 'paper-thumbnail' : 'paper-source'}
        ref={ref}
        style={
          small
            ? { width: 72, height: (72 * page.height) / page.width }
            : { width: page.width, height: page.height }
        }
        aria-label={`${page.index + 1}페이지 원본`}
      />
    </>
  );
}
const TOOLS: [InkTool, string][] = [
  ['ballpoint', '볼펜'],
  ['fountain', '필기 펜'],
  ['highlighter', '형광펜'],
  ['eraser', '획 지우개'],
  ['lasso', '올가미'],
  ['line', '직선'],
  ['rectangle', '사각형'],
  ['ellipse', '타원'],
  ['pan', '이동'],
];
export function DigitalPaperRoom({
  initial,
  problemId,
  attemptKey,
  onReference,
  onClose,
}: {
  initial: PaperDocument;
  problemId?: string;
  attemptKey?: string;
  onReference?: () => boolean;
  onClose?: () => void;
}) {
  const { doc, edit, save, status, error, isDirty } = usePaperDocument(initial);
  const initialRegion = initial.regions.find((r) => r.problemId === problemId);
  const [pageId, setPageId] = useState(initialRegion?.pageId ?? initial.cursor.pageId),
    [zoom, setZoom] = useState(initial.cursor.zoom),
    [available, setAvailable] = useState(600),
    [pdf, setPdf] = useState<PDFDocumentProxy | null>(null),
    [image, setImage] = useState(''),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(''),
    [actionError, setActionError] = useState('');
  const [tool, setTool] = useState<InkTool>('ballpoint'),
    [color, setColor] = useState('#25332f'),
    [width, setWidth] = useState(2),
    [penOnly, setPenOnly] = useState(true),
    [hidden, setHidden] = useState(false),
    [scope, setScope] = useState<'problem' | 'page'>(problemId ? 'problem' : 'page'),
    [thumbs, setThumbs] = useState(false),
    [exporting, setExporting] = useState(false),
    [historyId, setHistoryId] = useState('');
  const [history, setHistory] = useState<{ undo: InkStroke[][]; redo: InkStroke[][] }>({
    undo: [],
    redo: [],
  });
  const scroll = useRef<HTMLDivElement>(null),
    view = useRef<HTMLDivElement>(null),
    ready = useRef(false),
    zoomRef = useRef(initial.cursor.zoom);
  const page = doc.pages.find((p) => p.id === pageId) ?? doc.pages[0],
    index = doc.pages.indexOf(page),
    rotated = page.rotation === 90 || page.rotation === 270,
    viewW = rotated ? page.height : page.width,
    viewH = rotated ? page.width : page.height;
  const fit = Math.min(1.6, Math.max(0.05, (available - 32) / viewW)),
    scale = fit * zoom;
  const layerProblem = scope === 'problem' && problemId ? problemId : null;
  const layerIds = useRef(new Map<string, string>()),
    layerKey = JSON.stringify([page.id, layerProblem, layerProblem ? attemptKey : undefined]);
  if (!layerIds.current.has(layerKey)) layerIds.current.set(layerKey, uid());
  const layer: AnnotationLayer = doc.layers.find(
    (l) =>
      l.pageId === page.id &&
      l.problemId === layerProblem &&
      l.attemptKey === (layerProblem ? attemptKey : undefined),
  ) ?? {
    id: layerIds.current.get(layerKey)!,
    pageId: page.id,
    problemId: layerProblem,
    attemptKey: layerProblem ? attemptKey : undefined,
    strokes: [],
  };
  const priorContexts = [
    ...new Set(
      doc.layers
        .filter(
          (l) => l.problemId === problemId && l.attemptKey !== attemptKey && l.strokes.length > 0,
        )
        .map((l) => l.attemptKey ?? 'legacy'),
    ),
  ].filter(
    (key) =>
      !doc.inkHistory.some(
        (h) =>
          h.problemId === problemId &&
          h.layers.some((l) => (l.attemptKey ?? 'legacy') === key && l.problemId === problemId),
      ),
  );
  const contextKey = historyId.startsWith('context:') ? historyId.slice(8) : null;
  const historyLayers = contextKey
    ? doc.layers.filter(
        (l) =>
          l.problemId === null ||
          (l.problemId === problemId && (l.attemptKey ?? 'legacy') === contextKey),
      )
    : doc.inkHistory.find((h) => h.attemptId === historyId)?.layers;
  const visible = (
    historyLayers ??
    (problemId
      ? doc.layers.filter(
          (l) => l.problemId === null || (l.problemId === problemId && l.attemptKey === attemptKey),
        )
      : currentInkLayers(doc.layers))
  ).filter((l) => l.pageId === page.id);
  useEffect(() => {
    if (layerProblem && attemptKey && !doc.layers.some((l) => l.id === layer.id))
      edit((d) => ({ ...d, layers: [...d.layers, layer] }));
  }, [page.id, layerProblem, attemptKey]);
  useEffect(() => {
    setHistoryId('');
    if (problemId) setScope('problem');
  }, [attemptKey]);

  useEffect(() => {
    let canceled = false,
      instance: PDFDocumentProxy | undefined,
      url = '';
    void (async () => {
      const bytes = await readPaperFile(doc.fileId);
      if ((await sha256(new Blob([bytes]))) !== doc.digest)
        throw new Error(
          '원본 무결성 검사가 실패했습니다. 원본을 변경하지 않고 열기를 중단했습니다.',
        );
      if (doc.mime === 'application/pdf') {
        instance = await openPdf(bytes);
        if (canceled) {
          await instance.destroy();
          return;
        }
        setPdf(instance);
      } else {
        url = URL.createObjectURL(new Blob([bytes], { type: doc.mime }));
        if (!canceled) setImage(url);
      }
      if (!canceled) setLoading(false);
    })().catch((e) => {
      if (!canceled) {
        setLoadError(e.message);
        setLoading(false);
      }
    });
    return () => {
      canceled = true;
      if (instance) void instance.destroy();
      if (url) URL.revokeObjectURL(url);
    };
  }, [doc.fileId]);
  useEffect(() => {
    const el = scroll.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setAvailable(el.clientWidth));
    obs.observe(el);
    setAvailable(el.clientWidth);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    const archive = (event: Event) => {
      const detail = (event as CustomEvent<{ attemptId: string; problemId: string }>).detail;
      if (detail.problemId !== problemId) return;
      edit((d) =>
        d.inkHistory.some((h) => h.attemptId === detail.attemptId)
          ? d
          : {
              ...d,
              inkHistory: [
                ...d.inkHistory,
                {
                  attemptId: detail.attemptId,
                  problemId: detail.problemId,
                  createdAt: new Date().toISOString(),
                  layers: structuredClone(
                    d.layers.filter(
                      (l) =>
                        (l.problemId === problemId && l.attemptKey === attemptKey) ||
                        l.problemId === null,
                    ),
                  ),
                },
              ],
            },
      );
    };
    document.addEventListener('bkit:archive-ink-attempt', archive);
    return () => document.removeEventListener('bkit:archive-ink-attempt', archive);
  }, [problemId, attemptKey, edit]);
  useEffect(() => {
    setHistory({ undo: [], redo: [] });
  }, [page.id, layer.id]);
  useEffect(() => {
    if (loading || !scroll.current) return;
    if (!ready.current) {
      ready.current = true;
      if (initialRegion && initial.cursor.pageId !== initialRegion.pageId)
        edit((d) => ({ ...d, cursor: { ...d.cursor, pageId: initialRegion.pageId } }));
      const r = initialRegion;
      if (r) focusRegion(r);
      else {
        scroll.current.scrollLeft = initial.cursor.scrollLeft;
        scroll.current.scrollTop = initial.cursor.scrollTop;
      }
    }
  }, [loading, scale]);
  function focusRegion(r: ProblemRegion) {
    const rp = doc.pages.find((p) => p.id === r.pageId) ?? page;
    const a = pageToView(r.x, r.y, rp.width, rp.height, rp.rotation),
      b = pageToView(r.x + r.width, r.y + r.height, rp.width, rp.height, rp.rotation);
    scroll.current?.scrollTo({
      left: Math.max(0, Math.min(a.x, b.x) * scale - 16),
      top: Math.max(0, Math.min(a.y, b.y) * scale - 16),
    });
  }
  function strokes(next: InkStroke[], record = true) {
    if (record) setHistory((h) => ({ undo: [...h.undo.slice(-49), layer.strokes], redo: [] }));
    edit((d) => ({
      ...d,
      layers: [...d.layers.filter((l) => l.id !== layer.id), { ...layer, strokes: next }],
    }));
  }
  function undo(redo = false) {
    const stack = redo ? history.redo : history.undo,
      next = stack.at(-1);
    if (!next) return;
    setHistory((h) =>
      redo
        ? { undo: [...h.undo, layer.strokes], redo: h.redo.slice(0, -1) }
        : { undo: h.undo.slice(0, -1), redo: [...h.redo, layer.strokes] },
    );
    strokes(next, false);
  }
  function go(id: string) {
    if (!flushLearning(() => go(id))) return;
    setPageId(id);
    edit((d) => ({ ...d, cursor: { ...d.cursor, pageId: id, scrollLeft: 0, scrollTop: 0 } }));
    scroll.current?.scrollTo(0, 0);
  }
  function changeZoom(z: number) {
    const value = clamp(z, 0.25, 4);
    zoomRef.current = value;
    setZoom(value);
    edit((d) => ({ ...d, cursor: { ...d.cursor, zoom: value } }));
  }
  const matrix =
    page.rotation === 90
      ? [0, 1, -1, 0, page.height, 0]
      : page.rotation === 180
        ? [-1, 0, 0, -1, page.width, page.height]
        : page.rotation === 270
          ? [0, -1, 1, 0, 0, page.width]
          : [1, 0, 0, 1, 0, 0];
  async function exportPdf() {
    if (!flushLearning(() => void exportPdf())) return;
    setExporting(true);
    try {
      await save();
      if (isDirty()) throw new Error('필기를 저장한 후 다시 내보내세요.');
      downloadPaperBlob(
        await exportInkedPdf((await listPaperDocuments()).find((d) => d.id === doc.id) ?? doc),
        doc.name.replace(/\.[^.]+$/, '') + '-필기.pdf',
      );
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setExporting(false);
    }
  }
  const region = doc.regions.find((r) => r.problemId === problemId);
  return (
    <section
      className="digital-paper"
      aria-label="디지털 종이 학습실"
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !(e.target instanceof HTMLInputElement)) {
          e.preventDefault();
          undo(e.shiftKey);
        }
      }}
    >
      <header className="paper-header">
        <strong>{doc.name}</strong>
        <span>
          {index + 1} / {doc.pages.length} 페이지
        </span>
        <span role="status" data-testid="ink-save-status">
          {status}
        </span>
        {onClose && (
          <button
            onClick={() => {
              if (flushLearning(onClose)) onClose();
            }}
          >
            종이 닫기
          </button>
        )}
      </header>
      <nav className="paper-controls" aria-label="페이지 도구">
        <button onClick={() => go(doc.pages[index - 1].id)} disabled={index === 0}>
          이전 페이지
        </button>
        <label>
          페이지
          <select aria-label="종이 페이지" value={page.id} onChange={(e) => go(e.target.value)}>
            {doc.pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.index + 1}
                {p.bookmarked ? ' ★' : ''}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={() => go(doc.pages[index + 1].id)}
          disabled={index === doc.pages.length - 1}
        >
          다음 페이지
        </button>
        <button onClick={() => changeZoom(zoom / 1.2)} aria-label="축소">
          −
        </button>
        <output>{Math.round(zoom * 100)}%</output>
        <button onClick={() => changeZoom(zoom * 1.2)} aria-label="확대">
          ＋
        </button>
        <button onClick={() => changeZoom(1)}>너비 맞춤</button>
        <button
          onClick={() =>
            edit((d) => ({
              ...d,
              pages: d.pages.map((p) =>
                p.id === page.id
                  ? { ...p, rotation: ((p.rotation + 90) % 360) as DocumentPage['rotation'] }
                  : p,
              ),
            }))
          }
        >
          페이지 회전
        </button>
        <button
          aria-pressed={page.bookmarked}
          onClick={() =>
            edit((d) => ({
              ...d,
              pages: d.pages.map((p) =>
                p.id === page.id ? { ...p, bookmarked: !p.bookmarked } : p,
              ),
            }))
          }
        >
          책갈피
        </button>
        <button aria-expanded={thumbs} onClick={() => setThumbs(!thumbs)}>
          썸네일
        </button>
      </nav>
      <fieldset
        className="paper-tools"
        disabled={!!historyId}
        role="toolbar"
        aria-label="필기 도구"
      >
        {TOOLS.map(([key, label]) => (
          <button key={key} aria-pressed={tool === key} onClick={() => setTool(key)}>
            {label}
          </button>
        ))}
        <label>
          잉크 색
          <input
            type="color"
            aria-label="잉크 색"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </label>
        <label>
          굵기
          <input
            type="range"
            aria-label="펜 굵기"
            min="0.5"
            max="16"
            step="0.5"
            value={width}
            onChange={(e) => setWidth(+e.target.value)}
          />
          <output>{width}</output>
        </label>
        <label>
          <input type="checkbox" checked={penOnly} onChange={(e) => setPenOnly(e.target.checked)} />
          펜 전용 · 손가락 이동
        </label>
        <button disabled={!history.undo.length} onClick={() => undo()}>
          실행 취소
        </button>
        <button disabled={!history.redo.length} onClick={() => undo(true)}>
          다시 실행
        </button>
        <button aria-pressed={hidden} onClick={() => setHidden(!hidden)}>
          필기 {hidden ? '표시' : '숨기기'}
        </button>
        <button
          onClick={() => {
            if (
              confirm(
                '현재 페이지의 선택한 필기 레이어를 모두 지울까요? 원본과 다른 문제의 필기는 보존됩니다.',
              )
            )
              strokes([]);
          }}
        >
          현재 필기 지우기
        </button>
      </fieldset>
      {problemId && (
        <div className="paper-controls">
          <label>
            필기 레이어
            <select
              aria-label="필기 레이어"
              value={scope}
              onChange={(e) => {
                const value = e.target.value as typeof scope;
                if (flushLearning(() => setScope(value))) setScope(value);
              }}
            >
              <option value="problem">이 문제 풀이</option>
              <option value="page">페이지 전체 메모</option>
            </select>
          </label>
          <button aria-pressed={tool === 'region'} onClick={() => setTool('region')}>
            문제 영역 지정
          </button>
          {region && (
            <button
              onClick={() => {
                if (page.id !== region.pageId) {
                  go(region.pageId);
                  requestAnimationFrame(() => focusRegion(region));
                } else focusRegion(region);
              }}
            >
              연결 영역으로 이동
            </button>
          )}
          <small>문제 영역은 원본 좌표로 저장됩니다. 드래그해 지정하세요.</small>
        </div>
      )}
      {thumbs && (
        <nav className="paper-thumbnails" aria-label="페이지 썸네일">
          {doc.pages.map((p) => (
            <button
              key={p.id}
              onClick={() => go(p.id)}
              aria-current={p.id === page.id ? 'page' : undefined}
            >
              <SourceCanvas pdf={pdf} image={image} page={p} small />
              {p.index + 1}
              {p.bookmarked ? ' ★' : ''}
            </button>
          ))}
        </nav>
      )}
      {(error || loadError || actionError) && (
        <p role="alert" className="warning">
          {error || loadError || actionError}
        </p>
      )}
      {error && (
        <div className="paper-controls">
          <button onClick={() => void save()}>저장 재시도</button>
          <button
            onClick={() =>
              downloadPaperBlob(
                new Blob([JSON.stringify(doc)], { type: 'application/json' }),
                'bkit-unsaved-ink.json',
              )
            }
          >
            미저장 필기 구조 JSON 보존
          </button>
        </div>
      )}
      {loading && <p role="status">원본 확인·페이지 준비 중…</p>}
      <div
        className="paper-scroll"
        ref={scroll}
        onScroll={() => {
          const el = scroll.current;
          if (!el || !ready.current) return;
          const left = el.scrollLeft,
            top = el.scrollTop;
          if (left !== doc.cursor.scrollLeft || top !== doc.cursor.scrollTop)
            edit((d) => ({ ...d, cursor: { ...d.cursor, scrollLeft: left, scrollTop: top } }));
        }}
      >
        {!loading && !loadError && (
          <div
            ref={view}
            className="paper-view"
            style={{ width: viewW * scale, height: viewH * scale }}
          >
            <div
              className="paper-page"
              style={{
                width: page.width,
                height: page.height,
                transform: `matrix(${matrix.map((v) => v * scale).join(',')})`,
              }}
            >
              <SourceCanvas pdf={pdf} image={image} page={page} />
              {region?.pageId === page.id && (
                <div
                  className="paper-region"
                  style={{
                    left: region.x,
                    top: region.y,
                    width: region.width,
                    height: region.height,
                  }}
                />
              )}
              <InkCanvas
                key={page.id + layer.id}
                page={page}
                scale={scale}
                viewRef={view}
                layers={visible}
                activeLayer={layer}
                tool={historyId ? 'pan' : tool}
                color={color}
                width={width}
                penOnly={penOnly}
                hidden={hidden}
                onStrokes={(next, record) => {
                  if (!historyId) strokes(next, record);
                }}
                onRegion={(r) => {
                  if (!problemId) return;
                  edit((d) => ({
                    ...d,
                    regions: [
                      ...d.regions.filter((r) => r.problemId !== problemId),
                      { ...r, id: uid(), problemId, pageId: page.id },
                    ],
                  }));
                  setTool('ballpoint');
                }}
                onGesture={(dx, dy, ratio, center) => {
                  const el = scroll.current;
                  if (!el) return;
                  const rect = el.getBoundingClientRect(),
                    x = center ? center.x - rect.left : el.clientWidth / 2,
                    y = center ? center.y - rect.top : el.clientHeight / 2;
                  const z = clamp(zoomRef.current * ratio, 0.25, 4),
                    actual = z / zoomRef.current;
                  if (actual !== 1) changeZoom(z);
                  // Compose every gesture around its moving focal point, after the scale reaches the DOM.
                  requestAnimationFrame(() => {
                    el.scrollLeft = (el.scrollLeft + x - dx) * actual - x;
                    el.scrollTop = (el.scrollTop + y - dy) * actual - y;
                  });
                }}
              />
            </div>
          </div>
        )}
      </div>
      {problemId &&
        (doc.inkHistory.some((h) => h.problemId === problemId) || priorContexts.length > 0) && (
          <label>
            이 문제의 필기 이력
            <select
              aria-label="이 문제의 필기 이력"
              value={historyId}
              onChange={(e) => {
                if (!e.target.value || !onReference || onReference()) setHistoryId(e.target.value);
              }}
            >
              <option value="">현재 편집 가능한 풀이</option>
              {doc.inkHistory
                .filter((h) => h.problemId === problemId)
                .map((h, i) => (
                  <option key={h.attemptId} value={h.attemptId}>
                    {i + 1}회 · {new Date(h.createdAt).toLocaleString()} · 보존본
                  </option>
                ))}
              {priorContexts.map((key, i) => (
                <option key={'context:' + key} value={'context:' + key}>
                  이전 작업 {i + 1} · 보존본
                </option>
              ))}
            </select>
          </label>
        )}
      <footer className="paper-controls">
        <button onClick={() => void save()}>필기 저장</button>
        <button disabled={exporting || loading} onClick={() => void exportPdf()}>
          {exporting ? 'PDF 생성 중…' : '필기한 PDF 내보내기'}
        </button>
        <button
          onClick={() =>
            void readPaperFile(doc.fileId)
              .then((b) => downloadPaperBlob(new Blob([b], { type: doc.mime }), doc.name))
              .catch((e) => setActionError(e.message))
          }
        >
          원본 내보내기
        </button>
        <small>
          원본은 보존됩니다. 내보낸 PDF는 필기가 합쳐진 사본이며, 편집 가능한 필기는 전체 ZIP에
          포함됩니다.
        </small>
      </footer>
      <details>
        <summary>펜·브라우저 안내</summary>
        <p>
          Apple Pencil·S Pen에 대응하는 Pointer Events 입력을 사용합니다. 필압·기울기는 기기가
          제공할 때 적용합니다. 브라우저의 완전한 팜 리젝션, Pencil 더블 탭·S Pen 버튼은 보장하지
          않습니다. 실기기 필기 품질 검증은 별도로 필요합니다. 손가락 필기는 펜 전용을 해제하세요.
          두 손가락으로 확대·이동할 수 있습니다.
        </p>
      </details>
    </section>
  );
}

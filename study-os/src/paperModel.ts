import { z } from 'zod';
const id = z.string().min(1).max(100);
const finite = z.number().finite();
const sourceUrl = z
  .string()
  .max(2000)
  .refine((value) => {
    if (!value) return true;
    try {
      const u = new URL(value);
      return (
        u.protocol === 'https:' &&
        !u.username &&
        !u.password &&
        !u.port &&
        (u.hostname === 'kice.re.kr' ||
          u.hostname.endsWith('.kice.re.kr') ||
          u.hostname === 'ebsi.co.kr' ||
          u.hostname.endsWith('.ebsi.co.kr') ||
          u.hostname === 'ebs.co.kr' ||
          u.hostname.endsWith('.ebs.co.kr') ||
          u.hostname.endsWith('.go.kr'))
      );
    } catch {
      return false;
    }
  }, '공식 HTTPS 출처가 아닙니다.');
export const pointSchema = z.object({
  x: finite,
  y: finite,
  pressure: finite.min(0).max(1),
  tiltX: finite.min(-90).max(90),
  tiltY: finite.min(-90).max(90),
  time: finite,
});
export const strokeSchema = z.object({
  id,
  pageId: id,
  layerId: id,
  tool: z.enum(['ballpoint', 'fountain', 'highlighter', 'line', 'rectangle', 'ellipse']),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  width: finite.min(0.1).max(100),
  points: z.array(pointSchema).min(1).max(100000),
});
export const layerSchema = z.object({
  id,
  pageId: id,
  problemId: id.nullable(),
  attemptKey: id.optional(),
  strokes: z.array(strokeSchema).max(20000),
});
export const pageSchema = z.object({
  id,
  index: z.number().int().min(0),
  width: finite.positive().max(30000),
  height: finite.positive().max(30000),
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  bookmarked: z.boolean(),
});
export const regionSchema = z.object({
  id,
  problemId: id,
  pageId: id,
  x: finite.min(0),
  y: finite.min(0),
  width: finite.positive(),
  height: finite.positive(),
});
export const provenanceSchema = z.object({
  title: z.string().max(500),
  url: sourceUrl,
  fileUrl: sourceUrl,
  institution: z.string().max(200),
  year: z.string().max(20),
  exam: z.string().max(100),
  grade: z.string().max(50),
  subject: z.string().max(100),
  curriculum: z.string().max(100),
  kind: z.enum(['question', 'answer', 'other']),
  rights: z.string().max(2000),
  verifiedAt: z.string().nullable(),
});
export const documentSchema = z
  .object({
    version: z.literal(1),
    id,
    fileId: id,
    resourceId: id.nullable(),
    legacyMediaId: id.optional(),
    name: z.string().max(1000),
    mime: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
    digest: z.string().regex(/^[a-f0-9]{64}$/),
    size: z
      .number()
      .int()
      .positive()
      .max(20 * 1024 * 1024),
    revision: z.number().int().min(0),
    pages: z.array(pageSchema).min(1).max(500),
    layers: z.array(layerSchema).max(20000),
    regions: z.array(regionSchema).max(10000),
    inkHistory: z
      .array(
        z.object({
          attemptId: id,
          problemId: id,
          createdAt: z.string(),
          layers: z.array(layerSchema).max(1000),
        }),
      )
      .max(50000)
      .default([]),
    cursor: z.object({
      pageId: id,
      zoom: finite.min(0.25).max(4),
      scrollLeft: finite.min(0),
      scrollTop: finite.min(0),
    }),
    provenance: provenanceSchema.nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .superRefine((d, ctx) => {
    const pages = new Map(d.pages.map((p) => [p.id, p]));
    const layers = new Map(d.layers.map((l) => [l.id, l]));
    if (
      pages.size !== d.pages.length ||
      layers.size !== d.layers.length ||
      new Set(d.regions.map((r) => r.id)).size !== d.regions.length ||
      new Set(d.pages.map((p) => p.index)).size !== d.pages.length ||
      !pages.has(d.cursor.pageId)
    )
      ctx.addIssue({ code: 'custom', message: '중복 ID 또는 잘못된 페이지 위치' });
    if (
      new Set(d.inkHistory.map((h) => h.attemptId)).size !== d.inkHistory.length ||
      d.pages.some((p, i) => p.index !== i) ||
      new Set(d.layers.map((l) => JSON.stringify([l.pageId, l.problemId, l.attemptKey]))).size !==
        d.layers.length
    )
      ctx.addIssue({ code: 'custom', message: '중복 풀이 레이어·이력 또는 잘못된 페이지 순서' });
    const strokes = new Set<string>();
    for (const l of d.layers) {
      if (!pages.has(l.pageId)) ctx.addIssue({ code: 'custom', message: '필기 페이지 누락' });
      for (const s of l.strokes) {
        if (
          s.pageId !== l.pageId ||
          s.layerId !== l.id ||
          strokes.has(s.id) ||
          s.points.some((p) => {
            const page = pages.get(l.pageId);
            return !page || p.x < 0 || p.y < 0 || p.x > page.width || p.y > page.height;
          })
        )
          ctx.addIssue({ code: 'custom', message: '필기 연결 불일치' });
        strokes.add(s.id);
      }
    }
    for (const h of d.inkHistory)
      for (const l of h.layers)
        if (
          !pages.has(l.pageId) ||
          l.strokes.some((s) => s.pageId !== l.pageId || s.layerId !== l.id)
        )
          ctx.addIssue({ code: 'custom', message: '필기 이력 페이지 연결 오류' });
    for (const r of d.regions) {
      const p = pages.get(r.pageId);
      if (!p || r.x + r.width > p.width + 0.01 || r.y + r.height > p.height + 0.01)
        ctx.addIssue({ code: 'custom', message: '문제 영역 범위 오류' });
    }
  });
export type PaperDocument = z.infer<typeof documentSchema>;
export type DocumentPage = z.infer<typeof pageSchema>;
export type InkStroke = z.infer<typeof strokeSchema>;
export type InkPoint = z.infer<typeof pointSchema>;
export type AnnotationLayer = z.infer<typeof layerSchema>;
export type ProblemRegion = z.infer<typeof regionSchema>;
export type SourceProvenance = z.infer<typeof provenanceSchema>;
/** Answers remain in learning.attempts (3.1 source of truth), indexed by stable problem IDs. */
export type AnswerSheet = { resourceId: string; problemIds: string[]; attemptIds: string[] };

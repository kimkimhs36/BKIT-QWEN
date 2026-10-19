import { z } from 'zod';
import { date, time } from './model';

export const briefingInput = z.string().trim().min(1).max(3000);
export const briefingResponse = z.object({
  mode: z.literal('live'),
  missions: z
    .array(
      z
        .object({
          title: z.string().trim().min(1).max(200),
          subject: z.string().trim().max(200),
          kind: z.enum(['숙제', '수행평가', '시험공부', '개인 일정']),
          due: date.nullable(),
          dueTime: time.nullable(),
          quantityUnit: z.enum(['problems', 'pages', 'passages', 'chapters']).nullable(),
          quantityTotal: z.number().int().min(1).max(10000).nullable(),
          minutes: z.number().int().min(1).max(480).nullable(),
          sourceText: z.string().trim().min(1).max(3000),
        })
        .refine((m) => !m.dueTime || !!m.due, '날짜 없는 시각은 사용할 수 없어요.')
        .refine(
          (m) => !!m.quantityUnit === (m.quantityTotal !== null),
          '분량과 단위를 함께 확인해 주세요.',
        ),
    )
    .min(1)
    .max(20),
});
export function parseBriefingResponse(body: unknown, text: string) {
  const result = briefingResponse.parse(body);
  if (result.missions.some((m) => !text.includes(m.sourceText)))
    throw new Error('AI 초안의 원문 근거를 확인하지 못했어요. 직접 정리해 주세요.');
  return result;
}

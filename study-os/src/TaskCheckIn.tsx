import { CheckCheck, ArrowRight, Leaf } from 'lucide-react';
/** Finished work still needs a clear submission handoff; it must not disappear. */
export function TaskCheckIn({
  pending,
  awaiting,
  total,
  onSubmission,
  onAdd,
}: {
  pending: number;
  awaiting: number;
  total: number;
  onSubmission: () => void;
  onAdd: () => void;
}) {
  if (awaiting)
    return (
      <section className="task-check-in" aria-label="제출 확인 알림">
        <CheckCheck size={22} aria-hidden="true" />
        <div>
          <h2>{pending ? '제출만 남은 과제가 있어요.' : '학습은 끝났어요. 제출도 확인해요.'}</h2>
          <p>숙제·수행평가 {awaiting}개 · 제출한 뒤 직접 확인해 주세요.</p>
        </div>
        <button onClick={onSubmission}>
          제출 확인하기 <ArrowRight size={16} />
        </button>
      </section>
    );
  if (!pending && total)
    return (
      <section className="task-check-in task-check-in--complete" aria-label="오늘의 과제 완료">
        <Leaf size={22} aria-hidden="true" />
        <div>
          <h2>남은 학습 과제가 없어요.</h2>
          <p>마친 공부는 기록에 보관했어요. 가볍게 복습하거나 쉬어 가세요.</p>
        </div>
        <button onClick={onAdd}>
          새 과제 등록 <ArrowRight size={16} />
        </button>
      </section>
    );
  return null;
}

import { ArrowRight, ImagePlus, PencilLine } from 'lucide-react';

/** The home has two capture routes and one focus action, with no duplicated dashboard. */
export function HomeEntry({
  onBriefing,
  onMaterials,
}: {
  onBriefing: () => void;
  onMaterials: () => void;
}) {
  return (
    <section className="home-entry" aria-label="오늘 준비하기">
      <button className="home-entry-action home-entry-briefing" onClick={onBriefing}>
        <span className="home-entry-icon" aria-hidden="true">
          <PencilLine size={23} />
        </span>
        <span>
          <strong>오늘 할 일 정리</strong>
          <small>숙제·수행평가를 한곳에</small>
        </span>
        <ArrowRight size={19} aria-hidden="true" />
      </button>
      <button className="home-entry-action home-entry-materials" onClick={onMaterials}>
        <span className="home-entry-icon" aria-hidden="true">
          <ImagePlus size={23} />
        </span>
        <span>
          <strong>자료 추가</strong>
          <small>촬영하거나 사진 고르기</small>
        </span>
        <ArrowRight size={19} aria-hidden="true" />
      </button>
    </section>
  );
}

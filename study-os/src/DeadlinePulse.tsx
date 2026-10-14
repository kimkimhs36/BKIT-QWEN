import type { Task } from './model';
import { deadlineDigest } from './studyInsights';
import { clock,dayKey } from './time';
import { ArrowRight,CalendarClock,Plus } from 'lucide-react';
export function DeadlinePulse({tasks,now,onTasks,onAdd}:{tasks:Task[],now:number,onTasks:()=>void,onAdd:()=>void}) {
  const d=deadlineDigest(tasks,now);
  return <section className="deadline-pulse" aria-label="앞으로 48시간 과제 현황">
    <div className="deadline-pulse-intro">
      <div className="deadline-pulse-kicker"><CalendarClock size={15}/> NEXT 48 HOURS</div>
      <h2>{d.overdue?'지난 마감을 먼저 확인해.':d.soon?'가까운 마감부터 준비하자.':d.total?'급한 마감은 없어.':'첫 과제를 등록해 보자.'}</h2>
      <p>{d.earliest?d.earliest.subject+' · '+d.earliest.title+' / '+dayKey(d.earliest.due!)+' '+clock(d.earliest.due!):d.total?'48시간 이내의 확정 마감은 없어. 미확정 과제는 별도로 확인해.':'숙제나 공부할 것 하나만 적어도 다음 행동이 명확해져.'}</p>
    </div>
    <div className="deadline-pulse-right">
      <div className="deadline-pulse-badges">
        <span className={d.overdue?'has-overdue':''}><strong>{d.overdue}</strong> 지난 마감</span>
        <span><strong>{d.soon}</strong> 48시간 내</span>
        <span><strong>{d.unknown}</strong> 미확정</span>
      </div>
      <button className="text-button" onClick={d.total?onTasks:onAdd}>{d.total?'과제 확인':'과제 추가'} {d.total?<ArrowRight size={15}/>:<Plus size={15}/>}</button>
    </div>
  </section>;
}

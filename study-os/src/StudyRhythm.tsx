import type { Session } from './model';
import { recentStudyDays, weeklySubjectMinutes } from './studyInsights';
export function StudyRhythm({sessions,today}:{sessions:Session[],today:string}) {
  const days=recentStudyDays(sessions,today), max=Math.max(60,...days.map(x=>x.seconds));
  const total=Math.floor(days.reduce((n,x)=>n+x.seconds,0)/60);
  const active=days.filter(x=>x.seconds>0).length;
  const subjects=weeklySubjectMinutes(sessions,today).slice(0,3);
  return <section className="panel spaced rhythm-panel" aria-label="최근 7일 실제 학습 기록">
    <div className="section-head"><h2>7일 학습 리듬 <span>REAL DATA</span></h2><span className="rhythm-total">{total}분 · {active}/7일 기록</span></div>
    <p className="rhythm-caption">완료한 집중 기록을 날짜별로 보여줘. 기록 없는 날은 0이야.</p>
    <div className="rhythm-chart" role="img" aria-label={days.map(x=>x.day+' '+x.minutes+'분').join(', ')}>
      {days.map(x=><div className="rhythm-day" key={x.day}>
        <span className="rhythm-value">{x.minutes>0?x.minutes+'m':'—'}</span>
        <div className="rhythm-rail"><span className={'rhythm-fill '+(x.seconds>0?'is-recorded':'')} style={{height:(x.seconds>0?Math.max(7,x.seconds/max*100):2)+'%'}}/></div>
        <time dateTime={x.day}>{x.day.slice(5).replace('-','.')}</time>
      </div>)}
    </div>
    {!!subjects.length && <div className="rhythm-subjects">{subjects.map(x=><span key={x.subject}><strong>{x.subject}</strong> {x.minutes}분</span>)}</div>}
  </section>;
}

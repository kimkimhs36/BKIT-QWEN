import {useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {clock} from './time';
import type {OrbitEvent} from './DayOrbit';
export function DayTimeline({events,now,onOpen}:{events:OrbitEvent[];now:number;onOpen:()=>void}) {
 const [selected,setSelected]=useState<string|null>(null);
 return <div className="day-timeline">{[...events].sort((a,b)=>a.start-b.start).map(e=>{
   const active=e.start<=now&&e.end>now,opened=e.id===selected;
   return <div key={e.id} className={'temporal-row '+(active?'current ':'')+(e.end<=now?'past ':'')+(opened?'expanded':'')}>
    <button aria-expanded={opened} onClick={()=>setSelected(opened?null:e.id)}><span className="temporal-time">{clock(e.start)}<small>{clock(e.end)}</small></span><span className={'temporal-node '+e.kind}/><span className="temporal-title"><strong>{e.title}</strong><small>{active?<><i/> 지금 진행 중</>:e.kind==='study'?'학습 계획':e.kind==='sleep'?'보호된 수면':'고정 일정'}</small></span><span className="temporal-expand">{opened?'−':'+'}</span></button>
    {opened&&<div className="temporal-detail"><p>{Math.round((e.end-e.start)/60000)}분 · {active?`${Math.ceil((e.end-now)/60000)}분 후 종료`:e.end<=now?'지난 시간':'예정된 시간'}</p><button className="text-button" onClick={onOpen}>시간표에서 보기 <ArrowUpRight size={14}/></button></div>}
   </div>;
 })}<div className="timeline-end">END OF DAY <span>내일은 새로운 궤도.</span></div></div>;
}

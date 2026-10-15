import {useCallback, useEffect, useState, type CSSProperties} from 'react';
import {JuggernautOpening} from './JuggernautOpening';
import {JuggernautArchive} from './JuggernautArchive';
import {ArrowLeft, ArrowRight, CalendarDays, ChevronDown, Compass, ExternalLink, Flame, Focus, GraduationCap, Layers3, Target, TimerReset, Zap} from 'lucide-react';
import './juggernaut.css';

type Stage='intro'|'arrival'|'archive'|'system'|'strategy'|'launch';
type Subject={name:string;time:string;questions:string;scope:string;note:string;doNow:string;tag:string};
const SUBJECTS:Subject[]=[
 {name:'국어',time:'80분',questions:'45문항',scope:'화법과 언어 · 독서와 작문 · 문학',note:'기존 선택과목 없이 전원 공통. 지문을 읽는 속도보다 근거를 확인하는 훈련이 중요해.',doNow:'독서 지문 하나를 읽고 문단별 핵심을 적어 보기',tag:'공통'},
 {name:'수학',time:'100분',questions:'30문항',scope:'대수 · 미적분Ⅰ · 확률과 통계',note:'단답형 9문항 포함. 미적분Ⅱ·기하는 수능 출제범위가 아니지만 고교 수업·대학별 권장과목과는 별개야.',doNow:'대수·극한 기초 문제 3개를 풀이까지 설명하기',tag:'단답형 9문항'},
 {name:'영어',time:'70분',questions:'45문항',scope:'영어Ⅰ · 영어Ⅱ를 바탕으로 출제',note:'듣기 17문항 포함, 절대평가. 지문을 해석하지 못하는 구간부터 어휘·구문 훈련이 필요해.',doNow:'짧은 지문 5문장을 끊어 해석하고 모르는 단어 기록',tag:'절대평가'},
 {name:'한국사',time:'30분',questions:'20문항',scope:'한국사 핵심 내용',note:'반드시 응시해야 해. 절대평가로 등급이 나와.',doNow:'시대별 주요 사건 5개를 시간 순서로 설명하기',tag:'필수'},
 {name:'통합사회',time:'40분',questions:'25문항',scope:'통합사회',note:'사회탐구 선택 시 통합과학도 함께 응시. 별도 점수가 산출돼.',doNow:'개념 하나를 현실 사례에 연결해 설명하기',tag:'사회+과학'},
 {name:'통합과학',time:'40분',questions:'25문항',scope:'통합과학',note:'통합사회와 둘 다 응시. 분야를 건너뛰지 않는 균형이 필요해.',doNow:'약한 개념 하나를 그림과 원인·결과로 정리하기',tag:'사회+과학'},
];
const TIMELINE=[
 {at:'08:40',name:'국어',duration:'80분',sub:'45문항'},
 {at:'10:30',name:'수학',duration:'100분',sub:'30문항 · 단답형 9'},
 {at:'13:10',name:'영어',duration:'70분',sub:'45문항 · 듣기 17'},
 {at:'14:50',name:'한국사',duration:'30분',sub:'20문항 · 필수'},
 {at:'15:35',name:'통합사회',duration:'40분',sub:'25문항'},
 {at:'16:30',name:'통합과학',duration:'40분',sub:'25문항'},
];
const PHASES=[
 {step:'01',time:'2026.10—12',title:'기초 재건',copy:'영어 어휘·구문과 수학의 기본 연산·함수·극한처럼 막히는 지점을 먼저 확인. 국어 독서 루틴과 통합사회·통합과학 핵심 개념을 함께 시작한다.'},
 {step:'02',time:'2027.01—03',title:'전 범위의 지도',copy:'국어·수학·영어·통합탐구를 빠짐없이 1회독. 교육부가 예고한 2027년 3월 시행 기본계획을 확인하고 세부 전략을 조정한다.'},
 {step:'03',time:'2027.04—08',title:'기출 원리와 실전',copy:'평가원 예시문항과 교육과정에 맞는 연습문제로 유형과 오답을 분석. 2028학년도부터 하반기 모의평가가 8월 실시되는 변경사항에 주목한다.'},
 {step:'04',time:'2027.09—11',title:'실전 리허설',copy:'실제 시험 순서로 시간 안배, 약점 재시험, 수면·컨디션 유지. 새 문제만 늘리는 대신 반복되는 실수를 줄인다.'},
];
const OFFICIAL=[
 {name:'교육부 · 2028 수능 날짜 확정',url:'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=103512&lev=0&m=020402&opType=N&s=moe'},
 {name:'교육부 · 시험 및 점수 체제',url:'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=102385&lev=0&m=020402'},
 {name:'교육부 · 2028 대입 준비 및 예시문항',url:'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=103113&lev=0&m=0204'},
 {name:'교육부 · 2028 대입 제도 확정안',url:'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=97551&lev=0&m=020402&opType=N&s=moe'},
];
function kstDate(now:number){
 const iso=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 return new Date(iso+'T00:00:00Z').getTime();
}
function remaining(now:number){return Math.max(0,Math.round((Date.UTC(2027,10,18)-kstDate(now))/86400000));}
const STAGES:{key:Stage;label:string;num:string}[]=[
 {key:'arrival',label:'각성',num:'01'},{key:'archive',label:'수능 역사',num:'02'},
 {key:'system',label:'2028 수능',num:'03'},{key:'strategy',label:'전략',num:'04'},{key:'launch',label:'실행',num:'05'},
];
export function Juggernaut({onExit,onStart}:{onExit:()=>void;onStart:()=>void}){
 const [stage,setStage]=useState<Stage>('intro');
 const [selected,setSelected]=useState(1);
 const [now,setNow]=useState(()=>Date.now());
 const [tilt,setTilt]=useState({x:0,y:0});
 const [answer,setAnswer]=useState<number|null>(null);
 const [mission,setMission]=useState('수학');
 const days=remaining(now);
 const selectedSubject=SUBJECTS[selected];
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')onExit();};
  window.addEventListener('keydown',escape);
  const bodyOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  return()=>{window.removeEventListener('keydown',escape);document.body.style.overflow=bodyOverflow;};
 },[onExit]);
 const change=useCallback((next:Stage)=>{
  setStage(next);
  document.getElementById('jg-scroll')?.scrollTo({top:0,behavior:'smooth'});
 },[]);
 const finishIntro=useCallback(()=>change('arrival'),[change]);
 return <section className="juggernaut" aria-label="007 JUGGERNAUT — 2028 수능 작전">
  {stage==='intro' ? <JuggernautOpening onComplete={finishIntro}/> : <div className="jg-scroll" id="jg-scroll">
   <header className="jg-header">
    <button className="jg-back" onClick={onExit} type="button"><ArrowLeft size={17}/> BKIT</button>
    <strong>00/7 JUGGERNAUT <span>/ 2028</span></strong>
    <span className="jg-live"><i/> 2028 CSAT</span>
   </header>
   <nav className="jg-steps" aria-label="저거너트 탐험 단계">
    {STAGES.map(s=><button key={s.key} className={stage===s.key?'is-active':''} onClick={()=>change(s.key)} type="button">
     <small>{s.num}</small>{s.label}
    </button>)}
   </nav>
   <div className="jg-content">
   {stage==='arrival'&&<div className="jg-arrival">
    <div className="jg-kicker"><span className="jg-pulse"/> OPERATION 00/7 · THE FIRST INTEGRATED CSAT</div>
    <h1>아직, <em>뒤집을</em><br/>시간이 있다.</h1>
    <p className="jg-lede">시간은 자동으로 줄어든다.<br/>실력은, 오늘부터 바꿀 수 있다.</p>
    <button type="button" className="jg-world" aria-label="3D 코어를 터치하여 2028 수능 알아보기" onClick={()=>change('archive')}
       onPointerMove={e=>{if(e.pointerType==='touch')return;const r=e.currentTarget.getBoundingClientRect();setTilt({x:((e.clientY-r.top)/r.height-.5)*-22,y:((e.clientX-r.left)/r.width-.5)*22});}}
       onPointerLeave={()=>setTilt({x:0,y:0})}
       style={{'--jx':tilt.x+'deg','--jy':tilt.y+'deg'} as CSSProperties}>
      <span className="jg-world-grid"/>
      <span className="jg-ring jg-ring-one"/>
      <span className="jg-ring jg-ring-two"/>
      <span className="jg-ring jg-ring-three"/>
      <span className="jg-core"><span>28</span><i/></span>
      <span className="jg-world-label">TOUCH TO DISCOVER <ArrowRight size={13}/></span>
    </button>
    <div className="jg-count">
      <span>2027년 11월 18일 목요일</span>
      <div><small>D</small><strong>{days===0?'DAY':'−'+days}</strong></div>
      <p>2028학년도 대학수학능력시험까지</p>
    </div>
    <p className="jg-human">꿈이 있는 건 좋다. 그 장면이 진짜가 될지는 오늘 무엇을 하느냐에 달려 있어.</p>
    <button className="jg-primary" type="button" onClick={()=>change('archive')}>기밀 파일 · 수능의 역사 열기 <ArrowRight size={18}/></button>
    <button className="jg-replay" type="button" onClick={()=>change('intro')}>오프닝 다시 보기</button>
   </div>}
   {stage==='archive'&&<JuggernautArchive onNext={()=>change('system')}/>}
   {stage==='system'&&<div className="jg-system">
    <div className="jg-section-top"><span>THE RULES HAVE CHANGED</span><h2>네가 치를 시험은<br/><em>이전과 다르다.</em></h2>
     <p>2028학년도는 첫 통합형 수능. 아래는 교육부 확정 사항이며, 대학별 전형 방식과 구별해야 해.</p></div>
    <div className="jg-breakout">
     <div><b>01</b><strong>선택과목 폐지</strong><p>국어·수학·탐구의 선택과목을 없애고 공통 체제로 전환.</p></div>
     <div><b>02</b><strong>사회 + 과학</strong><p>일반 사회·과학탐구 응시자는 통합사회·통합과학 모두 응시.</p></div>
     <div><b>03</b><strong>내신 5등급 체제</strong><p>2028학년도 대입에 적용되는 새 내신 체제. 대학별 반영은 별도 확인.</p></div>
    </div>
    <div className="jg-subject-title"><span>EXAM BLUEPRINT</span><h3>과목을 선택하면 시험 구조가 열린다.</h3></div>
    <div className="jg-subject-chips">{SUBJECTS.map((s,i)=><button key={s.name} type="button" className={selected===i?'active':''} onClick={()=>setSelected(i)}>{s.name}</button>)}</div>
    <article className="jg-subject-card" key={selectedSubject.name}>
     <div className="jg-subject-identity"><span>{selectedSubject.tag}</span><strong>{selectedSubject.name}</strong><Layers3 size={28}/></div>
     <div className="jg-subject-numbers"><div><strong>{selectedSubject.questions}</strong><span>문항 수</span></div><div><strong>{selectedSubject.time}</strong><span>시험시간</span></div></div>
     <p className="jg-scopes">{selectedSubject.scope}</p><p>{selectedSubject.note}</p>
     <div className="jg-action-suggestion"><Zap size={16}/> 지금 할 수 있는 훈련: {selectedSubject.doNow}</div>
    </article>
    <h3 className="jg-midtitle">시험 당일, 시간은 이렇게 흐른다.</h3>
    <div className="jg-timeline">{TIMELINE.map((t,i)=><div key={t.name} className="jg-time-row"><time>{t.at}</time><span className="jg-time-mark"/><div><strong>{t.name}</strong><p>{t.sub}</p></div><b>{t.duration}</b></div>)}</div>
    <div className="jg-truth"><GraduationCap size={18}/><p>한국사는 필수. 영어·한국사는 절대평가이고, 국어·수학·통합탐구는 표준점수·백분위·등급이 제공돼. 수능 기본계획 세부사항은 2027년 3월 발표 예정이므로 계속 공식 공지를 확인해야 해.</p></div>
    <button className="jg-primary" type="button" onClick={()=>change('strategy')}>그럼 어떻게 준비할까? <ArrowRight size={18}/></button>
   </div>}
   {stage==='strategy'&&<div className="jg-strategy">
    <div className="jg-section-top"><span>AN INTELLIGENT CAMPAIGN</span><h2>막연한 각오 대신,<br/><em>다음 행동.</em></h2><p>성적과 공부 시간을 꾸며서 예측하지 않아. 아래는 현재 시점에 맞춘 추천 학습 로드맵이야. 공식 시험 제도와는 구분해 봐.</p></div>
    <div className="jg-strategy-note"><Compass size={21}/><span><b>전략 / 추천</b> · 이 구역은 BKIT의 학습 제안이지 평가원 발표가 아니야.</span></div>
    <div className="jg-phases">{PHASES.map(phase=><article key={phase.step} className="jg-phase"><small>{phase.step} / {phase.time}</small><h3>{phase.title}</h3><p>{phase.copy}</p></article>)}</div>
    <h3 className="jg-midtitle">첫 통합형 수능에 대한 오해 확인</h3>
    <div className="jg-quiz">
     <p>2028학년도에 일반 사회·과학탐구를 응시한다면, 통합사회만 보고 통합과학을 건너뛸 수 있을까?</p>
     {[{label:'가능하다',correct:false},{label:'불가능하다',correct:true}].map((choice,i)=><button key={choice.label} className={answer===i?'chosen':''} type="button" onClick={()=>setAnswer(i)}>{choice.label}<ArrowRight size={15}/></button>)}
     {answer!==null&&<div className="jg-quiz-result" role="status">{answer===1?'정답.':'아쉽지만 달라.'} 일반 사회·과학탐구 응시자는 두 과목에 모두 응시해야 하고, 점수는 따로 산출돼.</div>}
    </div>
    <div className="jg-truth"><CalendarDays size={18}/><p>공식 일정: 2027년 11월 18일 수능, 12월 10일 성적 통지. 2028학년도부터 하반기 수능 모의평가는 기존 9월에서 8월로 변경돼.</p></div>
    <button className="jg-primary" type="button" onClick={()=>change('launch')}>내 첫 미션 선택하기 <ArrowRight size={18}/></button>
   </div>}
   {stage==='launch'&&<div className="jg-launch">
    <div className="jg-section-top"><span>FROM EMOTION TO EXECUTION</span><h2>달라질 수 있는 건<br/><em>지금부터.</em></h2><p>하루 전체를 바꾸겠다고 약속할 필요 없어. 오늘 첫 20분만 실제로 시작해 보자.</p></div>
    <div className="jg-launch-orbit"><span className="jg-launch-ring"/><Target size={56}/><strong>20<span>MIN</span></strong><small>FIRST MISSION</small></div>
    <h3 className="jg-midtitle">오늘 시작할 과목은?</h3>
    <div className="jg-missions">
      {['수학','영어','국어','통합사회','통합과학'].map(name=><button key={name} className={mission===name?'active':''} onClick={()=>setMission(name)} type="button">{name}<span>{mission===name?'선택됨':'선택'}</span></button>)}
    </div>
    <div className="jg-mission-instruction"><Flame size={21}/><div><span>TODAY'S ORDER</span><strong>{mission} · 20분 시작</strong><p>{SUBJECTS.find(s=>s.name===mission)?.doNow}. 끝나면 틀린 이유 하나를 남겨.</p></div></div>
    <button className="jg-primary jg-action-final" type="button" onClick={onStart}>BKIT 집중 화면으로 이동 <ArrowRight size={18}/></button>
    <p className="jg-launch-small">타이머를 자동으로 켜거나 기록을 조작하지 않아. BKIT 집중 화면에서 직접 시작해.</p>
   </div>}
   <footer className="jg-footer">
    <span>FACTS FIRST. THE FUTURE IS NOT FIXED.</span>
    <details><summary>공식 출처 및 정보 갱신 안내 <ChevronDown size={14}/></summary>
     <p>확정: 교육부가 발표한 시험일·시험 구조. 예상: 위 학습 로드맵과 행동 추천. 대학별 지원 가능성·모집요강·점수 컷은 여기서 예측하지 않음. 2026.10 기준 작성.</p>
     {OFFICIAL.map(s=><a key={s.name} target="_blank" rel="noopener noreferrer" href={s.url}>{s.name} <ExternalLink size={12}/></a>)}
    </details>
   </footer>
   </div>
  </div>}
 </section>;
}

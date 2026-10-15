import {useState} from 'react';
import {ArrowRight, Clock3, FileSearch2, Fingerprint, LockKeyhole, ScrollText, ShieldAlert, ExternalLink} from 'lucide-react';
import './juggernaut-archive.css';

const FILES=[
 {year:'1994',when:'1993 / THE BEGINNING',title:'수능은 원래\n두 번이었다.',sub:'최초의 수능',codename:'PROJECT ORIGIN',
  text:'1994학년도 첫 수능은 1993년 8월과 11월, 실제로 두 차례 실시됐다. 다음 학년도부터는 한 번으로 바뀌었다.',
  twist:'당시 시험은 언어·수리탐구·외국어 3개 영역이었다.',source:'연합뉴스 · 수능 변천사',url:'https://www.yna.co.kr/view/AKR20170512168600004',symbol:'94'},
 {year:'2005',when:'2004 / THE CHOICE',title:'선택의 시대가\n시작됐다.',sub:'선택형 체제로의 전환',codename:'PROJECT DIVIDE',
  text:'2005학년도에는 7차 교육과정에 따라 전 영역 선택형 수능이 도입되고, 직업탐구 영역 등이 신설됐다.',
  twist:'과목을 고르는 결정 자체가 입시 전략의 일부가 됐다.',source:'연합뉴스 · 수능 변천사',url:'https://www.yna.co.kr/view/AKR20170512168600004',symbol:'05'},
 {year:'2018',when:'2017 / THE ABSOLUTE',title:'영어의 규칙이\n바뀌었다.',sub:'영어 절대평가',codename:'PROJECT SHIFT',
  text:'2018학년도부터 수능 영어는 9등급 절대평가가 적용됐다. 90점 이상이면 1등급을 받는 체제다.',
  twist:'‘몇 명을 이기느냐’보다 ‘기준을 넘느냐’가 중요해진 영역.',source:'대한민국 정책브리핑 · 교육부',url:'https://www.korea.kr/news/policyNewsView.do?newsId=148801559&pWise=sub&pWiseSub=J1',symbol:'18'},
 {year:'2028',when:'2027 / YOUR OPERATION',title:'이제 너의 시대가\n시작된다.',sub:'첫 선택과목 없는 통합형',codename:'PROJECT JUGGERNAUT',
  text:'2028학년도는 국어·수학·탐구 선택과목이 폐지되는 첫 통합형 수능. 2027년 11월 18일에 치러진다.',
  twist:'일반 사회·과학탐구는 통합사회·통합과학을 모두 응시한다.',source:'교육부 · 2028 수능 시행일',url:'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=103512&lev=0',symbol:'28'},
];
export function JuggernautArchive({onNext}:{onNext:()=>void}){
 const [open,setOpen]=useState(0);
 const file=FILES[open];
 return <div className="jg-archive">
  <div className="jg-section-top">
    <span><Fingerprint size={16}/> ARCHIVE / CLASSIFIED</span>
    <h2>이 시험에는<br/><em>역사가 있다.</em></h2>
    <p>수능은 처음부터 지금 모습이 아니었어. 기밀 문서처럼 시대를 하나씩 열어봐. 마지막 파일은 네가 치를 시험이야.</p>
  </div>
  <div className="jg-archive-ruler" aria-label="수능 역사 작전 파일">
   {FILES.map((entry,i)=><button type="button" key={entry.year} aria-current={open===i?'step':undefined}
     className={open===i?'active':''} onClick={()=>setOpen(i)}>
    <span>{entry.year}</span><small>{i===3?'YOUR YEAR':'ARCHIVE 0'+(i+1)}</small>
   </button>)}
  </div>
  <article className="jg-file" key={file.year}>
   <div className="jg-file-stamp"><LockKeyhole size={14}/> DECLASSIFIED / {file.codename}</div>
   <div className="jg-file-graphic" aria-hidden="true"><div className="jg-file-orbits"/><span>{file.symbol}</span></div>
   <div className="jg-file-meta"><span>CASE {String(open+1).padStart(2,'0')} / 04</span><span>{file.when}</span></div>
   <h3>{file.title.split('\n').map((part,i)=><span key={i}>{part}<br/></span>)}</h3>
   <strong className="jg-file-sub">{file.sub}</strong>
   <p>{file.text}</p>
   <div className="jg-file-twist"><FileSearch2 size={17}/><span>HIDDEN DETAIL <strong>{file.twist}</strong></span></div>
   <a href={file.url} target="_blank" rel="noopener noreferrer">{file.source} <ExternalLink size={13}/></a>
  </article>
  <div className="jg-archive-compare"><Clock3 size={18}/><div><strong>1994 → 2028</strong><span>시험의 규칙은 달라졌다. 다음 작전은 현재의 규칙을 파악하는 것.</span></div></div>
  <button type="button" className="jg-primary" onClick={onNext}>MISSION 02 · 2028 시험 구조 해독 <ArrowRight size={18}/></button>
  <p className="jg-archive-disclaimer"><ShieldAlert size={14}/> 이 구역은 확인된 수능 변천사이며, 영화적 분위기는 이해를 돕는 연출이야.</p>
 </div>;
}

import { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, ExternalLink, Heart, ListFilter, Newspaper, Search, Star, Trophy, X } from 'lucide-react';
import { AI_GROUPS, AI_NEWS_LINKS, AI_TOOLS, AGENT_SNAPSHOT, RANK_SOURCES, externalAIUrl } from './aiZoneData';
import './ai-zone.css';

type Section='directory'|'ranking'|'news';
const KEY='bkit.ai-zone.favorites.v1';
function readFavorites():string[]{
  try {const raw=localStorage.getItem(KEY);const parsed=raw?JSON.parse(raw):[];return Array.isArray(parsed)?parsed.filter((id):id is string=>typeof id==='string'&&AI_TOOLS.some(t=>t.id===id)):[];}
  catch {return [];}
}
export function AIZone(){
 const [section,setSection]=useState<Section>('directory');
 const [query,setQuery]=useState('');
 const [group,setGroup]=useState<string>('전체');
 const [starred,setStarred]=useState(false);
 const [favorites,setFavorites]=useState<string[]>(readFavorites);
 const [saveError,setSaveError]=useState(false);
 const [expanded,setExpanded]=useState<string|null>(null);
 const [rankGroup,setRankGroup]=useState('overall');
 const results=useMemo(()=>{
  const term=query.trim().toLocaleLowerCase('ko-KR');
  return AI_TOOLS.filter(t=>(group==='전체'||t.group===group)&&(!starred||favorites.includes(t.id))&&(!term||[t.name,t.best,t.versions,t.group,t.how,t.tags].some(s=>s.toLocaleLowerCase('ko-KR').includes(term))))
  .sort((a,b)=>Number(favorites.includes(b.id))-Number(favorites.includes(a.id)));
 },[query,group,starred,favorites]);
 function toggleFavorite(id:string){
  const next=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];
  try{localStorage.setItem(KEY,JSON.stringify(next));setFavorites(next);setSaveError(false);}
  catch{setSaveError(true);}
 }
 const source=RANK_SOURCES.find(x=>x.id===rankGroup)??RANK_SOURCES[0];
 return <section className="ai-zone" aria-label="BKIT AI ZONE">
  <div className="ai-zone-hero">
   <span className="ai-zone-eyebrow">BKIT / KNOWLEDGE INDEX</span>
   <h2>AI ZONE<span className="ai-zone-dot">.</span></h2>
   <p>필요한 AI를 찾고, 제대로 사용하는 법까지. 광고 순위가 아닌 출처가 있는 지식 저장소.</p>
   <div className="ai-zone-hero-meta"><span>{AI_TOOLS.length}개 도구</span><span>8개 학습·창작 분야</span><span>공식 링크 제공</span></div>
  </div>
  <div className="ai-zone-switch" role="group" aria-label="AI ZONE 화면 선택">
   <button type="button" aria-pressed={section==='directory'} className={section==='directory'?'active':''} onClick={()=>setSection('directory')}><BookOpen size={17}/> AI 백과사전</button>
   <button type="button" aria-pressed={section==='ranking'} className={section==='ranking'?'active':''} onClick={()=>setSection('ranking')}><Trophy size={17}/> 세계 순위</button>
   <button type="button" aria-pressed={section==='news'} className={section==='news'?'active':''} onClick={()=>setSection('news')}><Newspaper size={17}/> AI 최신 소식</button>
  </div>
  {section==='directory'&&<>
   <div className="ai-zone-find"><Search size={19} aria-hidden="true"/><input type="search" aria-label="AI 도구 검색" value={query} placeholder="영상 생성, NotebookLM, 코딩, GPT, 무료…" onChange={e=>setQuery(e.target.value)}/>{query&&<button type="button" aria-label="검색어 지우기" onClick={()=>setQuery('')}><X size={17}/></button>}</div>
   <div className="ai-zone-filters" role="group" aria-label="AI 분야 선택">{AI_GROUPS.map(c=><button key={c} className={c===group?'active':''} aria-pressed={c===group} type="button" onClick={()=>setGroup(c)}>{c}</button>)}</div>
   <div className="ai-zone-result-head"><span><ListFilter size={15}/> {results.length}개 도구</span><button type="button" aria-pressed={starred} onClick={()=>setStarred(x=>!x)}><Star size={16} fill={starred?'currentColor':'none'}/> 즐겨찾기 {favorites.length}</button></div>
   {saveError&&<p role="alert" className="ai-zone-warning">저장 공간에 접근할 수 없어 즐겨찾기를 보존하지 못했습니다. Safari 설정을 확인해 주세요.</p>}
   {results.length===0?<div className="ai-zone-empty">검색 결과가 없어. 다른 단어로 검색하거나 필터를 초기화해 봐.
    <button type="button" onClick={()=>{setQuery('');setGroup('전체');setStarred(false);}}>전체 보기</button></div>:
    <div className="ai-zone-grid">{results.map(t=><article className="ai-zone-tool" key={t.id}>
      <div className="ai-zone-tool-heading"><span className="ai-zone-monogram" aria-hidden="true">{t.name.slice(0,2).toUpperCase()}</span><span className="ai-zone-type">{t.group}</span><button type="button" title="즐겨찾기" className="ai-zone-star" aria-label={t.name+(favorites.includes(t.id)?' 즐겨찾기 해제':' 즐겨찾기 추가')} aria-pressed={favorites.includes(t.id)} onClick={()=>toggleFavorite(t.id)}><Star size={20} fill={favorites.includes(t.id)?'currentColor':'none'}/></button></div>
      <h3>{t.name}</h3><p className="ai-zone-description">{t.best}</p>
      <p className="ai-zone-model"><span>모델 / 버전</span><strong>{t.versions}</strong></p>
      <div className="ai-zone-tool-actions"><a href={externalAIUrl(t.url)} target="_blank" rel="noopener noreferrer">도구 열기 <ExternalLink size={15}/></a><button type="button" onClick={()=>setExpanded(expanded===t.id?null:t.id)} aria-expanded={expanded===t.id}>{expanded===t.id?'사용법 닫기':'사용법 · 한도'} <ArrowRight size={15}/></button></div>
      {expanded===t.id&&<div className="ai-zone-tool-detail"><strong>이럴 때 사용해 봐</strong><p>{t.how}</p><strong>무료·유료 한도</strong><p>{t.limits}</p><div className="ai-zone-detail-links"><a href={externalAIUrl(t.billing)} target="_blank" rel="noopener noreferrer">공식 요금·한도 <ExternalLink size={13}/></a><a href={externalAIUrl(t.docs)} target="_blank" rel="noopener noreferrer">도움말·모델 버전 <ExternalLink size={13}/></a></div></div>}
     </article>)}</div>}
   <p className="ai-zone-disclaimer"><Heart size={15}/> 즐겨찾기는 이 기기에만 저장돼요. AI의 무료 횟수·모델 접근권한·요금은 자주 변경돼요. 공식 페이지에서 최종 확인하세요.</p>
  </>}
  {section==='ranking'&&<div className="ai-zone-rank">
    <div className="ai-zone-section-head"><span className="ai-zone-eyebrow">EVIDENCE / NOT AN ABSOLUTE SCORE</span><h3>분야별 AI 리더보드</h3><p>‘세계에서 가장 똑똑한 AI’ 한 개의 공식 순위는 없어. 분야·모델 버전·추론 설정에 따라 달라지므로 측정한 지표별로 분리해 보여줘.</p></div>
    <div className="ai-zone-filters" role="group" aria-label="AI 순위 분야">{RANK_SOURCES.map(s=><button key={s.id} type="button" className={rankGroup===s.id?'active':''} aria-pressed={rankGroup===s.id} onClick={()=>setRankGroup(s.id)}>{s.label}</button>)}</div>
    <div className="ai-zone-source-head"><span>{source.what} · {source.scope}</span><a href={externalAIUrl(source.url)} target="_blank" rel="noopener noreferrer">공식 최신 순위 전체 보기 <ExternalLink size={16}/></a></div>
    {rankGroup==='overall'?<>
     <p className="ai-zone-rank-time">기록된 순위: {AGENT_SNAPSHOT.checkedAt} · 출처: <a href={externalAIUrl(AGENT_SNAPSHOT.source)} target="_blank" rel="noopener noreferrer">{AGENT_SNAPSHOT.sourceName}</a></p>
     <p className="ai-zone-rank-note">{AGENT_SNAPSHOT.method}. 아래는 당시 발표된 상위 10개 모델 설정이며 실시간 순위가 아닙니다.</p>
     <div className="ai-zone-ranking-list">{AGENT_SNAPSHOT.ranking.map(x=><div className="ai-zone-ranking-row" key={x.rank}><span className="ai-zone-rank-no">#{x.rank}</span><span className="ai-zone-rank-name"><strong>{x.model}</strong><small>설정 · {x.variant}</small></span><span className="ai-zone-rank-score">{x.value}</span></div>)}</div>
     <p className="ai-zone-rank-bottom">원문에 100위까지 공개되지 않은 경우에는 임의로 숫자나 순위를 채우지 않습니다. <a href={externalAIUrl(source.url)} target="_blank" rel="noopener noreferrer">전체 모델 보기 <ExternalLink size={14}/></a></p>
    </>:<div className="ai-zone-source-detail"><Trophy size={23}/><h4>최신 순위는 공식 평가처에서 확인</h4><p>{source.limits}</p><p>이 분야의 순위는 아직 BKIT 내부에 검증된 데이터가 없어서 수치를 임의로 만들지 않았어. 원본에서 모델명·버전·평가 설정·표본 수를 확인할 수 있어.</p><a href={externalAIUrl(source.url)} target="_blank" rel="noopener noreferrer">최신 {source.domain} 순위 열기 <ExternalLink size={16}/></a></div>}
   </div>}
  {section==='news'&&<div className="ai-zone-news">
    <div className="ai-zone-section-head"><span className="ai-zone-eyebrow">OFFICIAL SOURCES / DIRECT LINKS</span><h3>AI 최신 소식</h3><p>공식 발표를 빠르게 확인할 수 있는 출처 모음. 아직 BKIT 자체 뉴스 자동 수집이나 즉시 알림은 연결하지 않았어. 자동 갱신된 기사인 것처럼 표시하지 않아.</p></div>
    <div className="ai-zone-news-grid">{AI_NEWS_LINKS.map(x=><a key={x.url} href={externalAIUrl(x.url)} target="_blank" rel="noopener noreferrer"><span><Newspaper size={21}/><strong>{x.label}</strong><small>{x.desc}</small></span><ExternalLink size={18}/></a>)}</div>
    <p className="ai-zone-disclaimer">원문 발표 날짜와 모델 버전, 사용 국가, 요금제에 따른 제한을 확인하세요. 외부 사이트 내용은 BKIT이 보증하지 않습니다.</p>
   </div>}
 </section>;
}

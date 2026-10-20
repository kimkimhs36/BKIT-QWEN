import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, ExternalLink, Search, X } from 'lucide-react';
import { FEATURE_DESTINATIONS, STUDY_SITES, externalStudyUrl, matchStudySite } from './studySites';
import { AI_TOOLS, externalAIUrl } from './aiZoneData';
import './global-search.css';

type Result = {kind:'feature';id:string;name:string;description:string;route:string} |
  {kind:'site';id:string;name:string;description:string;url:string} |
  {kind:'ai';id:string;name:string;description:string;url:string};
export function GlobalSearch({onNavigate}:{onNavigate:(route:string)=>void}) {
  const [value,setValue]=useState('');
  const [expanded,setExpanded]=useState(false);
  const container=useRef<HTMLDivElement>(null);
  const field=useRef<HTMLInputElement>(null);
  const results=useMemo(()=>{
    const term=value.trim().toLocaleLowerCase('ko-KR');
    const features=FEATURE_DESTINATIONS.filter(x=>!term||[x.name,x.description,x.keywords].some(s=>s.toLocaleLowerCase('ko-KR').includes(term)))
      .slice(0,term?7:4).map(x=>({...x,kind:'feature' as const}));
    const sites=STUDY_SITES.filter(x=>matchStudySite(x,term)).slice(0,term?7:4)
      .map(x=>({kind:'site' as const,id:x.id,name:x.name,description:x.description,url:x.url}));
    const ai=term?AI_TOOLS.filter(x=>[x.name,x.best,x.versions,x.group,x.tags].some(s=>s.toLocaleLowerCase('ko-KR').includes(term)))
      .slice(0,5).map(x=>({kind:'ai' as const,id:x.id,name:x.name,description:x.best,url:x.url})):[];
    return [...features,...sites,...ai] as Result[];
  },[value]);
  useEffect(()=>{
    const down=(e:PointerEvent)=>{
      if(container.current&&!container.current.contains(e.target as Node))setExpanded(false);
    };
    const hotkey=(e:KeyboardEvent)=>{
      if(e.key==='Escape') {setExpanded(false);field.current?.blur();return;}
      const target=e.target;
      if(e.key==='/' && !e.ctrlKey&&!e.metaKey&&!e.altKey &&
        !(target instanceof HTMLInputElement)&&!(target instanceof HTMLTextAreaElement)&&
        !(target instanceof HTMLSelectElement)&&!(target instanceof HTMLElement && target.isContentEditable)&&
        !document.querySelector('dialog[open]')) {
        e.preventDefault();field.current?.focus();setExpanded(true);
      }
    };
    document.addEventListener('pointerdown',down);
    window.addEventListener('keydown',hotkey);
    return()=>{document.removeEventListener('pointerdown',down);window.removeEventListener('keydown',hotkey);};
  },[]);
  function choose(result:Result) {
    setExpanded(false);setValue('');field.current?.blur();
    if(result.kind==='feature') {onNavigate(result.route);return;}
    window.open(result.kind==='ai'?externalAIUrl(result.url):externalStudyUrl(result.url),'_blank','noopener,noreferrer');
  }
  return <div className="bkit-quick-search" role="search" ref={container}>
    <div className="bkit-quick-search-field">
      <Search size={19} aria-hidden="true" />
      <input ref={field} type="search" value={value} aria-label="BKIT 기능 및 학습 사이트 검색"
        aria-expanded={expanded} aria-controls="bkit-search-results" autoComplete="off"
        placeholder="기능·AI·사이트 검색  예: Sora, GPT, 수행평가"
        onFocus={()=>setExpanded(true)} onChange={e=>{setValue(e.target.value);setExpanded(true);}}
        onKeyDown={e=>{if(e.key==='Enter'&&results.length){e.preventDefault();choose(results[0]);}}}/>
      {value&&<button type="button" aria-label="검색어 지우기" onClick={()=>{setValue('');field.current?.focus();}}>
        <X size={16}/></button>}
      <kbd aria-hidden="true">/</kbd>
    </div>
    {expanded&&<div className="bkit-search-results" id="bkit-search-results" role="region" aria-label="통합검색 결과">
      <p className="bkit-search-hint">{value.trim()?'검색 결과':'자주 쓰는 기능과 사이트'} · {results.length}개</p>
      {results.length?results.map(result=><button key={result.kind+result.id} type="button" className="bkit-search-hit" onClick={()=>choose(result)}>
        {result.kind==='feature'?<ArrowRight size={17} aria-hidden="true"/>:<ExternalLink size={17} aria-hidden="true"/>}
        <span><strong>{result.name}</strong><small>{result.description}</small></span>
        <em>{result.kind==='feature'?'기능':result.kind==='ai'?'AI ↗':'사이트 ↗'}</em>
      </button>):<p className="bkit-search-empty">검색 결과가 없어요. 다른 단어로 찾아보세요.</p>}
      <button type="button" className="bkit-search-all" onClick={()=>choose({kind:'feature',id:'sites',route:'sites',name:'공부 사이트 백과사전',description:''})}>
        <BookOpen size={16}/> 공부 사이트 전체 보기 <ArrowRight size={15}/>
      </button>
    </div>}
  </div>;
}

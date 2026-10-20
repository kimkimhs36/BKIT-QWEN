import { useMemo, useState } from 'react';
import { ExternalLink, Heart, LibraryBig, Search, Star, X } from 'lucide-react';
import { SITE_CATEGORIES, STUDY_SITES, externalStudyUrl, matchStudySite } from './studySites';
import './study-directory.css';

export const SITE_FAVORITES_KEY = 'bkit.study-site-favorites.v1';
function restoreFavorites(): string[] {
  try {
    const raw=localStorage.getItem(SITE_FAVORITES_KEY);
    const value=raw?JSON.parse(raw):[];
    return Array.isArray(value) ? [...new Set(value.filter((id):id is string=>typeof id==='string' && STUDY_SITES.some(s=>s.id===id)))] : [];
  } catch { return []; }
}
export function StudyDirectory({ onNotice }: {onNotice?:(message:string)=>void}) {
  const [search,setSearch]=useState('');
  const [category,setCategory]=useState('전체');
  const [onlyFavorites,setOnlyFavorites]=useState(false);
  const [favorites,setFavorites]=useState<string[]>(restoreFavorites);
  const [storageWarning,setStorageWarning]=useState(false);
  const filtered=useMemo(()=>{
    const matched=STUDY_SITES.filter(s=>(category==='전체'||s.category===category)&&(!onlyFavorites||favorites.includes(s.id))&&matchStudySite(s,search));
    return [...matched].sort((a,b)=>Number(favorites.includes(b.id))-Number(favorites.includes(a.id)));
  },[search,category,onlyFavorites,favorites]);

  function toggleFavorite(id:string) {
    const next=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];
    try { localStorage.setItem(SITE_FAVORITES_KEY,JSON.stringify(next)); setFavorites(next);setStorageWarning(false); }
    catch {setStorageWarning(true);onNotice?.('즐겨찾기가 저장되지 않았어요. Safari 저장 공간을 확인하세요.');}
  }
  return <section className="study-directory" aria-label="공부 사이트 백과사전">
    <div className="study-directory-intro">
      <LibraryBig size={25} aria-hidden="true"/>
      <div><h2>공부 사이트 백과사전</h2>
        <p>검색하러 나가지 말고 필요한 곳으로 바로 이동해요. 사이트는 BKIT와 제휴된 서비스가 아닙니다.</p>
      </div>
    </div>
    <div className="study-directory-search">
      <Search size={19} aria-hidden="true"/>
      <input aria-label="공부 사이트 찾기" placeholder="EBS, 영어 단어, 한국사, 자동차 공학…" value={search} onChange={e=>setSearch(e.target.value)}/>
      {search&&<button type="button" aria-label="사이트 검색어 지우기" onClick={()=>setSearch('')}><X size={17}/></button>}
    </div>
    <div className="study-directory-categories" role="group" aria-label="공부 사이트 분류">
      {['전체',...SITE_CATEGORIES].map(c=><button key={c} type="button" className={category===c?'selected':''}
        aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}</button>)}
    </div>
    <div className="study-directory-controls">
      <span>{filtered.length}개 사이트 · 전체 {STUDY_SITES.length}개</span>
      <button type="button" className={onlyFavorites?'active':''} onClick={()=>setOnlyFavorites(v=>!v)}
        aria-pressed={onlyFavorites}><Star size={16} fill={onlyFavorites?'currentColor':'none'}/> 즐겨찾기만 {favorites.length}</button>
    </div>
    {storageWarning&&<p className="study-directory-warning" role="alert">즐겨찾기를 저장할 수 없어요. 기존 즐겨찾기는 변경하지 않았습니다.</p>}
    {filtered.length===0?<div className="study-directory-empty" role="status">찾는 사이트가 없어요. 다른 검색어를 입력하거나 분류를 초기화해 보세요.
      <button type="button" onClick={()=>{setSearch('');setCategory('전체');setOnlyFavorites(false);}}>전체 보기</button>
    </div>:<div className="study-directory-grid">
      {filtered.map(s=><article className="study-site-card" key={s.id}>
        <div className="study-site-card-head">
          <span className="study-site-mark" aria-hidden="true">{s.name.slice(0,2)}</span>
          <span className="study-site-category">{s.category}</span>
          <button type="button" className="study-site-star" aria-label={s.name+(favorites.includes(s.id)?' 즐겨찾기 해제':' 즐겨찾기 추가')}
            aria-pressed={favorites.includes(s.id)} onClick={()=>toggleFavorite(s.id)}
            title={favorites.includes(s.id)?'즐겨찾기 해제':'즐겨찾기 추가'}>
            <Star size={21} fill={favorites.includes(s.id)?'currentColor':'none'} />
          </button>
        </div>
        <h3>{s.name}</h3>
        <p>{s.description}</p>
        {s.note&&<small>{s.note}</small>}
        <a href={externalStudyUrl(s.url)} target="_blank" rel="noopener noreferrer" aria-label={s.name+' 새 탭에서 열기'}>
          사이트 열기 <ExternalLink size={15} aria-hidden="true" />
        </a>
      </article>)}
    </div>}
    <p className="study-directory-footnote"><Heart size={14} aria-hidden="true"/> 즐겨찾기는 현재 기기에 보관돼요. 외부 사이트에 들어가도 BKIT 공부 기록은 전송하지 않으며, 외부 사이트의 이용약관과 로그인 정책이 적용됩니다.</p>
  </section>;
}

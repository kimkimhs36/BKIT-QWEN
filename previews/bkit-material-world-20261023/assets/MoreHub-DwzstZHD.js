import{j as a}from"./react-vendor-DENrKhsk.js";import{N as i,$ as d,a0 as o,a1 as n,O as r,a2 as c}from"./index-TuLOe7LA.js";import{L as h}from"./library-big-C1waY8qK.js";import"./schema-vendor-DYuAzjeD.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=i("Bot",[["path",{d:"M12 8V4H8",key:"hb8ula"}],["rect",{width:"16",height:"12",x:"4",y:"8",rx:"2",key:"enze0r"}],["path",{d:"M2 14h2",key:"vft8re"}],["path",{d:"M20 14h2",key:"4cs60a"}],["path",{d:"M15 13v2",key:"1xurst"}],["path",{d:"M9 13v2",key:"rq6x2g"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b=i("FileStack",[["path",{d:"M21 7h-3a2 2 0 0 1-2-2V2",key:"9rb54x"}],["path",{d:"M21 6v6.5c0 .8-.7 1.5-1.5 1.5h-7c-.8 0-1.5-.7-1.5-1.5v-9c0-.8.7-1.5 1.5-1.5H17Z",key:"1059l0"}],["path",{d:"M7 8v8.8c0 .3.2.6.4.8.2.2.5.4.8.4H15",key:"16874u"}],["path",{d:"M3 12v8.8c0 .3.2.6.4.8.2.2.5.4.8.4H11",key:"k2ox98"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=i("ScanText",[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2",key:"aa7l1z"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2",key:"4qcy5o"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2",key:"6vwrx8"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2",key:"ioqczr"}],["path",{d:"M7 8h8",key:"1jbsf9"}],["path",{d:"M7 12h10",key:"b7w52i"}],["path",{d:"M7 16h6",key:"1vyc9m"}]]),x=[{id:"materials",label:"공부 자료",detail:"PDF · 사진 · 문제집",icon:b},{id:"school",label:"시간표",detail:"학교 · 학원 · 일정",icon:d},{id:"exams",label:"시험 관리",detail:"범위와 준비 항목",icon:o},{id:"ai-zone",label:"AI ZONE",detail:"나에게 맞는 AI 도구",icon:n},{id:"sites",label:"공부 사이트",detail:"강의 · 기출 · 즐겨찾기",icon:h},{id:"sleep",label:"수면 루틴",detail:"Sleep Guard",icon:r},{id:"briefing",label:"공지 정리",detail:"사진과 글을 과제로",icon:k},{id:"settings",label:"설정",detail:"테마 · 백업 · 연동",icon:c}];function j({onNavigate:l,onCapture:s,onAssistant:t}){return a.jsxs("section",{className:"more-hub","aria-label":"추가 학습 도구",children:[a.jsx("nav",{"aria-label":"추가 도구",children:x.map(e=>a.jsxs("button",{className:"more-hub-link","aria-label":e.label,onClick:()=>e.id==="briefing"?s():l(e.id),children:[a.jsx("span",{className:"tool-symbol",children:a.jsx(e.icon,{size:22,strokeWidth:1.7,"aria-hidden":"true"})}),a.jsxs("span",{children:[a.jsx("strong",{children:e.label}),a.jsx("small",{children:e.detail})]})]},e.id))}),a.jsxs("button",{className:"tools-assistant","aria-label":"BKIT 비서 열기",onClick:t,children:[a.jsx(p,{size:18}),"BKIT 학습 비서"]})]})}export{j as MoreHub};

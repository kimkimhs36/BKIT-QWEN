/**
 * BKIT public study-site directory. External websites are not BKIT partners.
 * Always open links explicitly: no tracking, iframe embedding or user-data sync.
 */
export const SITE_CATEGORIES = ['고교 인강','공교육·기출','수학·과학','영어·국어','사회·한국사','진학·진로','공학·탐구','학습 도구'] as const;
export type SiteCategory = typeof SITE_CATEGORIES[number];
export type StudySite = {
  id: string;
  name: string;
  url: string;
  category: SiteCategory;
  description: string;
  keywords: string;
  note?: string;
};
const site = (id:string,name:string,url:string,category:SiteCategory,description:string,keywords='',note?:string):StudySite =>
  ({id,name,url,category,description,keywords,note});

export const STUDY_SITES: readonly StudySite[] = [
  site('ebsi','EBSi','https://www.ebsi.co.kr/','고교 인강','무료 고교 강좌, 모의고사와 기출 자료','이비에스 수능 고1 고2 고3 내신'),
  site('mega','메가스터디','https://www.megastudy.net/','고교 인강','고교 인강, 교재, 입시 학습 서비스','메가패스 메가 인강','유료 강좌·로그인이 필요할 수 있음'),
  site('mimac','대성마이맥','https://www.mimacstudy.com/','고교 인강','고교 강좌와 수능 대비 자료','대성 인강','유료 강좌·로그인이 필요할 수 있음'),
  site('etoos','이투스','https://www.etoos.com/','고교 인강','고교 온라인 강의와 입시 정보','인강 수능','유료 강좌·로그인이 필요할 수 있음'),
  site('ebs','EBS','https://www.ebs.co.kr/','고교 인강','방송 교육 콘텐츠와 강좌','교육방송'),
  site('ebsmath','EBSMath','https://www.ebsmath.co.kr/','고교 인강','영상과 체험형 수학 개념 학습','기초 수학'),
  site('ebsmiddle','EBS 중학','https://mid.ebs.co.kr/','고교 인강','고교 과정에 필요한 중학 기초 보충','중학 프리미엄 중학교'),

  site('edunet','에듀넷','https://www.edunet.net/','공교육·기출','학교 수업·학습 자료를 찾는 공교육 포털','교육부 티클리어 디지털교과서'),
  site('kice','한국교육과정평가원','https://www.kice.re.kr/','공교육·기출','수능·모의평가와 국가 교육평가 공식 안내','평가원 기출'),
  site('ebsi-papers','EBSi 모의고사·기출','https://www.ebsi.co.kr/','공교육·기출','EBSi에서 고2 모의고사 문제와 해설 찾아보기','전국연합학력평가 6월 9월 10월'),
  site('schoolinfo','학교알리미','https://www.schoolinfo.go.kr/','공교육·기출','학교별 공시·교육 현황 확인','학교정보'),
  site('keris','한국교육학술정보원','https://www.keris.or.kr/','공교육·기출','디지털 교육·교육정보 서비스 안내','KERIS'),

  site('khan','칸아카데미','https://ko.khanacademy.org/','수학·과학','개념 영상과 단계별 무료 연습문제','khan academy'),
  site('desmos','Desmos','https://www.desmos.com/calculator?lang=ko','수학·과학','함수 그래프와 방정식 시각화','데스모스 미적분 극한'),
  site('geogebra','GeoGebra','https://www.geogebra.org/','수학·과학','기하·대수·그래프 탐구 도구','지오지브라'),
  site('phet','PhET','https://phet.colorado.edu/ko/','수학·과학','힘·운동·전기·화학 인터랙티브 시뮬레이션','물리 실험 역학'),
  site('scienceall','사이언스올','https://www.scienceall.com/','수학·과학','과학 개념·탐구 기사와 학습 콘텐츠','한국과학창의재단'),
  site('wolfram','WolframAlpha','https://www.wolframalpha.com/','수학·과학','수학 계산과 과학 지식 검색','적분 방정식 계산','일부 풀이 기능 유료'),
  site('nasa','NASA Science','https://science.nasa.gov/','수학·과학','우주와 과학의 공식 자료','천문 우주 영어'),

  site('stdict','표준국어대사전','https://stdict.korean.go.kr/','영어·국어','국립국어원 표준 어휘 사전','국어 뜻 맞춤법'),
  site('opendict','우리말샘','https://opendict.korean.go.kr/','영어·국어','한국어 어휘와 쓰임 검색','국어 국립국어원'),
  site('naverdict','네이버 사전','https://dict.naver.com/','영어·국어','영어·국어 등 단어 뜻과 예문','영단어 숙어 어휘'),
  site('cambridge','Cambridge Dictionary','https://dictionary.cambridge.org/','영어·국어','영영 정의, 발음, 예문','영어 회화'),
  site('oxford','Oxford Learner’s Dictionaries','https://www.oxfordlearnersdictionaries.com/','영어·국어','학습자용 영영사전','영어 발음'),
  site('quizlet','Quizlet','https://quizlet.com/','영어·국어','단어 카드와 암기 세트','플래시카드','일부 기능 유료'),

  site('ourhistory','우리역사넷','https://contents.history.go.kr/','사회·한국사','한국사 시대별 교과서·사료·해설','국사편찬위원회 왕조 근현대사'),
  site('historydb','한국사데이터베이스','https://db.history.go.kr/','사회·한국사','한국사 원전·사료 검색','역사 자료'),
  site('kosis','국가통계포털 KOSIS','https://kosis.kr/','사회·한국사','사회·경제 보고서에 활용할 국가 통계','인구 물가 GDP 경제 수행'),
  site('ecos','한국은행 ECOS','https://ecos.bok.or.kr/','사회·한국사','한국은행 경제통계 검색','금리 환율 물가 경제'),
  site('kdi','KDI 경제교육·연구','https://www.kdi.re.kr/','사회·한국사','경제 현안과 연구 자료','경제학 보고서'),
  site('law','국가법령정보센터','https://www.law.go.kr/','사회·한국사','법령 원문과 관련 정보를 찾는 공식 사이트','정치 법 사회'),

  site('adiga','대입정보포털 어디가','https://www.adiga.kr/','진학·진로','대학·학과·전형 정보 찾기','입시 대학교 진학'),
  site('career','커리어넷','https://www.career.go.kr/','진학·진로','진로 탐색·직업과 학과 정보','적성 직업 상담'),
  site('worknet','고용24','https://www.work24.go.kr/','진학·진로','진로·직업훈련·고용정보','취업 직업'),
  site('moe','교육부','https://www.moe.go.kr/','진학·진로','교육정책·교육과정 공식 안내','2022 교육과정'),
  site('univ','대학알리미','https://www.academyinfo.go.kr/','진학·진로','대학별 공시와 학교 현황','전공 대학 취업률'),

  site('kocw','KOCW','https://www.kocw.net/','공학·탐구','대학 공개 강의로 심화 학습','미래자동차 기계공학 대학강의'),
  site('kmooc','K-MOOC','https://www.kmooc.kr/','공학·탐구','대학·기관 공개 온라인 강좌','기계 자동차 인공지능'),
  site('arduino','Arduino Docs','https://docs.arduino.cc/','공학·탐구','마이크로컨트롤러·코딩 공식 설명서','전자 로봇'),
  site('github','GitHub','https://github.com/','공학·탐구','오픈소스 코드와 개발 프로젝트','코딩 소프트웨어 만들기'),
  site('mdn','MDN Web Docs','https://developer.mozilla.org/ko/','공학·탐구','웹 개발 HTML·CSS·JavaScript 자료','프론트엔드'),
  site('physicsclass','The Physics Classroom','https://www.physicsclassroom.com/','공학·탐구','역학과 물리 개념 자료(영어)','운동 힘 뉴턴'),

  site('notion','Notion','https://www.notion.so/','학습 도구','정리·계획·노트 작업공간','노션'),
  site('googleclass','Google Classroom','https://classroom.google.com/','학습 도구','수업 과제와 교사 피드백','구글 클래스룸','학교 계정이 필요할 수 있음'),
  site('googletranslate','Google 번역','https://translate.google.com/','학습 도구','문장 번역과 발음 참고','영어 해석'),
  site('papago','Papago','https://papago.naver.com/','학습 도구','영어 등 외국어 번역','파파고'),
  site('chatgpt','ChatGPT','https://chatgpt.com/','학습 도구','학습 개념 질문과 풀이 피드백','질문 AI'),
];
export const FEATURE_DESTINATIONS: readonly {id:string;name:string;route:string;description:string;keywords:string}[] = [
  {id:'today',name:'오늘 · 홈',route:'today',description:'바로 공부 시작하고 오늘 할 일을 확인',keywords:'메인 시작'},
  {id:'study',name:'집중 타이머 · DRIVE',route:'study',description:'스톱워치, 공부 타이머, 계기판',keywords:'자동차 포커스 시간 카운트다운'},
  {id:'tasks',name:'과제 · 수행평가',route:'tasks',description:'숙제, 제출, 수행평가 관리',keywords:'할일 체크리스트 사진 등록'},
  {id:'school',name:'시간표',route:'school',description:'학교·학원·고정 일정',keywords:'수업 스케줄'},
  {id:'progress',name:'학습 기록',route:'progress',description:'공부 시간과 복습 기록 확인',keywords:'통계 히스토리'},
  {id:'exams',name:'시험 관리',route:'exams',description:'시험 범위와 학습 준비',keywords:'모의고사 내신'},
  {id:'garage',name:'TOHEŞAR 차고',route:'garage',description:'차량 꾸미기와 드래그 레이스',keywords:'자동차 게임 튜닝 레이싱'},
  {id:'juggernaut',name:'JUGGERNAUT',route:'juggernaut',description:'학습 동기와 장기 목표',keywords:'저거너트 수능'},
  {id:'sleep',name:'Sleep Guard',route:'sleep',description:'수면과 휴식 루틴',keywords:'잠 취침'},
  {id:'sites',name:'공부 사이트 백과사전',route:'sites',description:'EBSi·메가스터디·기출·학습 도구 즐겨찾기',keywords:'웹사이트 링크 검색 바로가기'},
  {id:'settings',name:'설정 · 백업',route:'settings',description:'테마, 백업, 앱 설정',keywords:'다크모드 테마 동기화'},
];

export function matchStudySite(site:StudySite,term:string) {
  const query=term.trim().toLocaleLowerCase('ko-KR');
  return !query || [site.name,site.description,site.category,site.keywords].some(v=>v.toLocaleLowerCase('ko-KR').includes(query));
}
export function externalStudyUrl(url:string):string {
  const parsed=new URL(url);
  if(parsed.protocol!=='https:')throw new Error('HTTPS 학습 사이트만 열 수 있습니다.');
  return parsed.href;
}

import {
  Car,
  LibraryBig,
  Bot,
  CalendarDays,
  ChevronRight,
  Moon,
  Plus,
  Settings,
  Sparkles,
  Target,
} from 'lucide-react';

const TOOLS = [
  {id:'ai-zone',label:'BKIT AI ZONE',detail:'개념 이해·자료 요약·문제 정리를 돕는 AI',icon:Bot},
  {id:'sites',label:'공부 사이트',detail:'EBSi·메가스터디·공교육 자료·즐겨찾기',icon:LibraryBig},
  {
    id: 'exams',
    label: '시험 관리',
    detail: '확인된 범위·자료·실제 문제 복습',
    icon: CalendarDays,
  },
  { id: 'school', label: '시간표', detail: '학교·학원·이동·준비 일정', icon: CalendarDays },
  { id: 'progress', label: '기록', detail: '실제 답변·지연 재시험·학습 성과', icon: Target },
  { id: 'sleep', label: 'Sleep Guard', detail: '취침 준비·수면 회고', icon: Moon },
  { id: 'settings', label: '설정', detail: '생활 리듬·백업·복구·연동', icon: Settings },

];

export function MoreHub({
  onNavigate,
  onCapture,
}: {
  onNavigate: (route: string) => void;
  onCapture: () => void;
}) {
  return (
    <section className="panel more-hub" aria-label="추가 학습 도구">
      <nav aria-label="추가 도구">
        {TOOLS.map((item) => (
          <button
            key={item.id}
            className="more-hub-link"
            aria-label={item.label}
            onClick={() => onNavigate(item.id)}
          >
            <item.icon size={22} aria-hidden="true" />
            <span>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        ))}
      </nav>
      <button className="secondary" onClick={onCapture}>
        <Plus size={17} />
        빠른 과제 입력
      </button>
    </section>
  );
}

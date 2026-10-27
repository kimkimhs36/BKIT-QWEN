import {
  BookOpen,
  Bot,
  CalendarDays,
  FileStack,
  LibraryBig,
  Moon,
  ScanText,
  Settings,
  Sparkles,
} from 'lucide-react';
const TOOLS = [
  { id: 'subjects', label: '과목 공간', detail: '과제 · 자료 · 공부 기록', icon: BookOpen },
  { id: 'inbox', label: '학교 공지', detail: '받은 공지 · 원본 · 과제 확인', icon: ScanText },
  { id: 'materials', label: '공부 자료', detail: 'PDF · 사진 · 문제집', icon: FileStack },
  { id: 'school', label: '시간표', detail: '학교 · 학원 · 일정', icon: CalendarDays },
  { id: 'exams', label: '시험 관리', detail: '범위와 준비 항목', icon: BookOpen },
  { id: 'books', label: 'BKIT BOOKS', detail: '나만의 책장 · 학습지 · 필기', icon: BookOpen },
  { id: 'exam-lab', label: '수능관 · 기초 회복실', detail: '수학 한 문제 · 복습 · 실제 풀이 기록', icon: Sparkles },
  { id: 'ai-zone', label: 'AI ZONE', detail: '나에게 맞는 AI 도구', icon: Sparkles },
  { id: 'sites', label: '공부 사이트', detail: '강의 · 기출 · 즐겨찾기', icon: LibraryBig },
  { id: 'sleep', label: '수면 루틴', detail: 'Sleep Guard', icon: Moon },
  { id: 'briefing', label: '공지 정리', detail: '사진과 글을 과제로', icon: ScanText },
  { id: 'settings', label: '설정', detail: '테마 · 백업 · 연동', icon: Settings },
];
export function MoreHub({
  onNavigate,
  onCapture,
  onAssistant,
}: {
  onNavigate: (route: string) => void;
  onCapture: () => void;
  onAssistant: () => void;
}) {
  return (
    <section className="more-hub" aria-label="추가 학습 도구">
      <nav aria-label="추가 도구">
        {TOOLS.map((item) => (
          <button
            key={item.id}
            className="more-hub-link"
            aria-label={item.label}
            onClick={() => (item.id === 'briefing' ? onCapture() : onNavigate(item.id))}
          >
            <span className="tool-symbol">
              <item.icon size={22} strokeWidth={1.7} aria-hidden="true" />
            </span>
            <span>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </span>
          </button>
        ))}
      </nav>
      <button className="tools-assistant" aria-label="BKIT 비서 열기" onClick={onAssistant}>
        <Bot size={18} />
        BKIT 학습 비서
      </button>
    </section>
  );
}

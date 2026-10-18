import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  FileImage,
  ImagePlus,
  LockKeyhole,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type { Task } from './model';
import { JuggernautOpening } from './JuggernautOpening';
import {
  DRAFT_KEY,
  createMission,
  emptyDraft,
  hasVisited,
  missionToTask,
  prepareMissions,
  readDraft,
  rememberVisit,
  type AtelierDraft,
  type Mission,
} from './atelier';
import { getPhoto, storePhoto } from './atelierMedia';
import { PhotoText } from './PhotoText';
import { BriefingAI } from './BriefingAI';
import { formatQuantity, formatTaskDeadline } from './capture';

export function AtelierScene() {
  return (
    <svg className="atelier-scene" viewBox="0 0 560 440" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="room-light">
          <stop stopColor="#d9b975" stopOpacity=".22" />
          <stop offset="1" stopColor="#d9b975" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="window-light" x2="0" y2="1">
          <stop stopColor="#c6a573" stopOpacity=".18" />
          <stop offset="1" stopColor="#c6a573" stopOpacity=".01" />
        </linearGradient>
      </defs>
      <ellipse cx="283" cy="235" rx="260" ry="200" fill="url(#room-light)" />
      <g stroke="#b99a63" strokeOpacity=".5">
        <path d="M145 325V155a135 135 0 0 1 270 0v170" fill="url(#window-light)" />
        <path d="M161 325V155a119 119 0 0 1 238 0v170M280 22v303M161 155h238M161 220h238" />
        <path d="M145 325 59 402M415 325l86 77M109 357h342M80 383h400" strokeOpacity=".25" />
        <path d="M44 111h65v214H44zM44 169h65M44 230h65M44 289h65M451 111h65v214h-65zM451 169h65M451 230h65M451 289h65" />
        <path d="M52 126v35m8-40v40m8-36v36m11-40v40m9-30v30m9-36v36M52 188v34m10-39v39m12-33v33m9-36v36m13-31v31M460 122v39m8-32v32m10-39v39m12-34v34m10-39v39M460 186v36m10-32v32m10-37v37m12-33v33m10-38v38" />
        <path d="M105 329h350v12H105zM129 341v65m302-65v65M129 380h302" />
        <path
          d="M220 319c18-13 40-13 60 0 20-13 42-13 60 0v10c-20-10-40-10-60 0-20-10-40-10-60 0zM280 319v10"
          fill="#151411"
        />
        <path d="M351 314h38m-19 0v-72m-27 0h54l-13-36h-28z" fill="#ad8e53" fillOpacity=".15" />
        <path d="M243 393v-29c0-34 74-34 74 0v29zM253 393v28m54-28v28" fill="#11120f" />
      </g>
      <circle cx="280" cy="110" r="28" stroke="#d8bc84" strokeOpacity=".22" />
      <path d="m272 110 6 6 12-14" stroke="#d8bc84" strokeOpacity=".7" />
    </svg>
  );
}

export function PrivatePhotoCard({
  id,
  onRemove,
  large = false,
}: {
  id: string;
  onRemove?: () => void;
  large?: boolean;
}) {
  const [photo, setPhoto] = useState<{ url: string; name: string } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true,
      url = '';
    setPhoto(null);
    setFailed(false);
    getPhoto(id)
      .then((p) => {
        if (!live) return;
        if (!p) {
          setFailed(true);
          return;
        }
        url = URL.createObjectURL(p.blob);
        setPhoto({ url, name: p.name });
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);
  return (
    <figure className={'atelier-photo' + (large ? ' atelier-photo--large' : '')}>
      {photo && !failed ? (
        <a
          href={photo.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={photo.name + ' 원본 보기'}
        >
          <img
            loading="lazy"
            decoding="async"
            src={photo.url}
            alt={photo.name}
            onError={() => setFailed(true)}
          />
        </a>
      ) : (
        <div className="atelier-photo-fallback">
          <FileImage />
          <span>{failed ? '미리보기를 열 수 없어요' : '사진 불러오는 중'}</span>
        </div>
      )}
      <figcaption>{photo?.name || '이 기기의 학습 자료'}</figcaption>
      {failed && photo && (
        <a href={photo.url} download={photo.name}>
          원본 다운로드
        </a>
      )}
      {failed && !photo && (
        <small>
          다른 기기에서 가져왔거나 Safari 저장소에서 지워진 사진입니다. 원본을 다시 첨부해 주세요.
        </small>
      )}
      {onRemove && (
        <button
          type="button"
          aria-label={(photo?.name || '사진') + ' 첨부 해제'}
          onClick={onRemove}
        >
          <X size={16} />
        </button>
      )}
    </figure>
  );
}

export function StudyAtelier({
  onClose,
  onSave,
  startAt,
}: {
  onClose: () => void;
  startAt?: 'capture';
  onSave: (tasks: Task[]) => { duplicates: number } | null;
}) {
  const [initial] = useState(() => {
    const saved = readDraft();
    return startAt ? { ...saved, draft: { ...saved.draft, step: startAt } } : saved;
  });
  const [draft, setDraft] = useState(initial.draft);
  const draftRef = useRef(draft);
  const blocked = useRef(!!initial.error);
  const prelude = useRef(!hasVisited() && initial.draft.step === 'briefing');
  const [intro, setIntro] = useState(prelude.current);
  const [error, setError] = useState(initial.error);
  const [savedDraft, setSavedDraft] = useState(!initial.error);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [locked, setLocked] = useState(false);
  const gallery = useRef<HTMLInputElement>(null),
    camera = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null),
    heading = useRef<HTMLHeadingElement>(null);
  const finishIntro = useCallback(() => {
    rememberVisit();
    setIntro(false);
  }, []);
  useEffect(() => {
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const conflict = (e: StorageEvent) => {
      if (e.key === DRAFT_KEY) {
        blocked.current = true;
        setLocked(true);
        setSavedDraft(false);
        setError(
          '다른 탭에서 초안이 바뀌었습니다. 이 화면의 내용을 복사해 보관한 뒤 새로고침해 주세요.',
        );
      }
    };
    window.addEventListener('storage', conflict);
    return () => {
      dialog.current?.close();
      document.body.style.overflow = overflow;
      window.removeEventListener('storage', conflict);
    };
  }, []);
  useEffect(() => {
    dialog.current?.scrollTo(0, 0);
    heading.current?.focus({ preventScroll: true });
    // Film completion must not move focus away while the learner is typing.
  }, [draft.step]);
  function update(next: AtelierDraft) {
    draftRef.current = next;
    setDraft(next);
    if (blocked.current) {
      setSavedDraft(false);
      return;
    }
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      setSavedDraft(true);
    } catch {
      setSavedDraft(false);
      setError(
        '임시 저장 공간이 부족합니다. 입력 내용을 복사해 보관하고 저장 공간을 확인해 주세요.',
      );
    }
  }
  function step(next: AtelierDraft['step']) {
    setError('');
    update({ ...draftRef.current, step: next });
  }
  function changeMission(id: string, values: Partial<Mission>) {
    update({
      ...draftRef.current,
      missions: draftRef.current.missions.map((m) =>
        m.id === id ? { ...m, ...values, checked: values.checked ?? false } : m,
      ),
    });
  }
  async function attach(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length || busyRef.current || locked) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      for (const file of files) {
        const id = await storePhoto(file, draftRef.current.attachmentIds);
        const ids = [...new Set([...draftRef.current.attachmentIds, id])];
        update({
          ...draftRef.current,
          attachmentIds: ids,
          missions: draftRef.current.missions.map((m) => ({
            ...m,
            checked: false,
            attachmentIds: [...new Set([...m.attachmentIds, id])],
          })),
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '사진을 첨부하지 못했습니다. 다시 선택해 주세요.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function removePhoto(id: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      // A removed draft reference is enough. Retain bytes if a recovered/replayed
      // draft may also reference a previously saved task; never delete its source.
      update({
        ...draftRef.current,
        attachmentIds: draftRef.current.attachmentIds.filter((x) => x !== id),
        missions: draftRef.current.missions.map((m) => ({
          ...m,
          checked: false,
          attachmentIds: m.attachmentIds.filter((x) => x !== id),
        })),
      });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  function prepare(rebuild = false) {
    try {
      const current = draftRef.current;
      update({
        ...current,
        step: 'prepare',
        missions: !rebuild && current.missions.length ? current.missions : prepareMissions(current),
      });
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function save() {
    if (busyRef.current || locked) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      const tasks = draftRef.current.missions.map(missionToTask);
      if (!tasks.length) throw new Error('과제 하나 이상을 준비해 주세요.');
      const photos = await Promise.all(draftRef.current.attachmentIds.map(getPhoto));
      if (photos.some((p) => !p))
        throw new Error(
          '첨부 사진을 찾지 못했습니다. 이전 단계에서 사진을 다시 첨부하거나 첨부를 해제해 주세요.',
        );
      const result = onSave(tasks);
      if (!result)
        throw new Error(
          'BKIT에 저장하지 못했습니다. 저장 잠금이나 저장 공간을 확인한 후 다시 시도해 주세요.',
        );
      rememberVisit();
      // Persist tasks first. If draft cleanup fails, stable IDs make retries safe.
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(emptyDraft()));
      } catch {
        /* Idempotent replay. */
      }
      onClose();
    } catch (e) {
      setError(
        e instanceof Error && e.name !== 'ZodError'
          ? e.message
          : '마감 날짜, 분량(1~10000), 예상 시간(1~480분)을 확인해 주세요.',
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  const steps = ['briefing', 'capture', 'prepare'] as const;
  return (
    <dialog
      ref={dialog}
      className="atelier"
      aria-label="TOHEŞAR 학습 준비실"
      onCancel={(e) => {
        e.preventDefault();
        if (!busyRef.current) {
          rememberVisit();
          onClose();
        }
      }}
    >
      <header className="atelier-header">
        <div className="atelier-wordmark">
          TOHEŞAR<small>PRIVATE STUDY ATELIER</small>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            rememberVisit();
            onClose();
          }}
          aria-label="작성 보관하고 BKIT으로"
        >
          <span>BKIT으로</span>
          <X size={18} />
        </button>
      </header>
      <nav className="atelier-steps" aria-label="학습 준비 단계">
        {steps.map((s, i) => (
          <span key={s} aria-current={draft.step === s ? 'step' : undefined}>
            <b>0{i + 1}</b>
            {['오늘 할 일', '자료 추가', '최종 확인'][i]}
            {i < 2 && <i />}
          </span>
        ))}
      </nav>
      <div
        className={
          'atelier-layout' + (prelude.current && draft.step === 'briefing' ? ' is-cinematic' : '')
        }
      >
        <aside className="atelier-aside">
          {prelude.current && draft.step === 'briefing' ? (
            intro ? (
              <div className="juggernaut jg-heritage atelier-inline-opening">
                <JuggernautOpening embedded onComplete={finishIntro} />
                <button
                  className="atelier-inline-skip"
                  type="button"
                  onClick={finishIntro}
                  aria-label="오프닝 건너뛰기"
                >
                  건너뛰기 <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <div className="atelier-prelude-still" aria-label="TOHEŞAR JUGGERNAUT">
                <AtelierScene />
                <span>
                  TOHEŞAR<small>JUGGERNAUT · THE NEXT CHAPTER</small>
                </span>
              </div>
            )
          ) : (
            <>
              <span className="atelier-eyebrow">THE ART OF GETTING READY</span>
              <h2>
                큰 미래를 위한,
                <br />
                <em>작은 준비.</em>
              </h2>
              <AtelierScene />
              <div className="atelier-aside-note">
                <span>JUGGERNAUT × BKIT</span>
                <p>
                  머릿속에 흩어진 오늘을 내려놓으면,
                  <br />
                  시작할 한 가지가 선명해집니다.
                </p>
              </div>
            </>
          )}
        </aside>
        <section key={draft.step} className="atelier-workspace" aria-label="오늘의 학습 준비">
          <h1 ref={heading} tabIndex={-1}>
            {draft.step === 'briefing' ? (
              <>
                오늘의 이야기를
                <br />
                <em>들려주세요.</em>
              </>
            ) : draft.step === 'capture' ? (
              <>
                책상 위의 자료를
                <br />
                <em>여기에 모으세요.</em>
              </>
            ) : (
              <>
                시작하기 전에,
                <br />
                <em>한 번만 확인해요.</em>
              </>
            )}
          </h1>
          <p className="atelier-lede">
            {draft.step === 'briefing'
              ? '숙제와 수행평가를 과제마다 한 줄씩 적어주세요.'
              : draft.step === 'capture'
                ? '학습지나 안내문을 촬영하거나 골라주세요. 사진 없이도 다음 단계로 갈 수 있어요.'
                : '기본 규칙으로 나눈 초안입니다. 실제 과제와 사진을 보며 내용을 다듬어 주세요.'}
          </p>
          {draft.step === 'briefing' && (
            <>
              <label className="atelier-brief">
                <span>
                  오늘 해야 할 일 <small>과제마다 한 줄씩</small>
                </span>
                <textarea
                  aria-label="오늘 해야 할 일"
                  rows={4}
                  maxLength={3000}
                  placeholder={
                    '수학 학습지 20문제 풀기\n영어 수행평가 발표 준비\n마감은 확인한 다음 적어도 괜찮아요.'
                  }
                  value={draft.text}
                  onChange={(e) => update({ ...draftRef.current, text: e.target.value })}
                />
                <small>{draft.text.length.toLocaleString()} / 3,000</small>
              </label>
              <p className="atelier-note">사진만 있다면, 바로 다음 단계로 가도 좋아요.</p>
              <BriefingAI text={draft.text} photoIds={draft.attachmentIds} disabled={busy || locked}
                existing={draft.missions.length > 0} onUse={missions => {
                  // A late response must never replace a newer human-edited review.
                  if (draftRef.current.missions.length) throw new Error('작성 중인 과제를 먼저 확인하고 저장해 주세요.');
                  update({ ...draftRef.current, missions, step: 'prepare' });
                  setError('');
                }}/>
              <button
                type="button"
                className="atelier-text-shortcut"
                disabled={busy || locked || !draft.text.trim()}
                onClick={() => prepare()}
              >
                사진 없이 과제 확인하기 <ArrowRight size={16} />
              </button>
              {draft.missions.length > 0 && (
                <p className="atelier-note">
                  확인 중인 과제 {draft.missions.length}개가 보관돼 있어요. 다음 단계에서 이어서
                  수정할 수 있습니다.
                </p>
              )}
            </>
          )}
          {draft.step === 'capture' && (
            <>
              <input
                ref={camera}
                hidden
                tabIndex={-1}
                aria-label="카메라 사진"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={attach}
              />
              <input
                ref={gallery}
                hidden
                tabIndex={-1}
                aria-label="갤러리 사진"
                type="file"
                accept="image/*,.heic,.heif"
                multiple
                onChange={attach}
              />
              <div className="atelier-capture-buttons">
                <button
                  type="button"
                  disabled={busy || locked}
                  onClick={() => camera.current?.click()}
                >
                  <Camera size={27} />
                  <strong>카메라로 촬영</strong>
                  <span>지금 책상 위의 자료</span>
                </button>
                <button
                  type="button"
                  disabled={busy || locked}
                  onClick={() => gallery.current?.click()}
                >
                  <ImagePlus size={27} />
                  <strong>갤러리에서 선택</strong>
                  <span>여러 장 함께 첨부</span>
                </button>
              </div>
              <div className="atelier-photo-heading">
                <strong>MY DOCUMENTS</strong>
                <span>{draft.attachmentIds.length} / 12</span>
              </div>
              {draft.attachmentIds.length ? (
                <div className="atelier-photos">
                  {draft.attachmentIds.map((id) => (
                    <PrivatePhotoCard
                      key={id}
                      id={id}
                      onRemove={!busy && !locked ? () => void removePhoto(id) : undefined}
                    />
                  ))}
                </div>
              ) : (
                <div className="atelier-no-photos">
                  <FileImage size={26} />
                  <span>오늘의 자료를 기다리고 있어요.</span>
                </div>
              )}
              <p className="atelier-note">
                장당 20MB · 합계 60MB까지. 사진을 첨부한 뒤 필요한 글자만 가져올 수도 있어요.
              </p>
              {!!draft.attachmentIds.length && (
                <PhotoText
                  photoIds={draft.attachmentIds}
                  disabled={busy || locked}
                  onUse={(text, photoId) => {
                    const current = draftRef.current;
                    const combined = [current.text, text].filter(Boolean).join('\n');
                    if (combined.length > 3000) throw new Error('브리핑은 합계 3,000자까지입니다. 필요한 과제만 남겨 주세요.');
                    const added = prepareMissions({ ...emptyDraft(), text, attachmentIds: [photoId] });
                    const missions = current.missions.length
                      ? [...current.missions, ...added]
                      : [...(current.text.trim() ? prepareMissions(current) : []), ...added];
                    if (missions.length > 20) throw new Error('한 번에 최대 20개 과제까지 준비할 수 있습니다.');
                    update({ ...current, text: combined, missions, step: 'prepare' });
                    setError('');
                  }}
                />
              )}
              <div className="atelier-privacy">
                <LockKeyhole size={17} />
                <p>
                  사진은 이 기기의 브라우저에만 보관됩니다.
                  <br />
                  공개 페이지나 서버로 업로드하지 않아요.
                </p>
              </div>
            </>
          )}
          {draft.step === 'prepare' && (
            <form
              id="atelier-confirm"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <div className="atelier-prepare-meta">
                <span>
                  {draft.missions.length} MISSIONS / {draft.attachmentIds.length} DOCUMENTS
                </span>
                <button type="button" disabled={busy || locked} onClick={() => prepare(true)}>
                  브리핑으로 다시 구성
                </button>
              </div>
              <p className="atelier-note">
                다시 구성하면 아래 수정 내용 대신 브리핑 입력으로 초안을 새로 만듭니다. 25분은 수정
                가능한 기본값입니다. 마감을 모르면 비워두세요.
              </p>
              {draft.attachmentIds.length > 0 && (
                <details className="atelier-source">
                  <summary>첨부 자료 펼쳐보기 ({draft.attachmentIds.length})</summary>
                  <div className="atelier-photos">
                    {draft.attachmentIds.map((id) => (
                      <PrivatePhotoCard id={id} key={id} />
                    ))}
                  </div>
                </details>
              )}
              <fieldset disabled={busy || locked} className="atelier-mission-fieldset">
                {draft.missions.map((m, index) => (
                  <article className="atelier-mission" key={m.id}>
                    <div className="atelier-mission-top">
                      <span>MISSION {String(index + 1).padStart(2, '0')}</span>
                      <button
                        type="button"
                        aria-label={`과제 ${index + 1} 삭제`}
                        onClick={() =>
                          update({
                            ...draftRef.current,
                            missions: draftRef.current.missions.filter((v) => v.id !== m.id),
                          })
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="atelier-fields">
                      <label>
                        과목
                        <input
                          required
                          maxLength={200}
                          aria-label={`과제 ${index + 1} 과목`}
                          value={m.subject}
                          placeholder="예: 수학"
                          onChange={(e) => changeMission(m.id, { subject: e.target.value })}
                        />
                      </label>
                      <label>
                        종류
                        <select
                          aria-label={`과제 ${index + 1} 종류`}
                          value={m.kind}
                          onChange={(e) =>
                            changeMission(m.id, { kind: e.target.value as Mission['kind'] })
                          }
                        >
                          {['숙제', '수행평가', '시험공부', '개인 일정'].map((k) => (
                            <option key={k}>{k}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label>
                      과제 내용
                      <input
                        required
                        aria-label={`과제 ${index + 1} 내용`}
                        maxLength={200}
                        value={m.title}
                        placeholder="사진을 보며 할 일을 적어주세요"
                        onChange={(e) => changeMission(m.id, { title: e.target.value })}
                      />
                    </label>
                    <div className="atelier-fields">
                      <label>
                        마감일 · 모르면 비우기
                        <input
                          type="date"
                          aria-label={`과제 ${index + 1} 마감일`}
                          value={m.due}
                          onChange={(e) =>
                            changeMission(m.id, {
                              due: e.target.value,
                              dueTime: e.target.value ? m.dueTime : '',
                            })
                          }
                        />
                      </label>
                      <label>
                        마감 시각 · 선택 (KST)
                        <input
                          type="time"
                          aria-label={`과제 ${index + 1} 마감 시각`}
                          disabled={!m.due}
                          value={m.dueTime}
                          onChange={(e) => changeMission(m.id, { dueTime: e.target.value })}
                        />
                      </label>
                    </div>
                    <div className="atelier-fields atelier-fields--three">
                      <label>
                        분량 단위
                        <select
                          aria-label={`과제 ${index + 1} 분량 단위`}
                          value={m.quantityUnit}
                          onChange={(e) =>
                            changeMission(m.id, {
                              quantityUnit: e.target.value as Mission['quantityUnit'],
                            })
                          }
                        >
                          <option value="">미확인</option>
                          <option value="problems">문제</option>
                          <option value="pages">쪽</option>
                          <option value="passages">지문</option>
                          <option value="chapters">단원</option>
                        </select>
                      </label>
                      <label>
                        전체 분량
                        <input
                          type="number"
                          min={1}
                          max={10000}
                          required={!!m.quantityUnit}
                          disabled={!m.quantityUnit}
                          aria-label={`과제 ${index + 1} 분량`}
                          value={m.quantityTotal}
                          onChange={(e) => changeMission(m.id, { quantityTotal: e.target.value })}
                        />
                      </label>
                      <label>
                        예상 시간 · 분
                        <input
                          type="number"
                          required
                          min={1}
                          max={480}
                          aria-label={`과제 ${index + 1} 예상 시간`}
                          value={m.minutes}
                          onChange={(e) => changeMission(m.id, { minutes: e.target.value })}
                        />
                      </label>
                    </div>
                    {!!draft.attachmentIds.length && (
                      <details className="atelier-source">
                        <summary>이 과제에 연결할 사진 ({m.attachmentIds.length})</summary>
                        {draft.attachmentIds.map((id, i) => (
                          <label className="atelier-check" key={id}>
                            <input
                              type="checkbox"
                              checked={m.attachmentIds.includes(id)}
                              onChange={(e) =>
                                changeMission(m.id, {
                                  attachmentIds: e.target.checked
                                    ? [...m.attachmentIds, id]
                                    : m.attachmentIds.filter((v) => v !== id),
                                })
                              }
                            />
                            자료 {i + 1}
                          </label>
                        ))}
                      </details>
                    )}
                    <label className="atelier-check">
                      <input
                        required
                        type="checkbox"
                        aria-label={`과제 ${index + 1} 확인`}
                        checked={m.checked}
                        onChange={(e) => changeMission(m.id, { checked: e.target.checked })}
                      />
                      <span>
                        {m.due
                          ? `${m.due}${m.dueTime ? ' ' + m.dueTime : ' · 시각 미확인'}`
                          : '마감 미확인'}{' '}
                        — 내용과 마감을 확인했어요.
                      </span>
                    </label>
                  </article>
                ))}
                <button
                  type="button"
                  className="atelier-add-mission"
                  disabled={draft.missions.length >= 20}
                  onClick={() =>
                    update({
                      ...draftRef.current,
                      missions: [
                        ...draftRef.current.missions,
                        createMission('', [...draftRef.current.attachmentIds]),
                      ],
                    })
                  }
                >
                  <Plus size={17} /> 과제 하나 더
                </button>
              </fieldset>
            </form>
          )}
          {error && (
            <p className="atelier-error" role="alert">
              {error}
            </p>
          )}
          <div className="atelier-actions">
            {draft.step !== 'briefing' && (
              <button
                className="atelier-back"
                type="button"
                disabled={busy || locked}
                onClick={() => step(draft.step === 'prepare' ? 'capture' : 'briefing')}
              >
                <ArrowLeft size={16} /> 이전
              </button>
            )}
            <button
              className="atelier-primary"
              type={draft.step === 'prepare' ? 'submit' : 'button'}
              form={draft.step === 'prepare' ? 'atelier-confirm' : undefined}
              disabled={
                busy ||
                locked ||
                (draft.step === 'prepare' &&
                  (!draft.missions.length || draft.missions.some((m) => !m.checked)))
              }
              onClick={
                draft.step === 'briefing'
                  ? () => step('capture')
                  : draft.step === 'capture'
                    ? () => prepare()
                    : undefined
              }
            >
              {busy
                ? '이 기기에 저장하는 중…'
                : draft.step === 'briefing'
                  ? '오늘의 자료 모으기'
                  : draft.step === 'capture'
                    ? '과제 준비하기'
                    : '확인하고 BKIT에 저장'}
              <ArrowRight size={18} />
            </button>
          </div>
          <p className="atelier-save-status" role="status">
            {busy ? (
              '사진을 안전하게 보관하고 있어요.'
            ) : savedDraft ? (
              <>
                <Check size={12} /> 초안이 이 기기에 보관돼요. 나중에 이어 써도 괜찮아요.
              </>
            ) : (
              '현재 초안이 저장되지 않았습니다. 화면을 닫기 전에 내용을 복사해 주세요.'
            )}
          </p>
          <p className="atelier-local-note">
            Safari 데이터 삭제 시 사진과 기록도 삭제될 수 있어요. 원본 사진을 함께 보관해 주세요.
          </p>
        </section>
      </div>
      <footer className="atelier-footer">
        <span>TOHEŞAR / JUGGERNAUT</span>
        <span>PREPARE WITH INTENTION. BEGIN WITH ONE.</span>
        <span>BKIT STUDY OS</span>
      </footer>
    </dialog>
  );
}

export function AtelierMissions({
  tasks,
  onStart,
  onEdit,
}: {
  tasks: Task[];
  onStart: (id: string) => void;
  onEdit: (task: Task) => void;
}) {
  const [viewing, setViewing] = useState<Task | null>(null);
  const photoDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (viewing) photoDialog.current?.showModal();
  }, [viewing]);
  if (!tasks.length) return null;
  return (
    <section className="atelier-today-missions" aria-label="오늘 실행할 과제">
      <div className="atelier-shelf-head">
        <div>
          <span className="atelier-eyebrow">YOUR MISSION DESK</span>
          <h2>준비된 오늘의 한 걸음.</h2>
        </div>
        <span>{tasks.length} MISSIONS</span>
      </div>
      <div className="atelier-task-list">
        {tasks.map((t, i) => (
          <article className="atelier-task" key={t.id}>
            <span className="atelier-task-number">{String(i + 1).padStart(2, '0')}</span>
            <div className="atelier-task-content">
              <span>
                {t.subject} <i /> {t.kind}
              </span>
              <button className="atelier-task-title" onClick={() => onEdit(t)}>
                {t.title}
              </button>
              <p>
                {formatTaskDeadline(t)}
                <span>
                  {' '}
                  · {t.minutes}분{t.quantity ? ' · ' + formatQuantity(t.quantity) : ''}
                </span>
              </p>
              {!!t.attachmentIds?.length && (
                <button className="atelier-task-photos" onClick={() => setViewing(t)}>
                  <FileImage size={13} /> 내 자료 {t.attachmentIds.length}장
                </button>
              )}
            </div>
            {t.status !== 'done' && (
              <button
                className="atelier-task-start"
                aria-label={`${t.title} 첫 5분 시작`}
                onClick={() => onStart(t.id)}
              >
                <span>첫 5분</span>
                <ArrowRight size={18} />
              </button>
            )}
          </article>
        ))}
      </div>
      {viewing && (
        <dialog
          ref={photoDialog}
          className="atelier-photo-dialog"
          aria-label="과제의 비공개 학습 자료"
          onCancel={() => setViewing(null)}
        >
          <div>
            <h2>{viewing.title}</h2>
            <button aria-label="자료 닫기" onClick={() => setViewing(null)}>
              <X />
            </button>
          </div>
          <p>이 기기에만 저장된 자료입니다. 사진을 누르면 원본이 열립니다.</p>
          <div className="atelier-photos">
            {viewing.attachmentIds?.map((id) => (
              <PrivatePhotoCard id={id} key={id} large />
            ))}
          </div>
        </dialog>
      )}
    </section>
  );
}

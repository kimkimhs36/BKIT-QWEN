"use strict";
(() => {
  const KEY = "bkit.exam-lab.20261019.v1",
    ORIGINAL = window.BKIT_EXAM_QUESTIONS || [],
    SIMILAR = window.BKIT_SIMILAR || [],
    QUESTIONS = [...ORIGINAL, ...SIMILAR];
  const SUBJECTS = ["영어", "수학", "통합과학", "국어", "통합사회", "한국사"];
  const PAPER_LENGTH = {
    국어: 45,
    수학: 30,
    영어: 45,
    한국사: 20,
    통합사회: 25,
    통합과학: 25,
  };
  const DIAGNOSTIC = [
    "lab024",
    "lab001",
    "lab025",
    "lab015",
    "lab006",
    "lab031",
  ];
  const PLANS = {
    120: [
      ["진단", 10],
      ["영어", 25],
      ["휴식", 5],
      ["수학", 30],
      ["휴식", 5],
      ["통합과학", 20],
      ["오답 재시험", 15],
      ["마무리", 10],
    ],
    180: [
      ["진단", 10],
      ["영어", 40],
      ["휴식", 5],
      ["수학", 45],
      ["휴식", 5],
      ["통합과학", 30],
      ["휴식", 5],
      ["국어", 20],
      ["오답 재시험", 15],
      ["마무리", 5],
    ],
  };
  const $ = (id) => document.getElementById(id),
    now = () => Date.now(),
    qById = (id) => QUESTIONS.find((q) => q.id === id);
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const initial = () => ({
    v: 1,
    view: "drills",
    subject: "추천",
    mode: "new",
    current: null,
    attempts: {},
    past: {},
    pastSubject: "영어",
    pastNumber: 1,
    mission: null,
    feedback: null,
    draft: null,
    diagnostic: null,
    events: [],
    sessions: [],
    causeFilter: "",
  });
  let raw = null,
    blocked = false,
    storageError = "",
    fileUrl = null,
    enteredAt = now();
  const object = (v) => v && typeof v === "object" && !Array.isArray(v);
  function validate(d) {
    if (!object(d) || d.v !== 1 || !object(d.attempts) || !object(d.past))
      return false;
    if (
      Object.keys(d.attempts).length > 1000 ||
      Object.keys(d.past).length > 1000
    )
      return false;
    for (const a of Object.values(d.attempts))
      if (
        !object(a) ||
        typeof a.firstCorrect !== "boolean" ||
        (a.tries !== undefined && (!Number.isFinite(a.tries) || a.tries < 1))
      )
        return false;
    for (const a of Object.values(d.past))
      if (
        !object(a) ||
        (a.pick !== null &&
          a.pick !== undefined &&
          !(Number.isInteger(a.pick) && a.pick >= 1 && a.pick <= 5)) ||
        (a.note !== undefined && typeof a.note !== "string") ||
        (a.mark !== undefined &&
          !["correct", "wrong", "unsure"].includes(a.mark)) ||
        (a.answer !== undefined && typeof a.answer !== "string")
      )
        return false;
    if (
      d.events !== undefined &&
      (!Array.isArray(d.events) ||
        d.events.length > 20000 ||
        d.events.some(
          (e) =>
            !object(e) ||
            typeof e.id !== "string" ||
            typeof e.correct !== "boolean" ||
            typeof e.subject !== "string" ||
            !Number.isFinite(e.at),
        ))
    )
      return false;
    if (
      d.sessions !== undefined &&
      (!Array.isArray(d.sessions) ||
        d.sessions.length > 1000 ||
        d.sessions.some(
          (s) =>
            !object(s) ||
            !Number.isFinite(s.elapsed) ||
            s.elapsed < 0 ||
            typeof s.subject !== "string" ||
            typeof s.note !== "string" ||
            typeof s.id !== "string" ||
            typeof s.endedAt !== "string" ||
            !Number.isFinite(Date.parse(s.endedAt)),
        ))
    )
      return false;
    if (
      d.mission !== null &&
      d.mission !== undefined &&
      (!object(d.mission) ||
        !PLANS[d.mission.minutes] ||
        !Number.isFinite(d.mission.elapsed) ||
        d.mission.elapsed < 0 ||
        !Number.isFinite(d.mission.startedAt) ||
        typeof d.mission.running !== "boolean")
    )
      return false;
    if (
      d.draft !== undefined &&
      d.draft !== null &&
      (!object(d.draft) ||
        typeof d.draft.id !== "string" ||
        typeof d.draft.note !== "string" ||
        !["normal", "unsure", "guess"].includes(d.draft.confidence) ||
        !Number.isInteger(d.draft.hints) ||
        d.draft.hints < 0 ||
        d.draft.hints > 2)
    )
      return false;
    if (
      d.feedback !== undefined &&
      d.feedback !== null &&
      (!object(d.feedback) ||
        !qById(d.feedback.id) ||
        !d.attempts[d.feedback.id] ||
        !Number.isInteger(d.feedback.choice) ||
        d.feedback.choice < 0 ||
        d.feedback.choice > 4)
    )
      return false;
    if (
      d.diagnostic !== undefined &&
      d.diagnostic !== null &&
      (!object(d.diagnostic) ||
        !Array.isArray(d.diagnostic.queue) ||
        d.diagnostic.queue.length < 1 ||
        d.diagnostic.queue.length > 100 ||
        !Number.isInteger(d.diagnostic.index) ||
        d.diagnostic.index < 0 ||
        d.diagnostic.index > d.diagnostic.queue.length ||
        d.diagnostic.queue.some((id) => !ORIGINAL.some((q) => q.id === id)))
    )
      return false;
    if (
      d.mission &&
      ((d.mission.breakSeconds !== undefined &&
        (!Number.isFinite(d.mission.breakSeconds) ||
          d.mission.breakSeconds < 0)) ||
        (d.mission.breakStarted !== undefined &&
          (!Number.isFinite(d.mission.breakStarted) ||
            d.mission.breakStarted < 0)) ||
        (d.mission.baselineMastered !== undefined &&
          !Array.isArray(d.mission.baselineMastered)))
    )
      return false;
    return true;
  }
  function load() {
    try {
      raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (!validate(d))
          throw Error("기존 기록 형식을 읽을 수 없어 원본을 보호하고 있어.");
        return { ...initial(), ...d };
      }
    } catch (e) {
      blocked = true;
      storageError = String(e.message || "저장소를 읽을 수 없어.");
    }
    return initial();
  }
  let state = load();
  if (!["추천", ...SUBJECTS].includes(state.subject)) state.subject = "추천";
  if (!["new", "review", "all"].includes(state.mode)) state.mode = "new";
  if (!SUBJECTS.includes(state.pastSubject)) state.pastSubject = "영어";
  state.pastNumber = Math.min(
    PAPER_LENGTH[state.pastSubject],
    Math.max(1, Number(state.pastNumber) || 1),
  );
  if (
    state.feedback &&
    (!qById(state.feedback.id) ||
      !Number.isInteger(state.feedback.choice) ||
      state.feedback.choice < 0 ||
      state.feedback.choice > 4)
  )
    state.feedback = null;
  if (
    state.diagnostic &&
    (!object(state.diagnostic) ||
      !Array.isArray(state.diagnostic.queue) ||
      !Number.isInteger(state.diagnostic.index) ||
      state.diagnostic.index < 0 ||
      state.diagnostic.index > state.diagnostic.queue.length ||
      state.diagnostic.queue.some((id) => !ORIGINAL.some((q) => q.id === id)))
  )
    state.diagnostic = null;
  function warning(msg) {
    $("save-warning").hidden = false;
    $("save-warning").textContent =
      msg + " 현재 풀이를 보존하려면 나의 기록 → JSON 백업을 사용해.";
    $("save-status").textContent = "저장 확인 필요 · JSON 백업을 만들어 줘.";
  }
  function save() {
    if (blocked) {
      warning(
        storageError || "다른 탭에서 기록이 변경되어 이 탭의 저장을 멈췄어.",
      );
      return false;
    }
    try {
      const current = localStorage.getItem(KEY);
      if (current !== raw) {
        blocked = true;
        warning(
          "다른 탭의 기록을 덮어쓰지 않도록 저장을 멈췄어. 이 탭을 백업한 뒤 새로 열어 줘.",
        );
        return false;
      }
      const next = JSON.stringify(state);
      localStorage.setItem(KEY, next);
      raw = next;
      $("save-warning").hidden = true;
      $("save-status").textContent =
        "이 브라우저에 저장됨 · " +
        new Date().toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        });
      return true;
    } catch {
      warning("브라우저 저장에 실패했어. 저장 공간을 확인해 줘.");
      return false;
    }
  }
  function toast(s) {
    $("backup-status").textContent = s;
  }
  const pending = (a) => !!a && !a.mastered;
  const draft = (q) =>
    state.draft?.id === q.id
      ? state.draft
      : { id: q.id, hints: 0, note: "", confidence: "normal" };
  function clock(s) {
    s = Math.max(0, Math.floor(s));
    return (
      String(Math.floor(s / 3600)).padStart(2, "0") +
      ":" +
      String(Math.floor((s % 3600) / 60)).padStart(2, "0") +
      ":" +
      String(s % 60).padStart(2, "0")
    );
  }
  function stats() {
    const attempts = ORIGINAL.map((q) => state.attempts[q.id]).filter(Boolean);
    $("stat-done").textContent = attempts.length;
    $("stat-rate").textContent = attempts.length
      ? Math.round(
          (100 * attempts.filter((a) => a.firstCorrect).length) /
            attempts.length,
        ) + "%"
      : "—";
    $("stat-pending").textContent = QUESTIONS.filter((q) =>
      pending(state.attempts[q.id]),
    ).length;
    $("stat-past").textContent = Object.values(state.past).filter(
      (a) => a.pick != null || a.answer,
    ).length;
    $("hero-count").textContent = ORIGINAL.length;
    $("hero-start").innerHTML =
      (state.diagnostic || attempts.length
        ? "이어서 한 문제"
        : "지금 시작하기") + " <span>→</span>";
    $("resume-caption").textContent =
      state.diagnostic || attempts.length
        ? "마지막 풀이·해설에서 그대로 이어가."
        : "짧은 6문항 진단부터 · 준비할 것 없이 바로";
  }
  function go(view, scroll = false) {
    if (!["drills", "past", "report"].includes(view)) return;
    state.view = view;
    save();
    for (const v of ["drills", "past", "report"]) {
      $("view-" + v).hidden = v !== view;
      $("tab-" + v).setAttribute("aria-pressed", String(v === view));
      if (v === view) $("tab-" + v).setAttribute("aria-current", "page");
      else $("tab-" + v).removeAttribute("aria-current");
    }
    $("welcome").hidden =
      view !== "drills" || document.body.classList.contains("started");
    if (view === "drills") drawQuestion();
    if (view === "past") drawPast();
    if (view === "report") drawReport();
    stats();
    if (scroll)
      $("view-" + view).scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
  }
  function startStudy() {
    document.body.classList.add("started");
    $("welcome").hidden = true;
    if (!Object.keys(state.attempts).length && !state.diagnostic) {
      state.diagnostic = { queue: DIAGNOSTIC, index: 0, done: false };
      state.current = DIAGNOSTIC[0];
      state.mode = "new";
      state.feedback = null;
      state.direct = false;
    }
    save();
    go("drills", true);
  }
  function activePool() {
    let qs =
      state.mode === "review"
        ? QUESTIONS.filter((q) => pending(state.attempts[q.id]))
        : ORIGINAL.slice();
    if (state.subject !== "추천")
      qs = qs.filter((q) => q.subject === state.subject);
    if (state.mode === "new") qs = qs.filter((q) => !state.attempts[q.id]);
    if (state.mode === "review" && state.causeFilter)
      qs = qs.filter((q) => state.attempts[q.id]?.cause === state.causeFilter);
    if (state.subject === "추천") {
      const data = reportData();
      qs.sort((a, b) => {
        const da = data.find((x) => x.subject === a.subject),
          db = data.find((x) => x.subject === b.subject);
        const score = (q, d) =>
          !d.done
            ? -10
            : (d.pending ? d.rate - 100 : d.rate) +
              (q.tier === 3 && d.rate < 60 ? 30 : 0);
        return (
          score(a, da) - score(b, db) ||
          SUBJECTS.indexOf(a.subject) - SUBJECTS.indexOf(b.subject)
        );
      });
    }
    return qs;
  }
  function chooseQuestion() {
    if (state.feedback) return qById(state.feedback.id);
    if (state.direct && qById(state.current)) return qById(state.current);
    if (state.diagnostic && !state.diagnostic.done) {
      state.current = state.diagnostic.queue[state.diagnostic.index];
      return qById(state.current);
    }
    const pool = activePool(),
      q = pool.find((q) => q.id === state.current) || pool[0];
    state.current = q?.id || null;
    return q;
  }
  function leaveDiagnostic() {
    if (state.diagnostic && !state.diagnostic.done)
      state.diagnostic.done = true;
  }
  function setSubject(s) {
    leaveDiagnostic();
    state.subject = s;
    resetQuestion();
    drawQuestion();
  }
  function setMode(m) {
    leaveDiagnostic();
    state.mode = m;
    resetQuestion();
    drawQuestion();
  }
  function resetQuestion() {
    state.current = null;
    state.feedback = null;
    state.draft = null;
    state.direct = false;
    save();
  }
  function wordMarkup(txt) {
    return String(txt)
      .split(/([A-Za-z]+(?:'[A-Za-z]+)?)/)
      .map((w) =>
        window.BKIT_VOCAB?.[w.toLowerCase()]
          ? '<button class="word" type="button" data-word="' +
            esc(w.toLowerCase()) +
            '" aria-label="' +
            esc(w) +
            ' 뜻 보기">' +
            esc(w) +
            "</button>"
          : esc(w),
      )
      .join("");
  }
  function englishSupport(q) {
    if (q.subject !== "영어") return "";
    const group = q.parent || q.id,
      n = Number(group.slice(3)),
      key = n <= 15 ? "lab013" : n <= 18 ? "lab016" : n <= 21 ? "lab019" : null;
    const info = q.passage
      ? window.BKIT_ENGLISH?.[q.parent ? q.id : key]
      : null;
    return (
      '<div id="word-meaning" class="word-meaning" role="status" hidden></div>' +
      (info
        ? '<details class="reading-support"><summary>문장 구조·해석 펼치기</summary><p>' +
          esc(info.structure) +
          "</p><p>" +
          esc(info.translation) +
          "</p></details>"
        : "")
    );
  }
  function drawQuestion() {
    $("drill-subjects").innerHTML = ["추천", ...SUBJECTS]
      .map(
        (s) =>
          '<button data-subject="' +
          s +
          '" aria-pressed="' +
          (state.subject === s) +
          '">' +
          s +
          "</button>",
      )
      .join("");
    for (const m of ["new", "review", "all"])
      $("mode-" + m).setAttribute("aria-pressed", String(state.mode === m));
    $("current-filter").textContent =
      state.subject +
      " · " +
      { new: "안 푼 문제", review: "아직 모르는 문제", all: "전체 보기" }[
        state.mode
      ];
    $("cause-filter-label").hidden = state.mode !== "review";
    $("cause-filter").value = state.causeFilter || "";
    const q = chooseQuestion(),
      box = $("question-shell"),
      diag = state.diagnostic && !state.diagnostic.done;
    $("diagnostic-status").hidden = !diag;
    if (diag) {
      $("diagnostic-status").innerHTML =
        "<span>작은 진단 " +
        (state.diagnostic.index + 1) +
        " / " +
        state.diagnostic.queue.length +
        ' · 결과로 다음 문제를 골라요</span><button id="skip-diagnostic" class="quiet">자유롭게 풀기 →</button>';
      $("skip-diagnostic").onclick = () => {
        leaveDiagnostic();
        resetQuestion();
        drawQuestion();
      };
    }
    $("drill-progress").textContent =
      state.mode === "review"
        ? "다시 확인할 문제 " + activePool().length + "개"
        : "자체 제작 연습 · 공식 기출 아님";
    if (!q) {
      box.innerHTML =
        '<div class="empty"><span>✳</span><h3>' +
        (state.mode === "review"
          ? "이 범위에서 다시 확인할 문제는 없어."
          : "이 범위의 문제를 모두 풀었어.") +
        '</h3><p>기출로 적용해 보거나 다른 과목을 이어가자.</p><button id="empty-all" class="solid">전체 문제 보기 →</button><button id="empty-past" class="ghost">기출 학습</button></div>';
      $("empty-all").onclick = () => setMode("all");
      $("empty-past").onclick = () => go("past", true);
      save();
      return;
    }
    const d = draft(q),
      answered = state.feedback?.id === q.id,
      lesson = window.BKIT_LESSONS[q.id];
    box.classList.toggle("has-passage", !!q.passage);
    box.innerHTML =
      '<div class="question-meta"><span><i></i> ' +
      esc(q.subject) +
      " <b>/</b> " +
      esc(q.topic) +
      "</span><span>" +
      (q.parent ? "유사 문항" : "Q. " + q.id.slice(3)) +
      " · " +
      (q.tier === 3 ? "도전" : "핵심") +
      '</span></div><div class="question-layout">' +
      (q.passage
        ? '<div class="reading-column"><div class="question-reading" aria-label="공통 지문">' +
          (q.subject === "영어" ? wordMarkup(q.passage) : esc(q.passage)) +
          "</div>" +
          englishSupport(q) +
          "</div>"
        : "") +
      '<div class="response-column"><h3 class="question-stem">' +
      (q.subject === "영어" ? wordMarkup(q.stem) : esc(q.stem)) +
      "</h3>" +
      (!q.passage ? englishSupport(q) : "") +
      (!answered
        ? '<details class="understanding"><summary>내가 이해한 내용 짚어보기 <small>선택</small></summary><label>주어진 조건·묻는 것을 한 줄로<textarea id="understanding-note" rows="2" maxlength="250" placeholder="예: 반대 방향 힘을 빼고, 질량으로 나누기">' +
          esc(d.note) +
          "</textarea></label></details>"
        : "") +
      '<div class="choices" role="group" aria-label="정답 선택">' +
      q.options
        .map((txt, i) => {
          const result = answered
            ? i === q.answer
              ? "correct"
              : i === state.feedback.choice
                ? "wrong"
                : ""
            : "";
          return (
            '<button data-choice="' +
            i +
            '" class="' +
            result +
            '" ' +
            (answered ? "disabled" : "") +
            '><span class="num">' +
            (i + 1) +
            "</span><span>" +
            esc(txt) +
            "</span>" +
            (answered && i === q.answer
              ? "<small>정답 ✓</small>"
              : answered && i === state.feedback.choice
                ? "<small>내 선택</small>"
                : "") +
            "</button>"
          );
        })
        .join("") +
      "</div>" +
      (!answered
        ? '<div class="confidence"><span>지금 내 느낌은</span>' +
          [
            ["normal", "풀어 볼 만해"],
            ["unsure", "헷갈려"],
            ["guess", "추측이야"],
          ]
            .map(
              ([v, t]) =>
                '<button data-confidence="' +
                v +
                '" aria-pressed="' +
                (d.confidence === v) +
                '">' +
                t +
                "</button>",
            )
            .join("") +
          '</div><div class="question-foot"><button id="hint-toggle" class="text-btn">' +
          (d.hints === 0
            ? "힌트 1단계"
            : d.hints === 1
              ? "힌트 2단계"
              : "힌트 접기") +
          " <span>＋</span></button><span>답을 선택하면 바로 확인해요</span></div>" +
          (d.hints
            ? '<div class="hint-box"><b>01 · 방향 잡기</b><p>' +
              esc(q.hint) +
              "</p>" +
              (d.hints > 1
                ? "<b>02 · 한 걸음 더</b><p>" + esc(lesson.hint2) + "</p>"
                : "") +
              "</div>"
            : "")
        : "") +
      "</div></div>" +
      (answered ? makeFeedback(q) : "");
    box.querySelectorAll("[data-word]").forEach(
      (b) =>
        (b.onclick = () => {
          const el = $("word-meaning");
          el.hidden = false;
          el.textContent =
            b.textContent + " — " + window.BKIT_VOCAB[b.dataset.word];
        }),
    );
    if (!answered) {
      box
        .querySelectorAll("[data-choice]")
        .forEach(
          (b) => (b.onclick = () => submitAnswer(q, Number(b.dataset.choice))),
        );
      box.querySelectorAll("[data-confidence]").forEach(
        (b) =>
          (b.onclick = () => {
            state.draft = { ...draft(q), confidence: b.dataset.confidence };
            save();
            drawQuestion();
          }),
      );
      $("understanding-note").oninput = (e) => {
        state.draft = { ...draft(q), note: e.target.value };
        save();
      };
      $("hint-toggle").onclick = () => {
        state.draft = {
          ...draft(q),
          hints: (draft(q).hints + 1) % 3,
          usedHint: true,
        };
        save();
        drawQuestion();
      };
    } else {
      box.querySelectorAll("[data-cause]").forEach(
        (b) =>
          (b.onclick = () => {
            state.attempts[q.id].cause = b.dataset.cause;
            save();
            drawQuestion();
          }),
      );
      $("next-drill").onclick = () => nextDrill();
      $("similar-drill").onclick = () => openSimilar(q);
      $("retry-drill").onclick = () => openQuestion(q.id);
      $("ai-prompt").onclick = () => openTutor(q);
    }
    enteredAt = now();
    save();
  }
  function makeFeedback(q) {
    const a = state.attempts[q.id],
      correct = state.feedback.choice === q.answer,
      l = window.BKIT_LESSONS[q.id];
    return (
      '<div class="feedback ' +
      (correct ? "" : "is-wrong") +
      '"><div class="feedback-heading" role="status"><span>' +
      (correct ? "✓" : "↺") +
      "</span><div><small>" +
      (correct ? "잘 짚었어" : "여기서 이해하면 돼") +
      "</small><h4>" +
      (correct
        ? a.mastered
          ? a.tries > 1
            ? "도움 없이 다시 맞혔어. 이유도 말해 볼까?"
            : "정답. 한 걸음 더 선명해졌어."
          : "맞았어. 도움 없이 한 번 더 확인하자."
        : "괜찮아. 판단이 달라진 곳을 찾자.") +
      '</h4></div></div><p class="answer-why"><b>정답 ' +
      (q.answer + 1) +
      "번.</b> " +
      esc(q.why) +
      '</p><p class="concept"><b>기억할 한 줄</b> ' +
      esc(l.concept) +
      '</p><details class="solution"><summary>풀이를 단계별로 보기</summary><ol>' +
      l.steps.map((s) => "<li>" + esc(s) + "</li>").join("") +
      '</ol></details><details class="solution"><summary>다른 선택지는 왜 아닐까?</summary><ul class="option-reasons">' +
      q.options
        .map((txt, i) =>
          i === q.answer
            ? ""
            : "<li><b>" +
              (i + 1) +
              "번 · " +
              esc(txt) +
              "</b><p>" +
              esc(l.reasons[i]) +
              "</p></li>",
        )
        .join("") +
      "</ul></details>" +
      (!correct || !a.mastered
        ? '<p class="explain-label">어디에서 막혔어? 나중에 같은 이유끼리 모아볼 수 있어.</p><div class="cause-grid">' +
          ["개념", "풀이방법", "계산·실수", "독해·해석", "시간 부족", "추측"]
            .map(
              (c) =>
                '<button data-cause="' +
                c +
                '" aria-pressed="' +
                (a.cause === c) +
                '">' +
                c +
                "</button>",
            )
            .join("") +
          "</div>"
        : "") +
      '<div class="feedback-actions"><button id="similar-drill" class="solid">' +
      (q.parent ? "원래 문제로 다시 확인" : "비슷한 문제로 확인") +
      ' →</button><button id="next-drill" class="ghost">다음 문제 →</button></div><div class="feedback-links"><button id="retry-drill" class="text-btn">이 문제 다시 풀기</button><button id="ai-prompt" class="text-btn">ChatGPT에 이어서 질문 ↗</button></div><p class="hint">힌트·추측·헷갈림이 있었던 정답은 다시 확인할 문제에 남아. 도움 없이 다시 맞히면 재시험 확인으로 기록돼.</p></div>'
    );
  }
  function submitAnswer(q, pick) {
    if (
      state.feedback ||
      !Number.isInteger(pick) ||
      pick < 0 ||
      pick >= q.options.length
    )
      return;
    const correct = pick === q.answer,
      d = draft(q),
      old = state.attempts[q.id],
      assisted = !!d.usedHint || d.hints > 0 || d.confidence !== "normal";
    state.attempts[q.id] = {
      ...old,
      firstCorrect: old ? old.firstCorrect : correct,
      lastCorrect: correct,
      tries: (old?.tries || 0) + 1,
      mastered: correct && !assisted,
      when: old?.when || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      cause: old?.cause || (d.confidence === "guess" ? "추측" : ""),
      hinted: assisted,
      lastPick: pick,
      reflection: d.note,
    };
    state.events.push({
      id: q.id,
      correct,
      assisted,
      at: now(),
      seconds: Math.min(1800, Math.max(0, (now() - enteredAt) / 1000)),
      subject: q.subject,
    });
    state.events = state.events.slice(-20000);
    state.feedback = { id: q.id, choice: pick };
    state.current = q.id;
    save();
    drawQuestion();
    stats();
    const fb = $("question-shell").querySelector(".feedback");
    if (fb)
      fb.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "nearest",
      });
  }
  function nextDrill() {
    const old = state.current;
    if (state.diagnostic && !state.diagnostic.done) {
      state.diagnostic.index++;
      if (state.diagnostic.index >= state.diagnostic.queue.length) {
        state.diagnostic.done = true;
        state.subject = "추천";
        toast("진단을 마쳤어. 실제 풀이 결과로 다음 문제를 추천해.");
      }
    }
    state.feedback = null;
    state.draft = null;
    state.direct = false;
    state.current = null;
    if (state.mode === "all") {
      const pool = activePool(),
        i = pool.findIndex((q) => q.id === old);
      state.current = pool[(i + 1) % pool.length]?.id || null;
    }
    save();
    drawQuestion();
    $("question-shell").focus({ preventScroll: true });
    $("question-shell").scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }
  function openQuestion(id) {
    state.current = id;
    state.feedback = null;
    state.draft = null;
    state.direct = true;
    save();
    drawQuestion();
    $("question-shell").scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }
  function openSimilar(q) {
    const target = q.parent
      ? ORIGINAL.find((x) => x.id === q.parent)
      : SIMILAR.find((x) => x.parent === q.id);
    if (target) openQuestion(target.id);
    else nextDrill();
  }
  function openTutor(q) {
    const pick = state.feedback.choice;
    $("tutor-text").value =
      "고2 학생이야. 정답을 다시 말하기보다 내가 막힌 지점을 먼저 확인해 줘. 한 번에 한 질문씩, 쉬운 말로 설명한 뒤 다른 예제로 내가 풀게 해 줘.\n과목: " +
      q.subject +
      " / " +
      q.topic +
      "\n" +
      (q.passage ? "지문: " + q.passage + "\n" : "") +
      "문제: " +
      q.stem +
      "\n" +
      q.options.map((s, i) => i + 1 + ". " + s).join("\n") +
      "\n내 선택: " +
      (pick + 1) +
      " / 정답: " +
      (q.answer + 1) +
      "\n기본 해설: " +
      q.why +
      "\n내가 이해한 내용: " +
      (state.attempts[q.id]?.reflection || "아직 정리하지 못했어") +
      "\n막힌 이유: " +
      (state.attempts[q.id]?.cause || "아직 모르겠어");
    $("tutor-status").textContent = "질문 내용을 확인한 뒤 복사해 줘.";
    $("tutor-dialog").showModal();
  }
  async function copyTutor() {
    try {
      await navigator.clipboard.writeText($("tutor-text").value);
      $("tutor-status").textContent = "복사했어. ChatGPT를 열고 붙여넣어 줘.";
    } catch {
      $("tutor-text").focus();
      $("tutor-text").select();
      $("tutor-status").textContent =
        "질문을 선택했어. 길게 눌러 복사하거나 Ctrl/Cmd+C를 눌러 줘.";
    }
  }
  function examKey() {
    return state.pastSubject + "#" + state.pastNumber;
  }
  function currentPast() {
    return (
      state.past[examKey()] || {
        pick: null,
        mark: "unsure",
        note: "",
        answer: "",
      }
    );
  }
  function pastSave(next) {
    state.past[examKey()] = {
      ...currentPast(),
      ...next,
      updatedAt: new Date().toISOString(),
    };
    save();
    renderPastGrid();
    stats();
  }
  function drawPast() {
    $("past-subject").innerHTML = SUBJECTS.map(
      (s) => "<option>" + s + "</option>",
    ).join("");
    $("past-subject").value = state.pastSubject;
    renderPastGrid();
    renderPastEditor();
  }
  function renderPastGrid() {
    $("past-grid").innerHTML = Array.from(
      { length: PAPER_LENGTH[state.pastSubject] },
      (_, i) => {
        const n = i + 1,
          a = state.past[state.pastSubject + "#" + n];
        return (
          '<button data-past-number="' +
          n +
          '" class="' +
          (n === state.pastNumber ? "selected " : "") +
          (a?.mark || "") +
          '" aria-label="' +
          n +
          "번 " +
          (a?.mark === "wrong"
            ? "오답"
            : a?.mark === "correct"
              ? "정답"
              : a?.pick != null || a?.answer
                ? "답안 있음"
                : "미기록") +
          '" aria-pressed="' +
          (n === state.pastNumber) +
          '">' +
          n +
          (a?.mark === "wrong"
            ? "<small>×</small>"
            : a?.mark === "correct"
              ? "<small>✓</small>"
              : a?.pick != null || a?.answer
                ? "<small>·</small>"
                : "") +
          "</button>"
        );
      },
    ).join("");
    $("past-grid")
      .querySelectorAll("[data-past-number]")
      .forEach(
        (b) =>
          (b.onclick = () => {
            state.pastNumber = Number(b.dataset.pastNumber);
            save();
            renderPastGrid();
            renderPastEditor();
          }),
      );
  }
  function renderPastEditor() {
    const a = currentPast(),
      short = state.pastSubject === "수학" && state.pastNumber >= 22;
    $("answer-heading").textContent =
      state.pastSubject + " " + state.pastNumber + "번 · 답안 기록";
    $("past-choices").hidden = short;
    $("short-answer-label").hidden = !short;
    $("short-answer").value = a.answer || "";
    $("past-choices").innerHTML = [1, 2, 3, 4, 5]
      .map(
        (n) =>
          '<button data-pick="' +
          n +
          '" class="' +
          (a.pick === n ? "selected" : "") +
          '" aria-pressed="' +
          (a.pick === n) +
          '">' +
          n +
          "</button>",
      )
      .join("");
    $("past-choices")
      .querySelectorAll("[data-pick]")
      .forEach(
        (b) =>
          (b.onclick = () => {
            pastSave({ pick: Number(b.dataset.pick), mark: "unsure" });
            renderPastEditor();
          }),
      );
    document.querySelectorAll("[data-mark]").forEach((b) => {
      b.classList.toggle("selected", a.mark === b.dataset.mark);
      b.setAttribute("aria-pressed", String(a.mark === b.dataset.mark));
      b.disabled = short ? !a.answer : a.pick == null;
    });
    $("past-note").value = a.note || "";
    $("past-status").textContent =
      a.mark === "correct"
        ? "공식 정답표를 보고 직접 O로 기록했어."
        : a.mark === "wrong"
          ? "오답으로 기록했어. 막힌 이유를 적고 다시 풀어 보자."
          : "공식 정답표를 직접 확인한 뒤 O/X를 표시해. 자동 채점은 하지 않아.";
  }
  function reportData() {
    return SUBJECTS.map((subject) => {
      const qs = ORIGINAL.filter((q) => q.subject === subject),
        done = qs.filter((q) => state.attempts[q.id]),
        correct = done.filter((q) => state.attempts[q.id].firstCorrect).length;
      return {
        subject,
        total: qs.length,
        done: done.length,
        correct,
        pending: QUESTIONS.filter(
          (q) => q.subject === subject && pending(state.attempts[q.id]),
        ).length,
        rate: done.length ? Math.round((correct / done.length) * 100) : null,
      };
    });
  }
  function drawReport() {
    stats();
    const data = reportData();
    $("report-subjects").innerHTML = data
      .map(
        (d) =>
          '<article class="report-subject"><h3>' +
          d.subject +
          "</h3><strong>" +
          (d.rate === null ? "아직 시작 전" : d.rate + "%") +
          "</strong><p>첫 시도 " +
          d.correct +
          "/" +
          d.done +
          " · 재확인 " +
          d.pending +
          '문항</p><div class="mini-track"><span style="width:' +
          (d.rate || 0) +
          '%"></span></div></article>',
      )
      .join("");
    const used = data
        .filter((d) => d.done)
        .sort((a, b) => b.pending - a.pending || a.rate - b.rate),
      worst = used[0],
      hinted = Object.values(state.attempts).filter((a) => a.hinted).length;
    $("report-next").innerHTML =
      '<p class="eyebrow">YOUR NEXT SMALL STEP</p><h3>다음 15분의 방향.</h3><p>' +
      (worst
        ? "<b>" +
          worst.subject +
          "</b>에서 첫 시도 " +
          worst.correct +
          "/" +
          worst.done +
          "문항 정답, 다시 확인할 문항 " +
          worst.pending +
          "개가 있어. 표본이 적으니 이 기록을 출발점으로 삼아 줘."
        : "짧은 진단을 풀면 실제 결과로 다음 과목을 추천해.") +
      "</p><p>최근 풀이에서 힌트·헷갈림·추측이 기록된 문제 " +
      hinted +
      '개. 정답을 기억하는 것과 이유를 설명하는 것을 구별해 보자.</p><button id="review-recommend" class="solid">아직 모르는 문제 다시 풀기 →</button>';
    $("review-recommend").onclick = () => {
      state.subject = "추천";
      state.mode = "review";
      state.causeFilter = "";
      leaveDiagnostic();
      resetQuestion();
      document.body.classList.add("started");
      go("drills", true);
    };
    $("session-history").innerHTML =
      '<p class="eyebrow">FOCUS JOURNAL</p><h3>세션 기록</h3>' +
      (state.sessions.length
        ? state.sessions
            .slice()
            .reverse()
            .slice(0, 20)
            .map(
              (s) =>
                '<article class="session-row"><p><b>' +
                esc(new Date(s.endedAt).toLocaleString("ko-KR")) +
                "</b> · 집중 " +
                Math.round(s.elapsed / 60) +
                "분 · 휴식 " +
                Math.round((s.breakSeconds || 0) / 60) +
                "분</p><p>풀이 " +
                (s.solved || 0) +
                "회 · 정답 " +
                (s.correct || 0) +
                "회 · 새로 도움 없이 확인 " +
                (s.mastered || 0) +
                '개</p><label>과목<input data-session-subject="' +
                esc(s.id) +
                '" value="' +
                esc(s.subject) +
                '" maxlength="60"></label><label>오늘 공부한 내용<textarea data-session-note="' +
                esc(s.id) +
                '" rows="2" maxlength="300">' +
                esc(s.note) +
                "</textarea></label></article>",
            )
            .join("")
        : "<p>120분 또는 180분 세션을 시작하면 집중·휴식 시간과 풀이 결과가 여기에 남아.</p>");
    $("session-history")
      .querySelectorAll("[data-session-subject]")
      .forEach(
        (el) =>
          (el.oninput = () => {
            state.sessions.find(
              (s) => s.id === el.dataset.sessionSubject,
            ).subject = el.value;
            save();
          }),
      );
    $("session-history")
      .querySelectorAll("[data-session-note]")
      .forEach(
        (el) =>
          (el.oninput = () => {
            state.sessions.find((s) => s.id === el.dataset.sessionNote).note =
              el.value;
            save();
          }),
      );
  }
  function missionSeconds() {
    const m = state.mission;
    return m
      ? Math.min(
          Math.max(0, m.minutes * 60 - (m.breakSeconds || 0)),
          Math.max(0, m.elapsed) +
            (m.running ? Math.max(0, (now() - m.startedAt) / 1000) : 0),
        )
      : 0;
  }
  function breakSeconds() {
    const m = state.mission;
    return m
      ? Math.min(
          Math.max(0, m.minutes * 60 - m.elapsed),
          (m.breakSeconds || 0) +
            (m.breakStarted ? Math.max(0, (now() - m.breakStarted) / 1000) : 0),
        )
      : 0;
  }
  function sessionSeconds() {
    return Math.min(
      (state.mission?.minutes || 0) * 60,
      missionSeconds() + breakSeconds(),
    );
  }
  function closeBreak() {
    const m = state.mission;
    if (m?.breakStarted) {
      m.breakSeconds = breakSeconds();
      m.breakStarted = 0;
    }
  }
  function pauseMission() {
    const m = state.mission;
    if (!m) return;
    if (m.running) {
      m.elapsed = missionSeconds();
      m.running = false;
      m.startedAt = 0;
    }
    closeBreak();
    save();
    renderMission();
  }
  function startMission(minutes) {
    if (state.mission) {
      if (
        !confirm("현재 세션을 기록하고 새 세션을 시작할까? 풀이 기록은 유지돼.")
      )
        return;
      finishMission(false);
    }
    state.mission = {
      minutes,
      elapsed: 0,
      startedAt: now(),
      running: true,
      createdAt: now(),
      breakSeconds: 0,
      baselineMastered: QUESTIONS.filter(
        (q) => state.attempts[q.id]?.mastered,
      ).map((q) => q.id),
    };
    save();
    renderMission();
    startStudy();
  }
  function missionStage() {
    const m = state.mission;
    if (!m) return null;
    let t = sessionSeconds();
    for (const [i, [subject, minutes]] of PLANS[m.minutes].entries()) {
      if (t < minutes * 60) return { subject, i, remaining: minutes * 60 - t };
      t -= minutes * 60;
    }
    return { subject: "마무리", i: PLANS[m.minutes].length, remaining: 0 };
  }
  function renderMission() {
    const m = state.mission;
    for (const id of ["mission-120", "mission-180"]) $(id).hidden = !!m;
    for (const id of [
      "mission-toggle",
      "mission-break",
      "mission-focus",
      "mission-end",
      "mission-track",
      "mission-stages",
    ])
      $(id).hidden = !m;
    if (!m) {
      $("mission-title").textContent = "오늘, 나에게 주는 두 시간.";
      $("mission-clock").innerHTML = "120<span>min</span>";
      $("mission-note").textContent =
        "과목을 바꿔도 흐름은 이어져. 쉬는 시간도 따로 기록해.";
      return;
    }
    const elapsed = sessionSeconds(),
      stage = missionStage();
    if (elapsed >= m.minutes * 60 && (m.running || m.breakStarted)) {
      m.elapsed = missionSeconds();
      m.running = false;
      m.startedAt = 0;
      closeBreak();
      save();
    }
    $("mission-title").textContent = m.breakStarted
      ? "잠깐, 눈과 어깨를 쉬어 줘."
      : elapsed >= m.minutes * 60
        ? "집중 시간을 채웠어. 이해한 것을 돌아보자."
        : "지금의 한 문제에 집중해.";
    $("mission-clock").textContent = m.breakStarted
      ? clock(Math.max(0, 300 - (now() - m.breakStarted) / 1000))
      : clock(m.minutes * 60 - elapsed);
    $("mission-note").textContent = m.breakStarted
      ? "휴식 " +
        Math.floor(breakSeconds() / 60) +
        "분 기록 중 · 준비되면 이어하기"
      : (m.running ? "집중 중" : "일시정지 중") +
        " · " +
        stage.subject +
        " 권장 구간 · 화면을 나가면 자동 일시정지";
    $("mission-fill").style.width = (100 * elapsed) / (m.minutes * 60) + "%";
    $("mission-toggle").textContent = m.running ? "일시정지" : "이어하기";
    $("mission-toggle").disabled = elapsed >= m.minutes * 60;
    $("mission-break").hidden = !!m.breakStarted || elapsed >= m.minutes * 60;
    $("mission-focus").textContent =
      stage.subject === "휴식" ? "5분 휴식 시작 →" : stage.subject + " 열기 →";
    $("mission-stages").innerHTML = PLANS[m.minutes]
      .map(
        ([s, t], i) =>
          '<button data-stage="' +
          i +
          '" class="' +
          (stage.i === i ? "active" : "") +
          '">' +
          s +
          " <small>" +
          t +
          "분</small></button>",
      )
      .join("");
    $("mission-stages")
      .querySelectorAll("[data-stage]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            missionSubject(PLANS[m.minutes][Number(b.dataset.stage)][0])),
      );
  }
  function beginBreak() {
    const m = state.mission;
    if (!m) return;
    pauseMission();
    m.breakStarted = now();
    save();
    renderMission();
  }
  function missionSubject(s) {
    if (s === "휴식") {
      beginBreak();
      return;
    }
    if (s === "마무리") {
      go("report", true);
      return;
    }
    document.body.classList.add("started");
    if (s === "진단") {
      if (!state.diagnostic || state.diagnostic.done) {
        state.diagnostic = { queue: DIAGNOSTIC, index: 0, done: false };
        resetQuestion();
      }
      go("drills", true);
      return;
    }
    leaveDiagnostic();
    state.subject = s === "오답 재시험" ? "추천" : s;
    state.mode = s === "오답 재시험" ? "review" : "new";
    state.causeFilter = "";
    resetQuestion();
    go("drills", true);
  }
  function finishMission(show = true) {
    const m = state.mission;
    if (!m) return;
    pauseMission();
    const events = state.events.filter((e) => e.at >= (m.createdAt || now()));
    state.sessions.push({
      id: String(now()),
      endedAt: new Date().toISOString(),
      elapsed: m.elapsed,
      breakSeconds: m.breakSeconds || 0,
      solved: events.length,
      correct: events.filter((e) => e.correct).length,
      mastered: QUESTIONS.filter(
        (q) =>
          state.attempts[q.id]?.mastered &&
          !(m.baselineMastered || []).includes(q.id),
      ).length,
      subject:
        [...new Set(events.map((e) => e.subject))].join(" · ") || "자유 학습",
      note: "",
    });
    state.mission = null;
    save();
    renderMission();
    if (show) go("report", true);
  }
  function exportData() {
    const snapshot = JSON.parse(JSON.stringify(state));
    if (snapshot.mission) {
      snapshot.mission.elapsed = missionSeconds();
      snapshot.mission.breakSeconds = breakSeconds();
      snapshot.mission.running = false;
      snapshot.mission.startedAt = 0;
      snapshot.mission.breakStarted = 0;
    }
    const payload = {
      app: "BKIT_EXAM_LAB",
      savedAt: new Date().toISOString(),
      data: snapshot,
    };
    if (blocked && raw) payload.protectedOriginal = raw;
    const url = URL.createObjectURL(
        new Blob([JSON.stringify(payload, null, 2)], {
          type: "application/json",
        }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "BKIT-EXAM-LAB-20261019.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    toast("다운로드를 요청했어. 파일 앱 등에 실제 저장됐는지 확인해 줘.");
  }
  async function importData(file) {
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw Error("5MB 이하 JSON만 가져올 수 있어.");
      const obj = JSON.parse(await file.text());
      if (obj.app !== "BKIT_EXAM_LAB" || !validate(obj.data))
        throw Error(
          "백업 형식이나 기록 값이 올바르지 않아. 기존 기록은 유지했어.",
        );
      if (blocked)
        throw Error(
          "현재 저장소 상태를 먼저 확인해 줘. 보호 중인 원본을 덮어쓰지 않았어.",
        );
      if (
        !confirm(
          "현재 EXAM LAB 기록을 이 백업으로 교체할까? 계속하면 교체 전 기록도 이 브라우저에 안전 사본으로 보관해. JSON 백업도 먼저 내려받는 것을 권장해.",
        )
      )
        return;
      const previous = state;
      const safetyKey = KEY + ".before-restore." + now();
      localStorage.setItem(safetyKey, JSON.stringify(previous));
      state = { ...initial(), ...obj.data, view: "report" };
      if (state.mission) {
        state.mission.running = false;
        state.mission.startedAt = 0;
        state.mission.breakStarted = 0;
      }
      if (!save()) {
        state = previous;
        throw Error("저장 실패. 기존 기록을 유지했어.");
      }
      location.reload();
    } catch (e) {
      toast("가져오기 실패: " + e.message);
    }
  }
  function loadPaper(file) {
    if (!file) return;
    const image = ["image/png", "image/jpeg", "image/webp"].includes(file.type),
      pdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");
    if (file.size > 40_000_000 || (!image && !pdf)) {
      $("file-name").textContent = "40MB 이하 PDF·PNG·JPEG·WebP를 선택해 줘.";
      return;
    }
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    fileUrl = URL.createObjectURL(file);
    const box = $("file-preview");
    box.textContent = "";
    const open = document.createElement("a");
    open.href = fileUrl;
    open.target = "_blank";
    open.rel = "noopener";
    open.className = "source-link";
    open.textContent = "전체 화면으로 원본 보기 ↗";
    box.appendChild(open);
    if (image) {
      const img = document.createElement("img");
      img.src = fileUrl;
      img.alt = "내가 선택한 시험지";
      box.appendChild(img);
    } else {
      const frame = document.createElement("iframe");
      frame.src = fileUrl;
      frame.title = "내 기출 PDF";
      box.appendChild(frame);
    }
    box.hidden = false;
    box.parentElement.classList.add("with-paper");
    $("file-name").textContent =
      file.name +
      " · 이 기기에서만 열람 중. PDF가 잘리지 않게 보려면 전체 화면을 사용해.";
  }
  function init() {
    if (!ORIGINAL.length || !SIMILAR.length) {
      $("question-shell").textContent =
        "문항 파일을 불러오지 못했어. 인터넷 연결을 확인하고 새로고침해 줘.";
      return;
    }
    for (const v of ["drills", "past", "report"])
      $("tab-" + v).onclick = () => go(v, true);
    $("hero-start").onclick = startStudy;
    $("focus-toggle").onclick = () => {
      const on = document.body.classList.toggle("focus-mode");
      $("focus-toggle").setAttribute("aria-pressed", String(on));
      $("focus-toggle").textContent = on ? "집중 화면 나가기 ↙" : "집중 화면 ↗";
      if (on) {
        document.body.classList.add("started");
        go("drills", true);
      }
    };
    $("drill-subjects").onclick = (e) => {
      const b = e.target.closest("[data-subject]");
      if (b) setSubject(b.dataset.subject);
    };
    for (const m of ["new", "review", "all"])
      $("mode-" + m).onclick = () => setMode(m);
    $("cause-filter").onchange = (e) => {
      state.causeFilter = e.target.value;
      resetQuestion();
      drawQuestion();
    };
    $("past-subject").onchange = (e) => {
      state.pastSubject = e.target.value;
      state.pastNumber = 1;
      save();
      drawPast();
    };
    document.querySelectorAll("[data-mark]").forEach(
      (b) =>
        (b.onclick = () => {
          pastSave({ mark: b.dataset.mark });
          renderPastEditor();
        }),
    );
    $("past-note").oninput = (e) =>
      pastSave({ note: e.target.value.slice(0, 180) });
    $("short-answer").oninput = (e) => {
      pastSave({
        answer: e.target.value.slice(0, 8),
        pick: null,
        mark: "unsure",
      });
      document
        .querySelectorAll("[data-mark]")
        .forEach((b) => (b.disabled = !e.target.value));
    };
    $("past-file").onchange = (e) => loadPaper(e.target.files?.[0]);
    $("export").onclick = exportData;
    $("import").onchange = (e) => {
      importData(e.target.files?.[0]);
      e.target.value = "";
    };
    $("mission-120").onclick = () => startMission(120);
    $("mission-180").onclick = () => startMission(180);
    $("mission-toggle").onclick = () => {
      if (state.mission.running) pauseMission();
      else {
        closeBreak();
        state.mission.running = true;
        state.mission.startedAt = now();
        save();
        renderMission();
      }
    };
    $("mission-break").onclick = beginBreak;
    $("mission-focus").onclick = () => missionSubject(missionStage().subject);
    $("mission-end").onclick = () => {
      if (confirm("지금까지 집중한 시간과 풀이를 기록하고 세션을 마칠까?"))
        finishMission();
    };
    $("tutor-close").onclick = () => $("tutor-dialog").close();
    $("tutor-copy").onclick = copyTutor;
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) pauseMission();
    });
    window.addEventListener("pagehide", pauseMission);
    window.addEventListener("storage", (e) => {
      if (e.key === KEY && e.newValue !== raw) {
        blocked = true;
        storageError =
          "다른 탭의 기록을 보호하기 위해 이 탭 저장을 멈췄어. 백업 후 새로 열어 줘.";
        if (state.mission) {
          state.mission.elapsed = missionSeconds();
          state.mission.running = false;
          state.mission.startedAt = 0;
        }
        warning(storageError);
        renderMission();
      }
    });
    if (state.mission?.running) {
      state.mission.running = false;
      state.mission.startedAt = 0;
    }
    if (state.mission?.breakStarted) state.mission.breakStarted = 0;
    if (Object.keys(state.attempts).length || state.events.length)
      document.body.classList.add("started");
    go(
      ["drills", "past", "report"].includes(state.view) ? state.view : "drills",
    );
    renderMission();
    stats();
    if (blocked) warning(storageError);
    setInterval(() => {
      if (state.mission) {
        if (state.mission.running) {
          const t = now();
          state.mission.elapsed = missionSeconds();
          state.mission.startedAt = t;
          save();
        }
        renderMission();
      }
    }, 1000);
  }
  init();
})();

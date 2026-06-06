/* ===== SERVICE WORKER ===== */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  orderBy,
  query,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ===== FIREBASE INIT ===== */
const firebaseConfig = {
  apiKey: "AIzaSyAhsQz02rgD47PRV-ERxjcbGcNFVWz2zEc",
  authDomain: "mjlw-69d96.firebaseapp.com",
  projectId: "mjlw-69d96",
  storageBucket: "mjlw-69d96.firebasestorage.app",
  messagingSenderId: "408959307173",
  appId: "1:408959307173:web:85bb8b85d90b106030ac4c",
};
const fireapp = initializeApp(firebaseConfig);
const db = getFirestore(fireapp);

/* ===== CONSTANTS ===== */
const LEVELS = ["N1", "N2", "N3", "N4", "N5"];
const JOYO_LEVEL = "상용한자";

const SAMPLE_WORDS = [
  {
    level: "N5",
    reading: "にほんご",
    kanji: "日本語",
    onyomi: "ニチ・ゴ",
    kunyomi: "",
    meaning: "일본어",
    example: "日本語を毎日勉強しています。",
  },
  {
    level: "N5",
    reading: "たべる",
    kanji: "食べる",
    onyomi: "ショク",
    kunyomi: "た(べる)",
    meaning: "먹다",
    example: "朝ごはんを食べる。",
  },
  {
    level: "N5",
    reading: "みず",
    kanji: "水",
    onyomi: "スイ",
    kunyomi: "みず",
    meaning: "물",
    example: "水を飲んでください。",
  },
  {
    level: "N5",
    reading: "やま",
    kanji: "山",
    onyomi: "サン",
    kunyomi: "やま",
    meaning: "산",
    example: "富士山はきれいです。",
  },
  {
    level: "N5",
    reading: "がっこう",
    kanji: "学校",
    onyomi: "ガク・コウ",
    kunyomi: "",
    meaning: "학교",
    example: "学校へ行きます。",
  },
  {
    level: "N5",
    reading: "ともだち",
    kanji: "友達",
    onyomi: "ユウ",
    kunyomi: "とも",
    meaning: "친구",
    example: "友達と映画を見ました。",
  },
  {
    level: "N4",
    reading: "あんぜん",
    kanji: "安全",
    onyomi: "アン・ゼン",
    kunyomi: "",
    meaning: "안전",
    example: "安全に運転してください。",
  },
  {
    level: "N4",
    reading: "れんしゅう",
    kanji: "練習",
    onyomi: "レン・シュウ",
    kunyomi: "",
    meaning: "연습",
    example: "毎日練習すれば上手になります。",
  },
  {
    level: "N4",
    reading: "しんぱい",
    kanji: "心配",
    onyomi: "シン・パイ",
    kunyomi: "",
    meaning: "걱정",
    example: "心配しないでください。",
  },
  {
    level: "N4",
    reading: "じゆう",
    kanji: "自由",
    onyomi: "ジ・ユウ",
    kunyomi: "",
    meaning: "자유",
    example: "自由な時間が好きです。",
  },
  {
    level: "N3",
    reading: "けいけん",
    kanji: "経験",
    onyomi: "ケイ・ケン",
    kunyomi: "",
    meaning: "경험",
    example: "いい経験になりました。",
  },
  {
    level: "N3",
    reading: "かんきょう",
    kanji: "環境",
    onyomi: "カン・キョウ",
    kunyomi: "",
    meaning: "환경",
    example: "環境を大切にしましょう。",
  },
  {
    level: "N2",
    reading: "こうきょう",
    kanji: "公共",
    onyomi: "コウ・キョウ",
    kunyomi: "",
    meaning: "공공",
    example: "公共の場所でのマナーを守る。",
  },
  {
    level: "N2",
    reading: "ひつよう",
    kanji: "必要",
    onyomi: "ヒツ・ヨウ",
    kunyomi: "",
    meaning: "필요",
    example: "休息が必要です。",
  },
  {
    level: "N1",
    reading: "かんりょう",
    kanji: "完了",
    onyomi: "カン・リョウ",
    kunyomi: "",
    meaning: "완료",
    example: "作業が完了しました。",
  },
  {
    level: "상용한자",
    reading: "にち",
    kanji: "日",
    onyomi: "ニチ・ジツ",
    kunyomi: "ひ・か",
    meaning: "날, 해",
    korean: "날 일",
    example: "日本の日",
  },
];

/* ===== STATE ===== */
let words = [];
let selLevel = "all";
let wordJoyoFilter = "all";
let lfOpen = null; // "normal" | "joyo" | null
let editingId = null;
let navHistory = [];
/* ===== KUNYOMI PAIR HELPERS ===== */
function escHtml(s) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function parseKunyomi(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string" && val.trim()) return [{ r: val.trim(), m: "" }];
  return [];
}

function renderKunyomiList(listId, pairs) {
  const list = document.getElementById(listId);
  list.innerHTML = "";
  const rows = pairs.length ? pairs : [{ r: "", m: "" }];
  rows.forEach(({ r, m }) => _appendKunyomiRow(list, r, m));
}

function addKunyomiRow(listId) {
  _appendKunyomiRow(document.getElementById(listId), "", "");
}

function _appendKunyomiRow(listEl, r, m) {
  const row = mkEl("div", "kunyomi-pair");
  row.innerHTML = `
    <input class="form-input kunyomi-r" type="text" placeholder="발음 (예: ひ)" value="${escHtml(r)}" autocomplete="off" />
    <input class="form-input kunyomi-m" type="text" placeholder="의미 (예: 날)" value="${escHtml(m)}" autocomplete="off" />
    <button type="button" class="btn-remove-pair" title="삭제">×</button>
  `;
  row.querySelector(".btn-remove-pair").onclick = () => {
    if (listEl.children.length > 1) {
      row.remove();
    } else {
      row.querySelector(".kunyomi-r").value = "";
      row.querySelector(".kunyomi-m").value = "";
    }
  };
  listEl.appendChild(row);
}

function getKunyomiPairs(listId) {
  return Array.from(document.getElementById(listId).querySelectorAll(".kunyomi-pair"))
    .map((row) => ({
      r: row.querySelector(".kunyomi-r").value.trim(),
      m: row.querySelector(".kunyomi-m").value.trim(),
    }))
    .filter((p) => p.r);
}

function formatKunyomiTable(kunyomi) {
  const pairs = parseKunyomi(kunyomi);
  if (!pairs.length) return "—";
  return pairs
    .map((p) => (p.m ? `${p.r}<span class="kunyomi-pair-meaning">·${p.m}</span>` : p.r))
    .join("<br>");
}

function formatKunyomiBack(kunyomi, isRevealed) {
  const pairs = parseKunyomi(kunyomi);
  if (!pairs.length) return "";
  if (!isRevealed) {
    return `<div class="back-item back-item--hidden">
      <span class="back-item-lbl">훈독</span>
      <span class="back-item-val">●●●</span>
    </div>`;
  }
  return pairs
    .map((p, i) => `
      <div class="back-item">
        <span class="back-item-lbl">${pairs.length > 1 ? `훈독${i + 1}` : "훈독"}</span>
        <span class="back-item-val">${escHtml(p.r)}${p.m ? ` · ${escHtml(p.m)}` : ""}</span>
      </div>`)
    .join("");
}

/* ===== ADD FORM CATEGORY FILTER ===== */
let addCategory = null; // null | "normal" | "joyo"
let addNormalLv = null; // null | "N1" ~ "N5"

function renderAddLFBar() {
  const btnNormal = document.getElementById("add-lf-btn-normal");
  const btnJoyo   = document.getElementById("add-lf-btn-joyo");
  const subNormal = document.getElementById("add-lf-sub-normal");
  const subJoyo   = document.getElementById("add-lf-sub-joyo");
  if (!btnNormal) return;

  const isNormal = addCategory === "normal";
  const isJoyo   = addCategory === "joyo";

  btnNormal.classList.toggle("lf-hide", isJoyo);
  btnJoyo.classList.toggle("lf-hide", isNormal);
  btnNormal.classList.toggle("active", isNormal);
  btnJoyo.classList.toggle("active", isJoyo);
  btnNormal.classList.toggle("open", isNormal);
  btnJoyo.classList.toggle("open", isJoyo);
  subNormal.classList.toggle("open", isNormal);
  subJoyo.classList.toggle("open", isJoyo);

  // 일반 단어 N1~N5 (필수)
  subNormal.innerHTML = "";
  LEVELS.forEach((lv) => {
    const sel = isNormal && addNormalLv === lv;
    const btn = mkEl("button", "lf-pill" + (sel ? " sel" : ""));
    btn.textContent = lv;
    btn.onclick = (e) => {
      e.stopPropagation();
      addNormalLv = addNormalLv === lv ? null : lv;
      renderAddLFBar();
    };
    subNormal.appendChild(btn);
  });

  // 상용한자 N1~N5 (선택) — inp-joyo-jlpt select와 동기
  subJoyo.innerHTML = "";
  const joyoJlptEl = document.getElementById("inp-joyo-jlpt");
  const curJoyoLv  = joyoJlptEl ? joyoJlptEl.value : "";
  LEVELS.forEach((lv) => {
    const sel = isJoyo && curJoyoLv === lv;
    const btn = mkEl("button", "lf-pill joyo" + (sel ? " sel" : ""));
    btn.textContent = lv;
    btn.onclick = (e) => {
      e.stopPropagation();
      if (joyoJlptEl) joyoJlptEl.value = curJoyoLv === lv ? "" : lv;
      renderAddLFBar();
    };
    subJoyo.appendChild(btn);
  });

  const normalFields = document.getElementById("normal-fields");
  const joyoFields   = document.getElementById("joyo-fields");
  if (normalFields) normalFields.style.display = isNormal ? "block" : "none";
  if (joyoFields)   joyoFields.style.display   = isJoyo   ? "block" : "none";

  if (isJoyo) {
    const list = document.getElementById("add-kunyomi-list");
    if (list && list.children.length === 0) addKunyomiRow("add-kunyomi-list");
  }

  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) {
    submitBtn.disabled =
      addCategory === null || (addCategory === "normal" && !addNormalLv);
  }
}

function toggleAddCategory(category) {
  if (addCategory === category) {
    addCategory = null;
    addNormalLv = null;
  } else {
    addCategory = category;
  }
  renderAddLFBar();
}
let deck = [],
  ci = 0,
  revealed = new Set(),
  flipped = false;
let reviewIsJoyo = false; // startReview() 시점의 상용한자 여부 캡처
let currentScreen = "home";
let _screenAnimating = false;

/* ===== DB ===== */
async function loadWords() {
  showLoading(true, "단어장 불러오는 중...");
  try {
    let snap;
    try {
      snap = await getDocs(
        query(collection(db, "words"), orderBy("createdAt", "desc")),
      );
    } catch {
      snap = await getDocs(collection(db, "words"));
    }
    words = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (words.length === 0) await insertSamples();
  } catch (e) {
    toast("불러오기 실패. 인터넷 연결을 확인해주세요.");
  }
  showLoading(false);
}

async function insertSamples() {
  showLoading(true, "샘플 단어 삽입 중...");
  const batch = writeBatch(db);
  for (const w of SAMPLE_WORDS) {
    const ref = doc(collection(db, "words"));
    batch.set(ref, { ...w, isSample: true, createdAt: Date.now() });
  }
  await batch.commit();
  const snap = await getDocs(
    query(collection(db, "words"), orderBy("createdAt", "desc")),
  );
  words = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function deleteSamples() {
  const samples = words.filter((w) => w.isSample);
  if (!samples.length) return;
  const batch = writeBatch(db);
  samples.forEach((w) => batch.delete(doc(db, "words", w.id)));
  await batch.commit();
  words = words.filter((w) => !w.isSample);
}

/* ===== HELPERS ===== */
function filtered() {
  if (lfOpen === null) return words.filter((w) => w.level !== JOYO_LEVEL);
  if (lfOpen === "normal") {
    const base = words.filter((w) => w.level !== JOYO_LEVEL);
    return selLevel === "all" ? base : base.filter((w) => w.level === selLevel);
  }
  const base = words.filter((w) => w.level === JOYO_LEVEL);
  return wordJoyoFilter === "all" ? base : base.filter((w) => w.jlpt === wordJoyoFilter);
}
function countLv(lv) {
  return words.filter((w) => w.level === lv).length;
}
function hasSamples() {
  return words.some((w) => w.isSample);
}
function hasRealWords() {
  return words.some((w) => !w.isSample);
}
function mkEl(tag, cls) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  return el;
}

/* ===== LOADING ===== */
function showLoading(v, msg = "") {
  const el = document.getElementById("loading");
  el.style.display = v ? "flex" : "none";
  if (msg) document.getElementById("loading-text").textContent = msg;
}

/* ===== TOAST ===== */
let toastTimer;
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2500);
}

/* ===== SIDEBAR ===== */
function setSidebarActive(name) {
  document.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.screen === name);
  });
}

function openSidebar() {
  document.getElementById("sidebar").classList.add("open");
  document.getElementById("sidebar-overlay").classList.add("show");
}
function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebar-overlay").classList.remove("show");
}

/* ===== WAKELOCK ===== */
let _wakeLock = null;
async function acquireWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try { _wakeLock = await navigator.wakeLock.request('screen'); } catch (_) {}
}
function releaseWakeLock() {
  if (_wakeLock) { _wakeLock.release(); _wakeLock = null; }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && currentScreen === 'review') acquireWakeLock();
});

/* ===== SCREENS ===== */
function showScreen(name, addToHistory = true) {
  const prevScreen = currentScreen;

  if (name === "home") {
    navHistory = [];
  } else if (addToHistory && currentScreen !== name) {
    navHistory.push(currentScreen);
  }

  currentScreen = name;
  setSidebarActive(name);
  closeSidebar();
  document.body.classList.toggle("review-mode", name === "review");

  if (name === "review") acquireWakeLock();
  else releaseWakeLock();

  const titles = {
    home: "홈",
    words: "단어 목록",
    add: "단어 추가",
    review: "복습하기",
  };
  document.getElementById("topbar-title").textContent = titles[name] || "";

  const backBtn = document.getElementById("btn-back");
  backBtn.style.display = navHistory.length > 0 ? "flex" : "none";

  const isMobile = window.innerWidth <= 768;
  const shouldAnim = isMobile && !_screenAnimating && prevScreen !== name;

  if (shouldAnim) {
    _screenAnimating = true;
    const oldEl = document.getElementById("s-" + prevScreen);
    const newEl = document.getElementById("s-" + name);
    if (oldEl && newEl) {
      oldEl.classList.add("screen-slide-out");
      newEl.classList.add("screen-slide-in");
      setTimeout(() => {
        document.querySelectorAll(".screen").forEach(s =>
          s.classList.remove("active", "screen-slide-out", "screen-slide-in")
        );
        newEl.classList.add("active");
        window.scrollTo(0, 0);
        _screenAnimating = false;
      }, 295);
      return;
    }
    _screenAnimating = false;
  }

  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById("s-" + name).classList.add("active");
  window.scrollTo(0, 0);
}

function goBack() {
  if (!navHistory.length) return;
  const prev = navHistory.pop();
  showScreen(prev, false);
  if (prev === "add") {
    renderAddLFBar();
  }
}

/* ===== HOME SCREEN ===== */
function renderHome() {
  const total = words.length;
  const real = words.filter((w) => !w.isSample).length;
  const list = filtered();

  document.getElementById("stat-total").textContent = total;
  document.getElementById("nav-total").textContent = total;
  document.getElementById("stat-real").textContent = real;
  document.getElementById("stat-level").textContent =
    selLevel === "all" ? "전체" : selLevel;
  document.getElementById("stat-filtered").textContent = list.length;

  renderLevelFilter();
}

function renderLFBar(pfx) {
  const btnNormal = document.getElementById(pfx + "btn-normal");
  const btnJoyo   = document.getElementById(pfx + "btn-joyo");
  const subNormal = document.getElementById(pfx + "sub-normal");
  const subJoyo   = document.getElementById(pfx + "sub-joyo");
  if (!btnNormal) return;

  const isNormal = lfOpen === "normal";
  const isJoyo   = lfOpen === "joyo";

  // 펼쳐졌을 때 반대쪽 버튼 숨김
  btnNormal.classList.toggle("lf-hide", isJoyo);
  btnJoyo.classList.toggle("lf-hide", isNormal);

  // 활성 색상 & 화살표 회전
  btnNormal.classList.toggle("active", isNormal);
  btnJoyo.classList.toggle("active", isJoyo);
  btnNormal.classList.toggle("open", isNormal);
  btnJoyo.classList.toggle("open", isJoyo);

  // 서브 패널 슬라이드
  subNormal.classList.toggle("open", isNormal);
  subJoyo.classList.toggle("open", isJoyo);

  // 일반 단어 서브 pills (N1~N5)
  subNormal.innerHTML = "";
  LEVELS.forEach((lv) => {
    const sel = isNormal && selLevel === lv;
    const btn = mkEl("button", "lf-pill" + (sel ? " sel" : ""));
    btn.textContent = lv;
    btn.onclick = (e) => {
      e.stopPropagation();
      selLevel = (selLevel === lv) ? "all" : lv; // 재클릭 시 선택 해제
      wordJoyoFilter = "all";
      renderAll();
    };
    subNormal.appendChild(btn);
  });

  // 상용한자 서브 pills (N1~N5)
  subJoyo.innerHTML = "";
  LEVELS.forEach((v) => {
    const sel = isJoyo && wordJoyoFilter === v;
    const btn = mkEl("button", "lf-pill joyo" + (sel ? " sel" : ""));
    btn.textContent = v;
    btn.onclick = (e) => {
      e.stopPropagation();
      wordJoyoFilter = (wordJoyoFilter === v) ? "all" : v; // 재클릭 시 선택 해제
      selLevel = JOYO_LEVEL;
      renderAll();
    };
    subJoyo.appendChild(btn);
  });
}

function renderLevelFilter() {
  renderLFBar("lf-");
  renderLFBar("wl-lf-");
}

function toggleLFGroup(group) {
  if (lfOpen === group) {
    // 펼쳐진 버튼 재클릭 → 기본 상태로 복귀
    lfOpen = null;
    selLevel = "all";
    wordJoyoFilter = "all";
  } else {
    lfOpen = group;
    if (group === "normal") {
      selLevel = "all";
      wordJoyoFilter = "all";
    } else {
      selLevel = JOYO_LEVEL;
      wordJoyoFilter = "all";
    }
  }
  renderAll();
}

/* ===== WORD LIST ===== */
function renderWordList() {
  const isJoyo = selLevel === JOYO_LEVEL;
  let list = filtered();

  if (isJoyo && wordJoyoFilter !== "all") {
    list =
      wordJoyoFilter === "unset"
        ? list.filter((w) => !w.jlpt)
        : list.filter((w) => w.jlpt === wordJoyoFilter);
  }

  const body = document.getElementById("word-tbody");
  const notice = document.getElementById("sample-notice");
  const countEl = document.getElementById("word-count");

  countEl.textContent = `${list.length}개`;
  notice.style.display = hasSamples() && !hasRealWords() ? "flex" : "none";

  const thead = document.getElementById("word-thead");
  if (isJoyo) {
    thead.innerHTML = `<span>한자</span><span>의미</span><span>레벨</span>`;
  } else {
    thead.innerHTML = `<span>단어</span><span>의미</span><span>레벨</span>`;
  }

  body.innerHTML = "";
  if (!list.length) {
    body.innerHTML = `<div class="empty-table"><div class="empty-icon">📭</div><p>단어가 없어요. 단어를 추가해보세요!</p></div>`;
    return;
  }

  list.forEach((w, i) => {
    const row = mkEl("div", "word-card-row");
    row.style.cursor = "pointer";
    if (i === list.length - 1) row.classList.add("last");
    if (isJoyo) {
      row.innerHTML = `
        <div class="wc-word"><div class="wc-kanji">${w.kanji}</div><div class="wc-reading">${w.korean || "—"}</div></div>
        <div class="wc-meaning">${w.meaning || "—"}</div>
        <div class="wc-level"><span class="level-badge joyo">${w.jlpt || "미지정"}</span><button class="btn-delete" data-id="${w.id}">×</button></div>
      `;
    } else {
      row.innerHTML = `
        <div class="wc-word"><div class="wc-kanji">${w.kanji || w.reading}</div><div class="wc-reading">${w.reading || ""}</div></div>
        <div class="wc-meaning">${w.meaning}</div>
        <div class="wc-level"><span class="level-badge${w.isSample ? " sample" : ""}">${w.isSample ? "샘플" : w.level}</span><button class="btn-delete" data-id="${w.id}">×</button></div>
      `;
    }
    row.querySelector(".btn-delete").onclick = (e) => deleteWord(w.id, e);
    row.addEventListener("click", () => openEditModal(w));
    body.appendChild(row);
  });
}

/* ===== ADD WORD ===== */
function clearForm(type = "normal") {
  if (type === "normal") {
    const keys = ["kanji", "reading", "meaning", "example"];
    keys.forEach((k) => {
      const el = document.getElementById("inp-" + k);
      if (el) el.value = "";
    });
  }

  if (type === "joyo") {
    ["joyo-kanji", "joyo-korean", "joyo-onyomi", "joyo-meaning"].forEach((k) => {
      const el = document.getElementById("inp-" + k);
      if (el) el.value = "";
    });
    const jlptEl = document.getElementById("inp-joyo-jlpt");
    if (jlptEl) jlptEl.value = "";
    renderKunyomiList("add-kunyomi-list", []);
  }
}

async function addWord() {
  if (!addCategory || (addCategory === "normal" && !addNormalLv)) {
    toast("카테고리와 레벨을 선택해주세요");
    return;
  }
  const isJoyo = addCategory === "joyo";

  let w = {
    level: isJoyo ? JOYO_LEVEL : addNormalLv,
    isSample: false,
    createdAt: Date.now(),
  };

  if (!isJoyo) {
    w = {
      ...w,
      kanji: document.getElementById("inp-kanji").value.trim(),
      reading: document.getElementById("inp-reading").value.trim(),
      meaning: document.getElementById("inp-meaning").value.trim(),
      example: document.getElementById("inp-example").value.trim(),
    };
  } else {
    const jlptVal = document.getElementById("inp-joyo-jlpt").value;
    w = {
      ...w,
      kanji: document.getElementById("inp-joyo-kanji").value.trim(),
      korean: document.getElementById("inp-joyo-korean").value.trim(),
      onyomi: document.getElementById("inp-joyo-onyomi").value.trim(),
      kunyomi: getKunyomiPairs("add-kunyomi-list"),
      meaning: document.getElementById("inp-joyo-meaning").value.trim(),
      jlpt: jlptVal || "",
    };
  }

  if (isJoyo ? !w.kanji || !w.korean : !w.reading || !w.meaning) {
    toast(isJoyo ? "한자와 한국한자는 필수값이에요" : "필수값을 입력해주세요");
    return;
  }

  const btn = document.getElementById("submit-btn");
  btn.disabled = true;
  btn.textContent = "저장 중...";

  try {
    const ref = await addDoc(collection(db, "words"), w);

    words.unshift({ id: ref.id, ...w });

    clearForm(isJoyo ? "joyo" : "normal");
    renderAll();
    renderAddLFBar();

    toast("등록 완료!");
  } catch (e) {
    toast("저장 실패");
  }

  btn.disabled = false;
  btn.textContent = "등록하기";
}

async function deleteWord(id, e) {
  e.stopPropagation();
  if (!confirm("이 단어를 삭제할까요?")) return;
  try {
    await deleteDoc(doc(db, "words", id));
    words = words.filter((w) => w.id !== id);
    renderAll();
    toast("삭제했어요");
  } catch (e) {
    toast("삭제 실패. 인터넷 연결을 확인해주세요.");
  }
}

/* ===== EDIT MODAL ===== */
function renderEditLevelRow(currentLevel) {
  const row = document.getElementById("edit-level-row");
  row.innerHTML = "";
  LEVELS.forEach((lv) => {
    const btn = mkEl("button", "lv-sel-btn" + (lv === currentLevel ? " sel" : ""));
    btn.textContent = lv;
    btn.dataset.lv = lv;
    btn.onclick = () => {
      row.querySelectorAll(".lv-sel-btn").forEach((b) => b.classList.remove("sel"));
      btn.classList.add("sel");
    };
    row.appendChild(btn);
  });
}

function openEditModal(word) {
  editingId = word.id;
  const isJoyo = word.level === JOYO_LEVEL;

  document.getElementById("modal-normal-fields").style.display = isJoyo
    ? "none"
    : "block";
  document.getElementById("modal-joyo-fields").style.display = isJoyo
    ? "block"
    : "none";

  if (!isJoyo) {
    document.getElementById("edit-kanji").value = word.kanji || "";
    document.getElementById("edit-reading").value = word.reading || "";
    document.getElementById("edit-meaning").value = word.meaning || "";
    document.getElementById("edit-korean").value = word.korean || "";
    document.getElementById("edit-example").value = word.example || "";
    renderEditLevelRow(word.level);
  } else {
    document.getElementById("edit-joyo-kanji").value = word.kanji || "";
    document.getElementById("edit-joyo-korean").value = word.korean || "";
    document.getElementById("edit-joyo-onyomi").value = word.onyomi || "";
    renderKunyomiList("edit-kunyomi-list", parseKunyomi(word.kunyomi));
    document.getElementById("edit-joyo-meaning").value = word.meaning || "";
    document.getElementById("edit-joyo-jlpt").value = word.jlpt || "";
  }

  document.getElementById("edit-modal").classList.add("show");
}

function closeEditModal() {
  document.getElementById("edit-modal").classList.remove("show");
  editingId = null;
}

async function saveEdit() {
  const word = words.find((w) => w.id === editingId);
  if (!word) return;

  const isJoyo = word.level === JOYO_LEVEL;
  let updated;

  if (!isJoyo) {
    const selectedLevel = document.querySelector("#edit-level-row .lv-sel-btn.sel");
    updated = {
      kanji: document.getElementById("edit-kanji").value.trim(),
      reading: document.getElementById("edit-reading").value.trim(),
      meaning: document.getElementById("edit-meaning").value.trim(),
      korean: document.getElementById("edit-korean").value.trim(),
      example: document.getElementById("edit-example").value.trim(),
      level: selectedLevel ? selectedLevel.dataset.lv : word.level,
    };
    if (!updated.reading || !updated.meaning) {
      toast("발음과 의미는 필수값이에요");
      return;
    }
  } else {
    updated = {
      kanji: document.getElementById("edit-joyo-kanji").value.trim(),
      korean: document.getElementById("edit-joyo-korean").value.trim(),
      onyomi: document.getElementById("edit-joyo-onyomi").value.trim(),
      kunyomi: getKunyomiPairs("edit-kunyomi-list"),
      meaning: document.getElementById("edit-joyo-meaning").value.trim(),
      jlpt: document.getElementById("edit-joyo-jlpt").value,
    };
    if (!updated.kanji || !updated.korean) {
      toast("한자와 한국한자는 필수값이에요");
      return;
    }
  }

  const btn = document.getElementById("modal-save");
  btn.disabled = true;
  btn.textContent = "저장 중...";

  try {
    await updateDoc(doc(db, "words", editingId), updated);
    Object.assign(word, updated);
    renderAll();
    closeEditModal();
    toast("수정했어요!");
  } catch {
    toast("저장 실패. 인터넷 연결을 확인해주세요.");
  }

  btn.disabled = false;
  btn.textContent = "저장하기";
}

/* ===== REVIEW ===== */
function startReview() {
  reviewIsJoyo = selLevel === JOYO_LEVEL; // document 이벤트 버블링으로 selLevel이 초기화되기 전에 캡처
  const list = filtered();

  if (!list.length) {
    toast(
      reviewIsJoyo
        ? "상용한자 단어를 먼저 추가해주세요"
        : "선택한 레벨에 단어가 없어요",
    );
    return;
  }

  deck = [...list];
  // 자동 셔플
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  ci = 0;
  revealed.clear();
  flipped = false;

  // 완료 화면 리셋
  document.getElementById("s-review-inner").style.display = "grid";
  document.getElementById("s-done").style.display = "none";

  // 사이드 패널 모드 전환
  const isJoyo = reviewIsJoyo;
  const normalPanel = document.getElementById("reveal-panel-normal");
  const joyoPanel = document.getElementById("reveal-panel-joyo");
  if (normalPanel) normalPanel.style.display = isJoyo ? "none" : "block";
  if (joyoPanel) joyoPanel.style.display = isJoyo ? "block" : "none";

  showScreen("review");
  renderCard();
}

function renderCard() {
  const total = deck.length;
  const w = deck[ci];
  const pct = Math.round((ci / total) * 100);
  const isJoyo = reviewIsJoyo;

  document.getElementById("prog-fill").style.width = pct + "%";
  document.getElementById("prog-label").textContent = `${ci + 1} / ${total}`;
  document.getElementById("prog-pct").textContent = pct + "%";

  if (isJoyo) {
    // ── 상용한자 앞면: 한자 크게 + 한국한자 버튼 누르면 아래 표시 ──
    const showKorean = revealed.has("korean");
    document.getElementById("card-front").innerHTML = `
      <div class="card-kanji">${w.kanji || w.reading}</div>
      ${showKorean && w.korean ? `<div class="card-korean-hint">${w.korean}</div>` : ""}
    `;

    // ── 상용한자 뒷면: 음독/훈독/의미만 (한국한자 없음) ──
    const revRow = (lbl, val, key) => {
      if (!val) return "";
      const hide = !revealed.has(key);
      return `
        <div class="back-item${hide ? " back-item--hidden" : ""}">
          <span class="back-item-lbl">${lbl}</span>
          <span class="back-item-val">${hide ? "●●●" : val}</span>
        </div>`;
    };
    document.getElementById("card-back").innerHTML = `
      <div class="back-rows">
        ${revRow("음독", w.onyomi, "onyomi")}
        ${formatKunyomiBack(w.kunyomi, revealed.has("kunyomi"))}
        ${revRow("의미", w.meaning, "meaning")}
      </div>
    `;
  } else {
    // ── 일반 단어 앞면: 단어 가운데 + 발음 버튼 시 단어 위에 표시 ──
    const showReading = revealed.has("reading");
    document.getElementById("card-front").innerHTML = `
      <div class="card-front-inner">
        ${showReading && w.reading ? `<div class="card-furigana">${w.reading}</div>` : ""}
        <div class="card-kanji">${w.kanji || w.reading}</div>
      </div>
    `;

    // ── 일반 단어 뒷면: 뜻/예문 ──
    const revRow = (lbl, val, key) => {
      if (!val) return "";
      const hide = !revealed.has(key);
      return `
        <div class="back-item${hide ? " back-item--hidden" : ""}">
          <span class="back-item-lbl">${lbl}</span>
          <span class="back-item-val">${hide ? "●●●" : val}</span>
        </div>`;
    };
    document.getElementById("card-back").innerHTML = `
      <div class="back-rows">
        ${revRow("뜻", w.meaning, "meaning")}
        ${revRow("예문", w.example, "example")}
      </div>
    `;
  }

  // Reset flip
  flipped = false;
  document.getElementById("flip-card").classList.remove("flipped");

  // Nav buttons
  document.getElementById("btn-prev").disabled = ci === 0;
  document.getElementById("btn-next").textContent =
    ci === total - 1 ? "완료 ✓" : "다음 →";

  // Reveal buttons — 현재 revealed 상태를 버튼에 반영
  document.querySelectorAll(".rev-btn").forEach((b) => {
    b.classList.toggle("on", revealed.has(b.dataset.k));
  });

  // Queue
  renderQueue();
}

function restartReview() {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  ci = 0;
  revealed.clear();
  flipped = false;
  document.getElementById("s-review-inner").style.display = "grid";
  document.getElementById("s-done").style.display = "none";
  renderCard();
}

function renderQueue() {
  const wrap = document.getElementById("word-queue");
  if (!wrap) return;
  wrap.innerHTML = "";
  deck.forEach((w, i) => {
    const item = mkEl("div", "queue-item" + (i === ci ? " current" : ""));
    item.innerHTML = `<span class="q-num">${i + 1}</span><span class="q-word">${w.kanji || w.reading}</span><span>${w.meaning}</span>`;
    item.onclick = () => {
      ci = i;
      revealed.clear();
      renderCard();
    };
    wrap.appendChild(item);
  });
  // scroll current into view
  const cur = wrap.querySelector(".current");
  if (cur) cur.scrollIntoView({ block: "nearest" });
}

function flipCard() {
  flipped = !flipped;
  document.getElementById("flip-card").classList.toggle("flipped", flipped);
}

function toggleReveal(btn) {
  const key = btn.dataset.k;
  revealed.has(key) ? revealed.delete(key) : revealed.add(key);
  const wasFlipped = flipped;
  renderCard();
  // renderCard는 flipped를 false로 리셋하므로 뒤집힌 상태였으면 복원
  if (wasFlipped) {
    document.getElementById("flip-card").classList.add("flipped");
    flipped = true;
  }
  // 상용한자 앞면에서 한국한자 토글 시 앞면 즉시 반영
  const isJoyo = reviewIsJoyo;
  if (isJoyo && key === "korean" && !wasFlipped) {
    const w = deck[ci];
    const showKorean = revealed.has("korean");
    document.getElementById("card-front").innerHTML = `
      <div class="card-kanji">${w.kanji || w.reading}</div>
      ${showKorean && w.korean ? `<div class="card-korean-hint">${w.korean}</div>` : ""}
    `;
  }
}

function nextCard() {
  if (ci >= deck.length - 1) {
    document.getElementById("done-sub").textContent =
      `${deck.length}개 단어를 모두 학습했어요!`;
    document.getElementById("s-review-inner").style.display = "none";
    document.getElementById("s-done").style.display = "block";
    return;
  }
  ci++;
  revealed.clear();
  renderCard();
}

function prevCard() {
  if (ci <= 0) return;
  ci--;
  revealed.clear();
  renderCard();
}

function shuffleDeck() {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  ci = 0;
  revealed.clear();
  renderCard();
  toast("카드를 섞었어요 🔀");
}

/* ===== DARK / LIGHT MODE ===== */
const moonSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>`;
const sunSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  const icon = theme === "dark" ? sunSVG : moonSVG;
  document.querySelectorAll("#theme-icon, #theme-toggle-mobile").forEach((el) => {
    el.innerHTML = icon;
  });
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.content = theme === "dark" ? "#1c1f2b" : "#ffffff";
}

(function initTheme() {
  const saved = localStorage.getItem("theme") || "light";
  applyTheme(saved);
})();

["theme-toggle", "theme-toggle-mobile"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(current === "dark" ? "light" : "dark");
  });
});

/* ===== RENDER ALL ===== */
function renderAll() {
  renderHome();
  renderWordList();
}

/* ===== HAPTIC FEEDBACK ===== */
document.addEventListener('click', (e) => {
  if (navigator.vibrate && e.target.closest('button, [onclick]')) navigator.vibrate(10);
}, true);

/* ===== KEYBOARD LAYOUT ===== */
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    const kh = Math.max(0, window.innerHeight - window.visualViewport.height);
    document.documentElement.style.setProperty('--keyboard-height', kh + 'px');
    if (kh > 0) {
      const el = document.activeElement;
      if (el && el !== document.body) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
    }
  });
}

/* ===== TOUCH GESTURES ===== */
(function () {
  let startX = 0, startY = 0;

  document.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    // 세로 방향이 더 크면 무시
    if (Math.abs(dy) > Math.abs(dx) * 0.8 || Math.abs(dx) < 40) return;
    const sidebarOpen = document.getElementById('sidebar').classList.contains('open');
    // 왼쪽 끝 20px에서 오른쪽 스와이프 → 사이드바 열기
    if (startX < 20 && dx > 50 && !sidebarOpen) { openSidebar(); return; }
    // 사이드바 열린 상태에서 왼쪽 스와이프 → 닫기
    if (dx < -50 && sidebarOpen) { closeSidebar(); return; }
    // 일반 영역 오른쪽 스와이프 → 뒤로 가기
    if (startX >= 20 && dx > 60 && !sidebarOpen) goBack();
  }, { passive: true });
})();

/* ===== INIT ===== */
async function init() {
  await loadWords();
  renderAll();

  // Sidebar nav
  document.querySelectorAll(".nav-item").forEach((el) => {
    el.addEventListener("click", () => {
      const screen = el.dataset.screen;

      if (screen === "review") {
        startReview();
        return;
      }

      if (screen === "add") {
        addCategory = null;
        addNormalLv = null;
        showScreen("add");
        clearForm("normal");
        clearForm("joyo");
        renderAddLFBar();
        return;
      }

      showScreen(screen);
    });
  });

  // Hamburger & back & title
  document.getElementById("hamburger").addEventListener("click", openSidebar);
  document
    .getElementById("sidebar-overlay")
    .addEventListener("click", closeSidebar);
  document.getElementById("btn-back").addEventListener("click", goBack);
  document
    .getElementById("topbar-title")
    .addEventListener("click", () => showScreen("home"));
  document
    .querySelector(".sidebar-logo")
    .addEventListener("click", () => showScreen("home"));

  // Level filter toggles (홈 + 단어 목록 공유)
  document.getElementById("lf-btn-normal").addEventListener("click", () => toggleLFGroup("normal"));
  document.getElementById("lf-btn-joyo").addEventListener("click", () => toggleLFGroup("joyo"));
  document.getElementById("wl-lf-btn-normal").addEventListener("click", () => toggleLFGroup("normal"));
  document.getElementById("wl-lf-btn-joyo").addEventListener("click", () => toggleLFGroup("joyo"));
  document.getElementById("add-lf-btn-normal").addEventListener("click", () => toggleAddCategory("normal"));
  document.getElementById("add-lf-btn-joyo").addEventListener("click", () => toggleAddCategory("joyo"));

  // 필터 영역 밖 클릭 시 기본 상태로 복귀
  document.addEventListener("click", (e) => {
    if (lfOpen === null) return;
    if (!e.target.closest(".lf-bar")) {
      lfOpen = null;
      selLevel = "all";
      wordJoyoFilter = "all";
      renderAll();
    }
  });

  // Add form submit
  document.getElementById("submit-btn").addEventListener("click", addWord);
  document
    .getElementById("cancel-btn")
    .addEventListener("click", () => showScreen("home"));
  document
    .getElementById("btn-add-kunyomi-add")
    .addEventListener("click", () => addKunyomiRow("add-kunyomi-list"));
  document
    .getElementById("btn-add-kunyomi-edit")
    .addEventListener("click", () => addKunyomiRow("edit-kunyomi-list"));

  // Flip card
  document.getElementById("flip-card").addEventListener("click", flipCard);

  // Reveal buttons
  document.querySelectorAll(".rev-btn").forEach((btn) => {
    btn.addEventListener("click", () => toggleReveal(btn));
  });

  // Nav buttons
  document.getElementById("btn-prev").addEventListener("click", prevCard);
  document.getElementById("btn-next").addEventListener("click", nextCard);
  document.getElementById("shuffle-btn").addEventListener("click", shuffleDeck);

  // Done buttons
  document
    .getElementById("btn-done-home")
    .addEventListener("click", () => showScreen("home"));
  document
    .getElementById("btn-done-restart")
    .addEventListener("click", restartReview);

  // Edit modal
  document
    .getElementById("modal-close")
    .addEventListener("click", closeEditModal);
  document
    .getElementById("modal-cancel")
    .addEventListener("click", closeEditModal);
  document.getElementById("modal-save").addEventListener("click", saveEdit);
  document.getElementById("edit-modal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeEditModal();
  });

  showScreen("home");
}

init();

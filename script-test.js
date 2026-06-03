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
let editingId = null;
let navHistory = [];
/* ===== FORM TOGGLE ===== */
function toggleAddForm(type) {
  const normalEl = document.getElementById("normal-fields");
  const joyoEl = document.getElementById("joyo-fields");

  if (normalEl) normalEl.style.display = type === "normal" ? "grid" : "none";
  if (joyoEl) joyoEl.style.display = type === "joyo" ? "grid" : "none";
}
let addLv = "N5";
let deck = [],
  ci = 0,
  revealed = new Set(),
  flipped = false;
let currentScreen = "home";

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
  if (selLevel === "all") return words.filter((w) => w.level !== JOYO_LEVEL);
  return words.filter((w) => w.level === selLevel);
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

/* ===== SCREENS ===== */
function showScreen(name, addToHistory = true) {
  if (name === "home") {
    navHistory = [];
  } else if (addToHistory && currentScreen !== name) {
    navHistory.push(currentScreen);
  }

  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.remove("active"));
  document.getElementById("s-" + name).classList.add("active");
  currentScreen = name;
  setSidebarActive(name);
  closeSidebar();
  window.scrollTo(0, 0);

  const titles = {
    home: "홈",
    words: "단어 목록",
    add: "단어 추가",
    review: "복습하기",
  };
  document.getElementById("topbar-title").textContent = titles[name] || "";

  const backBtn = document.getElementById("btn-back");
  backBtn.style.display = navHistory.length > 0 ? "flex" : "none";
}

function goBack() {
  if (!navHistory.length) return;
  const prev = navHistory.pop();
  showScreen(prev, false);
  if (prev === "add") {
    renderAddLevel();
    toggleAddForm(addLv === JOYO_LEVEL ? "joyo" : "normal");
  }
}

/* ===== HOME SCREEN ===== */
function renderHome() {
  const total = words.length;
  const real = words.filter((w) => !w.isSample).length;
  const list = filtered();

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-real").textContent = real;
  document.getElementById("stat-level").textContent =
    selLevel === "all" ? "전체" : selLevel;
  document.getElementById("stat-filtered").textContent = list.length;

  // level pills
  const pillWrap = document.getElementById("level-pills");
  pillWrap.innerHTML = "";
  const allPill = mkEl(
    "div",
    "level-pill" + (selLevel === "all" ? " sel" : ""),
  );
  allPill.textContent = "전체";
  allPill.onclick = () => {
    selLevel = "all";
    wordJoyoFilter = "all";
    renderAll();
  };
  pillWrap.appendChild(allPill);

  LEVELS.forEach((lv) => {
    const cnt = countLv(lv);
    const pill = mkEl("div", "level-pill" + (selLevel === lv ? " sel" : ""));
    pill.textContent = `${lv} (${cnt})`;
    pill.onclick = () => {
      selLevel = lv;
      wordJoyoFilter = "all";
      renderAll();
    };
    pillWrap.appendChild(pill);
  });

  // 상용한자 pill (구분선 역할의 클래스 추가)
  const joyoCnt = countLv(JOYO_LEVEL);
  const joyoPill = mkEl(
    "div",
    "level-pill joyo" + (selLevel === JOYO_LEVEL ? " sel" : ""),
  );
  joyoPill.textContent = `상용한자 (${joyoCnt})`;
  joyoPill.onclick = () => {
    selLevel = JOYO_LEVEL;
    wordJoyoFilter = "all";
    renderAll();
  };
  pillWrap.appendChild(joyoPill);
}

/* ===== WORD LIST ===== */
function renderWordFilterBar() {
  const bar = document.getElementById("word-filter-bar");
  bar.innerHTML = "";

  const mainLevels = [
    { v: "all", label: "전체", cls: "" },
    ...LEVELS.map((l) => ({ v: l, label: l, cls: "" })),
    { v: JOYO_LEVEL, label: "상용한자", cls: "joyo" },
  ];

  mainLevels.forEach(({ v, label, cls }) => {
    const pill = mkEl(
      "button",
      `filter-pill${cls ? " " + cls : ""}${selLevel === v ? " sel" : ""}`,
    );
    pill.textContent = label;
    pill.onclick = () => {
      selLevel = v;
      wordJoyoFilter = "all";
      renderAll();
    };
    bar.appendChild(pill);
  });

  if (selLevel === JOYO_LEVEL) {
    const sep = mkEl("span", "filter-sep");
    sep.textContent = "|";
    bar.appendChild(sep);

    const subLevels = [
      { v: "all", label: "전체" },
      ...LEVELS.map((l) => ({ v: l, label: l })),
      { v: "unset", label: "미지정" },
    ];

    subLevels.forEach(({ v, label }) => {
      const pill = mkEl(
        "button",
        `filter-pill sub${wordJoyoFilter === v ? " sel" : ""}`,
      );
      pill.textContent = label;
      pill.onclick = (e) => {
        e.stopPropagation();
        wordJoyoFilter = v;
        renderWordList();
      };
      bar.appendChild(pill);
    });
  }
}

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

  renderWordFilterBar();

  const thead = document.getElementById("word-thead");
  if (isJoyo) {
    thead.innerHTML = `<tr>
      <th>한자</th>
      <th class="col-korean">한국한자</th>
      <th class="col-onyomi">음독</th>
      <th class="col-kunyomi">훈독</th>
      <th>의미</th>
      <th>레벨</th>
      <th></th>
    </tr>`;
  } else {
    thead.innerHTML = `<tr>
      <th>단어</th>
      <th class="col-reading">발음</th>
      <th>의미</th>
      <th class="col-example">예문</th>
      <th>레벨</th>
      <th></th>
    </tr>`;
  }

  body.innerHTML = "";
  if (!list.length) {
    body.innerHTML = `
      <tr><td colspan="6">
        <div class="empty-table">
          <div class="empty-icon">📭</div>
          <p>단어가 없어요. 단어를 추가해보세요!</p>
        </div>
      </td></tr>`;
    return;
  }

  list.forEach((w) => {
    const tr = mkEl("tr");
    tr.style.cursor = "pointer";
    if (isJoyo) {
      tr.innerHTML = `
        <td><div class="td-kanji">${w.kanji}</div></td>
        <td class="col-korean td-korean">${w.korean || "—"}</td>
        <td class="col-onyomi td-onyomi">${w.onyomi || "—"}</td>
        <td class="col-kunyomi td-kunyomi">${w.kunyomi || "—"}</td>
        <td class="td-meaning">${w.meaning || "—"}</td>
        <td><span class="level-badge joyo">${w.jlpt || "미지정"}</span></td>
        <td><button class="btn-delete" data-id="${w.id}">✕</button></td>
      `;
    } else {
      tr.innerHTML = `
        <td><div class="td-kanji">${w.kanji || w.reading}</div></td>
        <td class="col-reading td-reading">${w.reading || "—"}</td>
        <td class="td-meaning">${w.meaning}</td>
        <td class="col-example td-example">${w.example || "—"}</td>
        <td><span class="level-badge${w.isSample ? " sample" : ""}">${w.isSample ? "샘플" : w.level}</span></td>
        <td><button class="btn-delete" data-id="${w.id}">✕</button></td>
      `;
    }
    tr.querySelector(".btn-delete").onclick = (e) => deleteWord(w.id, e);
    tr.addEventListener("click", () => openEditModal(w));
    body.appendChild(tr);
  });
}

/* ===== ADD WORD ===== */
function renderAddLevel() {
  const row = document.getElementById("add-level-row");
  row.innerHTML = "";
  [...LEVELS, JOYO_LEVEL].forEach((lv) => {
    const btn = mkEl(
      "button",
      "lv-sel-btn" +
        (addLv === lv ? " sel" : "") +
        (lv === JOYO_LEVEL ? " joyo" : ""),
    );
    btn.textContent = lv;
    btn.onclick = () => {
      addLv = lv;
      renderAddLevel();

      toggleAddForm(lv === JOYO_LEVEL ? "joyo" : "normal");
    };
    row.appendChild(btn);
  });
}
function clearForm(type = "normal") {
  if (type === "normal") {
    const keys = ["kanji", "reading", "meaning", "example"];
    keys.forEach((k) => {
      const el = document.getElementById("inp-" + k);
      if (el) el.value = "";
    });
  }

  if (type === "joyo") {
    const keys = [
      "joyo-kanji",
      "joyo-korean",
      "joyo-onyomi",
      "joyo-kunyomi",
      "joyo-meaning",
    ];
    keys.forEach((k) => {
      const el = document.getElementById("inp-" + k);
      if (el) el.value = "";
    });
    const jlptEl = document.getElementById("inp-joyo-jlpt");
    if (jlptEl) jlptEl.value = "";
  }
}

async function addWord() {
  const isJoyo = addLv === JOYO_LEVEL;

  let w = {
    level: addLv,
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
      kunyomi: document.getElementById("inp-joyo-kunyomi").value.trim(),
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
  } else {
    document.getElementById("edit-joyo-kanji").value = word.kanji || "";
    document.getElementById("edit-joyo-korean").value = word.korean || "";
    document.getElementById("edit-joyo-onyomi").value = word.onyomi || "";
    document.getElementById("edit-joyo-kunyomi").value = word.kunyomi || "";
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
    updated = {
      kanji: document.getElementById("edit-kanji").value.trim(),
      reading: document.getElementById("edit-reading").value.trim(),
      meaning: document.getElementById("edit-meaning").value.trim(),
      korean: document.getElementById("edit-korean").value.trim(),
      example: document.getElementById("edit-example").value.trim(),
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
      kunyomi: document.getElementById("edit-joyo-kunyomi").value.trim(),
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
  const list = filtered();

  if (!list.length) {
    toast(
      selLevel === JOYO_LEVEL
        ? "상용한자 단어를 먼저 추가해주세요"
        : "선택한 레벨에 단어가 없어요",
    );
    return;
  }

  deck = [...list];
  ci = 0;
  revealed.clear();
  flipped = false;

  // 사이드 패널 모드 전환
  const isJoyo = selLevel === JOYO_LEVEL;
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
  const isJoyo = selLevel === JOYO_LEVEL;

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
        ${revRow("훈독", w.kunyomi, "kunyomi")}
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
  const isJoyo = selLevel === JOYO_LEVEL;
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
    document.getElementById("s-done").style.display = "flex";
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

function restartReview() {
  ci = 0;
  revealed.clear();
  flipped = false;
  document.getElementById("s-review-inner").style.display = "grid";
  document.getElementById("s-done").style.display = "none";
  renderCard();
}

/* ===== RENDER ALL ===== */
function renderAll() {
  renderHome();
  renderWordList();
}

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
        addLv = selLevel === "all" ? "N5" : selLevel;

        showScreen("add");
        renderAddLevel();
        toggleAddForm("normal");
        clearForm("normal");

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

  // Add form submit
  document.getElementById("submit-btn").addEventListener("click", addWord);
  document
    .getElementById("cancel-btn")
    .addEventListener("click", () => showScreen("home"));

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

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, getDocs, addDoc, deleteDoc,
  doc, orderBy, query, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ===== FIREBASE INIT ===== */
const firebaseConfig = {
  apiKey: "AIzaSyAhsQz02rgD47PRV-ERxjcbGcNFVWz2zEc",
  authDomain: "mjlw-69d96.firebaseapp.com",
  projectId: "mjlw-69d96",
  storageBucket: "mjlw-69d96.firebasestorage.app",
  messagingSenderId: "408959307173",
  appId: "1:408959307173:web:85bb8b85d90b106030ac4c"
};
const fireapp = initializeApp(firebaseConfig);
const db = getFirestore(fireapp);

/* ===== CONSTANTS ===== */
const LEVELS = ['N1','N2','N3','N4','N5'];

const SAMPLE_WORDS = [
  { level:'N5', reading:'にほんご',  kanji:'日本語', onyomi:'ニチ・ゴ',    kunyomi:'',        meaning:'일본어', example:'日本語を毎日勉強しています。' },
  { level:'N5', reading:'たべる',    kanji:'食べる', onyomi:'ショク',      kunyomi:'た(べる)', meaning:'먹다',   example:'朝ごはんを食べる。' },
  { level:'N5', reading:'みず',      kanji:'水',     onyomi:'スイ',        kunyomi:'みず',     meaning:'물',     example:'水を飲んでください。' },
  { level:'N5', reading:'やま',      kanji:'山',     onyomi:'サン',        kunyomi:'やま',     meaning:'산',     example:'富士山はきれいです。' },
  { level:'N5', reading:'がっこう',  kanji:'学校',   onyomi:'ガク・コウ',  kunyomi:'',         meaning:'학교',   example:'学校へ行きます。' },
  { level:'N5', reading:'ともだち',  kanji:'友達',   onyomi:'ユウ',        kunyomi:'とも',     meaning:'친구',   example:'友達と映画を見ました。' },
  { level:'N4', reading:'あんぜん',  kanji:'安全',   onyomi:'アン・ゼン',  kunyomi:'',         meaning:'안전',   example:'安全に運転してください。' },
  { level:'N4', reading:'れんしゅう',kanji:'練習',   onyomi:'レン・シュウ',kunyomi:'',         meaning:'연습',   example:'毎日練習すれば上手になります。' },
  { level:'N4', reading:'しんぱい',  kanji:'心配',   onyomi:'シン・パイ',  kunyomi:'',         meaning:'걱정',   example:'心配しないでください。' },
  { level:'N4', reading:'じゆう',    kanji:'自由',   onyomi:'ジ・ユウ',    kunyomi:'',         meaning:'자유',   example:'自由な時間が好きです。' },
  { level:'N3', reading:'けいけん',  kanji:'経験',   onyomi:'ケイ・ケン',  kunyomi:'',         meaning:'경험',   example:'いい経験になりました。' },
  { level:'N3', reading:'かんきょう',kanji:'環境',   onyomi:'カン・キョウ',kunyomi:'',         meaning:'환경',   example:'環境を大切にしましょう。' },
  { level:'N2', reading:'こうきょう',kanji:'公共',   onyomi:'コウ・キョウ',kunyomi:'',         meaning:'공공',   example:'公共の場所でのマナーを守る。' },
  { level:'N2', reading:'ひつよう',  kanji:'必要',   onyomi:'ヒツ・ヨウ',  kunyomi:'',         meaning:'필요',   example:'休息が必要です。' },
  { level:'N1', reading:'かんりょう',kanji:'完了',   onyomi:'カン・リョウ',kunyomi:'',         meaning:'완료',   example:'作業が完了しました。' },
];

/* ===== STATE ===== */
let words = [];
let selLevel = 'all';
let addLv = 'N5';
let deck = [], ci = 0, revealed = new Set(), flipped = false;
let currentScreen = 'home';

/* ===== DB ===== */
async function loadWords() {
  showLoading(true, '단어장 불러오는 중...');
  try {
    let snap;
    try {
      snap = await getDocs(query(collection(db, 'words'), orderBy('createdAt', 'desc')));
    } catch {
      snap = await getDocs(collection(db, 'words'));
    }
    words = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (words.length === 0) await insertSamples();
  } catch (e) {
    toast('불러오기 실패. 인터넷 연결을 확인해주세요.');
  }
  showLoading(false);
}

async function insertSamples() {
  showLoading(true, '샘플 단어 삽입 중...');
  const batch = writeBatch(db);
  for (const w of SAMPLE_WORDS) {
    const ref = doc(collection(db, 'words'));
    batch.set(ref, { ...w, isSample: true, createdAt: Date.now() });
  }
  await batch.commit();
  const snap = await getDocs(query(collection(db, 'words'), orderBy('createdAt', 'desc')));
  words = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function deleteSamples() {
  const samples = words.filter(w => w.isSample);
  if (!samples.length) return;
  const batch = writeBatch(db);
  samples.forEach(w => batch.delete(doc(db, 'words', w.id)));
  await batch.commit();
  words = words.filter(w => !w.isSample);
}

/* ===== HELPERS ===== */
function filtered() {
  return selLevel === 'all' ? [...words] : words.filter(w => w.level === selLevel);
}
function countLv(lv) { return words.filter(w => w.level === lv).length; }
function hasSamples() { return words.some(w => w.isSample); }
function hasRealWords() { return words.some(w => !w.isSample); }
function mkEl(tag, cls) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  return el;
}

/* ===== LOADING ===== */
function showLoading(v, msg = '') {
  const el = document.getElementById('loading');
  el.style.display = v ? 'flex' : 'none';
  if (msg) document.getElementById('loading-text').textContent = msg;
}

/* ===== TOAST ===== */
let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}

/* ===== SIDEBAR ===== */
function setSidebarActive(name) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.screen === name);
  });
}

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
}

/* ===== SCREENS ===== */
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('s-' + name).classList.add('active');
  currentScreen = name;
  setSidebarActive(name);
  closeSidebar();
  window.scrollTo(0, 0);

  const titles = { home: '홈', words: '단어 목록', add: '단어 추가', review: '복습하기' };
  document.getElementById('topbar-title').textContent = titles[name] || '';
}

/* ===== HOME SCREEN ===== */
function renderHome() {
  const total = words.length;
  const real = words.filter(w => !w.isSample).length;
  const list = filtered();

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-real').textContent = real;
  document.getElementById('stat-level').textContent = selLevel === 'all' ? '전체' : selLevel;
  document.getElementById('stat-filtered').textContent = list.length;

  // level pills
  const pillWrap = document.getElementById('level-pills');
  pillWrap.innerHTML = '';
  const allPill = mkEl('div', 'level-pill' + (selLevel === 'all' ? ' sel' : ''));
  allPill.textContent = '전체';
  allPill.onclick = () => { selLevel = 'all'; renderAll(); };
  pillWrap.appendChild(allPill);

  LEVELS.forEach(lv => {
    const cnt = countLv(lv);
    const pill = mkEl('div', 'level-pill' + (selLevel === lv ? ' sel' : ''));
    pill.textContent = `${lv} (${cnt})`;
    pill.onclick = () => { selLevel = lv; renderAll(); };
    pillWrap.appendChild(pill);
  });
}

/* ===== WORD LIST ===== */
function renderWordList() {
  const list = filtered();
  const body = document.getElementById('word-tbody');
  const notice = document.getElementById('sample-notice');
  const countEl = document.getElementById('word-count');

  countEl.textContent = `${list.length}개`;
  notice.style.display = (hasSamples() && !hasRealWords()) ? 'flex' : 'none';

  body.innerHTML = '';
  if (!list.length) {
    body.innerHTML = `
      <tr><td colspan="7">
        <div class="empty-table">
          <div class="empty-icon">📭</div>
          <p>단어가 없어요. 단어를 추가해보세요!</p>
        </div>
      </td></tr>`;
    return;
  }

  list.forEach(w => {
    const tr = mkEl('tr');
    tr.innerHTML = `
      <td>
        <div class="td-kanji">${w.kanji || w.reading}</div>
        ${w.kanji ? `<div class="td-reading">${w.reading}</div>` : ''}
      </td>
      <td class="td-meaning">${w.meaning}</td>
      <td class="td-onyomi">${w.onyomi || '—'}</td>
      <td class="td-kunyomi">${w.kunyomi || '—'}</td>
      <td>${w.example ? `<span style="font-size:12px;color:var(--text-3)">있음</span>` : '—'}</td>
      <td><span class="level-badge${w.isSample ? ' sample' : ''}">${w.isSample ? '샘플' : w.level}</span></td>
      <td><button class="btn-delete" data-id="${w.id}">✕</button></td>
    `;
    tr.querySelector('.btn-delete').onclick = (e) => deleteWord(w.id, e);
    body.appendChild(tr);
  });
}

/* ===== ADD WORD ===== */
function renderAddLevel() {
  const row = document.getElementById('add-level-row');
  row.innerHTML = '';
  LEVELS.forEach(lv => {
    const btn = mkEl('button', 'lv-sel-btn' + (addLv === lv ? ' sel' : ''));
    btn.textContent = lv;
    btn.onclick = () => { addLv = lv; renderAddLevel(); };
    row.appendChild(btn);
  });
}

function clearForm() {
  ['reading','kanji','onyomi','kunyomi','meaning','example'].forEach(k => {
    document.getElementById('inp-' + k).value = '';
  });
}

async function addWord() {
  const reading = document.getElementById('inp-reading').value.trim();
  const meaning = document.getElementById('inp-meaning').value.trim();
  if (!reading) { toast('발음을 입력해주세요'); return; }
  if (!meaning) { toast('의미를 입력해주세요'); return; }

  const btn = document.getElementById('submit-btn');
  btn.disabled = true; btn.textContent = '저장 중...';

  try {
    const isFirstReal = !hasRealWords();
    const w = {
      level: addLv, reading,
      kanji: document.getElementById('inp-kanji').value.trim(),
      onyomi: document.getElementById('inp-onyomi').value.trim(),
      kunyomi: document.getElementById('inp-kunyomi').value.trim(),
      meaning,
      example: document.getElementById('inp-example').value.trim(),
      isSample: false,
    };
    const ref = await addDoc(collection(db, 'words'), { ...w, createdAt: Date.now() });
    words.unshift({ id: ref.id, ...w, createdAt: Date.now() });

    if (isFirstReal && hasSamples()) {
      btn.textContent = '샘플 삭제 중...';
      await deleteSamples();
      toast(`"${w.kanji || w.reading}" 등록! 샘플 단어가 삭제됐어요 🗑️`);
    } else {
      toast(`"${w.kanji || w.reading}" 등록 완료! ✓`);
    }
    clearForm();
    renderAll();
  } catch (e) {
    toast('저장 실패. 인터넷 연결을 확인해주세요.');
  }
  btn.disabled = false; btn.textContent = '등록하기';
}

async function deleteWord(id, e) {
  e.stopPropagation();
  if (!confirm('이 단어를 삭제할까요?')) return;
  try {
    await deleteDoc(doc(db, 'words', id));
    words = words.filter(w => w.id !== id);
    renderAll();
    toast('삭제했어요');
  } catch (e) {
    toast('삭제 실패. 인터넷 연결을 확인해주세요.');
  }
}

/* ===== REVIEW ===== */
function startReview() {
  const list = filtered();
  if (!list.length) { toast('선택한 레벨에 단어가 없어요'); return; }
  deck = [...list]; ci = 0; revealed.clear(); flipped = false;
  showScreen('review');
  renderCard();
}

function renderCard() {
  const total = deck.length;
  const w = deck[ci];
  const pct = Math.round((ci / total) * 100);

  document.getElementById('prog-fill').style.width = pct + '%';
  document.getElementById('prog-label').textContent = `${ci + 1} / ${total}`;
  document.getElementById('prog-pct').textContent = pct + '%';

  // Front
  document.getElementById('card-front').innerHTML = `
    <div class="card-kanji">${w.kanji || w.reading}</div>
    ${w.kanji ? `<div class="card-reading">${w.reading}</div>` : ''}
    <div class="card-hint">💡 클릭하면 뒤집기</div>
  `;

  // Back
  const row = (lbl, val, key) => {
    if (!val) return '';
    const hide = !revealed.has(key);
    return `<div class="detail-lbl">${lbl}</div><div class="detail-val${hide ? ' hidden-val' : ''}">${hide ? val.replace(/./g, '●') : val}</div>`;
  };
  document.getElementById('card-back').innerHTML = `
    <div class="card-meaning">${w.meaning}</div>
    <div class="card-divider"></div>
    <div class="detail-grid">
      ${row('발음', w.reading, 'reading')}
      ${row('한자', w.kanji, 'kanji')}
      ${row('음독', w.onyomi, 'onyomi')}
      ${row('훈독', w.kunyomi, 'kunyomi')}
    </div>
    ${w.example ? `<div class="card-divider"></div><div class="card-example">${w.example}</div>` : ''}
    <div class="card-hint">💡 클릭하면 앞면으로</div>
  `;

  // Reset flip
  flipped = false;
  document.getElementById('flip-card').classList.remove('flipped');

  // Nav buttons
  document.getElementById('btn-prev').disabled = (ci === 0);
  document.getElementById('btn-next').textContent = ci === total - 1 ? '완료 ✓' : '다음 →';

  // Reveal buttons
  document.querySelectorAll('.rev-btn').forEach(b => b.classList.remove('on'));

  // Queue
  renderQueue();
}

function renderQueue() {
  const wrap = document.getElementById('word-queue');
  if (!wrap) return;
  wrap.innerHTML = '';
  deck.forEach((w, i) => {
    const item = mkEl('div', 'queue-item' + (i === ci ? ' current' : ''));
    item.innerHTML = `<span class="q-num">${i + 1}</span><span class="q-word">${w.kanji || w.reading}</span><span>${w.meaning}</span>`;
    item.onclick = () => { ci = i; revealed.clear(); renderCard(); };
    wrap.appendChild(item);
  });
  // scroll current into view
  const cur = wrap.querySelector('.current');
  if (cur) cur.scrollIntoView({ block: 'nearest' });
}

function flipCard() {
  flipped = !flipped;
  document.getElementById('flip-card').classList.toggle('flipped', flipped);
}

function toggleReveal(btn) {
  const key = btn.dataset.k;
  revealed.has(key) ? revealed.delete(key) : revealed.add(key);
  btn.classList.toggle('on', revealed.has(key));
  const wasFlipped = flipped;
  renderCard();
  if (wasFlipped) { document.getElementById('flip-card').classList.add('flipped'); flipped = true; }
}

function nextCard() {
  if (ci >= deck.length - 1) {
    document.getElementById('done-sub').textContent = `${deck.length}개 단어를 모두 학습했어요!`;
    document.getElementById('s-review-inner').style.display = 'none';
    document.getElementById('s-done').style.display = 'flex';
    return;
  }
  ci++; revealed.clear(); renderCard();
}

function prevCard() {
  if (ci <= 0) return;
  ci--; revealed.clear(); renderCard();
}

function shuffleDeck() {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  ci = 0; revealed.clear(); renderCard();
  toast('카드를 섞었어요 🔀');
}

function restartReview() {
  ci = 0; revealed.clear(); flipped = false;
  document.getElementById('s-review-inner').style.display = 'grid';
  document.getElementById('s-done').style.display = 'none';
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
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => {
      const screen = el.dataset.screen;
      if (screen === 'review') {
        startReview();
      } else {
        if (screen === 'add') {
          addLv = selLevel === 'all' ? 'N5' : selLevel;
          renderAddLevel();
          clearForm();
        }
        showScreen(screen);
      }
    });
  });

  // Hamburger
  document.getElementById('hamburger').addEventListener('click', openSidebar);
  document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);

  // Add form submit
  document.getElementById('submit-btn').addEventListener('click', addWord);
  document.getElementById('cancel-btn').addEventListener('click', () => showScreen('home'));

  // Flip card
  document.getElementById('flip-card').addEventListener('click', flipCard);

  // Reveal buttons
  document.querySelectorAll('.rev-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleReveal(btn));
  });

  // Nav buttons
  document.getElementById('btn-prev').addEventListener('click', prevCard);
  document.getElementById('btn-next').addEventListener('click', nextCard);
  document.getElementById('shuffle-btn').addEventListener('click', shuffleDeck);

  // Done buttons
  document.getElementById('btn-done-home').addEventListener('click', () => showScreen('home'));
  document.getElementById('btn-done-restart').addEventListener('click', restartReview);

  showScreen('home');
}

init();
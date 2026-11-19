// GTA 6 Trophy Guide — tracker logic. Loads data/trophies.json (a file of
// this app, never the network), renders the checklist, the roadmap, the
// detail panel, and saves progress in localStorage. Export writes a JSON
// file; import reads one back. Spoiler mode hides the names and descriptions
// of story trophies until they are earned.

const STORAGE_KEY = 'gta6-trophy-guide-v1';
const DATA_URL = 'data/trophies.json';

// Roadmap stages, built from the official descriptions: story chapters and
// missions first, then side characters, collectibles, activities, crime and
// money, and finally the 100% checklist that ends in the platinum.
const ROADMAP = [
  { n: 1, title: 'Story: Chapters 1–2', text: 'Play Gone Fishing and finish Chapters 1 and 2; do Lucia’s balcony meditation the morning after Down to Earth in Chapter 1. Scan vehicles and study animals as you go.' },
  { n: 2, title: 'Story: Chapters 3–4', text: 'Finish Chapters 3 and 4 and their named missions (The Cartel Heist, Child’s Play, Headliners, VCIA Takedown). Robberies and the Snap Gun open up here.' },
  { n: 3, title: 'Story: Chapter 5 & finale', text: 'Finish Operation Savage Glory and the final mission. Free roam continues after the credits, so almost everything else can wait until now.' },
  { n: 4, title: 'Side characters & strangers', text: 'Finish the final missions for Andy, Kenton, Billy, Randy and Tyrone, hunt Bret’s unique animal, and complete 8 Strangers & Freaks strands.' },
  { n: 5, title: 'Collectibles & exploration', text: 'Meditate at all 18 spots, finish 3 card sets, WAiNK It at 100 locations, discover 100 vehicles, and explore every area of Leonida.' },
  { n: 6, title: 'Activities & challenges', text: '250 stunts (300 for 100%), gold in all 42 Shooting Range challenges, drone races at all 14 locations, 20 different race wins, 50 challenges.' },
  { n: 7, title: 'Crime, robberies & money', text: 'Bank vaults, armored trucks, jewelry stores, one illegal operation per gang, and the money trophies: launder $250,000 in Marked Bills, spend $100,000, buy all 8 garages.' },
  { n: 8, title: '100% completion & platinum', text: 'Open Progress > Stats > 100% Completion after the story and clear the checklist. A Long Road pops — and Vice Got a Price! follows at once.' },
];

const KIND_LABEL = {
  platinum: 'Platinum', story: 'Story', side: 'Side quest',
  collectibles: 'Collectibles', activities: 'Activities',
  crime: 'Crime', misc: 'Misc',
};

let trophies = [];
let earned = {};
let spoiler = false;
let filter = 'all';
let query = '';
let selectedId = null;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved && typeof saved === 'object') {
      if (saved.earned) earned = saved.earned;
      if (typeof saved.spoiler === 'boolean') spoiler = saved.spoiler;
    }
  } catch { /* a corrupt save starts fresh */ }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ earned, spoiler }));
  } catch { /* storage full or blocked: the page still works */ }
}

function isStoryKind(t) {
  return t.kind === 'story' || t.kind === 'side';
}

function isHiddenFromSpoilers(t) {
  return spoiler && isStoryKind(t) && !earned[t.id];
}

function displayName(t) {
  return isHiddenFromSpoilers(t) ? 'Hidden story trophy' : t.name;
}

function displayDescription(t) {
  return isHiddenFromSpoilers(t)
    ? 'Hidden until earned — turn off “Hide story spoilers” or earn this trophy to reveal it.'
    : t.description;
}

function matchesFilter(t) {
  if (filter === 'all') return true;
  if (filter === 'story') return isStoryKind(t);
  if (filter === 'missable') return t.missable === true;
  if (filter === 'collectibles') return t.kind === 'collectibles';
  if (filter === 'activities') return t.kind === 'activities' || t.kind === 'crime';
  if (filter === 'online') return false; // GTA 6 has no online trophies
  if (filter === 'earned') return !!earned[t.id];
  if (filter === 'todo') return !earned[t.id];
  return true;
}

function matchesQuery(t) {
  if (!query) return true;
  const hay = (t.name + ' ' + t.description + ' ' + (t.guide || '')).toLowerCase();
  return hay.includes(query);
}

function visibleTrophies() {
  return trophies.filter((t) => matchesFilter(t) && matchesQuery(t));
}

function gradeCounts() {
  const out = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of trophies) if (earned[t.id] && out[t.grade] !== undefined) out[t.grade]++;
  return out;
}

function renderProgress() {
  const done = trophies.filter((t) => earned[t.id]).length;
  const total = trophies.length || 55;
  const pct = Math.round((done / total) * 100);
  document.getElementById('progress-count').textContent = done + ' / ' + total + ' earned';
  document.getElementById('progress-pct').textContent = pct + '%';
  document.getElementById('progress-fill').style.width = pct + '%';
  const c = gradeCounts();
  document.getElementById('progress-sub').textContent =
    'Platinum ' + c.platinum + '/1 · Gold ' + c.gold + '/2 · Silver ' + c.silver + '/6 · Bronze ' + c.bronze + '/46. ' +
    (done === total ? 'Platinum earned — you are a Leonida Legend!' : 'Platinum “Vice Got a Price!” unlocks when the other 54 are earned.');
}

function renderRoadmap() {
  const list = document.getElementById('stages');
  list.innerHTML = '';
  for (const stage of ROADMAP) {
    const members = trophies.filter((t) => t.stage === stage.n);
    const li = document.createElement('li');
    const title = document.createElement('b');
    title.textContent = 'Stage ' + stage.n + ' — ' + stage.title;
    const text = document.createElement('span');
    text.textContent = stage.text + ' ';
    const names = document.createElement('span');
    names.textContent = members.map((t) => displayName(t)).join(' · ') || '—';
    const miss = members.filter((t) => t.missable);
    li.append(title, text, names);
    if (miss.length) {
      const warn = document.createElement('span');
      warn.className = 'miss';
      warn.textContent = ' Missable: ' + miss.map((t) => displayName(t)).join(', ') + '.';
      li.append(warn);
    }
    list.appendChild(li);
  }
}

function renderList() {
  const list = document.getElementById('trophy-list');
  const shown = visibleTrophies();
  list.innerHTML = '';
  document.getElementById('empty-msg').hidden = shown.length !== 0;
  document.getElementById('list-count').textContent = '(' + shown.length + ' shown)';
  for (const t of shown) {
    const li = document.createElement('li');
    if (earned[t.id]) li.classList.add('earned');
    if (t.id === selectedId) li.classList.add('selected');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = !!earned[t.id];
    box.setAttribute('aria-label', 'Mark ' + displayName(t) + ' as earned');
    box.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleEarned(t.id);
    });
    const body = document.createElement('div');
    body.className = 't-body';
    const name = document.createElement('div');
    name.className = 't-name';
    name.textContent = displayName(t);
    const desc = document.createElement('div');
    desc.className = 't-desc';
    desc.textContent = displayDescription(t);
    const meta = document.createElement('div');
    meta.className = 't-meta';
    const grade = document.createElement('span');
    grade.className = 'chip ' + t.grade;
    grade.textContent = t.grade;
    meta.appendChild(grade);
    const kind = document.createElement('span');
    kind.className = 'chip kind';
    kind.textContent = KIND_LABEL[t.kind] || t.kind;
    meta.appendChild(kind);
    if (t.hidden) {
      const h = document.createElement('span');
      h.className = 'chip hidden-chip';
      h.textContent = 'Hidden on PS';
      meta.appendChild(h);
    }
    if (t.missable) {
      const m = document.createElement('span');
      m.className = 'chip missable';
      m.textContent = '⚠ Possibly missable';
      meta.appendChild(m);
    }
    body.append(name, desc, meta);
    li.append(box, body);
    li.addEventListener('click', () => selectTrophy(t.id));
    list.appendChild(li);
  }
}

function renderDetail() {
  const body = document.getElementById('detail-body');
  const t = trophies.find((x) => x.id === selectedId);
  if (!t) {
    body.innerHTML = '<p class="detail-empty">Select a trophy from the checklist to see its guide, when it can be missed, and the sources behind each step.</p>';
    document.getElementById('detail-title').textContent = 'Trophy guide';
    return;
  }
  body.innerHTML = '';
  document.getElementById('detail-title').textContent = 'Trophy guide';
  if (t.missable) {
    const warn = document.createElement('p');
    warn.className = 'd-warn';
    warn.textContent = 'Possibly missable — see the guide below before you pass the point of no return.';
    body.appendChild(warn);
  }
  const title = document.createElement('h3');
  title.textContent = displayName(t);
  const desc = document.createElement('p');
  desc.className = 'd-desc';
  desc.textContent = displayDescription(t);
  const chips = document.createElement('div');
  chips.className = 't-meta';
  for (const [text, cls] of [[t.grade, t.grade], [KIND_LABEL[t.kind] || t.kind, 'kind'], ['Roadmap stage ' + t.stage, 'kind']]) {
    const c = document.createElement('span');
    c.className = 'chip ' + cls;
    c.textContent = text;
    chips.appendChild(c);
  }
  const guideLabel = document.createElement('p');
  guideLabel.className = 'd-label';
  guideLabel.textContent = 'Guide';
  const guide = document.createElement('p');
  guide.className = 'd-guide';
  guide.textContent = isHiddenFromSpoilers(t)
    ? 'This is a story trophy. Earn it (or turn off spoiler mode) to read its guide.'
    : t.guide;
  body.append(title, desc, chips, guideLabel, guide);
  if (!isHiddenFromSpoilers(t) && t.sources && t.sources.length) {
    const srcLabel = document.createElement('p');
    srcLabel.className = 'd-label';
    srcLabel.textContent = 'Sources';
    const ul = document.createElement('ul');
    ul.className = 'sources';
    for (const s of t.sources) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = s.url;
      a.textContent = s.name;
      a.target = '_blank';
      a.rel = 'noopener';
      li.appendChild(a);
      ul.appendChild(li);
    }
    body.append(srcLabel, ul);
  }
  const state = document.createElement('p');
  state.className = 'd-label';
  state.textContent = earned[t.id] ? 'Status: earned ✓' : 'Status: not earned yet';
  body.appendChild(state);
}

function renderAll() {
  renderProgress();
  renderRoadmap();
  renderList();
  renderDetail();
}

function toggleEarned(id) {
  if (earned[id]) delete earned[id];
  else earned[id] = true;
  saveState();
  renderAll();
}

function selectTrophy(id) {
  selectedId = id;
  renderList();
  renderDetail();
}

function setFilter(name) {
  filter = name;
  document.querySelectorAll('#filters button').forEach((b) => {
    b.classList.toggle('active', b.dataset.filter === name);
  });
  renderList();
}

function exportProgress() {
  const payload = {
    app: 'gta6-trophy-guide',
    exportedAt: new Date().toISOString(),
    earned: Object.keys(earned).map(Number).sort((a, b) => a - b),
    spoiler,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gta6-trophy-progress.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      const ids = Array.isArray(data) ? data : data.earned;
      if (!Array.isArray(ids)) throw new Error('no earned list');
      const next = {};
      for (const id of ids) {
        const n = Number(id);
        if (trophies.some((t) => t.id === n)) next[n] = true;
      }
      earned = next;
      if (typeof data.spoiler === 'boolean') {
        spoiler = data.spoiler;
        document.getElementById('spoiler').checked = spoiler;
      }
      saveState();
      renderAll();
    } catch {
      alert('That file is not a valid gta6-trophy-guide progress export.');
    }
  };
  reader.readAsText(file);
}

// Hash state lets a screenshot or a shared link open one view directly,
// e.g. #detail=28, #filter=missable, #spoiler=1, #roadmap.
function applyHash() {
  const hash = new URLSearchParams(location.hash.slice(1));
  if (hash.get('filter')) setFilter(hash.get('filter'));
  if (hash.get('spoiler') === '1') {
    spoiler = true;
    document.getElementById('spoiler').checked = true;
    saveState();
  }
  const detail = Number(hash.get('detail'));
  if (detail && trophies.some((t) => t.id === detail)) selectedId = detail;
  if (hash.get('view') === 'roadmap') {
    document.getElementById('roadmap').scrollIntoView();
  }
}

async function init() {
  loadState();
  const response = await fetch(DATA_URL);
  const data = await response.json();
  trophies = Array.isArray(data) ? data : data.trophies;
  trophies.sort((a, b) => a.id - b.id);

  document.getElementById('search').addEventListener('input', (e) => {
    query = e.target.value.trim().toLowerCase();
    renderList();
  });
  document.querySelectorAll('#filters button').forEach((b) => {
    b.addEventListener('click', () => setFilter(b.dataset.filter));
  });
  document.getElementById('spoiler').checked = spoiler;
  document.getElementById('spoiler').addEventListener('change', (e) => {
    spoiler = e.target.checked;
    saveState();
    renderAll();
  });
  document.getElementById('export-btn').addEventListener('click', exportProgress);
  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) importProgress(e.target.files[0]);
    e.target.value = '';
  });
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('Clear all earned trophies?')) {
      earned = {};
      saveState();
      renderAll();
    }
  });

  applyHash();
  renderAll();
  // A hash change after load (a shared link, or a screenshot run that
  // navigates between views) applies the same state as a fresh load.
  window.addEventListener('hashchange', () => {
    applyHash();
    renderAll();
  });
}

init();

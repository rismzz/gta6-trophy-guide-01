// Leonida Legend — offline GTA VI trophy guide and tracker.
// Loads the official 55-trophy list from data/trophies.json and the roadmap
// from data/roadmap.json, then renders the checklist, the roadmap and the
// missables view. Progress lives in localStorage only; export and import
// move it as a JSON file. No network request is made at any point.
const STORE_KEY = 'leonida-legend-v1';

const state = loadState();
let trophies = [];
let stages = [];

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { earned: [], counts: {}, spoiler: false, theme: 'light' };
    const parsed = JSON.parse(raw);
    return {
      earned: Array.isArray(parsed.earned) ? parsed.earned : [],
      counts: parsed.counts && typeof parsed.counts === 'object' ? parsed.counts : {},
      spoiler: parsed.spoiler === true,
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
    };
  } catch {
    return { earned: [], counts: {}, spoiler: false, theme: 'light' };
  }
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function isEarned(trophy) {
  return state.earned.includes(trophy.name);
}

function countOf(trophy) {
  return state.counts[trophy.id] || 0;
}

function setEarned(trophy, earned) {
  const has = state.earned.includes(trophy.name);
  if (earned && !has) state.earned.push(trophy.name);
  if (!earned && has) state.earned = state.earned.filter((n) => n !== trophy.name);
}

function setCount(trophy, value) {
  const n = Math.max(0, Math.min(trophy.count || 0, Math.floor(Number(value) || 0)));
  state.counts[trophy.id] = n;
  if (trophy.count && n >= trophy.count) setEarned(trophy, true);
}

function gradeLabel(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

function kindLabel(kind) {
  const labels = { story: 'Story', missable: 'Missable', collectibles: 'Collectibles', activities: 'Activities', side: 'Side strand', world: 'Open world', platinum: 'Platinum', completion: 'Completion', online: 'Online' };
  return labels[kind] || kind;
}

function displayName(trophy) {
  if (state.spoiler && trophy.kind === 'story' && !isEarned(trophy)) return 'Hidden story trophy';
  return trophy.name;
}

function displayDesc(trophy) {
  if (state.spoiler && trophy.kind === 'story' && !isEarned(trophy)) return 'Hidden until earned — a story trophy.';
  return trophy.description;
}

function trophyCard(trophy, withControls) {
  const li = document.createElement('li');
  li.className = 'trophy' + (isEarned(trophy) ? ' earned' : '');
  li.dataset.id = trophy.id;

  const check = document.createElement('input');
  check.type = 'checkbox';
  check.checked = isEarned(trophy);
  check.setAttribute('aria-label', 'Earned: ' + trophy.name);
  check.addEventListener('change', () => {
    setEarned(trophy, check.checked);
    saveState();
    renderAll();
  });

  const body = document.createElement('div');
  const name = document.createElement('div');
  name.className = 'trophy-name';
  name.textContent = displayName(trophy);
  const desc = document.createElement('div');
  desc.className = 'trophy-desc';
  desc.textContent = displayDesc(trophy);
  const meta = document.createElement('div');
  meta.className = 'trophy-meta';
  const grade = document.createElement('span');
  grade.className = 'grade grade-' + trophy.grade;
  grade.textContent = gradeLabel(trophy.grade);
  meta.appendChild(grade);
  const kind = document.createElement('span');
  kind.className = 'kind-tag';
  kind.textContent = kindLabel(trophy.kind);
  meta.appendChild(kind);
  if (trophy.missable) {
    const miss = document.createElement('span');
    miss.className = 'miss-tag';
    miss.textContent = 'Missable';
    meta.appendChild(miss);
  }
  body.append(name, desc, meta);

  if (trophy.count) {
    const stepper = document.createElement('div');
    stepper.className = 'stepper';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = String(trophy.count);
    input.value = String(countOf(trophy));
    input.setAttribute('aria-label', 'Progress count for ' + trophy.name);
    input.addEventListener('input', () => {
      setCount(trophy, input.value);
      saveState();
      renderProgress();
    });
    input.addEventListener('change', () => renderAll());
    const label = document.createElement('span');
    const unit = trophy.countUnit ? trophy.countUnit + ' ' : '';
    label.textContent = 'of ' + unit + trophy.count.toLocaleString('en-US') + ' ' + (trophy.countLabel || '');
    stepper.append(input, label);
    body.appendChild(stepper);
  }

  const guideBtn = document.createElement('button');
  guideBtn.type = 'button';
  guideBtn.className = 'guide-btn';
  guideBtn.textContent = 'Guide';
  guideBtn.addEventListener('click', () => openDetail(trophy));

  li.append(check, body, guideBtn);
  if (!withControls) {
    check.disabled = true;
    guideBtn.remove();
    const step = li.querySelector('.stepper input');
    if (step) step.disabled = true;
  }
  return li;
}

function visibleTrophies() {
  const kind = document.getElementById('kindFilter').value;
  const grade = document.getElementById('gradeFilter').value;
  const query = document.getElementById('search').value.trim().toLowerCase();
  return trophies.filter((t) => {
    if (kind === 'missable' && !t.missable) return false;
    if (kind === 'online') return false;
    if (kind !== 'all' && kind !== 'missable' && kind !== 'online' && t.kind !== kind) return false;
    if (grade !== 'all' && t.grade !== grade) return false;
    if (query) {
      const hay = (t.name + ' ' + t.description + ' ' + t.guide).toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
}

function renderList() {
  const list = document.getElementById('trophyList');
  list.replaceChildren();
  const shown = visibleTrophies();
  for (const t of shown) list.appendChild(trophyCard(t, true));
  const line = document.getElementById('resultLine');
  const kind = document.getElementById('kindFilter').value;
  if (kind === 'online') {
    line.textContent = 'Showing 0 of 55 trophies — this list has no online trophies.';
  } else if (shown.length === 0) {
    line.textContent = 'No trophies match that search.';
  } else {
    line.textContent = 'Showing ' + shown.length + ' of 55 trophies.';
  }
}

function renderProgress() {
  const earned = trophies.filter(isEarned).length;
  document.getElementById('progressCount').textContent = earned + ' of 55 earned';
  document.getElementById('progressPct').textContent = Math.round((earned / 55) * 100) + '%';
  document.getElementById('progressFill').style.width = (earned / 55) * 100 + '%';
  const missables = trophies.filter((t) => t.missable).length;
  document.getElementById('missableCount').textContent = '(' + missables + ')';
}

function renderRoadmap() {
  const host = document.getElementById('roadmapList');
  host.replaceChildren();
  const byId = new Map(trophies.map((t) => [t.id, t]));
  for (const stage of stages) {
    const div = document.createElement('div');
    div.className = 'stage';
    const h = document.createElement('h3');
    const num = document.createElement('span');
    num.className = 'stage-num';
    num.textContent = 'Stage ' + stage.n;
    h.append(num, document.createTextNode(stage.title));
    const p = document.createElement('p');
    p.textContent = stage.blurb;
    const ul = document.createElement('ul');
    for (const id of stage.ids) {
      const t = byId.get(id);
      if (!t) continue;
      const li = document.createElement('li');
      if (isEarned(t)) li.className = 'done';
      li.textContent = t.name + (isEarned(t) ? ' ✓' : '');
      const g = document.createElement('span');
      g.className = 'g';
      g.textContent = t.grade;
      li.appendChild(g);
      ul.appendChild(li);
    }
    div.append(h, p, ul);
    host.appendChild(div);
  }
}

function renderMissables() {
  const host = document.getElementById('missableList');
  host.replaceChildren();
  for (const t of trophies.filter((x) => x.missable)) host.appendChild(trophyCard(t, false));
}

function openDetail(trophy) {
  document.getElementById('detailTitle').textContent = trophy.name;
  const body = document.getElementById('detailBody');
  body.replaceChildren();
  const desc = document.createElement('p');
  desc.className = 'trophy-desc';
  desc.textContent = trophy.description;
  const meta = document.createElement('p');
  const bits = [gradeLabel(trophy.grade) + ' trophy', kindLabel(trophy.kind)];
  if (trophy.missable) bits.push('Missable — do it while it is in front of you');
  if (trophy.count) bits.push('PSN target: ' + (trophy.countUnit || '') + trophy.count.toLocaleString('en-US') + ' ' + (trophy.countLabel || ''));
  meta.textContent = bits.join(' · ');
  const guide = document.createElement('p');
  guide.textContent = trophy.guide;
  const sources = document.createElement('p');
  sources.className = 'sources';
  const strong = document.createElement('strong');
  strong.textContent = 'Sources: ';
  sources.appendChild(strong);
  const extra = trophy.count ? '; PSNProfiles (PSN tracked count)' : '';
  sources.appendChild(document.createTextNode('the official list on Exophase (names, descriptions, grades)' + extra + '; our own advice from the official description, not yet checked in the game.'));
  body.append(desc, meta, guide, sources);
}

function closeDetail() {
  document.getElementById('detailTitle').textContent = 'Pick a trophy';
  const body = document.getElementById('detailBody');
  body.replaceChildren();
  const p = document.createElement('p');
  p.textContent = 'Choose any trophy on the left to read its guide and sources. Guides are written in our own words from the official descriptions — where a place or step is not confirmed, the guide says so.';
  body.appendChild(p);
}

function renderAll() {
  renderProgress();
  renderList();
  renderRoadmap();
  renderMissables();
  applyTheme();
  applySpoilerButton();
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  document.getElementById('themeToggle').textContent = state.theme === 'dark' ? 'Light theme' : 'Dark theme';
}

function applySpoilerButton() {
  const btn = document.getElementById('spoilerToggle');
  btn.textContent = state.spoiler ? 'Spoilers: on' : 'Spoilers: off';
  btn.setAttribute('aria-pressed', String(state.spoiler));
}

function switchView(view) {
  for (const tab of document.querySelectorAll('.view-tab')) {
    tab.classList.toggle('active', tab.dataset.view === view);
  }
  document.getElementById('view-checklist').hidden = view !== 'checklist';
  document.getElementById('view-roadmap').hidden = view !== 'roadmap';
  document.getElementById('view-missables').hidden = view !== 'missables';
}

function exportProgress() {
  const payload = {
    app: 'leonida-legend',
    version: 1,
    exportedAt: new Date().toISOString(),
    earned: state.earned,
    counts: state.counts,
    spoiler: state.spoiler,
    theme: state.theme,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gta6-trophies-progress.json';
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
      if (!Array.isArray(data.earned)) throw new Error('no earned list');
      const known = new Set(trophies.map((t) => t.name));
      state.earned = data.earned.filter((n) => known.has(n));
      if (data.counts && typeof data.counts === 'object') {
        for (const [id, value] of Object.entries(data.counts)) {
          const t = trophies.find((x) => String(x.id) === id);
          if (t && t.count) state.counts[t.id] = Math.max(0, Math.min(t.count, Math.floor(Number(value) || 0)));
        }
      }
      if (typeof data.spoiler === 'boolean') state.spoiler = data.spoiler;
      if (data.theme === 'dark' || data.theme === 'light') state.theme = data.theme;
      saveState();
      renderAll();
    } catch {
      document.getElementById('resultLine').textContent = 'That file could not be imported — it is not a Leonida Legend export.';
    }
  };
  reader.readAsText(file);
}

async function boot() {
  const [trophyData, roadmapData] = await Promise.all([
    fetch('data/trophies.json').then((r) => r.json()),
    fetch('data/roadmap.json').then((r) => r.json()),
  ]);
  trophies = trophyData.trophies;
  stages = roadmapData.stages;

  document.getElementById('search').addEventListener('input', renderList);
  document.getElementById('kindFilter').addEventListener('change', renderList);
  document.getElementById('gradeFilter').addEventListener('change', renderList);
  document.getElementById('spoilerToggle').addEventListener('click', () => {
    state.spoiler = !state.spoiler;
    saveState();
    renderAll();
  });
  document.getElementById('themeToggle').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    saveState();
    renderAll();
  });
  document.getElementById('exportBtn').addEventListener('click', exportProgress);
  document.getElementById('importFile').addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) importProgress(file);
    event.target.value = '';
  });
  document.getElementById('detailClose').addEventListener('click', closeDetail);
  for (const tab of document.querySelectorAll('.view-tab')) {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  }

  renderAll();
  const hash = window.location.hash || '';
  if (hash === '#roadmap') switchView('roadmap');
  else if (hash === '#missables') switchView('missables');
  else if (hash.startsWith('#trophy-')) {
    const id = Number(hash.slice('#trophy-'.length));
    const t = trophies.find((x) => x.id === id);
    if (t) openDetail(t);
  }
  window.__shotReady = true;
}

boot();

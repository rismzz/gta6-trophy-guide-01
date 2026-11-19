// Leonida Legend — an offline GTA VI trophy guide and tracker.
// Loads app/data/trophies.json, renders the checklist, roadmap and missable
// views, and keeps progress in localStorage. No network requests at run time
// beyond the one local data file; no Rockstar artwork anywhere.
const STORE_KEY = 'leonida-legend-v1';

const trophyList = document.getElementById('trophyList');
const missableList = document.getElementById('missableList');
const roadmapEl = document.getElementById('roadmap');
const resultLine = document.getElementById('resultLine');
const emptyNote = document.getElementById('emptyNote');
const searchInput = document.getElementById('search');
const kindFilter = document.getElementById('kindFilter');
const gradeFilter = document.getElementById('gradeFilter');
const hideEarned = document.getElementById('hideEarned');
const detailPanel = document.getElementById('detailPanel');
const detailBody = document.getElementById('detailBody');

let trophyData = null;
let savedState = loadSavedState();

function loadSavedState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null');
    if (raw && typeof raw === 'object') {
      return {
        earned: Array.isArray(raw.earned) ? raw.earned : [],
        counts: raw.counts && typeof raw.counts === 'object' ? raw.counts : {},
        spoiler: raw.spoiler === true,
        theme: raw.theme === 'dark' ? 'dark' : 'light',
      };
    }
  } catch { /* a corrupt store starts empty */ }
  return { earned: [], counts: {}, spoiler: false, theme: 'light' };
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(savedState));
}

function earnedSet() {
  return new Set(savedState.earned);
}

function isEarned(trophy) {
  return earnedSet().has(trophy.name);
}

function trophyIsHidden(trophy) {
  return savedState.spoiler && trophy.kind === 'story' && !isEarned(trophy);
}

function setEarned(trophy, earned) {
  const set = earnedSet();
  if (earned) set.add(trophy.name);
  else set.delete(trophy.name);
  savedState.earned = [...set];
  saveState();
  renderAll();
}

function setCount(trophy, value) {
  const n = Math.max(0, Math.min(trophy.count, Math.floor(value) || 0));
  savedState.counts[trophy.id] = n;
  if (n >= trophy.count && !isEarned(trophy)) {
    savedState.earned = [...earnedSet(), trophy.name];
  }
  saveState();
  renderAll();
}

function trophyMatchesFilters(trophy) {
  const kind = kindFilter.value;
  if (kind === 'missable' && !trophy.missable) return false;
  if (kind === 'online') return false; // this list holds no online trophies
  if (kind !== 'all' && kind !== 'missable' && trophy.kind !== kind) return false;
  if (gradeFilter.value !== 'all' && trophy.grade !== gradeFilter.value) return false;
  if (hideEarned.checked && isEarned(trophy)) return false;
  const q = searchInput.value.trim().toLowerCase();
  if (q) {
    if (trophyIsHidden(trophy)) return false;
    const hay = `${trophy.name} ${trophy.description} ${trophy.guide}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function gradeBadge(trophy) {
  const span = document.createElement('span');
  span.className = `badge grade-${trophy.grade}`;
  span.textContent = trophy.grade;
  return span;
}

function buildTrophyCard(trophy) {
  const li = document.createElement('li');
  li.className = 'trophy' + (isEarned(trophy) ? ' is-earned' : '');
  li.dataset.trophyId = trophy.id;

  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = isEarned(trophy);
  box.setAttribute('aria-label', `Mark ${trophyIsHidden(trophy) ? 'hidden story trophy' : trophy.name} earned`);
  box.addEventListener('change', () => setEarned(trophy, box.checked));
  li.append(box);

  const main = document.createElement('div');
  const name = document.createElement('p');
  name.className = 'trophy-name';
  name.textContent = trophyIsHidden(trophy) ? 'Hidden story trophy' : trophy.name;
  main.append(name);
  const desc = document.createElement('p');
  desc.className = trophyIsHidden(trophy) ? 'trophy-desc spoiler-note' : 'trophy-desc';
  desc.textContent = trophyIsHidden(trophy)
    ? 'Story spoiler hidden — earn this trophy to reveal its name and description.'
    : trophy.description;
  main.append(desc);
  const meta = document.createElement('div');
  meta.className = 'trophy-meta';
  meta.append(gradeBadge(trophy));
  const kind = document.createElement('span');
  kind.className = 'badge';
  kind.textContent = trophy.kind;
  meta.append(kind);
  if (trophy.missable) {
    const flag = document.createElement('span');
    flag.className = 'badge missable';
    flag.textContent = 'Missable';
    meta.append(flag);
  }
  if (trophy.count) {
    const target = document.createElement('span');
    target.className = 'badge';
    target.textContent = `Target: ${trophy.count} ${trophy.count_label}`;
    meta.append(target);
  }
  main.append(meta);
  li.append(main);

  const side = document.createElement('div');
  side.className = 'trophy-side';
  const guideBtn = document.createElement('button');
  guideBtn.type = 'button';
  guideBtn.className = 'guide-btn';
  guideBtn.textContent = 'Guide';
  guideBtn.addEventListener('click', () => openTrophyGuide(trophy));
  side.append(guideBtn);
  if (trophy.count) {
    const countBox = document.createElement('label');
    countBox.className = 'count-box';
    countBox.textContent = `Progress `;
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = String(trophy.count);
    input.value = String(savedState.counts[trophy.id] ?? 0);
    input.setAttribute('aria-label', `Progress toward ${trophy.count} ${trophy.count_label}`);
    input.addEventListener('input', () => setCount(trophy, Number(input.value)));
    countBox.append(input);
    countBox.append(document.createTextNode(` / ${trophy.count}`));
    side.append(countBox);
  }
  li.append(side);
  return li;
}

function renderChecklist() {
  const shown = trophyData.trophies.filter(trophyMatchesFilters);
  trophyList.replaceChildren(...shown.map(buildTrophyCard));
  emptyNote.hidden = shown.length > 0;
  const earned = earnedSet().size;
  resultLine.textContent = kindFilter.value === 'online'
    ? 'This list holds no online trophies — every one of the 55 is earned in single-player.'
    : `Showing ${shown.length} of ${trophyData.trophies.length} trophies · ${earned} earned`;
}

function renderMissables() {
  const missable = trophyData.trophies.filter((t) => t.missable);
  missableList.replaceChildren(...missable.map(buildTrophyCard));
}

function renderRoadmap() {
  roadmapEl.replaceChildren();
  for (const stage of trophyData.roadmap) {
    const members = trophyData.trophies.filter((t) => t.stage === stage.stage);
    const done = members.filter(isEarned).length;
    const card = document.createElement('article');
    card.className = 'stage';
    const h = document.createElement('h2');
    h.textContent = stage.title;
    card.append(h);
    const p = document.createElement('p');
    p.textContent = stage.text;
    card.append(p);
    const count = document.createElement('p');
    count.className = 'stage-count';
    count.textContent = `${done} of ${members.length} trophies earned`;
    card.append(count);
    const ul = document.createElement('ul');
    for (const t of members) {
      const li = document.createElement('li');
      if (isEarned(t)) li.className = 'is-earned';
      const link = document.createElement('a');
      link.href = `#/trophy/${t.id}`;
      link.textContent = trophyIsHidden(t) ? 'Hidden story trophy' : t.name;
      li.append(link);
      if (t.missable) {
        const flag = document.createElement('span');
        flag.className = 'badge missable';
        flag.textContent = 'Missable';
        li.append(' ', flag);
      }
      ul.append(li);
    }
    card.append(ul);
    roadmapEl.append(card);
  }
}

function renderProgress() {
  const total = trophyData.trophies.length;
  const earned = earnedSet().size;
  const others = total - 1; // the platinum itself
  const othersEarned = trophyData.trophies.filter((t) => t.grade !== 'platinum' && isEarned(t)).length;
  document.getElementById('progressCount').textContent = `${earned} of ${total} earned`;
  document.getElementById('progressFill').style.width = `${Math.round((earned / total) * 100)}%`;
  document.getElementById('progressSub').textContent =
    `Platinum: Vice Got a Price! — ${othersEarned} of ${others} others earned`;
}

function renderAll() {
  renderProgress();
  renderChecklist();
  renderMissables();
  renderRoadmap();
}

function openTrophyGuide(trophy) {
  detailBody.replaceChildren();
  const hidden = trophyIsHidden(trophy);
  const h = document.createElement('h2');
  h.textContent = hidden ? 'Hidden story trophy' : trophy.name;
  detailBody.append(h);
  const meta = document.createElement('div');
  meta.className = 'trophy-meta';
  meta.append(gradeBadge(trophy));
  const kind = document.createElement('span');
  kind.className = 'badge';
  kind.textContent = trophy.kind;
  meta.append(kind);
  if (trophy.missable) {
    const flag = document.createElement('span');
    flag.className = 'badge missable';
    flag.textContent = 'Missable — do it while the moment is live';
    meta.append(flag);
  }
  detailBody.append(meta);
  const desc = document.createElement('p');
  desc.className = 'trophy-desc';
  desc.textContent = hidden
    ? 'Story spoiler hidden — earn this trophy to reveal its name and description.'
    : trophy.description;
  detailBody.append(desc);
  if (trophy.count) {
    const fact = document.createElement('p');
    fact.className = 'fact';
    fact.textContent = `PSN target: ${trophy.count} ${trophy.count_label} — your progress: ${savedState.counts[trophy.id] ?? 0} / ${trophy.count}.`;
    detailBody.append(fact);
  }
  const guideTitle = document.createElement('h3');
  guideTitle.textContent = 'Guide';
  detailBody.append(guideTitle);
  const guide = document.createElement('p');
  guide.textContent = hidden
    ? 'The guide for this story trophy stays hidden until you earn it.'
    : trophy.guide;
  detailBody.append(guide);
  const sourcesTitle = document.createElement('h3');
  sourcesTitle.textContent = 'Sources';
  detailBody.append(sourcesTitle);
  const sources = document.createElement('p');
  sources.className = 'sources';
  sources.textContent = trophy.sources;
  detailBody.append(sources);
  const earned = document.createElement('p');
  earned.className = 'fact';
  earned.textContent = isEarned(trophy) ? 'Earned — ticked off in your tracker.' : 'Not earned yet.';
  detailBody.append(earned);
  detailPanel.hidden = false;
  location.hash = `#/trophy/${trophy.id}`;
}

function closeTrophyGuide() {
  detailPanel.hidden = true;
  if (location.hash.startsWith('#/trophy/')) history.replaceState(null, '', '#/checklist');
}

function showView(name) {
  for (const tab of document.querySelectorAll('.view-tab')) {
    tab.classList.toggle('is-active', tab.dataset.view === name);
  }
  for (const section of document.querySelectorAll('.view')) {
    section.classList.toggle('is-active', section.id === `view-${name}`);
  }
}

function applyTheme() {
  document.documentElement.dataset.theme = savedState.theme;
  const btn = document.getElementById('themeToggle');
  btn.textContent = savedState.theme === 'dark' ? 'Light theme' : 'Dark theme';
  btn.setAttribute('aria-pressed', String(savedState.theme === 'dark'));
}

function applySpoiler() {
  const btn = document.getElementById('spoilerToggle');
  btn.textContent = savedState.spoiler ? 'Spoilers: hidden' : 'Spoilers: shown';
  btn.setAttribute('aria-pressed', String(savedState.spoiler));
}

function exportProgress() {
  const payload = {
    app: 'leonida-legend',
    game: 'Grand Theft Auto VI',
    exported_at: new Date().toISOString(),
    earned: savedState.earned,
    counts: savedState.counts,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importProgress(file) {
  if (!file) return;
  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    alert('That file is not valid progress JSON.');
    return;
  }
  const names = new Set(trophyData.trophies.map((t) => t.name));
  const earned = Array.isArray(payload.earned) ? payload.earned.filter((n) => names.has(n)) : [];
  const counts = {};
  if (payload.counts && typeof payload.counts === 'object') {
    for (const t of trophyData.trophies) {
      if (!t.count) continue;
      const n = Math.floor(Number(payload.counts[t.id]) || 0);
      if (n > 0) counts[t.id] = Math.min(t.count, n);
    }
  }
  savedState.earned = earned;
  savedState.counts = counts;
  saveState();
  renderAll();
  alert(`Imported ${earned.length} earned trophies.`);
}

function routeFromHash() {
  const hash = location.hash || '#/checklist';
  if (hash.startsWith('#/trophy/')) {
    const id = Number(hash.slice('#/trophy/'.length));
    const trophy = trophyData.trophies.find((t) => t.id === id);
    showView('checklist');
    if (trophy) openTrophyGuide(trophy);
    return;
  }
  if (hash === '#/roadmap') { showView('roadmap'); return; }
  if (hash === '#/missables') { showView('missables'); return; }
  showView('checklist');
}

async function loadTrophyData() {
  const response = await fetch('data/trophies.json');
  trophyData = await response.json();
}

document.getElementById('themeToggle').addEventListener('click', () => {
  savedState.theme = savedState.theme === 'dark' ? 'light' : 'dark';
  saveState();
  applyTheme();
});
document.getElementById('spoilerToggle').addEventListener('click', () => {
  savedState.spoiler = !savedState.spoiler;
  saveState();
  applySpoiler();
  renderAll();
});
document.getElementById('detailClose').addEventListener('click', closeTrophyGuide);
document.getElementById('exportBtn').addEventListener('click', exportProgress);
document.getElementById('importFile').addEventListener('change', (e) => {
  importProgress(e.target.files[0]);
  e.target.value = '';
});
searchInput.addEventListener('input', renderChecklist);
kindFilter.addEventListener('change', renderChecklist);
gradeFilter.addEventListener('change', renderChecklist);
hideEarned.addEventListener('change', renderChecklist);
for (const tab of document.querySelectorAll('.view-tab')) {
  tab.addEventListener('click', () => {
    closeTrophyGuide();
    location.hash = `#/${tab.dataset.view}`;
    showView(tab.dataset.view);
  });
}
window.addEventListener('hashchange', routeFromHash);

await loadTrophyData();
applyTheme();
applySpoiler();
renderAll();
routeFromHash();
window.__shotReady = true;

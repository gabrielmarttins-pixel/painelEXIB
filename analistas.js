(() => {
const {
  STORAGE_KEY,
  SYNC_INTERVAL_MS,
  newsPresenters,
  teamCrests,
  countryCodes
} = window.GloboConfig;
const { weekdayNews, strategyPrograms, wednesdayNote, fridayProgram, day27Highlight } = window.GloboDefaults;
const {
  cleanReportData,
  createSupabaseClient,
  fetchRemoteReport,
  formatLastUpdate,
  getReportSignature,
  saveRemoteReport
} = window.GloboStorage;

const saveStatus = document.querySelector('#saveStatus');
const lastUpdateStatus = document.querySelector('#lastUpdateStatus');
const supabaseClient = createSupabaseClient();
let reportData = cleanReportData({});
let currentRemotePayload = null;
let saveTimer;
let activeEditor = null;
let hasPendingSync = false;
let shouldSaveFullReport = false;
let isServiceHandoffEditing = false;
const HISTORY_LIMIT_LOCAL = 10;
let undoHistory = [];
let redoHistory = [];
let currentHistorySnapshot = '';
let isRestoringHistory = false;
const PERSISTENT_REPORT_DATE = 'dados-persistentes';
const COORDINATOR_PERSISTENT_KEY = `${STORAGE_KEY}-coordinator-persistent`;
const PERSISTENT_COORDINATOR_SECTIONS = ['highlights', 'notes', 'news', 'programs', 'games', 'links'];
const STRATEGY_TAB_KEYS = ['weekday', 'saturday', 'sunday'];
let activeStrategyTab = 'weekday';

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function strategyTabForDate(dateValue) {
  const [year, month, day] = String(dateValue || todayKey()).split('-').map(Number);
  const weekday = new Date(year, month - 1, day).getDay();
  return weekday === 0 ? 'sunday' : weekday === 6 ? 'saturday' : 'weekday';
}

function cleanStrategyList(key) {
  return (strategyPrograms[key] || []).map(name => ({ id: makeId(), name, network: false, local: false, observation: '', _default: false }));
}

function normalizeStrategyTabs(data = {}) {
  const source = data.strategyTabs && typeof data.strategyTabs === 'object' ? data.strategyTabs : {};
  const migratedKey = strategyTabForDate(data.reportDate);
  return STRATEGY_TAB_KEYS.reduce((tabs, key) => {
    const items = Array.isArray(source[key]) ? source[key] : (key === migratedKey && Array.isArray(data.strategy) && data.strategy.length ? data.strategy : cleanStrategyList(key));
    tabs[key] = ensureIds(items);
    return tabs;
  }, {});
}

function syncCurrentStrategyTab() {
  reportData.strategyTabs ||= normalizeStrategyTabs(reportData);
  reportData.strategyTabs[activeStrategyTab] = reportData.strategy;
  reportData._persistentStrategyInitialized = true;
}

function updateStrategyTabsUi() {
  document.querySelectorAll('[data-strategy-tab]').forEach(button => {
    const active = button.dataset.strategyTab === activeStrategyTab;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
}

function persistentSnapshotFrom(data = {}) {
  const snapshot = {
    serviceHandoffHtml: data.serviceHandoffHtml || '',
    strategyTabs: normalizeStrategyTabs(data),
    _persistentHandoffInitialized: true,
    _persistentStrategyInitialized: true
  };
  PERSISTENT_COORDINATOR_SECTIONS.forEach(section => {
    snapshot[section] = Array.isArray(data[section]) ? data[section] : [];
  });
  return snapshot;
}

function resolvePersistentState(state, reportDate) {
  if (!state) return null;
  const eligibleDate = Object.keys(state._persistentSnapshots || {})
    .filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= reportDate)
    .sort()
    .pop();
  return eligibleDate ? { ...state, ...state._persistentSnapshots[eligibleDate] } : state;
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getOffsetDateKey(offset = 0, baseDate = todayKey()) {
  const [year, month, day] = baseDate.split('-').map(Number);
  const date = new Date(year, month - 1, day + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getDateStorageKey(reportDate = reportData.reportDate || todayKey()) {
  return `${STORAGE_KEY}-${reportDate}`;
}

function updateDayButtons() {
  document.querySelectorAll('[data-day-offset]').forEach(button => {
    button.classList.toggle('active', getOffsetDateKey(Number(button.dataset.dayOffset)) === reportData.reportDate);
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatWhatsappText(value) {
  const escaped = escapeHtml(value).replace(/\r\n?/g, '\n');
  return escaped
    .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
    .replaceAll('\n', '<br>');
}

function sanitizeInlineHtml(value) {
  const source = document.createElement('div');
  source.innerHTML = String(value || '');
  const output = document.createElement('div');
  const allowedColors = new Set(['#101116', '#087bff', '#00a86b', '#ff5600', '#e50046']);

  function normalizeEditorColor(value) {
    const color = String(value || '').trim().toLowerCase();
    if (color.startsWith('#')) return color;
    const rgb = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!rgb) return '';
    return `#${rgb.slice(1).map(part => Number(part).toString(16).padStart(2, '0')).join('')}`;
  }

  function appendClean(node, parent) {
    if (node.nodeType === Node.TEXT_NODE) {
      parent.append(document.createTextNode(node.textContent || ''));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tag = node.tagName.toLowerCase();
    if (tag === 'br') {
      parent.append(document.createElement('br'));
      return;
    }
    if (tag === 'b' || tag === 'strong' || tag === 'i' || tag === 'em') {
      const el = document.createElement(tag === 'b' ? 'strong' : tag === 'i' ? 'em' : tag);
      node.childNodes.forEach(child => appendClean(child, el));
      parent.append(el);
      return;
    }
    if (tag === 'span' || tag === 'font') {
      const hex = normalizeEditorColor(node.style?.color || node.getAttribute('color'));
      const el = allowedColors.has(hex) ? document.createElement('span') : parent;
      if (el !== parent) el.style.color = hex;
      node.childNodes.forEach(child => appendClean(child, el));
      if (el !== parent) parent.append(el);
      return;
    }
    if (tag === 'div' || tag === 'p') {
      if (parent.childNodes.length) parent.append(document.createElement('br'));
      node.childNodes.forEach(child => appendClean(child, parent));
      return;
    }
    node.childNodes.forEach(child => appendClean(child, parent));
  }

  source.childNodes.forEach(child => appendClean(child, output));
  return output.innerHTML.replace(/(<br>\s*)+$/g, '').trim();
}

function cleanText(value, fallback = 'Não informado') {
  const text = String(value || '').trim();
  return text || fallback;
}

function formatReportDate(value) {
  if (!value) return 'Data não informada';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR').format(new Date(year, month - 1, day));
}

function formatGameDate(value) {
  if (!value) return '';
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(date);
  return `${weekday}, ${formatReportDate(value)}`;
}

function normalizeKey(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
}

function getCountryFlag(team) {
  const normalized = normalizeKey(team);
  const code = countryCodes[normalized];
  if (!code) return '';
  return `https://flagcdn.com/w320/${code.toLowerCase()}.png`;
}
function getTeamName(item, fieldName) {
  return item[fieldName] === 'Outro' ? cleanText(item[`${fieldName}Custom`], 'Time a definir') : cleanText(item[fieldName], 'Time a definir');
}

function getChampionshipClass(championship) {
  const normalized = normalizeKey(championship);
  if (normalized.includes('brasileirao') && normalized.endsWith('f')) return 'game-brasileirao-f';
  if (normalized.includes('brasileirao')) return 'game-brasileirao-m';
  if (normalized.includes('copa do brasil') && normalized.endsWith('f')) return 'game-copa-brasil-f';
  if (normalized.includes('copa do brasil')) return 'game-copa-brasil-m';
  if (normalized.includes('libertadores') && normalized.endsWith('f')) return 'game-libertadores-f';
  if (normalized.includes('libertadores')) return 'game-libertadores-m';
  if (normalized.includes('amistoso') && normalized.endsWith('f')) return 'game-amistoso-f';
  if (normalized.includes('amistoso')) return 'game-amistoso-m';
  if (normalized.includes('copa do mundo')) return 'game-world-cup';
  return 'game-default';
}

function getTeamInitial(team) {
  const name = String(team || '').trim();
  return (name.match(/[\p{L}\p{N}]/u)?.[0] || '?').toLocaleUpperCase('pt-BR');
}

function getTeamVisual(team, side) {
  const crest = teamCrests[team];
  const flag = getCountryFlag(team);
  const sideClass = side === 'right' ? 'crest-right' : 'crest-left';
  if (crest) return `<img class="crest ${sideClass}" src="${escapeHtml(crest)}" alt="">`;
  if (flag) return `<img class="crest flag ${sideClass}" src="${escapeHtml(flag)}" alt="">`;
  return `<span class="crest crest-placeholder ${sideClass}">${escapeHtml(getTeamInitial(team))}</span>`;
}

function getProgramIdBadges(item) {
  const ids = Array.isArray(item.idsList) ? item.idsList : String(item.ids || '').split(/[,\n;|]+/);
  return ids.map(id => String(id || '').trim()).filter(Boolean);
}

function getNewsClass(name) {
  const normalized = String(name || '').trim().toLocaleUpperCase('pt-BR');
  if (normalized === 'BOM DIA DF') return 'news-bom-dia';
  if (normalized === 'DF1') return 'news-df1';
  if (normalized === 'GLOBO ESPORTE') return 'news-ge';
  if (normalized === 'DF2') return 'news-df2';
  return 'news-default';
}

function getStrategyClass(name) {
  const normalized = normalizeKey(name);
  if ((normalized.includes('especial') && !normalized.includes('sess')) || normalized.includes('temperatura')) return 'strategy-afternoon-start';
  if (normalized.includes('sess') || normalized.includes('vale a pena')) return 'strategy-afternoon';
  if (normalized.includes('novela ii') || normalized.includes('domingao')) return 'strategy-night';
  if (normalized.includes('caldeir') || normalized.includes('familia') || normalized.includes('novela i')) return 'strategy-sunset';
  return 'strategy-default';
}

function metric(label, value) {
  return value ? `<span class="info-pill"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></span>` : '';
}

function getNewsPresenter(name) {
  return newsPresenters[name] || '';
}

function getStatusClass(status) {
  const normalized = normalizeKey(status);
  if (normalized === 'enviado') return 'status-sent';
  if (normalized === 'capturado') return 'status-captured';
  if (normalized === 'ao vivo') return 'status-live';
  return 'status-preparing';
}

function getProgramTimeClass(start) {
  const hour = Number(String(start || '').split(':')[0]);
  if (!Number.isFinite(hour)) return 'program-default';
  if (hour >= 5 && hour < 12) return 'program-morning';
  if (hour >= 12 && hour < 18) return 'program-afternoon';
  return 'program-night';
}

function getCategoryClass(category) {
  const normalized = normalizeKey(category);
  if (normalized.includes('midia')) return 'category-media';
  if (normalized.includes('grade')) return 'category-grade';
  if (normalized.includes('comercial')) return 'category-commercial';
  if (normalized.includes('rotina')) return 'category-routine';
  return 'category-default';
}

function priorityClass(priority, urgent) {
  if (urgent) return 'urgent';
  if (priority === 'Alta') return 'priority-high';
  if (priority === 'Baixa') return 'priority-low';
  return 'priority-medium';
}

function hasContent(item, fields) {
  return fields.some(field => String(item[field] || '').trim());
}

function weekdayFor(dateValue) {
  const [year, month, day] = dateValue.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(new Date(year, month - 1, day));
}

function ensureIds(items) {
  return items.map(item => ({ ...item, id: item.id || makeId() }));
}

function applyDefaults(data) {
  const dateValue = data.reportDate || todayKey();
  const [year, month, day] = dateValue.split('-').map(Number);
  const dayOfWeek = new Date(year, month - 1, day).getDay();
  const next = { ...cleanReportData(data), reportDate: dateValue, weekday: data.weekday || weekdayFor(dateValue) };

  if (day === 27 && !next.highlights.some(item => item.title === day27Highlight.title)) {
    next.highlights = [...next.highlights, { ...day27Highlight, id: makeId() }];
  }
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    weekdayNews.forEach(item => {
      if (!next.news.some(news => news.name === item.name)) next.news.push({ ...item, id: makeId() });
    });
  }
  next.strategyTabs = normalizeStrategyTabs(next);
  next.strategy = next.strategyTabs[activeStrategyTab];
  next._persistentStrategyInitialized = true;
  if (dayOfWeek === 3 && !next.notes.some(item => item.subject === wednesdayNote.subject)) {
    next.notes.push({ ...wednesdayNote, id: makeId() });
  }
  if (dayOfWeek === 5 && !next.programs.some(item => item.name === fridayProgram.name)) {
    next.programs.push({ ...fridayProgram, id: makeId() });
  }

  ['highlights', 'news', 'strategy', 'games', 'programs', 'notes', 'links'].forEach(section => {
    next[section] = ensureIds(next[section] || []);
  });
  return next;
}

function setSectionVisibility(id, hasItems) {
  document.querySelector(`#${id}`).hidden = !hasItems;
}

function cardEmpty(text) {
  return `<div class="preview-empty analyst-empty">${escapeHtml(text)}</div>`;
}

function renderServiceHandoff() {
  const editor = document.querySelector('#serviceHandoffEditor');
  const view = document.querySelector('#serviceHandoffView');
  const card = document.querySelector('#serviceHandoffCard');
  const panel = document.querySelector('#serviceHandoffEditorPanel');
  if (!editor || !view || !card || !panel) return;
  const html = sanitizeInlineHtml(reportData.serviceHandoffHtml || '');
  view.innerHTML = html || '<span class="handoff-placeholder">Nenhuma passagem registrada.</span>';
  card.hidden = isServiceHandoffEditing;
  panel.hidden = !isServiceHandoffEditing;
  if (isServiceHandoffEditing && document.activeElement !== editor) editor.innerHTML = html;
}

function saveServiceHandoff() {
  const editor = document.querySelector('#serviceHandoffEditor');
  if (!editor) return;
  reportData.serviceHandoffHtml = sanitizeInlineHtml(editor.innerHTML);
  scheduleSave();
  commitHistoryAction();
}

function openServiceHandoffEditor() {
  isServiceHandoffEditing = true;
  renderServiceHandoff();
  const editor = document.querySelector('#serviceHandoffEditor');
  if (editor) {
    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

function closeServiceHandoffEditor() {
  const editor = document.querySelector('#serviceHandoffEditor');
  if (editor) reportData.serviceHandoffHtml = sanitizeInlineHtml(editor.innerHTML);
  isServiceHandoffEditing = false;
  scheduleSave();
  renderServiceHandoff();
}

function bindServiceHandoffEditor() {
  const editor = document.querySelector('#serviceHandoffEditor');
  const card = document.querySelector('#serviceHandoffCard');
  const okButton = document.querySelector('#serviceHandoffOkButton');
  const panel = document.querySelector('#serviceHandoffEditorPanel');
  if (!editor || editor.dataset.bound === 'true') return;
  editor.dataset.bound = 'true';
  if (card) {
    card.addEventListener('click', openServiceHandoffEditor);
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openServiceHandoffEditor();
      }
    });
  }
  if (panel) panel.addEventListener('click', event => event.stopPropagation());
  if (okButton) okButton.addEventListener('click', closeServiceHandoffEditor);
  editor.addEventListener('focus', beginHistoryAction);
  editor.addEventListener('input', saveServiceHandoff);
  editor.addEventListener('blur', () => {
    editor.innerHTML = sanitizeInlineHtml(editor.innerHTML);
    saveServiceHandoff();
  });

  document.querySelectorAll('[data-handoff-command], [data-handoff-color]').forEach(button => {
    button.addEventListener('mousedown', event => event.preventDefault());
    button.addEventListener('click', () => {
      beginHistoryAction();
      editor.focus();
      if (button.dataset.handoffCommand) document.execCommand(button.dataset.handoffCommand, false);
      if (button.dataset.handoffColor) document.execCommand('foreColor', false, button.dataset.handoffColor);
      saveServiceHandoff();
    });
  });
}

function getHistorySnapshot(data = reportData) {
  return JSON.stringify(cleanReportData(data));
}

function updateHistoryButtons() {
  document.querySelector('#undoButton')?.toggleAttribute('disabled', undoHistory.length === 0);
  document.querySelector('#redoButton')?.toggleAttribute('disabled', redoHistory.length === 0);
}

function initializeHistory(data = reportData) {
  undoHistory = [];
  redoHistory = [];
  currentHistorySnapshot = getHistorySnapshot(data);
  updateHistoryButtons();
}

function recordHistoryCheckpoint(data = reportData) {
  if (isRestoringHistory) return;
  const snapshot = getHistorySnapshot(data);
  if (!snapshot || snapshot === currentHistorySnapshot) return;
  if (currentHistorySnapshot) {
    undoHistory.push(currentHistorySnapshot);
    if (undoHistory.length > HISTORY_LIMIT_LOCAL) undoHistory.shift();
  }
  currentHistorySnapshot = snapshot;
  redoHistory = [];
  updateHistoryButtons();
}

function beginHistoryAction() {
  if (isRestoringHistory) return;
  const snapshot = getHistorySnapshot();
  if (snapshot !== currentHistorySnapshot) {
    recordHistoryCheckpoint();
    return;
  }
  if (!snapshot) return;
  undoHistory.push(snapshot);
  if (undoHistory.length > HISTORY_LIMIT_LOCAL) undoHistory.shift();
  redoHistory = [];
  updateHistoryButtons();
}

function commitHistoryAction(data = reportData) {
  if (isRestoringHistory) return;
  currentHistorySnapshot = getHistorySnapshot(data);
  updateHistoryButtons();
}

function restoreHistorySnapshot(snapshot) {
  if (!snapshot) return;
  let data;
  try {
    data = JSON.parse(snapshot);
  } catch {
    return;
  }
  closeEditor();
  isRestoringHistory = true;
  reportData = applyDefaults(cleanReportData(data));
  saveLocal();
  render();
  commitHistoryAction();
  isRestoringHistory = false;
  shouldSaveFullReport = false;
  hasPendingSync = true;
  commitHistoryAction();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveOnline, SYNC_INTERVAL_MS);
}

function undoChange() {
  recordHistoryCheckpoint();
  const previous = undoHistory.pop();
  if (!previous) return updateHistoryButtons();
  redoHistory.push(currentHistorySnapshot);
  if (redoHistory.length > HISTORY_LIMIT_LOCAL) redoHistory.shift();
  currentHistorySnapshot = previous;
  restoreHistorySnapshot(previous);
  saveStatus.textContent = 'Alteração desfeita';
  updateHistoryButtons();
}

function redoChange() {
  const next = redoHistory.pop();
  if (!next) return updateHistoryButtons();
  undoHistory.push(currentHistorySnapshot);
  if (undoHistory.length > HISTORY_LIMIT_LOCAL) undoHistory.shift();
  currentHistorySnapshot = next;
  restoreHistorySnapshot(next);
  saveStatus.textContent = 'Alteração refeita';
  updateHistoryButtons();
}

function isServiceHandoffActive() {
  return isServiceHandoffEditing || document.activeElement === document.querySelector('#serviceHandoffEditor');
}

function renderHighlights() {
  const items = reportData.highlights.filter(item => hasContent(item, ['title', 'details'])).sort((a, b) => Number(Boolean(b.urgent)) - Number(Boolean(a.urgent)));
  setSectionVisibility('highlightsSection', items.length);
  document.querySelector('#highlightsView').innerHTML = items.map(item => `
    <article class="preview-card highlight-preview-card ${priorityClass(item.priority, item.urgent)}">
      ${item.category ? `<span class="highlight-category-badge ${getCategoryClass(item.category)}">${escapeHtml(item.category)}</span>` : ''}
      <h3>${escapeHtml(item.title || 'Destaque')}</h3>
      ${item.details ? `<p>${formatWhatsappText(item.details)}</p>` : ''}
      ${item.priority ? `<div class="preview-meta">Prioridade: ${escapeHtml(item.priority)}</div>` : ''}
    </article>
  `).join('');
}

function renderNews() {
  const items = reportData.news;
  document.querySelector('#newsView').innerHTML = items.length ? items.map((item, index) => {
    const presenter = getNewsPresenter(item.name);
    return `
      <article class="preview-card news-preview-card ${getNewsClass(item.name)} analyst-editable" data-edit="news" data-index="${index}" tabindex="0">
        ${presenter ? `<img class="news-presenter" src="${escapeHtml(presenter)}" alt="">` : ''}
        <div class="news-card-content">
          <h3>${escapeHtml(item.name || 'Jornal')}</h3>
          <div class="info-pills">${metric('Início', item.start)}${metric('Produção', item.production)}${metric('Blocos', item.blocks)}</div>
          ${item.notes ? `<p>${escapeHtml(item.notes)}</p>` : ''}
        </div>
        <span class="edit-chip">Clique para editar</span>
      </article>
    `;
  }).join('') : cardEmpty('Nenhum jornal disponível.');
}

function renderStrategy() {
  const items = reportData.strategy;
  document.querySelector('#strategyView').innerHTML = items.length ? items.map((item, index) => {
    const badges = [item.network && '<span class="strategy-badge network">Em rede</span>', item.local && '<span class="strategy-badge local">Local</span>'].filter(Boolean).join('');
    return `
      <article class="preview-card strategy-preview-card ${getStrategyClass(item.name)} analyst-editable" data-edit="strategy" data-index="${index}" tabindex="0">
        <div class="strategy-card-actions">
          <button class="strategy-order-button" type="button" data-move-strategy="${index}" data-direction="up" aria-label="Mover programa para cima" title="Mover para cima" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button class="strategy-order-button" type="button" data-move-strategy="${index}" data-direction="down" aria-label="Mover programa para baixo" title="Mover para baixo" ${index === items.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="analyst-card-remove" type="button" data-remove-strategy="${index}" aria-label="Remover programa" title="Remover programa">×</button>
        </div>
        <div class="strategy-program">
          <span class="strategy-dot"></span>
          <div class="strategy-title-stack">
            <h3>${escapeHtml(item.name || 'Programa')}</h3>
            ${badges ? `<div class="strategy-badges">${badges}</div>` : '<p class="strategy-empty">Sem marcação.</p>'}
          </div>
        </div>
        <div class="strategy-info">
          ${item.observation ? `<p class="strategy-observation">${escapeHtml(item.observation)}</p>` : ''}
        </div>
        <span class="edit-chip">Clique para editar</span>
      </article>
    `;
  }).join('') : cardEmpty('Nenhuma estratégia disponível.');
}

function renderGames() {
  const items = reportData.games.filter(item => hasContent(item, ['date', 'time', 'championship', 'team1', 'team1Custom', 'team2', 'team2Custom']));
  setSectionVisibility('gamesSection', items.length);
  document.querySelector('#gamesView').innerHTML = items.map(item => {
    const team1 = getTeamName(item, 'team1');
    const team2 = getTeamName(item, 'team2');
    return `
      <div class="game-preview-item">
        ${item.date ? `<div class="game-schedule"><span>${escapeHtml(formatGameDate(item.date))}</span></div>` : ''}
        <article class="preview-card game ${getChampionshipClass(item.championship)}">
          <div class="club-crests" aria-hidden="true">
            ${getTeamVisual(team1, 'left')}
            ${getTeamVisual(team2, 'right')}
          </div>
          <div class="game-card-content">
            <h3>${escapeHtml(team1)} x ${escapeHtml(team2)}</h3>
            ${item.championship ? `<p>${escapeHtml(item.championship)}</p>` : ''}
            ${item.time ? `<div class="game-card-meta"><strong class="game-time">${escapeHtml(item.time)}</strong></div>` : ''}
            ${item.signal ? `<div class="game-preview-footer"><span class="signal-badge ${item.signal === 'SP' ? 'signal-sp' : 'signal-rede'}">${escapeHtml(item.signal)}</span></div>` : ''}
          </div>
        </article>
      </div>
    `;
  }).join('');
}

function renderPrograms() {
  const items = reportData.programs;
  document.querySelector('#programsView').innerHTML = items.length ? items.map((item, index) => `
    <article class="preview-card program-preview-card ${getProgramTimeClass(item.start)} analyst-editable" data-edit="program" data-index="${index}" tabindex="0">
      <div class="program-title-row">
        <span class="status-badge ${getStatusClass(item.status)}">${escapeHtml(item.status || 'Em preparação')}</span>
        <h3>${escapeHtml(item.name || 'Programa local')}</h3>
        ${item.exhibitionDate ? `<span class="program-date-badge">${escapeHtml(formatReportDate(item.exhibitionDate))}</span>` : ''}
      </div>
      <div class="program-preview-footer">
        <div class="program-ids">${getProgramIdBadges(item).map(id => `<span class="program-category">ID: ${escapeHtml(id)}</span>`).join('')}</div>
        <div class="preview-meta">${[
          item.exhibitionDate && `Exibição: ${formatReportDate(item.exhibitionDate)}`,
          item.start && `Início: ${item.start}`,
          item.duration && `Duração: ${item.duration}`
        ].slice(1).filter(Boolean).map(escapeHtml).join(' &nbsp;|&nbsp; ')}</div>
      </div>
      <span class="edit-chip">Clique para alterar status</span>
    </article>
  `).join('') : cardEmpty('Nenhum programa local disponível.');
}

function renderNotes() {
  const items = reportData.notes.filter(item => hasContent(item, ['subject', 'text']));
  setSectionVisibility('notesSection', items.length);
  document.querySelector('#notesView').innerHTML = items.map(item => `
    <article class="preview-card violet">
      <h3>${escapeHtml(item.subject || 'Informação')}</h3>
      ${item.text ? `<p>${escapeHtml(item.text)}</p>` : ''}
    </article>
  `).join('');
}

function renderLinks() {
  const items = reportData.links.filter(item => item.label && item.url);
  setSectionVisibility('linksSection', items.length);
  document.querySelector('#linksView').innerHTML = items.map(item => `
    <a class="useful-link" href="${escapeHtml(/^https?:\/\//i.test(item.url) ? item.url : `https://${item.url}`)}" target="_blank" rel="noopener">${escapeHtml(item.label)}</a>
  `).join('');
}

function render() {
  document.querySelector('#reportDateDisplay').textContent = `${formatReportDate(reportData.reportDate)} | ${reportData.weekday || ''}`;
  document.querySelector('#footerDate').textContent = formatReportDate(reportData.reportDate);
  updateDayButtons();
  renderServiceHandoff();
  renderHighlights();
  renderNotes();
  renderNews();
  renderStrategy();
  renderGames();
  renderPrograms();
  renderLinks();
  bindServiceHandoffEditor();
  bindEditableCards();
  updateStrategyTabsUi();
}

function closeEditor() {
  if (activeEditor) activeEditor.remove();
  activeEditor = null;
}

function openEditor(type, index, card) {
  closeEditor();
  const item = reportData[type === 'program' ? 'programs' : type][index];
  if (!item) return;
  activeEditor = document.createElement('div');
  activeEditor.className = 'analyst-editor';

  if (type === 'news') {
    activeEditor.innerHTML = `
      <label>Jornal<select data-field="name">
        ${['BOM DIA DF', 'DF1', 'GLOBO ESPORTE', 'DF2'].map(name => `<option ${item.name === name ? 'selected' : ''}>${name}</option>`).join('')}
      </select></label>
      <div class="analyst-editor-grid">
        <label>Início<input data-field="start" type="time" value="${escapeHtml(item.start || '')}"></label>
        <label>Produção<input data-field="production" type="time" step="1" value="${escapeHtml(item.production || '')}"></label>
        <label>Blocos<input data-field="blocks" type="number" min="0" step="1" value="${escapeHtml(item.blocks || '')}"></label>
      </div>
      <label>Observações<input data-field="notes" type="text" value="${escapeHtml(item.notes || '')}"></label>
    `;
  } else if (type === 'strategy') {
    activeEditor.innerHTML = `
      <label>Programa<input data-field="name" type="text" value="${escapeHtml(item.name || '')}"></label>
      <div class="strategy-checks analyst-checks">
        <label class="check-option"><input data-field="network" type="checkbox" ${item.network ? 'checked' : ''}><span>Em rede</span></label>
        <label class="check-option"><input data-field="local" type="checkbox" ${item.local ? 'checked' : ''}><span>Local</span></label>
      </div>
      <label>Observação<input data-field="observation" type="text" value="${escapeHtml(item.observation || '')}"></label>
    `;
  } else {
    activeEditor.innerHTML = `
      <label>Status<select data-field="status">
        ${['Em preparação', 'Enviado', 'Capturado', 'Ao Vivo'].map(status => `<option ${item.status === status ? 'selected' : ''}>${status}</option>`).join('')}
      </select></label>
    `;
  }

  activeEditor.insertAdjacentHTML('beforeend', '<div class="analyst-editor-actions"><button class="button secondary" type="button" data-close>Fechar</button></div>');
  card.append(activeEditor);
  activeEditor.querySelector('[data-close]').addEventListener('click', event => {
    event.stopPropagation();
    closeEditor();
    render();
  });
  activeEditor.querySelectorAll('[data-field]').forEach(field => {
    field.addEventListener('click', event => event.stopPropagation());
    field.addEventListener('focus', beginHistoryAction);
    field.addEventListener('input', () => updateItem(type, index, field));
    field.addEventListener('change', () => updateItem(type, index, field));
  });
}

function updateItem(type, index, field) {
  const section = type === 'program' ? 'programs' : type;
  const item = reportData[section][index];
  if (!item) return;
  item[field.dataset.field] = field.type === 'checkbox' ? field.checked : field.value;
  scheduleSave();
  commitHistoryAction();
}

function selectStrategyTab(tab) {
  if (!STRATEGY_TAB_KEYS.includes(tab) || tab === activeStrategyTab) return;
  closeEditor();
  syncCurrentStrategyTab();
  activeStrategyTab = tab;
  reportData.strategy = reportData.strategyTabs[tab];
  render();
}

function clearStrategy() {
  closeEditor();
  beginHistoryAction();
  reportData.strategy = cleanStrategyList(activeStrategyTab);
  syncCurrentStrategyTab();
  shouldSaveFullReport = false;
  hasPendingSync = true;
  saveLocal();
  render();
  commitHistoryAction();
  saveStatus.textContent = supabaseClient ? 'Grade restaurada; sincronização online agendada' : 'Grade restaurada neste navegador';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveOnline, SYNC_INTERVAL_MS);
}

function removeStrategyItem(index) {
  if (!Number.isInteger(index) || !reportData.strategy[index]) return;
  beginHistoryAction();
  reportData.strategy.splice(index, 1);
  shouldSaveFullReport = false;
  hasPendingSync = true;
  saveLocal();
  render();
  commitHistoryAction();
  saveStatus.textContent = supabaseClient ? 'Programa removido da grade; sincronização online agendada' : 'Programa removido da grade neste navegador';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveOnline, SYNC_INTERVAL_MS);
}

function addStrategyItem() {
  closeEditor();
  beginHistoryAction();
  const index = reportData.strategy.length;
  reportData.strategy.push({ id: makeId(), name: '', network: false, local: false, observation: '', _default: false });
  shouldSaveFullReport = false;
  hasPendingSync = true;
  saveLocal();
  render();
  commitHistoryAction();
  const card = document.querySelector(`[data-edit="strategy"][data-index="${index}"]`);
  if (card) openEditor('strategy', index, card);
  saveStatus.textContent = 'Novo programa adicionado à grade';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveOnline, SYNC_INTERVAL_MS);
}

function moveStrategyItem(index, direction) {
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (!reportData.strategy[index] || !reportData.strategy[targetIndex]) return;
  closeEditor();
  beginHistoryAction();
  const [item] = reportData.strategy.splice(index, 1);
  reportData.strategy.splice(targetIndex, 0, item);
  shouldSaveFullReport = false;
  hasPendingSync = true;
  saveLocal();
  render();
  commitHistoryAction();
  saveStatus.textContent = 'Ordem da grade atualizada';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveOnline, SYNC_INTERVAL_MS);
}

function bindEditableCards() {
  document.querySelectorAll('[data-move-strategy]').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      moveStrategyItem(Number(button.dataset.moveStrategy), button.dataset.direction);
    });
  });
  document.querySelectorAll('[data-remove-strategy]').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      removeStrategyItem(Number(button.dataset.removeStrategy));
    });
  });
  document.querySelectorAll('.analyst-editable').forEach(card => {
    card.addEventListener('click', () => openEditor(card.dataset.edit, Number(card.dataset.index), card));
    card.addEventListener('keydown', event => {
      if (event.target !== card) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openEditor(card.dataset.edit, Number(card.dataset.index), card);
      }
    });
  });
}

function loadLocalReport(reportDate = reportData.reportDate || todayKey()) {
  try {
    const dateData = JSON.parse(localStorage.getItem(getDateStorageKey(reportDate)) || 'null');
    if (dateData) return cleanReportData(dateData);
    const globalData = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (globalData?.reportDate === reportDate) return cleanReportData(globalData);
    return cleanReportData({});
  } catch {
    return cleanReportData({});
  }
}

function saveLocal() {
  syncCurrentStrategyTab();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reportData));
  localStorage.setItem(getDateStorageKey(reportData.reportDate), JSON.stringify(reportData));
}

function loadLocalPersistentData() {
  try {
    const data = JSON.parse(localStorage.getItem(COORDINATOR_PERSISTENT_KEY) || 'null');
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

function applyPersistentCoordinatorData(data, persistentData) {
  const next = cleanReportData(data || {});
  if (!persistentData) return next;
  persistentData = resolvePersistentState(persistentData, next.reportDate || reportData.reportDate || todayKey());
  if (persistentData._persistentHandoffInitialized === true || String(persistentData.serviceHandoffHtml || '').trim()) {
    next.serviceHandoffHtml = persistentData.serviceHandoffHtml || '';
  }
  if (persistentData._persistentStrategyInitialized === true || persistentData.strategyTabs) {
    next.strategyTabs = normalizeStrategyTabs(persistentData);
    next._persistentStrategyInitialized = true;
  }
  PERSISTENT_COORDINATOR_SECTIONS.forEach(section => {
    if (!Object.prototype.hasOwnProperty.call(persistentData, section)) return;
    if (section !== 'programs') {
      next[section] = Array.isArray(persistentData[section]) ? persistentData[section] : [];
      return;
    }
    const currentPrograms = new Map();
    (next.programs || []).forEach(item => {
      if (item.id) currentPrograms.set(item.id, item);
      if (item.name) currentPrograms.set(item.name, item);
    });
    next.programs = (persistentData.programs || []).map(item => {
      const current = currentPrograms.get(item.id) || currentPrograms.get(item.name);
      return current ? { ...item, status: current.status || item.status } : item;
    });
  });
  return next;
}

async function loadPersistentCoordinatorData() {
  let persistentData = loadLocalPersistentData();
  if (supabaseClient) {
    const { payload, error } = await fetchRemoteReport(supabaseClient, PERSISTENT_REPORT_DATE);
    if (!error && payload) {
      persistentData = {
        _persistentVersion: payload._persistentVersion,
        _persistentSnapshots: payload._persistentSnapshots || {}
      };
      const clearedSections = new Set(payload._persistentClearedSections || []);
      const remoteSections = Number(payload._persistentVersion) >= 2
        ? PERSISTENT_COORDINATOR_SECTIONS
        : ['highlights', 'games'];
      remoteSections.forEach(section => {
        const items = Array.isArray(payload[section]) ? payload[section] : [];
        if (items.length || clearedSections.has(section)) persistentData[section] = items;
      });
      persistentData.serviceHandoffHtml = payload.serviceHandoffHtml || '';
      persistentData._persistentHandoffInitialized = payload._persistentHandoffInitialized === true;
      persistentData.strategyTabs = payload.strategyTabs;
      persistentData._persistentStrategyInitialized = payload._persistentStrategyInitialized === true;
      localStorage.setItem(COORDINATOR_PERSISTENT_KEY, JSON.stringify(persistentData));
    } else if (error) {
      console.error(error);
    }
  }
  return persistentData;
}

async function savePersistentSharedData(editedData) {
  const { payload: remotePersistent, error: fetchError } = await fetchRemoteReport(supabaseClient, PERSISTENT_REPORT_DATE);
  if (fetchError) return { error: fetchError };
  const localPersistent = loadLocalPersistentData() || {};
  const base = remotePersistent || localPersistent;
  const persistentData = cleanReportData({
    ...base,
    reportDate: PERSISTENT_REPORT_DATE,
    _persistentVersion: 3,
    _persistentSnapshots: {
      ...(base._persistentSnapshots || {}),
      [editedData.reportDate]: persistentSnapshotFrom(editedData)
    }
  });
  const result = await saveRemoteReport(supabaseClient, persistentData, remotePersistent);
  if (!result.error) {
    localStorage.setItem(COORDINATOR_PERSISTENT_KEY, JSON.stringify(persistentData));
  }
  return result;
}

function mergeAnalystChanges(base, edited) {
  const merged = cleanReportData(base || {});
  merged.reportDate = edited.reportDate;
  merged.weekday = edited.weekday;
  merged.serviceHandoffHtml = edited.serviceHandoffHtml || '';
  merged.news = edited.news;
  merged.strategy = edited.strategy;
  merged.strategyTabs = normalizeStrategyTabs(edited);
  merged.strategyTabs[activeStrategyTab] = edited.strategy;
  merged._persistentStrategyInitialized = true;
  const editedPrograms = new Map();
  edited.programs.forEach(item => {
    if (item.id) editedPrograms.set(item.id, item);
    if (item.name) editedPrograms.set(item.name, item);
  });
  merged.programs = (merged.programs.length ? merged.programs : edited.programs).map(item => {
    const editedItem = editedPrograms.get(item.id || item.name);
    return editedItem ? { ...item, status: editedItem.status } : item;
  });
  return merged;
}

async function saveOnline() {
  if (!supabaseClient) {
    saveStatus.textContent = 'Salvo neste navegador';
    if (lastUpdateStatus) lastUpdateStatus.textContent = 'Última atualização: modo local';
    hasPendingSync = false;
    shouldSaveFullReport = false;
    return;
  }

  const { payload: latestPayload, error: fetchError } = await fetchRemoteReport(supabaseClient, reportData.reportDate);
  if (fetchError) {
    console.error(fetchError);
    hasPendingSync = true;
    saveStatus.textContent = 'Salvo neste navegador; sincronização online pendente';
    if (lastUpdateStatus) lastUpdateStatus.textContent = 'Última atualização: aguardando conexão com Supabase';
    return;
  }

  const payloadBase = latestPayload || currentRemotePayload || reportData;
  const merged = shouldSaveFullReport ? reportData : mergeAnalystChanges(payloadBase, reportData);
  const { payload, row, error } = await saveRemoteReport(supabaseClient, merged, payloadBase);
  if (error) {
    console.error(error);
    hasPendingSync = true;
    saveStatus.textContent = 'Salvo neste navegador; sincronização online pendente';
    if (lastUpdateStatus) lastUpdateStatus.textContent = 'Última atualização: aguardando conexão com Supabase';
    return;
  }

  const { error: persistentError } = await savePersistentSharedData(reportData);
  if (persistentError) {
    console.error(persistentError);
    hasPendingSync = true;
    saveStatus.textContent = 'Relatório salvo; dados perenes ainda não sincronizados';
    if (lastUpdateStatus) lastUpdateStatus.textContent = 'Última atualização: aguardando conexão com Supabase';
    return;
  }

  hasPendingSync = false;
  shouldSaveFullReport = false;
  currentRemotePayload = payload;
  reportData = applyDefaults(cleanReportData(payload || merged));
  saveLocal();
  if (lastUpdateStatus) lastUpdateStatus.textContent = formatLastUpdate(payload?._meta);
  saveStatus.textContent = row ? 'Salvo e sincronizado' : 'Salvo localmente; Supabase não confirmou';
}

function scheduleSave() {
  saveLocal();
  hasPendingSync = true;
  saveStatus.textContent = supabaseClient ? 'Salvo localmente; sincronização online agendada' : 'Salvo neste navegador';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveOnline, SYNC_INTERVAL_MS);
}

async function loadReport(force = false, reportDate = reportData.reportDate || todayKey()) {
  if (isServiceHandoffActive() && !force) return;
  if (activeEditor && !force) return;
  if (force && hasPendingSync) {
    await saveOnline();
    if (hasPendingSync) return;
  }

  saveStatus.textContent = supabaseClient ? 'Carregando dados online...' : 'Carregando dados locais...';
  const localData = loadLocalReport(reportDate);
  const persistentData = await loadPersistentCoordinatorData();
  let remoteData = null;
  if (supabaseClient) {
    const { payload, error } = await fetchRemoteReport(supabaseClient, reportDate);
    if (!error && payload) {
      currentRemotePayload = payload;
      remoteData = cleanReportData(payload);
      if (lastUpdateStatus) lastUpdateStatus.textContent = formatLastUpdate(payload._meta);
    } else if (force) {
      saveStatus.textContent = 'Não foi possível atualizar online agora';
    }
  }
  const baseData = hasContent(localData, ['reportDate']) || Object.keys(localData).some(key => Array.isArray(localData[key]) && localData[key].length)
    ? localData
    : { reportDate };
  activeStrategyTab = strategyTabForDate(reportDate);
  reportData = applyDefaults(applyPersistentCoordinatorData(remoteData || baseData, persistentData));
  saveLocal();
  render();
  initializeHistory(reportData);
  if (!currentRemotePayload && lastUpdateStatus) lastUpdateStatus.textContent = supabaseClient ? 'Última atualização: ainda não sincronizado' : 'Última atualização: modo local';
  saveStatus.textContent = force ? 'Dados atualizados' : 'Painel carregado';
}

async function selectReportDate(reportDate) {
  closeEditor();
  if (hasPendingSync) {
    await saveOnline();
    if (hasPendingSync) return;
  } else {
    saveLocal();
  }
  await loadReport(false, reportDate);
}

async function copyPreviousDay() {
  await copyPreviousEditableSections(['news', 'programs'], 'Informações editáveis copiadas');
}

async function getPreviousDayData() {
  const currentDate = reportData.reportDate || todayKey();
  const previousDate = getOffsetDateKey(-1, currentDate);
  let previousData = null;
  if (supabaseClient) {
    const { payload, error } = await fetchRemoteReport(supabaseClient, previousDate);
    if (!error && payload) previousData = cleanReportData(payload);
  }
  return previousData || loadLocalReport(previousDate);
}

function hasPreviousSectionData(previousData, section) {
  if (!previousData) return false;
  if (section === 'serviceHandoffHtml') return Boolean(String(previousData.serviceHandoffHtml || '').trim());
  return Array.isArray(previousData[section]) && previousData[section].length > 0;
}

async function copyPreviousEditableSections(sectionList, successLabel = 'Informacoes copiadas') {
  closeEditor();
  beginHistoryAction();
  const currentDate = reportData.reportDate || todayKey();
  const previousData = await getPreviousDayData();
  const sectionsWithData = sectionList.filter(section => hasPreviousSectionData(previousData, section));
  if (!sectionsWithData.length) {
    saveStatus.textContent = 'Nenhuma informacao encontrada no dia anterior para este bloco';
    return;
  }
  const nextData = cleanReportData({ ...reportData, reportDate: currentDate, weekday: weekdayFor(currentDate) });
  sectionsWithData.forEach(section => {
    if (section === 'serviceHandoffHtml') nextData.serviceHandoffHtml = previousData.serviceHandoffHtml || '';
    else nextData[section] = Array.isArray(previousData[section]) ? previousData[section].map(item => ({ ...item, id: makeId(), _default: false })) : [];
  });
  reportData = applyDefaults(nextData);
  shouldSaveFullReport = false;
  hasPendingSync = true;
  saveLocal();
  render();
  commitHistoryAction();
  saveStatus.textContent = supabaseClient ? `${successLabel}; sincronizacao online agendada` : `${successLabel} neste navegador`;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveOnline, SYNC_INTERVAL_MS);
}

function maestroReminderOccurrence(now = new Date()) {
  const candidates = [];
  const addCandidate = (date, hour, minute) => {
    const candidate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0, 0);
    if (candidate <= now) candidates.push(candidate);
  };
  addCandidate(now, 6, 30);
  addCandidate(now, 22, 0);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  addCandidate(yesterday, 22, 0);
  return candidates.sort((a, b) => b - a)[0];
}

function maestroReminderKey(occurrence = maestroReminderOccurrence()) {
  if (!occurrence) return '';
  const date = `${occurrence.getFullYear()}-${String(occurrence.getMonth() + 1).padStart(2, '0')}-${String(occurrence.getDate()).padStart(2, '0')}`;
  const time = `${String(occurrence.getHours()).padStart(2, '0')}${String(occurrence.getMinutes()).padStart(2, '0')}`;
  return `${STORAGE_KEY}-maestro-reminder-${date}-${time}`;
}

function updateMaestroReminder() {
  const reminder = document.querySelector('#maestroReminder');
  if (!reminder) return;
  const occurrence = maestroReminderOccurrence();
  const key = maestroReminderKey(occurrence);
  const dismissed = key && localStorage.getItem(key) === 'done';
  reminder.hidden = !occurrence || dismissed;
  if (!reminder.hidden) {
    const time = occurrence.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    document.querySelector('#maestroReminderText').textContent = `Aviso das ${time}: envie a versão atualizada do Maestro.`;
  }
}

function dismissMaestroReminder() {
  const key = maestroReminderKey();
  if (key) localStorage.setItem(key, 'done');
  updateMaestroReminder();
}

function collectReportStyles() {
  let css = '';
  [...document.styleSheets].forEach(sheet => {
    try {
      css += [...sheet.cssRules].map(rule => rule.cssText).join('\n');
    } catch {}
  });
  return css;
}

function dedicatedReportStyles() {
  return `
@font-face{font-family:Globotipo;src:url('assets/GlobotipoCorporativa-Regular.ttf') format('truetype');font-weight:400;font-display:swap}
@font-face{font-family:Globotipo;src:url('assets/GlobotipoCorporativa-Bold.ttf') format('truetype');font-weight:700;font-display:swap}
:root{--ink:#101116;--muted:#5d6475;--line:#dfe3ea;--blue:#087bff;--gradient:linear-gradient(110deg,#00a7ff,#2860ff 52%,#8200ff)}
*{box-sizing:border-box}html{background:#ececef}body{margin:0;padding:0 24px 24px;background:#ececef;color:var(--ink);font-family:Globotipo,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.preview-shell{width:min(1120px,100%);margin:18px auto 0;display:flex;flex-direction:column;gap:14px}.preview-hero,.preview-section{position:relative;overflow:hidden;background:#fff;border-radius:22px}.preview-hero{min-height:210px;padding:30px 38px;display:flex;align-items:center}.preview-hero:after{content:"";position:absolute;right:0;bottom:0;width:48%;height:96%;background:url("assets/programadores-tv-centro-exibidor-cinza-transparente.png") right bottom/contain no-repeat;opacity:.2}.preview-hero>div,.generated-report-meta{position:relative;z-index:1}.eyebrow{margin:0 0 10px;color:var(--blue);font-size:11px;font-weight:800;letter-spacing:.14em}.preview-hero h1{margin:0;font-size:42px;line-height:1;letter-spacing:-.04em}.preview-hero .date{margin:14px 0 0;font-size:14px;font-weight:700}.generated-report-meta{align-self:flex-end;margin:0 0 2px auto;color:var(--muted);font-size:10px}
.preview-section{padding:24px 28px}.preview-section-title{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:13px;margin-bottom:14px;border-bottom:1px solid var(--line)}.preview-section-title h2{margin:0;font-size:21px;letter-spacing:-.025em}.preview-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.preview-card{position:relative;overflow:hidden;min-height:106px;padding:17px 20px;border-radius:15px;background:#f5f5f7;border:1px solid #e8e9ed}.preview-card:before{content:"";position:absolute;inset:0 auto 0 0;width:5px;background:var(--gradient)}.preview-card h3{position:relative;margin:0 0 9px;font-size:16px}.preview-card p{position:relative;margin:6px 0 0;color:#50586a;font-size:12px;line-height:1.45}.preview-empty,.handoff-placeholder{color:#7a8190;font-size:12px}
.links-top{padding:0;background:transparent}.links-top .preview-cards{grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:7px}.useful-link{display:flex;align-items:center;justify-content:center;min-height:37px;padding:9px 12px;border:1px solid #dbe6f5;border-radius:10px;background:#fff;color:#075fd8;font-size:12px;font-weight:800;text-align:center;text-decoration:none}
.handoff-section .preview-cards,.handoff-preview-card{min-height:auto}.handoff-content{font-size:13px;line-height:1.55}.handoff-content p{margin:5px 0}.highlight-category,.program-category{display:inline-flex;padding:5px 8px;border-radius:7px;background:#087bff;color:#fff;font-size:9px;font-weight:800;text-transform:uppercase}.priority-label{font-size:10px;font-weight:800}.urgent-highlight{background:linear-gradient(115deg,#ff164c,#d900bc);color:#fff}.urgent-highlight h3,.urgent-highlight p{color:#fff}
#newsView{grid-template-columns:repeat(2,minmax(0,1fr))}.news-preview-card{min-height:118px}.news-bom-dia:before{background:linear-gradient(#ffe733,#ffb000)}.news-df1:before{background:linear-gradient(#ff9d00,#ff5600)}.news-ge:before{background:linear-gradient(#ff3030,#c90037)}.news-df2:before{background:linear-gradient(#00a7ff,#2860ff)}.news-card-content{position:relative;max-width:100%}.info-pills{display:flex;flex-wrap:wrap;gap:7px}.info-pill{display:flex;flex-direction:column;gap:2px;min-width:78px;padding:7px 9px;border-radius:9px;background:#fff;border:1px solid #e0e5ed}.info-pill small{color:#6e7584;font-size:8px;font-weight:800;text-transform:uppercase}.info-pill strong{color:#075fd8;font-size:12px}
#strategyView{grid-template-columns:1fr}.strategy-preview-card{display:grid;grid-template-columns:minmax(180px,.8fr) minmax(0,1.4fr);align-items:center;gap:16px;min-height:66px;padding:13px 18px 13px 26px}.strategy-afternoon-start:before{background:linear-gradient(#ffcf2e,#ff6b1a)}.strategy-afternoon:before{background:linear-gradient(#ff9d00,#e7357a)}.strategy-sunset:before{background:linear-gradient(#ff5a3d,#751cff)}.strategy-night:before{background:linear-gradient(#2860ff,#11183f)}.strategy-program{display:flex;align-items:center;gap:10px}.strategy-dot{width:10px;height:10px;flex:0 0 10px;border-radius:50%;background:var(--gradient)}.strategy-title-stack h3{margin-bottom:6px}.strategy-badges{display:flex;gap:5px}.strategy-badge,.status-badge,.signal-badge{display:inline-flex;padding:5px 8px;border-radius:7px;color:#fff;font-size:9px;font-weight:800}.strategy-badge.network,.signal-rede{background:linear-gradient(110deg,#00a7ff,#2860ff)}.strategy-badge.local{background:linear-gradient(110deg,#00a86b,#00c97b)}.strategy-info{min-width:0}.strategy-observation{padding:9px 11px;border:1px solid #dbe9ff;border-radius:10px;background:#fff!important;color:#17233f!important;font-weight:700;overflow-wrap:anywhere}
.game-schedule{grid-column:1/-1;margin:5px 0 0;font-size:11px}.game-schedule strong{font-size:12px}.preview-card.game{min-height:120px}.game-card-content{position:relative;z-index:2}.game-time{display:inline-flex;margin-top:7px;padding:6px 12px;border-radius:999px;background:linear-gradient(110deg,#00a86b,#00c97b);color:#fff!important;font-size:15px!important;font-weight:800}.club-crests{position:absolute;inset:5px 10px;display:flex;justify-content:space-between;opacity:.18}.club-crests img{width:36%;height:82%;object-fit:contain}.crest-placeholder{width:68px;height:68px;border-radius:50%;display:grid;place-items:center;background:var(--gradient);color:#fff;font-size:28px;font-weight:800}.signal-badge{float:right;background:#087bff}
.program-title-row{display:flex;align-items:center;gap:9px}.program-date-badge{padding:5px 8px;border-radius:7px;background:#fff;color:#087bff;font-size:10px;font-weight:800}.program-ids{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px}.program-id{padding:5px 8px;border-radius:7px;background:#fff;border:1px solid #dfe5ee;color:#273147;font-size:9px;font-weight:800}.status-badge{background:#7a8190}.status-enviado{background:#ff8500}.status-capturado{background:#00a86b}.status-ao-vivo{background:#e50046}.program-preview-footer{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;margin-top:10px}
footer{display:flex;justify-content:space-between;padding:12px 5px 0;color:#6e7584;font-size:10px}
@media(max-width:720px){body{padding:0 10px 16px}.preview-hero{padding:24px;min-height:175px}.preview-hero:after{opacity:.1}.preview-hero h1{font-size:34px}.preview-section{padding:19px}.preview-cards,#newsView{grid-template-columns:1fr}.strategy-preview-card{grid-template-columns:1fr}.generated-report-meta{display:none}}
@media print{body{padding:0;background:#fff}.preview-shell{margin-top:10px;gap:8px}.preview-hero{min-height:150px}.preview-section{break-inside:auto;padding:16px 20px}.preview-card{break-inside:avoid}}
`;
}

function generateHtmlReport() {
  closeEditor();
  if (isServiceHandoffActive()) closeServiceHandoffEditor(true);
  render();
  const source = document.querySelector('main.preview-shell');
  if (!source) return;
  const report = source.cloneNode(true);
  report.querySelectorAll('[data-export-control],.day-actions,.analyst-hint,.edit-chip,.strategy-card-actions,.analyst-editor,.handoff-editor-panel,.hero-copy,.strategy-title-row>.section-actions,button,[hidden]').forEach(element => element.remove());
  report.querySelectorAll('.news-presenter').forEach(image => image.remove());
  report.querySelectorAll('.analyst-editable').forEach(element => element.classList.remove('analyst-editable'));
  report.querySelectorAll('[contenteditable], [tabindex]').forEach(element => {
    element.removeAttribute('contenteditable');
    element.removeAttribute('tabindex');
  });
  report.querySelectorAll('img[src]').forEach(image => {
    image.src = new URL(image.getAttribute('src'), document.baseURI).href;
  });
  report.querySelectorAll('a[href]').forEach(link => {
    link.href = new URL(link.getAttribute('href'), document.baseURI).href;
  });
  const generatedAt = new Date().toLocaleString('pt-BR');
  const meta = document.createElement('p');
  meta.className = 'generated-report-meta';
  meta.textContent = `Relatório gerado em ${generatedAt}`;
  report.querySelector('.preview-hero')?.append(meta);
  const styles = `${collectReportStyles()}\n${dedicatedReportStyles()}`;
  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<base href="${document.baseURI}"><title>Relatório diário - ${reportData.reportDate}</title>
<style>${styles}</style>
</head><body class="analyst-page export-report">${report.outerHTML}</body></html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `relatorio-diario-${reportData.reportDate || todayKey()}.html`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  saveStatus.textContent = 'Relatório HTML gerado';
}

function buildMaestroStrategy(importedItems, currentItems, tab) {
  const importedByName = new Map(importedItems.map(item => [normalizeKey(item.name), item]));
  const currentByName = new Map(currentItems.map(item => [normalizeKey(item.name), item]));
  const defaultNames = strategyPrograms[tab] || [];
  const ordered = [...currentItems];
  defaultNames.forEach(name => {
    if (!currentByName.has(normalizeKey(name))) {
      ordered.push({ id: makeId(), name, network: false, local: false, observation: '', _default: false });
    }
  });
  return ordered.map(item => {
    const maestro = importedByName.get(normalizeKey(item.name));
    return maestro ? { ...item, network: maestro.network, local: maestro.local, observation: maestro.observation, _default: false } : item;
  });
}

async function importMaestroFile(file) {
  if (!file || !window.GloboMaestro) return;
  try {
    const imported = window.GloboMaestro.parseMaestroFile(await file.text());
    if (!imported.news.length) throw new Error('Nenhum dos quatro jornais locais foi encontrado no arquivo.');
    const summary = `${imported.news.length} jornais e dados de grade para ${formatReportDate(imported.date)}.`;
    if (!confirm(`Importar ${summary}\n\nOs dados existentes dessa data serão atualizados.`)) return;
    if (reportData.reportDate !== imported.date) await selectReportDate(imported.date);
    beginHistoryAction();
    reportData.news = imported.news.map(item => ({ ...item, id: makeId(), _default: false }));
    reportData.strategy = buildMaestroStrategy(imported.strategy, reportData.strategy, activeStrategyTab);
    syncCurrentStrategyTab();
    shouldSaveFullReport = false;
    hasPendingSync = true;
    saveLocal();
    render();
    commitHistoryAction();
    clearTimeout(saveTimer);
    if (supabaseClient) {
      saveStatus.textContent = 'Salvando importação do Maestro...';
      await saveOnline();
    } else {
      await savePersistentSharedData(reportData);
      saveStatus.textContent = 'Dados do Maestro importados neste navegador';
    }
    dismissMaestroReminder();
  } catch (error) {
    console.error(error);
    alert(`Não foi possível importar o arquivo do Maestro. ${error.message || ''}`.trim());
  }
}

document.querySelectorAll('[data-day-offset]').forEach(button => button.addEventListener('click', () => selectReportDate(getOffsetDateKey(Number(button.dataset.dayOffset)))));
document.querySelectorAll('[data-strategy-tab]').forEach(button => button.addEventListener('click', () => selectStrategyTab(button.dataset.strategyTab)));
document.querySelector('#clearStrategy')?.addEventListener('click', clearStrategy);
document.querySelector('#addStrategyProgram')?.addEventListener('click', addStrategyItem);
document.querySelector('#copyPreviousDayButton')?.addEventListener('click', copyPreviousDay);
document.querySelector('#refreshButton').addEventListener('click', () => loadReport(true, reportData.reportDate || todayKey()));
document.querySelector('#maestroButton')?.addEventListener('click', () => document.querySelector('#maestroFileInput')?.click());
document.querySelector('#maestroReminderConnect')?.addEventListener('click', () => document.querySelector('#maestroFileInput')?.click());
document.querySelector('#maestroReminderDismiss')?.addEventListener('click', dismissMaestroReminder);
document.querySelector('#generateHtmlReport')?.addEventListener('click', generateHtmlReport);
document.querySelector('#maestroFileInput')?.addEventListener('change', event => {
  const [file] = event.target.files || [];
  importMaestroFile(file).finally(() => { event.target.value = ''; });
});
document.querySelector('#undoButton')?.addEventListener('click', undoChange);
document.querySelector('#redoButton')?.addEventListener('click', redoChange);
loadReport().catch(error => {
  console.error(error);
  reportData = applyDefaults({ reportDate: todayKey() });
  render();
  initializeHistory(reportData);
  saveStatus.textContent = 'Falha ao iniciar; usando modo local';
  if (lastUpdateStatus) lastUpdateStatus.textContent = 'Última atualização: modo local';
});
updateMaestroReminder();
setInterval(updateMaestroReminder, 30000);
setInterval(() => {
  if (activeEditor || isServiceHandoffActive()) return;
  if (hasPendingSync) saveOnline();
  else loadReport(false, reportData.reportDate || todayKey());
}, SYNC_INTERVAL_MS);
})();

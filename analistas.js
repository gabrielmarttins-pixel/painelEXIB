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

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

function getTeamVisual(team) {
  const crest = teamCrests[team];
  const flag = getCountryFlag(team);
  if (crest) return `<img class="crest" src="${escapeHtml(crest)}" alt="">`;
  if (flag) return `<img class="crest flag" src="${escapeHtml(flag)}" alt="">`;
  return '';
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
  const strategyList = dayOfWeek === 0 ? strategyPrograms.sunday : dayOfWeek === 6 ? strategyPrograms.saturday : strategyPrograms.weekday;
  strategyList.forEach(name => {
    if (!next.strategy.some(item => item.name === name)) next.strategy.push({ id: makeId(), name, network: false, local: false, observation: '', _default: true });
  });
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
        <button class="analyst-card-remove" type="button" data-remove-strategy="${index}" aria-label="Remover programa" title="Remover programa">×</button>
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
            ${getTeamVisual(team1)}
            ${getTeamVisual(team2)}
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
    <article class="preview-card program-preview-card analyst-editable" data-edit="program" data-index="${index}" tabindex="0">
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

function applyStrategyPreset(preset) {
  closeEditor();
  const programNames = strategyPrograms[preset];
  if (!Array.isArray(programNames) || !programNames.length) return;
  beginHistoryAction();

  const existingByName = new Map();
  reportData.strategy.forEach(item => {
    const key = normalizeKey(item.name);
    if (key && !existingByName.has(key)) existingByName.set(key, item);
  });

  reportData.strategy = programNames.map(name => {
    const existing = existingByName.get(normalizeKey(name)) || {};
    return {
      ...existing,
      id: existing.id || makeId(),
      name,
      network: Boolean(existing.network),
      local: Boolean(existing.local),
      observation: existing.observation || '',
      _default: false
    };
  });
  shouldSaveFullReport = false;
  hasPendingSync = true;
  saveLocal();
  render();
  commitHistoryAction();
  saveStatus.textContent = supabaseClient ? 'Estratégia de grade atualizada; sincronização online agendada' : 'Estratégia de grade atualizada neste navegador';
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

function bindEditableCards() {
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reportData));
  localStorage.setItem(getDateStorageKey(reportData.reportDate), JSON.stringify(reportData));
}

function mergeAnalystChanges(base, edited) {
  const merged = cleanReportData(base || {});
  merged.reportDate = edited.reportDate;
  merged.weekday = edited.weekday;
  merged.serviceHandoffHtml = edited.serviceHandoffHtml || '';
  merged.news = edited.news;
  merged.strategy = edited.strategy;
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
  reportData = applyDefaults(remoteData || baseData);
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
  await copyPreviousEditableSections(['serviceHandoffHtml', 'news', 'strategy', 'programs'], 'Informacoes editaveis copiadas');
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

document.querySelectorAll('[data-day-offset]').forEach(button => button.addEventListener('click', () => selectReportDate(getOffsetDateKey(Number(button.dataset.dayOffset)))));
document.querySelectorAll('[data-strategy-preset]').forEach(button => button.addEventListener('click', () => applyStrategyPreset(button.dataset.strategyPreset)));
document.querySelector('#copyPreviousDayButton')?.addEventListener('click', copyPreviousDay);
document.querySelector('#refreshButton').addEventListener('click', () => loadReport(true, reportData.reportDate || todayKey()));
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
setInterval(() => {
  if (activeEditor || isServiceHandoffActive()) return;
  if (hasPendingSync) saveOnline();
  else loadReport(false, reportData.reportDate || todayKey());
}, SYNC_INTERVAL_MS);
})();

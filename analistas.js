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

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
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

function getTeamVisual(team) {
  const crest = teamCrests[team];
  const flag = getCountryFlag(team);
  if (crest) return `<img class="crest" src="${escapeHtml(crest)}" alt="">`;
  if (flag) return `<img class="crest flag" src="${escapeHtml(flag)}" alt="">`;
  return '';
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

function renderHighlights() {
  const items = reportData.highlights.filter(item => hasContent(item, ['title', 'details'])).sort((a, b) => Number(Boolean(b.urgent)) - Number(Boolean(a.urgent)));
  setSectionVisibility('highlightsSection', items.length);
  document.querySelector('#highlightsView').innerHTML = items.map(item => `
    <article class="preview-card highlight-preview-card ${priorityClass(item.priority, item.urgent)}">
      ${item.category ? `<span class="highlight-category-badge ${getCategoryClass(item.category)}">${escapeHtml(item.category)}</span>` : ''}
      <h3>${escapeHtml(item.title || 'Destaque')}</h3>
      ${item.details ? `<p>${escapeHtml(item.details)}</p>` : ''}
      ${item.priority ? `<div class="preview-meta">Prioridade: ${escapeHtml(item.priority)}</div>` : ''}
    </article>
  `).join('');
}

function renderNews() {
  const items = reportData.news;
  document.querySelector('#newsView').innerHTML = items.length ? items.map((item, index) => {
    const presenter = getNewsPresenter(item.name);
    return `
      <article class="preview-card news-preview-card analyst-editable" data-edit="news" data-index="${index}" tabindex="0">
        ${presenter ? `<img class="news-presenter" src="${escapeHtml(presenter)}" alt="">` : ''}
        <div class="news-card-content">
          <h3>${escapeHtml(item.name || 'Jornal')}</h3>
          <div class="preview-meta">${[
            item.start && `Início: ${item.start}`,
            item.production && `Produção: ${item.production}`,
            item.blocks && `Blocos: ${item.blocks}`
          ].filter(Boolean).map(escapeHtml).join(' &nbsp;|&nbsp; ')}</div>
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
      <article class="preview-card strategy-preview-card analyst-editable" data-edit="strategy" data-index="${index}" tabindex="0">
        <h3>${escapeHtml(item.name || 'Programa')}</h3>
        ${badges ? `<div class="strategy-badges">${badges}</div>` : '<p>Sem marcação.</p>'}
        ${item.observation ? `<p>${escapeHtml(item.observation)}</p>` : ''}
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
        ${(item.date || item.time) ? `<div class="game-schedule">${item.date ? `<span>${escapeHtml(formatGameDate(item.date))}</span>` : ''}${item.time ? `<strong>${escapeHtml(item.time)}</strong>` : ''}</div>` : ''}
        <article class="preview-card game">
          <div class="club-crests" aria-hidden="true">
            ${getTeamVisual(team1)}
            ${getTeamVisual(team2)}
          </div>
          <div class="game-card-content">
            <h3>${escapeHtml(team1)} x ${escapeHtml(team2)}</h3>
            ${item.championship ? `<p>${escapeHtml(item.championship)}</p>` : ''}
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
      </div>
      <div class="program-preview-footer">
        <div class="program-ids">${item.ids ? `<span class="program-category">ID's: ${escapeHtml(item.ids)}</span>` : ''}</div>
        <div class="preview-meta">${[
          item.start && `Início: ${item.start}`,
          item.duration && `Duração: ${item.duration}`
        ].filter(Boolean).map(escapeHtml).join(' &nbsp;|&nbsp; ')}</div>
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
  renderHighlights();
  renderNews();
  renderStrategy();
  renderGames();
  renderPrograms();
  renderNotes();
  renderLinks();
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
      <label>Jornal<input data-field="name" type="text" value="${escapeHtml(item.name || '')}"></label>
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
}

function bindEditableCards() {
  document.querySelectorAll('.analyst-editable').forEach(card => {
    card.addEventListener('click', () => openEditor(card.dataset.edit, Number(card.dataset.index), card));
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openEditor(card.dataset.edit, Number(card.dataset.index), card);
      }
    });
  });
}

function loadLocalReport() {
  try {
    return cleanReportData(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || {});
  } catch {
    return cleanReportData({});
  }
}

function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reportData));
}

function mergeAnalystChanges(base, edited) {
  const merged = cleanReportData(base || {});
  merged.reportDate = edited.reportDate;
  merged.weekday = edited.weekday;
  merged.news = edited.news;
  merged.strategy = edited.strategy;
  const editedPrograms = new Map(edited.programs.map(item => [item.id || item.name, item]));
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
  const merged = mergeAnalystChanges(payloadBase, reportData);
  const { payload, row, error } = await saveRemoteReport(supabaseClient, merged, payloadBase);
  if (error) {
    console.error(error);
    hasPendingSync = true;
    saveStatus.textContent = 'Salvo neste navegador; sincronização online pendente';
    if (lastUpdateStatus) lastUpdateStatus.textContent = 'Última atualização: aguardando conexão com Supabase';
    return;
  }

  hasPendingSync = false;
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

async function loadReport(force = false) {
  if (activeEditor && !force) return;
  if (force && hasPendingSync) {
    await saveOnline();
    if (hasPendingSync) return;
  }

  saveStatus.textContent = supabaseClient ? 'Carregando dados online...' : 'Carregando dados locais...';
  const localData = loadLocalReport();
  let remoteData = null;
  if (supabaseClient) {
    const { payload, error } = await fetchRemoteReport(supabaseClient, localData.reportDate || todayKey());
    if (!error && payload) {
      currentRemotePayload = payload;
      remoteData = cleanReportData(payload);
      if (lastUpdateStatus) lastUpdateStatus.textContent = formatLastUpdate(payload._meta);
    } else if (force) {
      saveStatus.textContent = 'Não foi possível atualizar online agora';
    }
  }
  reportData = applyDefaults(remoteData || localData || { reportDate: todayKey() });
  saveLocal();
  render();
  if (!currentRemotePayload && lastUpdateStatus) lastUpdateStatus.textContent = supabaseClient ? 'Última atualização: ainda não sincronizado' : 'Última atualização: modo local';
  saveStatus.textContent = force ? 'Dados atualizados' : 'Painel carregado';
}

document.querySelector('#refreshButton').addEventListener('click', () => loadReport(true));
loadReport().catch(error => {
  console.error(error);
  reportData = applyDefaults({ reportDate: todayKey() });
  render();
  saveStatus.textContent = 'Falha ao iniciar; usando modo local';
  if (lastUpdateStatus) lastUpdateStatus.textContent = 'Última atualização: modo local';
});
setInterval(() => {
  if (activeEditor) return;
  if (hasPendingSync) saveOnline();
  else loadReport(false);
}, SYNC_INTERVAL_MS);
})();

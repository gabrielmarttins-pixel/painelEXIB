const STORAGE_KEY = 'globo-df-exibicao-v3-global';
const LEGACY_STORAGE_KEY = 'globo-df-exibicao-v1';
const DATE_STORAGE_KEY = 'globo-df-exibicao-v2';
const SUPABASE_URL = 'https://kveoxuqzywebqmtgtaho.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2ZW94dXF6eXdlYnFtdGd0YWhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMTc1OTAsImV4cCI6MjA5Nzc5MzU5MH0.pmyZERMf6iwrwlEEXYrqKHngyqRyR1aXk1Jxtl1AUM0';
const SUPABASE_TABLE = 'relatorios_exibicao';
const SUPABASE_REPORT_ID = 'painel-principal';
const sections = {
  highlights: { container: 'highlights', template: 'highlightTemplate', empty: 'Nenhum destaque adicionado.' },
  news: { container: 'news', template: 'newsTemplate', empty: 'Nenhum jornal adicionado.' },
  strategy: { container: 'strategy', template: 'strategyTemplate', empty: 'Nenhum programa de grade adicionado.' },
  games: { container: 'games', template: 'gameTemplate', empty: 'Nenhum jogo adicionado.' },
  programs: { container: 'programs', template: 'programTemplate', empty: 'Nenhum programa adicionado.' },
  notes: { container: 'notes', template: 'noteTemplate', empty: 'Nenhuma informação adicionada.' },
  links: { container: 'links', template: 'linkTemplate', empty: 'Nenhum link adicionado.' }
};

const newsPresenters = {
  'BOM DIA DF': 'assets/apresentadores/bom-dia-df.png',
  'DF1': 'assets/apresentadores/df1.png',
  'DF2': 'assets/apresentadores/df2.png',
  'GLOBO ESPORTE': 'assets/apresentadores/globo-esporte.png'
};

const teamCrests = {
  'Athletico-PR': 'assets/escudos/athletico-pr.png',
  'Atlético-MG': 'assets/escudos/atletico-mg.png',
  'Bahia': 'assets/escudos/bahia.png',
  'Botafogo': 'assets/escudos/botafogo.png',
  'Chapecoense': 'assets/escudos/chapecoense.png',
  'Corinthians': 'assets/escudos/corinthians.png',
  'Coritiba': 'assets/escudos/coritiba.png',
  'Cruzeiro': 'assets/escudos/cruzeiro.png',
  'Flamengo': 'assets/escudos/flamengo.png',
  'Fluminense': 'assets/escudos/fluminense.png',
  'Grêmio': 'assets/escudos/gremio.png',
  'Internacional': 'assets/escudos/internacional.png',
  'Mirassol': 'assets/escudos/mirassol.png',
  'Palmeiras': 'assets/escudos/palmeiras.png',
  'RB Bragantino': 'assets/escudos/rb-bragantino.png',
  'Remo': 'assets/escudos/remo.png',
  'Santos': 'assets/escudos/santos.png',
  'São Paulo': 'assets/escudos/sao-paulo.png',
  'Vasco': 'assets/escudos/vasco.png',
  'Vitória': 'assets/escudos/vitoria.png'
};

const countryCodes = {
  'brasil':'BR','argentina':'AR','uruguai':'UY','paraguai':'PY','chile':'CL','colombia':'CO','equador':'EC','peru':'PE','bolivia':'BO','venezuela':'VE',
  'mexico':'MX','estados unidos':'US','eua':'US','canada':'CA','costa rica':'CR','panama':'PA','honduras':'HN','jamaica':'JM',
  'alemanha':'DE','franca':'FR','espanha':'ES','portugal':'PT','italia':'IT','inglaterra':'GB','escocia':'GB','pais de gales':'GB','irlanda':'IE','irlanda do norte':'GB',
  'holanda':'NL','paises baixos':'NL','belgica':'BE','croacia':'HR','suica':'CH','austria':'AT','dinamarca':'DK','suecia':'SE','noruega':'NO','polonia':'PL','servia':'RS','turquia':'TR','grecia':'GR','ucrania':'UA','russia':'RU',
  'japao':'JP','coreia do sul':'KR','coreia':'KR','china':'CN','australia':'AU','nova zelandia':'NZ','arabia saudita':'SA','catar':'QA','ira':'IR',
  'marrocos':'MA','senegal':'SN','egito':'EG','nigeria':'NG','camaroes':'CM','gana':'GH','africa do sul':'ZA','argelia':'DZ','tunisia':'TN','costa do marfim':'CI'
};

Object.assign(countryCodes, {
  'brasileira':'BR','uruguaia':'UY','paraguaia':'PY','chilena':'CL','colombiana':'CO','equatoriana':'EC','peruana':'PE','boliviana':'BO','venezuelana':'VE','mexicana':'MX','americana':'US','canadense':'CA',
  'alema':'DE','francesa':'FR','espanhola':'ES','portuguesa':'PT','italiana':'IT','inglesa':'GB','holandesa':'NL','belga':'BE','croata':'HR','dinamarquesa':'DK','sueca':'SE','norueguesa':'NO','polonesa':'PL','servia':'RS','turca':'TR','grega':'GR','ucraniana':'UA',
  'japonesa':'JP','sul-coreana':'KR','chinesa':'CN','australiana':'AU','marroquina':'MA','senegalesa':'SN','egipcia':'EG','nigeriana':'NG','camaronesa':'CM','ganesa':'GH'
});

const weekdayNews = [
  { name: 'BOM DIA DF', start: '06:00', production: '02:20:00', notes: '', _default: true },
  { name: 'DF1', start: '11:45', production: '01:05:00', notes: '', _default: true },
  { name: 'GLOBO ESPORTE', start: '13:00', production: '00:18:00', notes: '', _default: true },
  { name: 'DF2', start: '19:00', production: '00:30:00', notes: '', _default: true }
];

const strategyPrograms = {
  weekday: ['Edição Especial', 'Sessão da Tarde', 'Vale a Pena Ver de Novo', 'Novela I', 'Novela II'],
  saturday: ['Edição Especial', 'Sessão de Sábado', 'Caldeirão', 'Novela I', 'Novela II'],
  sunday: ['Temperatura Máxima', 'Em Família', 'Domingão com Huck']
};

const wednesdayNote = {
  subject: 'Previsão do Globo Comunidade',
  text: 'Enviar a previsão do GCO. Verificar produção e horário de entrada no GradeWeb.',
  category: 'Grade',
  _default: true
};

const fridayProgram = {
  name: 'GLOBO COMUNIDADE', start: '', duration: '', ids: '', status: 'Em preparação', _default: true
};

const day27Highlight = {
  title: 'Atualizar break de emergência',
  details: 'Atualizar junto ao Mestre Íon o break de emergência',
  category: 'Rotina',
  priority: 'Alta',
  _default: true
};

const today = new Date();
const dateInput = document.querySelector('#reportDate');
const weekdayInput = document.querySelector('#weekday');
const reportDateDisplay = document.querySelector('#reportDateDisplay');
const weekdayDisplay = document.querySelector('#weekdayDisplay');
const saveStatus = document.querySelector('#saveStatus');
let saveTimer;
let remoteSaveTimer;
let isLoading = false;
let lastRemoteSignature = '';
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY);

function makeId() { return `${Date.now()}-${Math.random().toString(16).slice(2)}`; }

function normalizeProduction(value) {
  const text = String(value || '').trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(text)) return text;
  const hours = Number(text.match(/(\d+)\s*h/i)?.[1] || 0);
  const minutes = Number(text.match(/(\d+)\s*(?:min|m)/i)?.[1] || 0);
  if (hours || minutes) return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  return '';
}

function updateEmpty(section) {
  const container = document.querySelector(`#${sections[section].container}`);
  const existing = container.querySelector('.empty-state');
  if (container.querySelector('.item-card')) existing?.remove();
  else if (!existing) container.insertAdjacentHTML('beforeend', `<div class="empty-state">${sections[section].empty}</div>`);
}

function updateMoveButtons(section) {
  const items = [...document.querySelectorAll(`#${sections[section].container} .item-card`)];
  items.forEach((item, index) => {
    item.querySelector('[data-move="up"]').disabled = index === 0;
    item.querySelector('[data-move="down"]').disabled = index === items.length - 1;
  });
}

function updateHighlightPriority(item) {
  const priority = item.querySelector('[data-field="priority"]')?.value;
  item.classList.remove('priority-low', 'priority-medium', 'priority-high');
  if (priority === 'Baixa') item.classList.add('priority-low');
  else if (priority === 'Alta') item.classList.add('priority-high');
  else item.classList.add('priority-medium');
}

function updateCustomTeamFields(item) {
  ['team1', 'team2'].forEach(fieldName => {
    const select = item.querySelector(`[data-field="${fieldName}"]`);
    const custom = item.querySelector(`[data-field="${fieldName}Custom"]`);
    if (!select || !custom) return;
    custom.hidden = select.value !== 'Outro';
  });
}

function getGameTeam(item, fieldName) {
  return item[fieldName] === 'Outro' ? cleanText(item[`${fieldName}Custom`], 'Time a definir') : cleanText(item[fieldName], 'Time a definir');
}

function getTeamCrest(team) {
  return teamCrests[team] || '';
}

function getCountryFlag(team) {
  const normalized = String(team || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\b(selecao|masculina|feminina|sub[- ]?\d+|[mf])\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
  const code = countryCodes[normalized];
  return code ? `assets/bandeiras/${code.toLocaleLowerCase('pt-BR')}.svg` : '';
}

function getNewsPresenter(name) {
  return newsPresenters[String(name || '').trim().toLocaleUpperCase('pt-BR')] || '';
}

function getStatusClass(status) {
  if (status === 'Enviado') return 'status-sent';
  if (status === 'Capturado') return 'status-captured';
  if (status === 'Ao Vivo') return 'status-live';
  return 'status-preparing';
}

function normalizeUrl(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const candidate = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(candidate);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function addItem(section, values = {}, shouldSave = true) {
  if (section === 'news' && values.production == null && values.duration != null) {
    values = { ...values, production: normalizeProduction(values.duration) };
  }
  if (section === 'programs' && values.ids == null) {
    const legacyValue = !['Programa', "ID's"].includes(values.category) ? values.category : '';
    values = { ...values, ids: legacyValue || '' };
  }
  const config = sections[section];
  const fragment = document.querySelector(`#${config.template}`).content.cloneNode(true);
  const item = fragment.querySelector('.item-card');
  item.dataset.id = values.id || makeId();
  item.dataset.default = values._default ? 'true' : 'false';
  item.querySelectorAll('[data-field]').forEach(field => {
    if (values[field.dataset.field] == null) return;
    if (field.type === 'checkbox') field.checked = Boolean(values[field.dataset.field]);
    else field.value = values[field.dataset.field];
  });
  if (section === 'highlights') updateHighlightPriority(item);
  if (section === 'games') {
    updateCustomTeamFields(item);
    item.querySelectorAll('[data-field="team1"], [data-field="team2"]').forEach(select => {
      select.addEventListener('change', () => updateCustomTeamFields(item));
    });
  }
  item.querySelector('.remove').addEventListener('click', () => { item.remove(); updateEmpty(section); updateMoveButtons(section); save(); });
  item.querySelectorAll('[data-move]').forEach(moveButton => moveButton.addEventListener('click', () => {
    const container = item.parentElement;
    if (moveButton.dataset.move === 'up') {
      const previous = item.previousElementSibling;
      if (previous?.classList.contains('item-card')) container.insertBefore(item, previous);
    } else {
      const next = item.nextElementSibling;
      if (next?.classList.contains('item-card')) container.insertBefore(next, item);
    }
    updateMoveButtons(section);
    save();
  }));
  item.querySelectorAll('input, textarea, select').forEach(field => field.addEventListener('input', () => {
    item.dataset.default = 'false';
    if (section === 'highlights' && field.dataset.field === 'priority') updateHighlightPriority(item);
    scheduleSave();
  }));
  document.querySelector(`#${config.container}`).append(fragment);
  updateEmpty(section);
  updateMoveButtons(section);
  if (shouldSave) save();
}

function collectItems(section) {
  return [...document.querySelector(`#${sections[section].container}`).querySelectorAll('.item-card')].map(item => {
    const value = { id: item.dataset.id, _default: item.dataset.default === 'true' };
    item.querySelectorAll('[data-field]').forEach(field => {
      value[field.dataset.field] = field.type === 'checkbox' ? field.checked : field.value;
    });
    return value;
  });
}

function getData() {
  return {
    reportDate: dateInput.value,
    weekday: weekdayInput.value,
    highlights: collectItems('highlights'), news: collectItems('news'), strategy: collectItems('strategy'), games: collectItems('games'), programs: collectItems('programs'), notes: collectItems('notes'), links: collectItems('links')
  };
}

function hasReportContent(data) {
  if (!data) return false;
  return Object.keys(sections).some(section => Array.isArray(data[section]) && data[section].length);
}

function getReportSignature(data) {
  return JSON.stringify(data || {});
}

function isFormFieldActive() {
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
}

function save() {
  const data = getData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  saveStatus.textContent = supabaseClient ? 'Salvo localmente' : 'Salvo neste navegador';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveStatus.textContent = supabaseClient ? 'Sincronizando...' : 'Salvo automaticamente', 1200);
  updateFooter();
  if (!isLoading) scheduleRemoteSave(data);
}

function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 250); }

function scheduleRemoteSave(data = getData()) {
  if (!supabaseClient) return;
  clearTimeout(remoteSaveTimer);
  remoteSaveTimer = setTimeout(() => saveRemoteReport(data), 700);
}

async function saveRemoteReport(data = getData()) {
  if (!supabaseClient) return;
  const { data: savedRow, error } = await supabaseClient
    .from(SUPABASE_TABLE)
    .upsert({ id: SUPABASE_REPORT_ID, dados: data, atualizado_em: new Date().toISOString() }, { onConflict: 'id' })
    .select('id, atualizado_em')
    .single();
  if (error) {
    console.error(error);
    saveStatus.textContent = `Falha ao sincronizar: ${error.message}`;
    return;
  }
  lastRemoteSignature = getReportSignature(data);
  saveStatus.textContent = savedRow ? 'Salvo e sincronizado' : 'Salvo localmente; Supabase não confirmou';
}

async function loadRemoteReport(silent = false) {
  if (!supabaseClient) return null;
  const { data, error } = await supabaseClient
    .from(SUPABASE_TABLE)
    .select('dados, atualizado_em')
    .eq('id', SUPABASE_REPORT_ID)
    .maybeSingle();
  if (error) {
    console.error(error);
    if (!silent) saveStatus.textContent = `Falha ao carregar Supabase: ${error.message}`;
    return null;
  }
  if (data?.dados && !silent) lastRemoteSignature = getReportSignature(data.dados);
  return data?.dados || null;
}

function setWeekday() {
  if (!dateInput.value) return;
  const [year, month, day] = dateInput.value.split('-').map(Number);
  weekdayInput.value = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(new Date(year, month - 1, day));
}

function updateDayInfo() {
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const dateChanged = dateInput.value && dateInput.value !== todayKey;
  dateInput.value = todayKey;
  setWeekday();
  reportDateDisplay.textContent = formatReportDate(todayKey);
  weekdayDisplay.textContent = weekdayInput.value;
  if (dateChanged) {
    applyDateDefaults();
    save();
  }
}

function updateFooter() {
  if (!dateInput.value) return document.querySelector('#footerDate').textContent = '';
  const [year, month, day] = dateInput.value.split('-').map(Number);
  document.querySelector('#footerDate').textContent = new Intl.DateTimeFormat('pt-BR').format(new Date(year, month - 1, day));
}

function removeAutomaticItems(section) {
  document.querySelectorAll(`#${sections[section].container} .item-card`).forEach(item => {
    if (item.dataset.default === 'true') item.remove();
  });
}

function hasItemWithField(section, field, value) {
  const expected = String(value || '').trim().toLocaleLowerCase('pt-BR');
  return [...document.querySelectorAll(`#${sections[section].container} .item-card`)].some(item => {
    const input = item.querySelector(`[data-field="${field}"]`);
    return String(input?.value || '').trim().toLocaleLowerCase('pt-BR') === expected;
  });
}

function applyDateDefaults() {
  if (!dateInput.value) return;
  const [year, month, day] = dateInput.value.split('-').map(Number);
  const dayOfWeek = new Date(year, month - 1, day).getDay();

  removeAutomaticItems('highlights');
  if (day === 27 && !hasItemWithField('highlights', 'title', day27Highlight.title)) {
    addItem('highlights', day27Highlight, false);
  }
  updateEmpty('highlights');
  updateMoveButtons('highlights');

  removeAutomaticItems('news');
  if (dayOfWeek >= 1 && dayOfWeek <= 5) weekdayNews.forEach(item => {
    if (!hasItemWithField('news', 'name', item.name)) addItem('news', item, false);
  });
  updateEmpty('news');
  updateMoveButtons('news');

  removeAutomaticItems('strategy');
  const defaultStrategy = dayOfWeek === 0 ? strategyPrograms.sunday : dayOfWeek === 6 ? strategyPrograms.saturday : strategyPrograms.weekday;
  defaultStrategy.forEach(name => {
    if (!hasItemWithField('strategy', 'name', name)) {
      addItem('strategy', { name, network: false, local: false, observation: '', _default: true }, false);
    }
  });
  updateEmpty('strategy');
  updateMoveButtons('strategy');

  removeAutomaticItems('notes');
  if (dayOfWeek === 3 && !hasItemWithField('notes', 'subject', wednesdayNote.subject)) {
    addItem('notes', wednesdayNote, false);
  }
  updateEmpty('notes');
  updateMoveButtons('notes');

  removeAutomaticItems('programs');
  if (dayOfWeek === 5 && !hasItemWithField('programs', 'name', fridayProgram.name)) {
    addItem('programs', fridayProgram, false);
  }
  updateEmpty('programs');
  updateMoveButtons('programs');
}

function clearReportFields() {
  Object.values(sections).forEach(config => document.querySelector(`#${config.container}`).replaceChildren());
}

function mergeDateReports(dateStore) {
  const lastDate = dateStore.lastDate || '';
  const lastReport = dateStore.reports?.[lastDate] || {};
  const merged = { reportDate: lastDate, weekday: lastReport.weekday || '', highlights: [], news: [], strategy: [], games: [], programs: [], notes: [], links: [] };
  const signatures = { highlights: new Set(), news: new Set(), strategy: new Set(), games: new Set(), programs: new Set(), notes: new Set(), links: new Set() };
  const fields = {
    highlights: ['title', 'details', 'category', 'priority', 'urgent'],
    news: ['name', 'start', 'production', 'duration', 'blocks', 'notes'],
    strategy: ['name', 'network', 'local', 'observation'],
    games: ['date', 'time', 'signal', 'championship', 'team1', 'team1Custom', 'team2', 'team2Custom'],
    programs: ['name', 'start', 'duration', 'ids', 'category', 'status'],
    notes: ['subject', 'text'],
    links: ['label', 'url']
  };

  Object.values(dateStore.reports || {}).forEach(report => {
    Object.keys(fields).forEach(section => {
      (report[section] || []).forEach(item => {
        const signature = fields[section].map(field => String(item[field] || '').trim().toLocaleLowerCase('pt-BR')).join('|');
        if (!signatures[section].has(signature)) {
          signatures[section].add(signature);
          merged[section].push(item);
        }
      });
    });
  });
  return merged;
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

function cleanText(value, fallback = 'Não informado') {
  const text = String(value || '').trim();
  return text || fallback;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function hasMeaningfulFields(item, fields) {
  return fields.some(field => String(item[field] || '').trim());
}

function showPreview() {
  save();
  const data = getData();
  const preview = document.querySelector('#previewView');
  const highlights = data.highlights.filter(item => hasMeaningfulFields(item, ['title', 'details'])).sort((a, b) => Number(Boolean(b.urgent)) - Number(Boolean(a.urgent)));
  const news = data.news.filter(item => hasMeaningfulFields(item, ['name', 'start', 'production', 'blocks', 'notes']));
  const strategy = data.strategy.filter(item => item.network || item.local || String(item.observation || '').trim());
  const games = data.games.filter(item => hasMeaningfulFields(item, ['date', 'time', 'championship', 'team1', 'team1Custom', 'team2', 'team2Custom']));
  const programs = data.programs.filter(item => hasMeaningfulFields(item, ['name', 'start', 'duration', 'ids']));
  const notes = data.notes.filter(item => hasMeaningfulFields(item, ['subject', 'text']));
  const links = data.links.filter(item => normalizeUrl(item.url));

  const card = (title, text, meta, accent = '') => `
    <article class="preview-card ${accent}">
      <h3>${escapeHtml(title)}</h3>
      ${text ? `<p>${escapeHtml(text).replaceAll('\n', '<br>')}</p>` : ''}
      ${meta ? `<div class="preview-meta">${escapeHtml(meta)}</div>` : ''}
    </article>`;

  const section = (number, title, content, className = '') => content ? `
    <section class="preview-section ${className}">
      <div class="preview-section-title"><span>${number}</span><h2>${title}</h2></div>
      <div class="preview-cards">${content}</div>
    </section>` : '';

  const highlightsHtml = highlights.map(item => card(
    item.title || 'Destaque estratégico',
    item.details,
    [item.category && `Categoria: ${item.category}`, item.priority && `Prioridade: ${item.priority}`].filter(Boolean).join('  |  '),
    item.urgent ? 'urgent' : item.priority === 'Alta' ? 'priority-high' : item.priority === 'Baixa' ? 'priority-low' : 'priority-medium'
  )).join('');

  const newsHtml = news.map(item => {
    const presenter = getNewsPresenter(item.name);
    return `
      <article class="preview-card news-preview-card">
        ${presenter ? `<img class="news-presenter" src="${escapeHtml(presenter)}" alt="" aria-hidden="true">` : ''}
        <div class="news-card-content">
          <h3>${escapeHtml(item.name || 'Jornal')}</h3>
          ${item.notes ? `<p>${escapeHtml(item.notes)}</p>` : ''}
          <div class="preview-meta">${[
            item.start && `Início: ${item.start}`,
            item.production && `Produção: ${item.production}`,
            item.blocks && `Blocos: ${item.blocks}`
          ].filter(Boolean).map(escapeHtml).join(' &nbsp;|&nbsp; ')}</div>
        </div>
      </article>`;
  }).join('');

  const strategyHtml = strategy.map(item => `
    <article class="preview-card strategy-preview-card">
      <h3>${escapeHtml(item.name || 'Programa')}</h3>
      ${item.observation ? `<p>${escapeHtml(item.observation)}</p>` : ''}
      <div class="strategy-badges">
        ${item.network ? '<span class="strategy-badge network">Em rede</span>' : ''}
        ${item.local ? '<span class="strategy-badge local">Local</span>' : ''}
      </div>
    </article>`).join('');

  const gamesHtml = games.map(item => {
    const crest1 = getTeamCrest(item.team1);
    const crest2 = getTeamCrest(item.team2);
    const flag1 = crest1 ? '' : getCountryFlag(getGameTeam(item, 'team1'));
    const flag2 = crest2 ? '' : getCountryFlag(getGameTeam(item, 'team2'));
    return `
      <div class="game-preview-item">
        ${(item.date || item.time) ? `<div class="game-schedule">${item.date ? `<span>${escapeHtml(formatGameDate(item.date))}</span>` : ''}${item.time ? `<strong>${escapeHtml(item.time)}</strong>` : ''}</div>` : ''}
        <article class="preview-card game">
          <div class="club-crests" aria-hidden="true">
            ${crest1 ? `<img class="crest crest-left" src="${escapeHtml(crest1)}" alt="">` : flag1 ? `<img class="crest flag crest-left" src="${escapeHtml(flag1)}" alt="">` : ''}
            ${crest2 ? `<img class="crest crest-right" src="${escapeHtml(crest2)}" alt="">` : flag2 ? `<img class="crest flag crest-right" src="${escapeHtml(flag2)}" alt="">` : ''}
          </div>
          <div class="game-card-content">
            <h3>${escapeHtml(getGameTeam(item, 'team1'))} x ${escapeHtml(getGameTeam(item, 'team2'))}</h3>
            ${item.championship ? `<p>${escapeHtml(item.championship)}</p>` : ''}
            ${item.signal ? `<div class="game-preview-footer"><span class="signal-badge ${item.signal === 'SP' ? 'signal-sp' : 'signal-rede'}">${escapeHtml(item.signal)}</span></div>` : ''}
          </div>
        </article>
      </div>`;
  }).join('');

  const programsHtml = programs.map(item => `
    <article class="preview-card program-preview-card">
      <h3>${escapeHtml(item.name || 'Programa local')}</h3>
      <div class="program-preview-footer">
        <div class="preview-meta">${[
          item.start && `Início: ${item.start}`,
          item.duration && `Duração: ${item.duration}`
        ].filter(Boolean).map(escapeHtml).join(' &nbsp;|&nbsp; ')}</div>
        <div class="program-badges">${item.ids ? `<span class="program-category">ID's: ${escapeHtml(item.ids)}</span>` : ''}<span class="status-badge ${getStatusClass(item.status)}">${escapeHtml(item.status || 'Em preparação')}</span></div>
      </div>
    </article>`).join('');

  const notesHtml = notes.map(item => card(
    item.subject || 'Informação',
    item.text,
    '',
    'violet'
  )).join('');

  const linksHtml = links.map(item => `
    <a class="useful-link" href="${escapeHtml(normalizeUrl(item.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.label || item.url)}</a>`).join('');

  preview.innerHTML = `
    <header class="topbar preview-topbar">
      <div class="brand" aria-label="tvglobo DF"><img class="brand-icon" src="assets/PLIMPLIM.png" alt=""><span>tvglobo <b>DF</b></span></div>
      <button class="button primary" id="editButton" type="button">Editar</button>
    </header>
    <main class="preview-shell">
      <section class="preview-hero">
        <p class="eyebrow">TV Globo DF</p>
        <h1>Relatório diário <span>de Exibição</span></h1>
        <p>${escapeHtml(formatReportDate(data.reportDate))} &nbsp;|&nbsp; ${escapeHtml(data.weekday)}</p>
      </section>
      ${section('01', 'Destaques', highlightsHtml)}
      ${section('02', 'Previsão dos jornais', newsHtml)}
      ${section('03', 'Estratégia de grade', strategyHtml, 'strategy-section')}
      ${section('04', 'Próximos jogos', gamesHtml)}
      ${section('05', 'Programas locais', programsHtml)}
      ${section('06', 'Informações diversas', notesHtml)}
      ${section('07', 'Links úteis', linksHtml, 'links-section')}
      ${!highlightsHtml && !newsHtml && !strategyHtml && !gamesHtml && !programsHtml && !notesHtml && !linksHtml ? '<div class="preview-empty">Nenhuma informação preenchida.</div>' : ''}
      <div class="preview-export"><button class="button primary" id="exportCsvButton" type="button">Exportar relatório</button></div>
      <footer><span>Exibição - TV Globo DF</span><span>${escapeHtml(formatReportDate(data.reportDate))}</span></footer>
    </main>`;

  document.querySelector('body > .topbar').hidden = true;
  document.querySelector('body > .page-shell').hidden = true;
  preview.hidden = false;
  preview.querySelector('#editButton').addEventListener('click', showEditor);
  preview.querySelector('#exportCsvButton').addEventListener('click', exportImageReport);
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function showEditor() {
  document.querySelector('#previewView').hidden = true;
  document.querySelector('body > .topbar').hidden = false;
  document.querySelector('body > .page-shell').hidden = false;
  window.scrollTo({ top: 0, behavior: 'instant' });
}

async function exportImageReport() {
  const button = document.querySelector('#exportCsvButton');
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = 'Gerando imagem...';

  try {
    await document.fonts.ready;
    const data = getData();
    const cards = {
      highlights: data.highlights.filter(item => hasMeaningfulFields(item, ['title', 'details']))
        .sort((a, b) => Number(Boolean(b.urgent)) - Number(Boolean(a.urgent)))
        .map(item => ({ title: item.title || 'Destaque', body: item.details, meta: [item.category, item.priority].filter(Boolean).join(' | '), theme: item.urgent ? 'urgent' : item.priority === 'Alta' ? 'high' : item.priority === 'Baixa' ? 'low' : 'medium', full: Boolean(item.urgent) })),
      news: data.news.filter(item => hasMeaningfulFields(item, ['name', 'start', 'production', 'blocks', 'notes']))
        .map(item => ({ title: item.name || 'Jornal', body: item.notes, meta: [item.start && `Início ${item.start}`, item.production && `Produção ${item.production}`, item.blocks && `${item.blocks} blocos`].filter(Boolean).join(' | '), theme: 'blue' })),
      strategy: data.strategy.filter(item => item.network || item.local || String(item.observation || '').trim())
        .map(item => ({ title: item.name || 'Programa', body: item.observation, meta: [item.network && 'Em rede', item.local && 'Local'].filter(Boolean).join(' + '), theme: 'blue' })),
      games: data.games.filter(item => hasMeaningfulFields(item, ['date', 'time', 'championship', 'team1', 'team1Custom', 'team2', 'team2Custom']))
        .map(item => ({ title: `${getGameTeam(item, 'team1')} x ${getGameTeam(item, 'team2')}`, body: item.championship, meta: [item.date && formatGameDate(item.date), item.time, item.signal].filter(Boolean).join(' | '), theme: 'green' })),
      programs: data.programs.filter(item => hasMeaningfulFields(item, ['name', 'start', 'duration', 'ids']))
        .map(item => ({ title: item.name || 'Programa local', body: '', meta: [item.start && `Início ${item.start}`, item.duration, item.ids && `ID's ${item.ids}`, item.status].filter(Boolean).join(' | '), theme: item.status === 'Ao Vivo' ? 'high' : item.status === 'Capturado' ? 'green' : item.status === 'Enviado' ? 'orange' : 'gray' })),
      notes: data.notes.filter(item => hasMeaningfulFields(item, ['subject', 'text']))
        .map(item => ({ title: item.subject || 'Informação', body: item.text, meta: '', theme: 'violet' })),
      links: data.links.filter(item => normalizeUrl(item.url))
        .map(item => ({ title: item.label || item.url, body: normalizeUrl(item.url), meta: '', theme: 'blue' }))
    };

    const sectionsToDraw = [
      ['Destaques', cards.highlights], ['Previsão dos jornais', cards.news], ['Estratégia de grade', cards.strategy],
      ['Próximos jogos', cards.games], ['Programas locais', cards.programs], ['Informações diversas', cards.notes]
    ].filter(([, items]) => items.length);

    const WIDTH = 1200;
    const OUTER = 34;
    const SECTION_PAD = 20;
    const GAP = 12;
    const INNER_WIDTH = WIDTH - OUTER * 2 - SECTION_PAD * 2;
    const COLUMN_WIDTH = (INNER_WIDTH - GAP) / 2;
    const measureCanvas = document.createElement('canvas');
    const measure = measureCanvas.getContext('2d');
    const font = (size, weight = 400) => `${weight} ${size}px Globotipo, Arial, sans-serif`;

    function wrapLines(text, width, textFont) {
      measure.font = textFont;
      const lines = [];
      String(text || '').split(/\r?\n/).forEach(paragraph => {
        let line = '';
        paragraph.split(/\s+/).filter(Boolean).forEach(word => {
          const candidate = line ? `${line} ${word}` : word;
          if (measure.measureText(candidate).width <= width) line = candidate;
          else { if (line) lines.push(line); line = word; }
        });
        if (line) lines.push(line);
      });
      return lines;
    }

    function measureCard(card, width) {
      const usable = width - 36;
      const titleLines = wrapLines(card.title, usable, font(18, 700));
      const bodyLines = wrapLines(card.body, usable, font(14, 400));
      const metaLines = wrapLines(card.meta, usable, font(11, 700));
      return { titleLines, bodyLines, metaLines, height: Math.max(76, 30 + titleLines.length * 23 + bodyLines.length * 19 + metaLines.length * 16) };
    }

    function layoutCards(items) {
      const positions = [];
      let offsetY = 0;
      let pending = null;
      const flushPending = () => {
        if (!pending) return;
        const measured = measureCard(pending, COLUMN_WIDTH);
        positions.push({ card: pending, x: 0, y: offsetY, width: COLUMN_WIDTH, ...measured });
        offsetY += measured.height + GAP;
        pending = null;
      };
      items.forEach(card => {
        if (card.full) {
          flushPending();
          const measured = measureCard(card, INNER_WIDTH);
          positions.push({ card, x: 0, y: offsetY, width: INNER_WIDTH, ...measured });
          offsetY += measured.height + GAP;
        } else if (!pending) pending = card;
        else {
          const left = measureCard(pending, COLUMN_WIDTH);
          const right = measureCard(card, COLUMN_WIDTH);
          const rowHeight = Math.max(left.height, right.height);
          positions.push({ card: pending, x: 0, y: offsetY, width: COLUMN_WIDTH, ...left, height: rowHeight });
          positions.push({ card, x: COLUMN_WIDTH + GAP, y: offsetY, width: COLUMN_WIDTH, ...right, height: rowHeight });
          offsetY += rowHeight + GAP;
          pending = null;
        }
      });
      flushPending();
      return { positions, height: Math.max(0, offsetY - GAP) };
    }

    const sectionLayouts = sectionsToDraw.map(([title, items]) => ({ title, ...layoutCards(items) }));
    const heroHeight = 125;
    const sectionHeader = 44;
    const sectionGap = 10;
    const sectionsHeight = sectionLayouts.reduce((sum, section) => sum + sectionHeader + section.height + SECTION_PAD * 2 + sectionGap, 0);
    const height = Math.max(500, OUTER + heroHeight + 18 + sectionsHeight + 54);
    const outputScale = Math.min(1, 8000 / height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(WIDTH * outputScale);
    canvas.height = Math.round(height * outputScale);
    const ctx = canvas.getContext('2d');
    ctx.scale(outputScale, outputScale);
    ctx.fillStyle = '#ececef';
    ctx.fillRect(0, 0, WIDTH, height);

    const roundRect = (x, y, width, cardHeight, radius, fill) => {
      ctx.beginPath(); ctx.roundRect(x, y, width, cardHeight, radius); ctx.fillStyle = fill; ctx.fill();
    };
    const gradientFor = (theme, x, width) => {
      const gradient = ctx.createLinearGradient(x, 0, x + width, 0);
      const palettes = {
        urgent: ['#ff1744','#eb005c','#a600ff'], high: ['#ff1744','#eb005c','#a600ff'],
        medium: ['#00a86b','#00c97b','#9bdc00'], low: ['#00a7ff','#2860ff','#8200ff'],
        blue: ['#00a7ff','#2860ff','#8200ff'], green: ['#00a86b','#00c97b','#9bdc00'],
        orange: ['#ff9d00','#ff5600','#ff3200'], violet: ['#751cff','#db007b','#a600ff'], gray: ['#85878d','#606269','#4b4d52']
      };
      const colors = palettes[theme] || palettes.blue;
      gradient.addColorStop(0, colors[0]); gradient.addColorStop(.52, colors[1]); gradient.addColorStop(1, colors[2]);
      return gradient;
    };
    const drawLines = (lines, x, y, textFont, color, lineHeight) => {
      ctx.font = textFont; ctx.fillStyle = color;
      lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
    };

    let y = OUTER;
    roundRect(OUTER, y, WIDTH - OUTER * 2, heroHeight, 24, '#ffffff');
    ctx.fillStyle = '#087bff'; ctx.font = font(14, 700); ctx.fillText('TV GLOBO DF', OUTER + 28, y + 30);
    ctx.fillStyle = '#686b73'; ctx.font = font(14, 400); ctx.textAlign = 'right';
    ctx.fillText(`${formatReportDate(data.reportDate)} | ${data.weekday}`, WIDTH - OUTER - 28, y + 30); ctx.textAlign = 'left';
    ctx.font = font(36, 700); ctx.fillStyle = '#101116';
    const reportTitle = 'Relatório diário ';
    ctx.fillText(reportTitle, OUTER + 28, y + 82);
    const reportTitleWidth = ctx.measureText(reportTitle).width;
    ctx.fillStyle = gradientFor('blue', OUTER + 28 + reportTitleWidth, 210);
    ctx.fillText('de Exibição', OUTER + 28 + reportTitleWidth, y + 82);
    y += heroHeight + 18;

    sectionLayouts.forEach(section => {
      const sectionHeight = sectionHeader + section.height + SECTION_PAD * 2;
      roundRect(OUTER, y, WIDTH - OUTER * 2, sectionHeight, 18, '#ffffff');
      ctx.fillStyle = '#101116'; ctx.font = font(24, 700); ctx.fillText(section.title, OUTER + SECTION_PAD, y + 34);
      ctx.strokeStyle = '#dedfe3'; ctx.lineWidth = 1; ctx.beginPath();
      ctx.moveTo(OUTER + SECTION_PAD, y + sectionHeader); ctx.lineTo(WIDTH - OUTER - SECTION_PAD, y + sectionHeader); ctx.stroke();
      const cardOriginY = y + sectionHeader + SECTION_PAD;
      section.positions.forEach(position => {
        const x = OUTER + SECTION_PAD + position.x;
        const cardY = cardOriginY + position.y;
        const urgent = position.card.theme === 'urgent';
        roundRect(x, cardY, position.width, position.height, 12, urgent ? gradientFor('urgent', x, position.width) : '#f4f4f5');
        if (!urgent) { ctx.fillStyle = gradientFor(position.card.theme, x, position.width); ctx.fillRect(x, cardY, 5, position.height); }
        const textColor = urgent ? '#ffffff' : '#101116';
        const mutedColor = urgent ? '#ffffff' : '#686b73';
        let textY = cardY + 25;
        drawLines(position.titleLines, x + 18, textY, font(18, 700), textColor, 23); textY += position.titleLines.length * 23;
        if (position.bodyLines.length) { drawLines(position.bodyLines, x + 18, textY, font(14), mutedColor, 19); textY += position.bodyLines.length * 19; }
        if (position.metaLines.length) drawLines(position.metaLines, x + 18, textY + 2, font(11, 700), urgent ? '#ffffff' : '#087bff', 16);
      });
      y += sectionHeight + sectionGap;
    });

    ctx.fillStyle = '#686b73'; ctx.font = font(11); ctx.fillText('Exibição - TV Globo DF', OUTER, height - 24);
    ctx.textAlign = 'right'; ctx.fillText(formatReportDate(data.reportDate), WIDTH - OUTER, height - 24); ctx.textAlign = 'left';

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Falha ao criar imagem');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-exibicao-${data.reportDate || 'globo-df'}.png`;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch (error) {
    console.error(error);
    alert('Não foi possível gerar a imagem. Recarregue a página e tente novamente.');
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

async function exportImageReportLegacy() {
  const button = document.querySelector('#exportCsvButton');
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = 'Gerando imagem...';

  try {
    await document.fonts.ready;
    const source = document.querySelector('#previewView .preview-shell');
    const clone = source.cloneNode(true);
    clone.querySelector('.preview-export')?.remove();
    clone.classList.add('export-report');
    clone.style.width = '1120px';
    clone.style.margin = '0';

    const originalImages = [...source.querySelectorAll('img')];
    const clonedImages = [...clone.querySelectorAll('img')];
    originalImages.forEach((image, index) => {
      const clonedImage = clonedImages[index];
      try {
        const imageCanvas = document.createElement('canvas');
        const maxSize = 220;
        const scale = Math.min(1, maxSize / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
        imageCanvas.width = Math.max(1, Math.round((image.naturalWidth || 1) * scale));
        imageCanvas.height = Math.max(1, Math.round((image.naturalHeight || 1) * scale));
        imageCanvas.getContext('2d').drawImage(image, 0, 0, imageCanvas.width, imageCanvas.height);
        clonedImage.src = imageCanvas.toDataURL('image/png');
      } catch {
        clonedImage.remove();
      }
    });

    const holder = document.createElement('div');
    holder.className = 'export-holder';
    holder.append(clone);
    document.body.append(holder);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const styleProperties = [
      'display','position','box-sizing','width','height','min-width','min-height','margin','padding','gap',
      'grid-template-columns','grid-column','align-items','justify-content','flex-direction','flex-wrap',
      'background','background-color','color','font-family','font-size','font-weight','line-height','text-align',
      'text-transform','letter-spacing','border','border-radius','box-shadow','overflow','opacity','object-fit',
      'object-position','transform','filter','text-decoration'
    ];
    [clone, ...clone.querySelectorAll('*')].forEach(element => {
      const computed = getComputedStyle(element);
      styleProperties.forEach(property => element.style.setProperty(property, computed.getPropertyValue(property)));
    });

    const width = 1120;
    const height = Math.ceil(clone.scrollHeight);
    const serialized = new XMLSerializer().serializeToString(clone);
    holder.remove();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">${serialized}</div></foreignObject></svg>`;
    const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = svgUrl;
    });

    const maxHeight = 8000;
    const outputScale = Math.min(1, maxHeight / height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * outputScale);
    canvas.height = Math.round(height * outputScale);
    const context = canvas.getContext('2d');
    context.fillStyle = '#ececef';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(svgUrl);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Falha ao criar imagem');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-exibicao-${dateInput.value || 'globo-df'}.png`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch (error) {
    console.error(error);
    alert('Não foi possível gerar a imagem. Recarregue a página e tente novamente.');
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

function exportCsvReport() {
  save();
  const data = getData();
  const rows = [['Bloco', 'Ordem', 'Item', 'Data', 'Horário', 'Tempo', 'Classificação', 'Detalhes', 'Time 1', 'Time 2', 'Prioridade']];
  rows.push(['Informações do dia', '1', data.weekday, formatReportDate(data.reportDate), '', '', '', '', '', '', '']);

  data.highlights.filter(item => hasMeaningfulFields(item, ['title', 'details'])).forEach((item, index) => {
    rows.push(['Destaques', index + 1, item.title, '', '', '', item.category, item.details, '', '', item.priority]);
  });
  data.news.filter(item => hasMeaningfulFields(item, ['name', 'start', 'production', 'notes'])).forEach((item, index) => {
    rows.push(['Previsão dos jornais', index + 1, item.name, '', item.start, item.production, '', item.notes, '', '', '']);
  });
  data.strategy.filter(item => item.network || item.local || String(item.observation || '').trim()).forEach((item, index) => {
    const selections = [item.network && 'Em rede', item.local && 'Local'].filter(Boolean).join(' + ');
    rows.push(['Estratégia de grade', index + 1, item.name, '', '', '', selections, item.observation, '', '', '']);
  });
  data.games.filter(item => hasMeaningfulFields(item, ['date', 'time', 'championship', 'team1', 'team1Custom', 'team2', 'team2Custom'])).forEach((item, index) => {
    rows.push(['Próximos jogos', index + 1, item.championship, item.date ? formatGameDate(item.date) : '', item.time, '', item.signal, '', getGameTeam(item, 'team1'), getGameTeam(item, 'team2'), '']);
  });
  data.programs.filter(item => hasMeaningfulFields(item, ['name', 'start', 'duration', 'ids'])).forEach((item, index) => {
    rows.push(['Programas locais', index + 1, item.name, '', item.start, item.duration, item.status, item.ids ? `ID's: ${item.ids}` : '', '', '', '']);
  });
  data.notes.filter(item => hasMeaningfulFields(item, ['subject', 'text'])).forEach((item, index) => {
    rows.push(['Informações diversas', index + 1, item.subject, '', '', '', item.category, item.text, '', '', '']);
  });

  const csvCell = value => `"${String(value ?? '').replaceAll('"', '""').replaceAll(/\r?\n/g, ' ')}"`;
  const csv = `\uFEFF${rows.map(row => row.map(csvCell).join(';')).join('\r\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `relatorio-exibicao-${data.reportDate || 'globo-df'}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function generateHtmlReport() {
  const button = document.querySelector('#printButton');
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = 'Gerando HTML...';

  try {
    save();
    const data = getData();
    const highlights = data.highlights.filter(item => hasMeaningfulFields(item, ['title', 'details']));
    const news = data.news.filter(item => hasMeaningfulFields(item, ['name', 'start', 'duration', 'notes']));
    const notes = data.notes.filter(item => hasMeaningfulFields(item, ['subject', 'text']));
    const baseUrl = new URL('.', location.href).href;
    const regularFont = new URL('assets/GlobotipoCorporativa-Regular.ttf', baseUrl).href;
    const boldFont = new URL('assets/GlobotipoCorporativa-Bold.ttf', baseUrl).href;
    const logoUrl = new URL('assets/PLIMPLIM.png', baseUrl).href;

    const card = (title, text, meta, accent = 'blue') => `
      <article class="card ${accent}">
        <h3>${escapeHtml(title)}</h3>
        ${text ? `<p>${escapeHtml(text).replaceAll('\n', '<br>')}</p>` : ''}
        ${meta ? `<div class="meta">${escapeHtml(meta)}</div>` : ''}
      </article>`;

    const section = (number, title, content) => content ? `
      <section>
        <header class="section-title"><span>${number}</span><h2>${title}</h2></header>
        <div class="cards">${content}</div>
      </section>` : '';

    const highlightsHtml = highlights.map(item => card(
      item.title || 'Destaque estratégico',
      item.details,
      [item.category && `Categoria: ${item.category}`, item.priority && `Prioridade: ${item.priority}`].filter(Boolean).join('  |  ')
    )).join('');

    const newsHtml = news.map(item => card(
      item.name || 'Jornal',
      item.notes,
      [item.start && `Início: ${item.start}`, item.duration && `Duração: ${item.duration}`].filter(Boolean).join('  |  ')
    )).join('');

    const notesHtml = notes.map(item => card(
      item.subject || 'Informação',
      item.text,
      item.category ? `Categoria: ${item.category}` : '',
      'violet'
    )).join('');

    const report = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Relatório de Exibição - ${escapeHtml(data.reportDate || 'TV Globo DF')}</title>
  <style>
    @font-face{font-family:Globotipo;src:url('${regularFont}') format('truetype');font-weight:400;font-display:swap}
    @font-face{font-family:Globotipo;src:url('${boldFont}') format('truetype');font-weight:700;font-display:swap}
    :root{--blue:#087bff;--violet:#6b20ff;--ink:#101116;--muted:#686b73;--line:#dedfe3;--panel:#f4f4f5;--gradient:linear-gradient(110deg,#00a7ff,#2860ff 48%,#8200ff)}
    *{box-sizing:border-box}body{margin:0;background:#ececef;color:var(--ink);font-family:Globotipo,Arial,sans-serif}.topbar{height:76px;background:#fff;border-bottom:1px solid #e7e7ea;display:flex;align-items:center;justify-content:space-between;padding:0 max(28px,calc((100vw - 1080px)/2));position:sticky;top:0;z-index:2}.brand{display:flex;align-items:center;gap:10px;color:var(--blue);font-size:25px;font-weight:700}.brand img{width:36px;height:36px;object-fit:contain;filter:invert(39%) sepia(96%) saturate(3874%) hue-rotate(205deg) brightness(101%) contrast(107%)}.brand b{color:var(--ink);font-size:15px}.print{border:0;border-radius:999px;padding:11px 18px;color:#fff;background:var(--gradient);font:700 14px Globotipo;cursor:pointer}.page{width:min(1080px,calc(100% - 32px));margin:28px auto 55px}.hero{background:#fff;border-radius:26px;padding:48px 52px;display:grid;grid-template-columns:1fr 210px;align-items:center;overflow:hidden}.eyebrow{color:var(--blue);font-size:13px;font-weight:700;letter-spacing:.13em;margin:0 0 16px}.hero h1{font-size:58px;line-height:.95;letter-spacing:-.04em;margin:0}.hero h1 span{background:var(--gradient);background-clip:text;-webkit-background-clip:text;color:transparent}.date{color:var(--muted);font-size:17px;margin:22px 0 0}.orbit{position:relative;width:180px;height:180px;border-radius:50%;background:conic-gradient(#00a8ff,#285bff,#8100ff,#f0007d,#ff3915,#ffbd00,#00a8ff);display:grid;place-items:center}.orbit:before{content:"";width:108px;height:108px;border-radius:50%;background:#fff}.orbit:after{content:"";position:absolute;width:54px;height:38px;border-radius:50%;background:var(--gradient)}section{background:#fff;border-radius:22px;margin-top:18px;padding:32px 36px}.section-title{border-bottom:1px solid var(--line);padding-bottom:18px;margin-bottom:20px}.section-title span{color:var(--blue);font-size:12px;font-weight:700}.section-title h2{font-size:28px;margin:7px 0 0}.cards{display:grid;gap:12px}.card{position:relative;background:var(--panel);border-radius:15px;padding:22px 24px 20px 28px;overflow:hidden}.card:before{content:"";position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--blue)}.card.violet:before{background:var(--violet)}.card h3{font-size:19px;margin:0}.card p{color:var(--muted);font-size:15px;line-height:1.45;margin:10px 0 0}.meta{color:var(--blue);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.045em;margin-top:14px}.violet .meta{color:var(--violet)}footer{display:flex;justify-content:space-between;color:#757780;font-size:12px;padding:22px 6px}.empty{background:#fff;border-radius:22px;margin-top:18px;padding:34px;color:var(--muted);text-align:center}@media(max-width:680px){.hero{grid-template-columns:1fr;padding:35px 28px}.hero h1{font-size:44px}.orbit{display:none}section{padding:26px 22px}}@page{size:A4;margin:12mm}@media print{body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.topbar{position:static;height:58px;padding:0}.print{display:none}.page{width:100%;margin:0}.hero{border:1px solid var(--line);padding:30px 34px;border-radius:16px}.hero h1{font-size:42px}.orbit{width:125px;height:125px}.orbit:before{width:76px;height:76px}section{break-inside:auto;border:1px solid var(--line);border-radius:14px;padding:22px 24px;margin-top:10px}.card{break-inside:avoid}.section-title h2{font-size:21px}footer{padding-bottom:0}}
    .orbit{position:relative;width:190px;height:135px;border-radius:32px;background:conic-gradient(from 220deg,#00a8ff,#285bff,#8100ff,#f0007d,#ff3915,#ffbd00,#00a8ff)}.orbit:before{content:"";position:absolute;inset:10px;width:auto;height:auto;border-radius:23px;background:#fff}.orbit i{position:absolute;z-index:1;left:50%;top:50%;width:136px;height:81px;border-radius:22px;background:var(--gradient);transform:translate(-50%,-50%)}.orbit i:after{content:"";position:absolute;left:50%;top:50%;width:55px;height:34px;border-radius:50%;background:#fff;transform:translate(-50%,-50%)}.orbit:after{content:"";position:absolute;left:50%;top:-28px;width:78px;height:36px;transform:translateX(-50%);background:linear-gradient(58deg,transparent 47%,#2860ff 48% 51%,transparent 52%),linear-gradient(-58deg,transparent 47%,#8200ff 48% 51%,transparent 52%)}
    @media print{.orbit{width:135px;height:94px;border-radius:22px}.orbit:before{inset:7px;border-radius:15px}.orbit i{width:96px;height:57px;border-radius:15px}.orbit i:after{width:39px;height:24px}.orbit:after{top:-20px;width:52px;height:26px}}
  </style>
</head>
<body>
  <header class="topbar">
    <div class="brand"><img src="${logoUrl}" alt=""><span>tvglobo <b>DF</b></span></div>
    <button class="print" onclick="window.print()">Imprimir</button>
  </header>
  <main class="page">
    <div class="hero">
      <div><p class="eyebrow">TV GLOBO DF</p><h1>Relatório diário <span>de Exibição</span></h1><p class="date">${escapeHtml(formatReportDate(data.reportDate))} &nbsp;|&nbsp; ${escapeHtml(data.weekday)}</p></div>
      <div class="orbit"><i></i></div>
    </div>
    ${section('01', 'Destaques', highlightsHtml)}
    ${section('02', 'Previsão dos jornais', newsHtml)}
    ${section('03', 'Informações diversas', notesHtml)}
    ${!highlightsHtml && !newsHtml && !notesHtml ? '<div class="empty">Nenhuma informação preenchida para este relatório.</div>' : ''}
    <footer><span>Exibição - TV Globo DF</span><span>${escapeHtml(formatReportDate(data.reportDate))}</span></footer>
  </main>
</body>
</html>`;

    const blob = new Blob([report], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-exibicao-${data.reportDate || 'globo-df'}.html`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    saveStatus.textContent = 'Relatório HTML gerado';
  } catch (error) {
    console.error(error);
    alert('Não foi possível gerar o relatório HTML. Recarregue a página e tente novamente.');
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

async function generatePdf() {
  const button = document.querySelector('#printButton');
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = 'Gerando PDF...';

  try {
    save();
    const data = getData();
    await document.fonts.ready;
    const { PDFDocument } = PDFLib;
    const pdf = await PDFDocument.create();
    const PAGE_W = 1240;
    const PAGE_H = 1754;
    const MARGIN = 88;
    const BOTTOM = 110;
    const CONTENT_W = PAGE_W - MARGIN * 2;
    const canvases = [];
    let canvas;
    let ctx;
    let y;

    function font(size, weight = 400) {
      return `${weight} ${size}px Globotipo, Arial, sans-serif`;
    }

    function roundedRect(context, x, top, width, height, radius) {
      context.beginPath();
      context.roundRect(x, top, width, height, radius);
    }

    function drawColoredLogo(context, x, top, size) {
      const source = document.querySelector('.brand-icon');
      const logoCanvas = document.createElement('canvas');
      logoCanvas.width = size;
      logoCanvas.height = size;
      const logoContext = logoCanvas.getContext('2d');
      logoContext.drawImage(source, 0, 0, size, size);
      logoContext.globalCompositeOperation = 'source-in';
      logoContext.fillStyle = '#087bff';
      logoContext.fillRect(0, 0, size, size);
      context.drawImage(logoCanvas, x, top, size, size);
    }

    function drawHeader(context) {
      drawColoredLogo(context, MARGIN, 54, 52);
      context.fillStyle = '#087bff';
      context.font = font(38, 700);
      context.fillText('tvglobo', MARGIN + 65, 93);
      context.fillStyle = '#101116';
      context.font = font(22, 700);
      context.fillText('DF', MARGIN + 205, 92);
      context.fillStyle = '#686b73';
      context.font = font(16, 700);
      context.textAlign = 'right';
      context.fillText('EXIBIÇÃO', PAGE_W - MARGIN, 88);
      context.textAlign = 'left';
      context.strokeStyle = '#dedfe3';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(MARGIN, 125);
      context.lineTo(PAGE_W - MARGIN, 125);
      context.stroke();
    }

    function newPage() {
      canvas = document.createElement('canvas');
      canvas.width = PAGE_W;
      canvas.height = PAGE_H;
      ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, PAGE_W, PAGE_H);
      drawHeader(ctx);
      canvases.push(canvas);
      y = 170;
    }

    function wrap(text, maxWidth, textFont) {
      ctx.font = textFont;
      const lines = [];
      cleanText(text).split(/\r?\n/).forEach(paragraph => {
        let line = '';
        paragraph.split(/\s+/).forEach(word => {
          const candidate = line ? `${line} ${word}` : word;
          if (ctx.measureText(candidate).width <= maxWidth) line = candidate;
          else {
            if (line) lines.push(line);
            line = word;
          }
        });
        if (line) lines.push(line);
      });
      return lines.length ? lines : ['Não informado'];
    }

    function drawTextLines(lines, x, top, textFont, color, lineHeight) {
      ctx.font = textFont;
      ctx.fillStyle = color;
      lines.forEach((line, index) => ctx.fillText(line, x, top + index * lineHeight));
    }

    function ensureSpace(height) {
      if (y + height > PAGE_H - BOTTOM) newPage();
    }

    function drawHero() {
      const height = 300;
      roundedRect(ctx, MARGIN, y, CONTENT_W, height, 34);
      ctx.fillStyle = '#f4f4f5';
      ctx.fill();
      ctx.fillStyle = '#087bff';
      ctx.font = font(18, 700);
      ctx.fillText('TV GLOBO DF', MARGIN + 38, y + 50);
      ctx.fillStyle = '#101116';
      ctx.font = font(57, 700);
      ctx.fillText('Relatório diário', MARGIN + 38, y + 124);
      const gradient = ctx.createLinearGradient(MARGIN + 38, 0, MARGIN + 470, 0);
      gradient.addColorStop(0, '#00a7ff');
      gradient.addColorStop(0.52, '#2860ff');
      gradient.addColorStop(1, '#8200ff');
      ctx.fillStyle = gradient;
      ctx.fillText('de Exibição', MARGIN + 38, y + 188);
      ctx.fillStyle = '#686b73';
      ctx.font = font(25, 400);
      ctx.fillText(`${formatReportDate(data.reportDate)}  |  ${cleanText(data.weekday)}`, MARGIN + 38, y + 244);
      ctx.beginPath();
      ctx.arc(PAGE_W - MARGIN - 130, y + 150, 96, 0, Math.PI * 2);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 35;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(PAGE_W - MARGIN - 130, y + 150, 47, 32, 0, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      y += height + 62;
    }

    function sectionTitle(number, title) {
      ensureSpace(100);
      ctx.fillStyle = '#087bff';
      ctx.font = font(17, 700);
      ctx.fillText(number, MARGIN, y);
      ctx.fillStyle = '#101116';
      ctx.font = font(38, 700);
      ctx.fillText(title, MARGIN, y + 48);
      ctx.strokeStyle = '#dedfe3';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(MARGIN, y + 70);
      ctx.lineTo(PAGE_W - MARGIN, y + 70);
      ctx.stroke();
      y += 102;
    }

    function drawCard(title, body, meta = '', accent = '#087bff') {
      const titleFont = font(27, 700);
      const bodyFont = font(22, 400);
      const metaFont = font(16, 700);
      const titleLines = wrap(title, CONTENT_W - 78, titleFont);
      const allBodyLines = wrap(body, CONTENT_W - 78, bodyFont);
      const chunks = [];
      for (let index = 0; index < allBodyLines.length; index += 38) chunks.push(allBodyLines.slice(index, index + 38));

      chunks.forEach((bodyLines, index) => {
        const currentTitle = index ? [`${titleLines[0]} (continuação)`] : titleLines;
        const cardHeight = 42 + currentTitle.length * 34 + bodyLines.length * 29 + (meta ? 42 : 12);
        ensureSpace(cardHeight + 22);
        roundedRect(ctx, MARGIN, y, CONTENT_W, cardHeight, 24);
        ctx.fillStyle = '#f4f4f5';
        ctx.fill();
        ctx.save();
        roundedRect(ctx, MARGIN, y, 9, cardHeight, 5);
        ctx.fillStyle = accent;
        ctx.fill();
        ctx.restore();
        drawTextLines(currentTitle, MARGIN + 34, y + 42, titleFont, '#101116', 34);
        const bodyTop = y + 42 + currentTitle.length * 34;
        drawTextLines(bodyLines, MARGIN + 34, bodyTop, bodyFont, '#686b73', 29);
        if (meta) {
          ctx.font = metaFont;
          ctx.fillStyle = accent;
          ctx.fillText(meta.toUpperCase(), MARGIN + 34, y + cardHeight - 25);
        }
        y += cardHeight + 22;
      });
    }

    newPage();
    drawHero();
    sectionTitle('01', 'Destaques');
    if (!data.highlights.length) drawCard('Sem destaques', 'Nenhum destaque estratégico foi informado.');
    data.highlights.forEach(item => drawCard(item.title, item.details, `Categoria: ${cleanText(item.category)}   |   Prioridade: ${cleanText(item.priority)}`));

    sectionTitle('02', 'Previsão dos jornais');
    if (!data.news.length) drawCard('Sem previsão', 'Nenhum jornal foi informado para esta data.');
    data.news.forEach(item => drawCard(item.name, cleanText(item.notes, 'Sem observações.'), `${cleanText(item.start)}  |  Duração: ${cleanText(item.duration)}`, '#2860ff'));

    sectionTitle('03', 'Informações diversas');
    if (!data.notes.length) drawCard('Sem informações', 'Nenhuma informação adicional foi registrada.', '', '#8200ff');
    data.notes.forEach(item => drawCard(item.subject, item.text, `Categoria: ${cleanText(item.category)}`, '#8200ff'));

    canvases.forEach((pageCanvas, index) => {
      const pageContext = pageCanvas.getContext('2d');
      pageContext.strokeStyle = '#dedfe3';
      pageContext.lineWidth = 2;
      pageContext.beginPath();
      pageContext.moveTo(MARGIN, PAGE_H - 78);
      pageContext.lineTo(PAGE_W - MARGIN, PAGE_H - 78);
      pageContext.stroke();
      pageContext.fillStyle = '#686b73';
      pageContext.font = font(16, 400);
      pageContext.fillText('Exibição - TV Globo DF', MARGIN, PAGE_H - 43);
      pageContext.textAlign = 'right';
      pageContext.fillText(`${index + 1} / ${canvases.length}`, PAGE_W - MARGIN, PAGE_H - 43);
      pageContext.textAlign = 'left';
    });

    for (const pageCanvas of canvases) {
      const image = await pdf.embedPng(pageCanvas.toDataURL('image/png'));
      const pdfPage = pdf.addPage([595.28, 841.89]);
      pdfPage.drawImage(image, { x: 0, y: 0, width: 595.28, height: 841.89 });
    }

    const bytes = await pdf.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-exibicao-${data.reportDate || 'globo-df'}.pdf`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    saveStatus.textContent = 'PDF gerado com sucesso';
  } catch (error) {
    console.error(error);
    alert('Não foi possível gerar o PDF. Recarregue a página e tente novamente.');
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

function loadLocalReport() {
  let data;
  try { data = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { data = null; }
  if (!data) {
    let dateStore;
    try { dateStore = JSON.parse(localStorage.getItem(DATE_STORAGE_KEY)); } catch { dateStore = null; }
    if (dateStore?.reports) data = mergeDateReports(dateStore);
  }
  if (!data) {
    try { data = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY)); } catch { data = null; }
  }
  return data;
}

function renderReportData(data) {
  clearReportFields();
  if (data) {
    Object.keys(sections).forEach(section => {
      (data[section] || []).forEach(item => addItem(section, item, false));
      updateEmpty(section);
      updateMoveButtons(section);
    });
  } else {
    Object.keys(sections).forEach(section => updateEmpty(section));
  }
}

async function load() {
  isLoading = true;
  saveStatus.textContent = supabaseClient ? 'Carregando dados online...' : 'Carregando dados locais...';
  const remoteData = await loadRemoteReport();
  const localData = loadLocalReport();
  const data = hasReportContent(remoteData) ? remoteData : localData || remoteData;
  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  dateInput.value = todayKey;
  updateDayInfo();
  renderReportData(data);
  applyDateDefaults();
  isLoading = false;
  save();
  updateFooter();
  localStorage.removeItem(DATE_STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

async function syncFromRemote(force = false) {
  if (!supabaseClient || isLoading || (!force && isFormFieldActive())) return;
  if (force) saveStatus.textContent = 'Atualizando dados...';
  const remoteData = await loadRemoteReport(true);
  if (!hasReportContent(remoteData)) {
    if (force) saveStatus.textContent = 'Nenhum dado online encontrado';
    return;
  }
  const remoteSignature = getReportSignature(remoteData);
  const currentSignature = getReportSignature(getData());
  if (remoteSignature === currentSignature || remoteSignature === lastRemoteSignature) {
    if (force) saveStatus.textContent = 'Dados já estão atualizados';
    return;
  }

  isLoading = true;
  renderReportData(remoteData);
  applyDateDefaults();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getData()));
  updateFooter();
  isLoading = false;
  lastRemoteSignature = remoteSignature;
  saveStatus.textContent = 'Atualizado com dados online';
}

document.querySelectorAll('[data-add]').forEach(button => button.addEventListener('click', () => addItem(button.dataset.add)));
document.querySelector('#refreshButton').addEventListener('click', () => syncFromRemote(true));
document.querySelector('#printButton').addEventListener('click', showPreview);
document.querySelector('#clearButton').addEventListener('click', async () => {
  if (!confirm('Limpar todas as informações deste painel?')) return;
  localStorage.removeItem(STORAGE_KEY);
  if (supabaseClient) {
    const { error } = await supabaseClient
      .from(SUPABASE_TABLE)
      .update({ dados: {}, atualizado_em: new Date().toISOString() })
      .eq('id', SUPABASE_REPORT_ID);
    if (error) console.error(error);
  }
  location.reload();
});

load();
setInterval(updateDayInfo, 60000);
setInterval(syncFromRemote, 60000);
